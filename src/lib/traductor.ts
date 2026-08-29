import { IDIOMAS } from './tipos'
import type { Idioma } from './tipos'
/**
 * El traductor: Gemini con tu propia clave (D-09).
 *
 * Tres reglas mandan aquí:
 *
 * 1. **La clave nunca sale del aparato.** No va en el código ni en el
 *    repositorio, que es público. Se pega en los ajustes y se guarda en local.
 * 2. **La traducción natural aparece primero.** Pediste cinco cosas (P28) pero
 *    también que nada se sienta lento (R19). Se resuelve con el orden: la
 *    respuesta llega en trozos y el primero que se muestra es el que necesitas.
 * 3. **Los errores se explican con palabras.** Si se acaba la cuota, la app dice
 *    cuándo vuelve, no un número (P31).
 */

const RAIZ = 'https://generativelanguage.googleapis.com/v1beta/models'

/**
 * El modelo no se fija en el código: se le pregunta a Google cuáles tiene tu
 * clave y se elige el mejor.
 *
 * Se hizo así después de fijar `gemini-2.5-flash-lite` y recibir un 404: los
 * nombres de modelo cambian, se retiran y no son iguales para todas las claves.
 * Cualquier nombre escrito aquí caduca, igual que caducó el prefijo `AIza` de
 * las claves. Preguntar no caduca.
 */

export interface Traduccion {
  natural: string
  literal: string
  contexto: string
  /** Solo si hay un modismo o un juego de palabras que no traduce directo. */
  aviso?: string
  /** Solo si lo que mandaste era una palabra suelta. */
  palabra?: {
    pronunciacion: string
    significado: string
    ejemplo: string
    ejemploTraducido: string
  }
}

/** Lo que no sirve para traducir texto, por muy Gemini que sea. */
const INSERVIBLES = /embedding|aqa|imagen|image|tts|audio|veo|vision|live|robotics/

function puntuar(id: string): number {
  const s = id.toLowerCase()
  if (INSERVIBLES.test(s)) return -1
  let p = 0
  // Flash-Lite primero: es el que más cuota gratuita da, y para traducir una
  // frase sobra. Pro gasta la cuota diez veces más rápido sin traducir mejor.
  if (s.includes('flash-lite')) p += 100
  else if (s.includes('flash')) p += 80
  else if (s.includes('pro')) p += 50
  else p += 20
  if (/preview|exp|thinking/.test(s)) p -= 30
  const version = /(\d+(?:\.\d+)?)/.exec(s.replace('gemini-', ''))
  if (version) p += Math.min(Number(version[1]), 20) * 2
  if (s.endsWith('-latest')) p += 3
  return p
}

