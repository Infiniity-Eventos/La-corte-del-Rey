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

const MODELO = 'gemini-2.5-flash-lite'
const RAIZ = 'https://generativelanguage.googleapis.com/v1beta/models'

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

export type Fallo =
  | { tipo: 'sin-clave' }
  | { tipo: 'clave-mala' }
  | { tipo: 'cuota'; vuelve: string }
  | { tipo: 'sin-red' }
  | { tipo: 'ocupado' }
  | { tipo: 'raro'; detalle: string }

export class ErrorTraductor extends Error {
  constructor(readonly fallo: Fallo) {
    super(fallo.tipo)
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

const INSTRUCCION = `Eres el traductor de una app de lectura. Traduces del inglés al español.

Devuelves siempre:
- natural: cómo lo diría un hispanohablante. Es lo más importante y lo que se lee primero. Sin rodeos, sin explicar, solo la frase.
- literal: la traducción palabra por palabra, aunque suene rara. Sirve para ver cómo está construido el original.
- contexto: en una o dos frases, qué quiere decir de verdad y qué tono tiene. Nada de lecciones de gramática.

Además, solo cuando corresponda:
- aviso: si es un modismo, un juego de palabras, una referencia cultural o algo que no traduce directo, dilo en una frase.
- palabra: solo si lo que te mandan es UNA sola palabra. Incluye pronunciación aproximada escrita para un hispanohablante (no alfabeto fonético), el significado, una frase de ejemplo en inglés y su traducción.

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
  /** Se llama con la traducción natural en cuanto asoma, antes del resto. */
  alAsomar?: (natural: string) => void
  senal?: AbortSignal
}

export async function traducir({ clave, texto, alAsomar, senal }: Opciones): Promise<Traduccion> {
  if (!clave) throw new ErrorTraductor({ tipo: 'sin-clave' })

  let respuesta: Response
  try {
    respuesta = await fetch(`${RAIZ}/${MODELO}:streamGenerateContent?alt=sse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': clave },
      signal: senal,
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: INSTRUCCION }] },
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
    if (senal?.aborted) throw e
    throw new ErrorTraductor({ tipo: 'sin-red' })
  }

  if (!respuesta.ok) {
    throw new ErrorTraductor(interpretar(respuesta.status, await respuesta.text().catch(() => '')))
  }

  const lector = respuesta.body?.getReader()
  if (!lector) throw new ErrorTraductor({ tipo: 'raro', detalle: 'sin cuerpo' })

  const decodificador = new TextDecoder()
  let pendiente = ''
  let completo = ''
  let ultimoAsomo = ''

  while (true) {
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
export async function probarClave(clave: string): Promise<{ ok: true; muestra: string } | { ok: false; fallo: Fallo }> {
  try {
    const r = await traducir({ clave, texto: 'good morning' })
    return { ok: true, muestra: r.natural }
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
    default:
      return { titulo: 'Algo salió mal', detalle: `El servidor respondió ${f.detalle}.` }
  }
}
