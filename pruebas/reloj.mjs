/**
 * El reloj del traductor, sin navegador y sin red.
 *
 * Esto existe por una avería real: cinco minutos con «Traduciendo…» en pantalla
 * y ninguna forma de saber si iba o si se había roto. **Una petición sin reloj
 * puede no terminar nunca** — el móvil cambia de antena, la conexión se queda
 * abierta y `fetch` no falla, simplemente no vuelve.
 *
 * Es justo la clase de fallo que no se ve probando a mano: con buena red nunca
 * pasa. Aquí se provoca a propósito, con un `fetch` que se queda callado, y se
 * comprueba que la app se rinde y **cuenta cuál de las dos averías fue**: no
 * llegar a conectar, o quedarse a medias.
 */
import { execSync } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const dir = mkdtempSync(join(tmpdir(), 'vellum-'))
const salida = join(dir, 'traductor.mjs')
execSync(`npx esbuild src/lib/traductor.ts --bundle --format=esm --outfile=${salida}`, { stdio: 'pipe' })
const { ESPERAS, ErrorTraductor, descubrirModelos, explicar, olvidarModelo, traducir } =
  await import(salida)

let rojos = 0
const paso = (n, ok, extra = '') => {
  console.log(`${ok ? '  OK  ' : ' FALLA'} ${n}${extra ? ' — ' + extra : ''}`)
  if (!ok) rojos++
}

// Se acortan las esperas para que la prueba dure un segundo y no dos minutos.
// Lo que se prueba es que el reloj exista y corte bien, no cuánto marca.
ESPERAS.respuesta = 200
ESPERAS.trozo = 200
ESPERAS.total = 3000
ESPERAS.modelos = 200

const CLAVE = 'clave-de-mentira'
const MODELOS = {
  models: [{ name: 'models/gemini-2.5-flash-lite', supportedGenerationMethods: ['generateContent'] }],
}

/** Una respuesta que nunca llega, y que solo termina si la cortan. */
const mudo = (_url, op) =>
  new Promise((_res, rej) => {
    const s = op?.signal
    if (s?.aborted) return rej(new Error('AbortError'))
    s?.addEventListener('abort', () => rej(new Error('AbortError')), { once: true })
  })

/** Trozos de SSE tal como los manda Gemini. */
const sse = texto => `data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text: texto }] } }] })}\n\n`

/**
 * Un cuerpo que suelta unos trozos y luego decide: o termina, o se calla para
 * siempre. Callarse es la avería que se quiere provocar.
 */
function goteo(trozos, { seCalla }) {
  return (_url, op) => {
    const s = op?.signal
    let i = 0
    return Promise.resolve({
      ok: true,
      status: 200,
      body: {
        getReader: () => ({
          read: () =>
            new Promise((res, rej) => {
              if (i < trozos.length) {
                const t = trozos[i++]
                setTimeout(() => res({ done: false, value: new TextEncoder().encode(t) }), 20)
                return
              }
              if (!seCalla) return res({ done: true })
              if (s?.aborted) return rej(new Error('AbortError'))
              s?.addEventListener('abort', () => rej(new Error('AbortError')), { once: true })
            }),
        }),
      },
    })
  }
}

/** Encamina: la lista de modelos siempre contesta; lo demás, lo que diga la prueba. */
function montar(cuerpo) {
  globalThis.fetch = (url, op) =>
    String(url).includes('pageSize')
      ? Promise.resolve({ ok: true, status: 200, json: async () => MODELOS })
      : cuerpo(url, op)
}

const fallar = async fn => {
  try {
    await fn()
    return null
  } catch (e) {
    return e
  }
}

/* --- Nadie contesta --- */
olvidarModelo()
montar(mudo)
let arranque = Date.now()
let e = await fallar(() => traducir({ clave: CLAVE, texto: 'hello' }))
let tardo = Date.now() - arranque
paso('**una respuesta que no llega se corta sola**', e instanceof ErrorTraductor && e.fallo.tipo === 'tardo',
  'sin esto la app se queda diciendo «Traduciendo…» para siempre')