/** Los modelos que la clave puede usar para generar texto, de mejor a peor. */
export async function descubrirModelos(clave: string, senal?: AbortSignal): Promise<string[]> {
  const espera = new Espera(senal, ESPERAS.modelos)
  let r: Response
  try {
    r = await fetch(`${RAIZ}?pageSize=200`, {
      headers: { 'x-goog-api-key': clave },
      signal: espera.control.signal,
    })
  } catch (e) {
    // Esta es la primera llamada con una clave nueva, y es justo donde una red
    // mala deja la app pensando para siempre.
    if (espera.caducado) throw espera.suFallo()
    if (senal?.aborted) throw e
    throw new ErrorTraductor({ tipo: 'sin-red' })
  } finally {
    espera.parar()
  }
  if (!r.ok) throw new ErrorTraductor(interpretar(r.status, await r.text().catch(() => '')))

  const datos = (await r.json()) as { models?: { name?: string; supportedGenerationMethods?: string[] }[] }
  return (datos.models ?? [])
    .filter(m => (m.supportedGenerationMethods ?? []).some(g => g.toLowerCase().includes('generatecontent')))
    .map(m => String(m.name ?? '').replace(/^models\//, ''))
    .filter(id => puntuar(id) > 0)
    .sort((a, b) => puntuar(b) - puntuar(a))
}

export type Fallo =
  | { tipo: 'sin-clave' }
  | { tipo: 'clave-mala' }
  | { tipo: 'cuota'; vuelve: string }
  | { tipo: 'sin-red' }
  | { tipo: 'ocupado' }
  /** Se acabó la paciencia: nadie contestó, o dejó de contestar a medias. */
  | { tipo: 'tardo'; donde: 'llamando' | 'a-medias' }
  | { tipo: 'raro'; detalle: string }

export class ErrorTraductor extends Error {
  constructor(readonly fallo: Fallo) {
    super(fallo.tipo)
  }
}

/**
 * Cuánto se espera antes de dar algo por colgado.
 *
 * No es una elección estética: **una petición sin reloj puede no terminar
 * nunca**. Un móvil que cambia de antena, un proxy que se queda con la conexión
 * abierta sin mandar nada — `fetch` no falla, simplemente no vuelve, y la app se
 * queda diciendo «Traduciendo…» hasta que alguien la cierra. Pasó de verdad:
 * cinco minutos mirando una pantalla que no iba a cambiar.
 *
 * Los números salen de lo que tarda esto cuando va bien: la primera respuesta
 * llega en un par de segundos y los trozos se pisan unos a otros. Veinte
 * segundos sin nada no es lentitud, es que no viene.
 */
export const ESPERAS = {
  /** Desde que se pide hasta que Google contesta. */
  respuesta: 20_000,
  /** Entre dos trozos, con la respuesta ya empezada. */
  trozo: 25_000,
  /** Tope de la petición entera, aunque vaya goteando. */
  total: 120_000,
  /** Preguntar qué modelos tiene la clave. Es una respuesta corta. */
  modelos: 20_000,
}

/**
 * Un reloj que corta lo que se queda colgado.
 *
 * Cada paso rearma el reloj: mientras llegue algo, se sigue esperando. Lo que
 * no se tolera es el silencio. Se distingue entre cortar por tiempo y cortar
 * porque quien lee cerró el panel, porque son dos cosas distintas y solo una
 * de ellas hay que contarla.
 */
class Espera {
  readonly control = new AbortController()
  /** Si el corte lo dio el reloj y no la persona. */
  caducado = false
  private paso: ReturnType<typeof setTimeout> | undefined
  private tope: ReturnType<typeof setTimeout>
  private donde: 'llamando' | 'a-medias' = 'llamando'

  constructor(senal?: AbortSignal, total = ESPERAS.total) {
    if (senal?.aborted) this.control.abort()
    else senal?.addEventListener('abort', () => this.control.abort(), { once: true })
    this.tope = setTimeout(() => this.rendirse(), total)
  }

  private rendirse() {
    this.caducado = true
    this.control.abort()
  }

  /** Vuelve a empezar la cuenta: acaba de pasar algo. */
  marcar(ms: number, donde: 'llamando' | 'a-medias' = this.donde) {
    this.donde = donde
    clearTimeout(this.paso)
    this.paso = setTimeout(() => this.rendirse(), ms)
  }

  parar() {
    clearTimeout(this.paso)
    clearTimeout(this.tope)
  }

  /** El error que toca contar, según quién cortó. */
  suFallo(): ErrorTraductor {
    return new ErrorTraductor({ tipo: 'tardo', donde: this.donde })
  }
}

const ESQUEMA = {
  type: 'object',
  properties: {
    natural: { type: 'string' },
    literal: { type: 'string' },
    contexto: { type: 'string' },
    aviso: { type: 'string' },
    palabra: {
      type: 'object',
      properties: {
        pronunciacion: { type: 'string' },
        significado: { type: 'string' },
        ejemplo: { type: 'string' },
        ejemploTraducido: { type: 'string' },
      },
      required: ['pronunciacion', 'significado', 'ejemplo', 'ejemploTraducido'],
    },
  },
  required: ['natural', 'literal', 'contexto'],
} as const

function instruccion(idioma: Idioma): string {
  const nombre = IDIOMAS.find(i => i.id === idioma)?.nombre ?? 'Inglés'
  // El japonés necesita una línea propia: sin ella, la «pronunciación» de una
  // palabra sale en kana, que es justo lo que no sabe leer quien pregunta.
  const extra = idioma === 'japones'
    ? `\n\nEl original está en japonés. En «pronunciación», escribe la lectura en
rōmaji tal como la diría un hispanohablante, y añade la lectura en kana entre
paréntesis. Si lo que te mandan lleva kanji, di en «contexto» cómo se lee.`
    : ''
  return BASE.replace('{IDIOMA}', nombre.toLowerCase()) + extra
}

const BASE = `Eres el traductor de una app de lectura. Traduces del {IDIOMA} al español.

Devuelves siempre:
- natural: cómo lo diría un hispanohablante. Es lo más importante y lo que se lee primero. Sin rodeos, sin explicar, solo la frase.
- literal: la traducción palabra por palabra, aunque suene rara. Sirve para ver cómo está construido el original.
- contexto: en una o dos frases, qué quiere decir de verdad y qué tono tiene. Nada de lecciones de gramática.

Además, solo cuando corresponda:
- aviso: si es un modismo, un juego de palabras, una referencia cultural o algo que no traduce directo, dilo en una frase.
- palabra: solo si lo que te mandan es UNA sola palabra. Incluye pronunciación aproximada escrita para un hispanohablante (no alfabeto fonético), el significado, una frase de ejemplo en el idioma original y su traducción.

Escribe en español de España neutro. Sé breve: esto se lee en un teléfono, en mitad de un libro.`

/** La cuota diaria del nivel gratuito se renueva a medianoche del Pacífico. */
function cuandoVuelveLaCuota(): string {
  try {
    const ahora = new Date()
    const enLA = new Date(ahora.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }))
    const medianocheLA = new Date(enLA)
    medianocheLA.setHours(24, 0, 0, 0)
    const faltan = medianocheLA.getTime() - enLA.getTime()
    const vuelve = new Date(ahora.getTime() + faltan)
    return vuelve.toLocaleString('es-ES', { hour: '2-digit', minute: '2-digit', weekday: 'long' })
  } catch {
    return 'mañana'
  }
}

function interpretar(estado: number, cuerpo: string): Fallo {
  const texto = cuerpo.toLowerCase()
  if (estado === 400 && (texto.includes('api key') || texto.includes('api_key'))) return { tipo: 'clave-mala' }
  if (estado === 401 || estado === 403) return { tipo: 'clave-mala' }
  if (estado === 429) return { tipo: 'cuota', vuelve: cuandoVuelveLaCuota() }
  if (estado === 503 || estado === 500) return { tipo: 'ocupado' }
  if (estado === 404) return { tipo: 'raro', detalle: '404' }
  return { tipo: 'raro', detalle: `${estado}` }
}

/**
 * Saca el valor de "natural" de un JSON a medio llegar.
 *
 * No se puede usar JSON.parse hasta que el objeto está entero, y esperar a eso
 * son un par de segundos mirando una pantalla quieta. Esto lee el trozo que ya
 * llegó y va enseñando la traducción mientras el resto sigue en camino.
 */
function naturalAMedias(texto: string): string | null {
  const m = /"natural"\s*:\s*"((?:[^"\\]|\\.)*)/.exec(texto)
  if (!m) return null
  try {
    return JSON.parse(`"${m[1]}"`)
  } catch {
    // La cadena puede acabar en mitad de un escape; se recorta y se reintenta.
    try {
      return JSON.parse(`"${m[1].replace(/\\[^"\\/bfnrtu]?$/, '')}"`)
    } catch {
      return null
    }
  }
}

export interface Opciones {
  clave: string
  texto: string
  /** De qué idioma se traduce. Siempre al español. */
  idioma?: Idioma
  /** Se llama con la traducción natural en cuanto asoma, antes del resto. */
  alAsomar?: (natural: string) => void
  senal?: AbortSignal
}

let elegido: string | null = null