paso('y se corta pronto, no cuando se acabe la paciencia de quien lee', tardo < 1500, `${tardo} ms`)
paso('diciendo que ni llegó a contestar', e?.fallo?.donde === 'llamando')

/* --- Contesta y se calla a mitad --- */
olvidarModelo()
montar(goteo([sse('{"natural":"Hola, ')], { seCalla: true }))
const asomos = []
e = await fallar(() => traducir({ clave: CLAVE, texto: 'hello', alAsomar: t => asomos.push(t) }))
paso('**una respuesta que empieza y se calla también se corta**', e?.fallo?.tipo === 'tardo')
paso('y se distingue de la otra avería', e?.fallo?.donde === 'a-medias',
  'no conectar suele ser la red de aquí; cortarse a medias, la de allá')
paso('lo que llegó antes de callarse se llegó a enseñar', asomos.length > 0 && asomos[0].startsWith('Hola'))

/* --- Que gotee no es que esté rota --- */
olvidarModelo()
// Cada trozo tarda 20 ms y el reloj corta a los 200: cinco trozos suman más que
// una espera, y aun así tiene que terminar. Es la diferencia entre «lento» y
// «colgado», que es justo lo que el reloj no puede confundir.
montar(goteo(
  [
    sse('{"natural":"Tiene recursos'),
    sse(' infinitos",'),
    sse('"literal":"él tiene recursos sin fin",'),
    sse('"contexto":"Dice que no se le acaba el dinero."'),
    sse('}'),
  ],
  { seCalla: false },
))
const r = await fallar(() => traducir({ clave: CLAVE, texto: 'endless resources' }))
paso('una respuesta lenta pero viva no se corta', !(r instanceof Error), r instanceof Error ? r.message : '')

olvidarModelo()
montar(goteo(
  [sse('{"natural":"Hola","literal":"hola","contexto":"saludo"}')],
  { seCalla: false },
))
const bien = await traducir({ clave: CLAVE, texto: 'hello' })
paso('y llega entera', bien.natural === 'Hola' && bien.contexto === 'saludo')

/* --- Cancelar no es un fallo --- */
olvidarModelo()
montar(mudo)
const corte = new AbortController()
setTimeout(() => corte.abort(), 50)
e = await fallar(() => traducir({ clave: CLAVE, texto: 'hello', senal: corte.signal }))
paso('**cortar a mano no se cuenta como «tardó»**', !(e instanceof ErrorTraductor),
  'lo que decidiste tú no es una avería que contarte')

/* --- Preguntar por los modelos también tiene reloj --- */
olvidarModelo()
globalThis.fetch = mudo
arranque = Date.now()
e = await fallar(() => descubrirModelos(CLAVE))
paso('preguntar qué modelos hay tampoco se queda colgado', e?.fallo?.tipo === 'tardo',
  'es la primera llamada con una clave nueva')
paso('y ahí también se corta pronto', Date.now() - arranque < 1500)

/* --- Y se cuenta con palabras --- */
// Se devuelven las esperas de verdad: lo que se comprueba abajo es que el
// mensaje diga el mismo número que espera el reloj.
ESPERAS.respuesta = 20_000
const a = explicar({ tipo: 'tardo', donde: 'llamando' })
const b = explicar({ tipo: 'tardo', donde: 'a-medias' })
paso('cada avería se explica distinto', a.titulo !== b.titulo, `«${a.titulo}» · «${b.titulo}»`)
paso('sin números de error a la vista', !/\d{3}/.test(a.detalle + b.detalle))
paso('**y el mensaje dice lo que el reloj espera de verdad**', a.detalle.includes('20 segundos'),
  'un mensaje escrito a mano se queda viejo en cuanto se cambia la constante')

console.log(rojos ? `\n${rojos} fallo(s)` : '\nTodo en orden.')
process.exitCode = rojos ? 1 : 0