/** Qué modelo se está usando. Se enseña en los ajustes para poder diagnosticar. */
export function modeloEnUso(): string | null {
  return elegido
}

export function olvidarModelo(): void {
  elegido = null
  try { localStorage.removeItem('vellum-modelo') } catch { /* modo privado */ }
}

async function modeloPara(clave: string): Promise<string> {
  if (elegido) return elegido
  try {
    const guardado = localStorage.getItem('vellum-modelo')
    if (guardado) { elegido = guardado; return guardado }
  } catch { /* modo privado: se descubre cada vez, que tampoco es caro */ }

  const lista = await descubrirModelos(clave)
  if (lista.length === 0) throw new ErrorTraductor({ tipo: 'raro', detalle: 'tu clave no tiene ningún modelo de texto' })
  elegido = lista[0]
  try { localStorage.setItem('vellum-modelo', elegido) } catch { /* ídem */ }
  return elegido
}

export async function traducir(opciones: Opciones): Promise<Traduccion> {
  if (!opciones.clave) throw new ErrorTraductor({ tipo: 'sin-clave' })
  try {
    return await pedirTraduccion(await modeloPara(opciones.clave), opciones)
  } catch (e) {
    // Un 404 significa que ese modelo ya no existe: se vuelve a preguntar y se
    // reintenta una vez. Sin esto, el día que Google retire un modelo la app se
    // queda muerta hasta que alguien la toque.
    const esNoExiste = e instanceof ErrorTraductor && e.fallo.tipo === 'raro' && e.fallo.detalle === '404'
    if (!esNoExiste) throw e
    olvidarModelo()
    return pedirTraduccion(await modeloPara(opciones.clave), opciones)
  }
}

async function pedirTraduccion(MODELO: string, { clave, texto, idioma = 'ingles', alAsomar, senal }: Opciones): Promise<Traduccion> {

  // El reloj empieza aquí y se rearma con cada trozo que llega: se tolera que
  // vaya lento, no que deje de venir.
  const espera = new Espera(senal)
  espera.marcar(ESPERAS.respuesta, 'llamando')

  let respuesta: Response
  try {
    respuesta = await fetch(`${RAIZ}/${MODELO}:streamGenerateContent?alt=sse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': clave },
      signal: espera.control.signal,
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: instruccion(idioma) }] },
        contents: [{ role: 'user', parts: [{ text: texto }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: ESQUEMA,
          temperature: 0.3,
          maxOutputTokens: 900,
        },
      }),
    })
  } catch (e) {
    espera.parar()
    if (espera.caducado) throw espera.suFallo()
    if (senal?.aborted) throw e
    throw new ErrorTraductor({ tipo: 'sin-red' })
  }

  if (!respuesta.ok) {
    espera.parar()
    throw new ErrorTraductor(interpretar(respuesta.status, await respuesta.text().catch(() => '')))
  }

  const lector = respuesta.body?.getReader()
  if (!lector) {
    espera.parar()
    throw new ErrorTraductor({ tipo: 'raro', detalle: 'sin cuerpo' })
  }

  const decodificador = new TextDecoder()
  let pendiente = ''
  let completo = ''
  let ultimoAsomo = ''

  try {
    while (true) {
      // Cada vuelta rearma la cuenta. Una respuesta larga puede tardar; lo que no
      // puede es quedarse callada.
      espera.marcar(ESPERAS.trozo, 'a-medias')
      const { done, value } = await lector.read()
      if (done) break
      pendiente += decodificador.decode(value, { stream: true })

      const lineas = pendiente.split('\n')
      pendiente = lineas.pop() ?? ''
      for (const linea of lineas) {
        if (!linea.startsWith('data:')) continue
        const carga = linea.slice(5).trim()
        if (!carga || carga === '[DONE]') continue
        try {
          const trozo = JSON.parse(carga)
          const t = trozo?.candidates?.[0]?.content?.parts?.[0]?.text
          if (typeof t === 'string') completo += t
        } catch {
          // Un trozo partido a la mitad: llegará entero en la siguiente vuelta.
        }
      }

      if (alAsomar) {
        const asomo = naturalAMedias(completo)
        if (asomo && asomo !== ultimoAsomo) {
          ultimoAsomo = asomo
          alAsomar(asomo)
        }
      }
    }
  } catch (e) {
    // Cortar el stream a medias hace que `read()` lance. Quién cortó decide qué
    // se cuenta: el reloj, quien cerró el panel, o la red que se cayó.
    if (espera.caducado) throw espera.suFallo()
    if (senal?.aborted) throw e
    throw new ErrorTraductor({ tipo: 'sin-red' })
  } finally {
    espera.parar()
  }

  try {
    const t = JSON.parse(completo) as Traduccion
    if (!t.natural) throw new Error('vacío')
    return t
  } catch {
    throw new ErrorTraductor({ tipo: 'raro', detalle: 'respuesta ilegible' })
  }
}

/**
 * Una traducción mínima para comprobar que la clave sirve, sin salir de los
 * ajustes. Vale más que cualquier validación de formato: Google ya cambió el
 * prefijo una vez —de `AIza` a `AQ.`— y cualquier comprobación que mire las
 * primeras letras se queda vieja sola.
 */
export async function probarClave(
  clave: string,
): Promise<{ ok: true; muestra: string; modelo: string } | { ok: false; fallo: Fallo }> {
  try {
    olvidarModelo()
    const r = await traducir({ clave, texto: 'good morning' })
    return { ok: true, muestra: r.natural, modelo: modeloEnUso() ?? '?' }
  } catch (e) {
    return { ok: false, fallo: e instanceof ErrorTraductor ? e.fallo : { tipo: 'raro', detalle: 'inesperado' } }
  }
}

export function explicar(f: Fallo): { titulo: string; detalle: string } {
  switch (f.tipo) {
    case 'sin-clave':
      return {
        titulo: 'Falta la clave de Gemini',
        detalle: 'Ponla en los ajustes y el traductor funciona. Es gratis y se pega una sola vez.',
      }
    case 'clave-mala':
      return {
        titulo: 'Esa clave no vale',
        detalle:
          'Suele ser una de tres: se copió a medias, es de un proyecto donde la API de Gemini ' +
          'no está activada, o tiene una restricción por dominio que no incluye esta dirección.',
      }
    case 'cuota':
      return {
        titulo: 'Se acabaron las traducciones de hoy',
        detalle: `Vuelven el ${f.vuelve}. El nivel gratuito da 1.000 al día y se renueva a medianoche del Pacífico.`,
      }
    case 'sin-red':
      return { titulo: 'Sin conexión', detalle: 'Leer sigue funcionando; traducir necesita internet.' }
    case 'ocupado':
      return { titulo: 'Gemini está saturado', detalle: 'No es cosa tuya. Inténtalo en un momento.' }
    case 'tardo':
      // Se dice dónde se cortó porque son dos averías distintas: no llegar a
      // conectar suele ser la red de aquí; quedarse a medias, la de allá.
      return f.donde === 'llamando'
        ? {
            titulo: 'No hubo respuesta',
            // El número sale de la constante y no escrito a mano: un mensaje
            // que dice «20 segundos» cuando el reloj espera treinta es una
            // mentira pequeña que nadie vuelve a revisar.
            detalle:
              `Se esperaron ${Math.round(ESPERAS.respuesta / 1000)} segundos y Google no contestó. ` +
              'Casi siempre es la conexión: prueba otra vez, y si sigue igual, con wifi.',
          }
        : {
            titulo: 'La traducción se quedó a medias',
            detalle:
              'Empezó a llegar y dejó de venir, casi siempre porque se cayó la conexión. ' +
              'Vuelve a darle a Traducir.',
          }
    default:
      return f.detalle === '404'
        ? {
            titulo: 'Ese modelo ya no existe',
            detalle: 'Vellum va a preguntarle a Google cuáles tiene tu clave y elegir otro.',
          }
        : { titulo: 'Algo salió mal', detalle: `El servidor respondió: ${f.detalle}.` }
  }
}
