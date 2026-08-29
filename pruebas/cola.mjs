/**
 * La cola del traductor: mandar varias y seguir leyendo.
 *
 * Viene de un uso real: una traducción tardó medio minuto, y durante ese medio
 * minuto no se podía hacer nada — ni mandar otra, ni seguir leyendo sin el
 * panel tapando la página. **Traducir no puede parar la lectura.**
 *
 * Aquí Google no contesta hasta que la prueba lo dice. Eso es lo que permite
 * comprobar lo que de otro modo sería cuestión de suerte: que la segunda espera
 * a la primera de verdad, que cerrar el panel no mata lo que va por detrás, y
 * que lo que llega mientras lees **avisa en vez de interrumpir**.
 */
import { chromium } from 'playwright'
import { exigirCompilacionAlDia } from './fresco.mjs'

const SC = process.env.SC ?? '/tmp'
const errores = []
const paso = (n, ok, extra = '') => {
  console.log(`${ok ? '  OK  ' : ' FALLA'} ${n}${extra ? ' — ' + extra : ''}`)
  if (!ok) process.exitCode = 1
}

exigirCompilacionAlDia()

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
const ctx = await browser.newContext({ viewport: { width: 412, height: 900 }, deviceScaleFactor: 2, hasTouch: true })

// Gemini de mentira, y con el freno de mano puesto: cada petición se queda
// esperando hasta que la prueba la suelta a mano.
await ctx.addInitScript(() => {
  const real = window.fetch.bind(window)
  window.__pendientes = []
  window.fetch = async (entrada, opciones) => {
    const url = typeof entrada === 'string' ? entrada : entrada.url
    if (!url.includes('generativelanguage.googleapis.com')) return real(entrada, opciones)

    if (url.includes('/models?')) {
      return new Response(JSON.stringify({
        models: [{ name: 'models/gemini-2.5-flash-lite', supportedGenerationMethods: ['generateContent'] }],
      }), { status: 200 })
    }

    return new Promise(resolver => {
      window.__pendientes.push(natural => {
        const json = JSON.stringify({ natural, literal: natural, contexto: 'Lo que quiere decir.' })
        const trama = { candidates: [{ content: { parts: [{ text: json }] } }] }
        const cuerpo = new ReadableStream({
          start(c) {
            c.enqueue(new TextEncoder().encode('data: ' + JSON.stringify(trama) + '\n\n'))
            c.close()
          },
        })
        resolver(new Response(cuerpo, { status: 200, headers: { 'Content-Type': 'text/event-stream' } }))
      })
    })
  }
})

const page = await ctx.newPage()
page.on('pageerror', e => errores.push(`pageerror: ${e.message}`))
page.on('console', m => { if (m.type() === 'error') errores.push(`console: ${m.text()}`) })

/** Cuántas peticiones están esperando respuesta ahora mismo. */
const enVuelo = () => page.evaluate(() => window.__pendientes.length)
/** Contestar la más antigua. */
const contestar = async natural => {
  await page.evaluate(t => window.__pendientes.shift()(t), natural)
  await page.waitForTimeout(700)
}
const pedir = async texto => {
  await page.fill('.barra-burbuja textarea', texto)
  await page.click('.barra-burbuja .btn')
  await page.waitForTimeout(500)
}
const folio = async () => (await page.textContent('.folio')).trim()

await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' })
await page.waitForSelector('.vacio')
await page.setInputFiles('input[type=file]', `${SC}/Cronica_de_una_prueba.pdf`)
await page.waitForSelector('.ficha', { timeout: 25000 })
await page.fill('.campo input[placeholder="Cómo se llama"]', 'Crónica de una prueba')
await page.click('.ficha-pie .btn:last-child')
await page.waitForSelector('.rejilla .libro', { timeout: 10000 })

// La clave, por donde se pone de verdad.
await page.click('.biblio-top .icono:has-text("Ajustes")')
await page.waitForSelector('.campo-fila input')
await page.fill('.campo-fila input', 'AQ.Ab8FalsaParaLaPrueba123')
await page.click('.fila-botones .btn:text-is("Guardar")')
await page.waitForTimeout(400)
await page.click('.icono.volver')
await page.waitForSelector('.rejilla .libro')

await page.click('.rejilla .libro:first-child .libro-abrir')
await page.waitForSelector('.hoja.debajo canvas', { timeout: 25000 })

/* --- Mandar dos --- */
await pedir('endless resources')
paso('la primera sale enseguida', (await enVuelo()) === 1)
paso('y se ve que está en marcha', (await page.textContent('.panel-natural')).trim() === 'Traduciendo…')

/* --- Y seguir leyendo mientras va --- */
await page.click('.panel-top .icono')
await page.waitForTimeout(400)
paso('cerrar el panel no cancela nada', (await page.locator('.aviso-cola.trabajando').count()) === 1)
paso('y se ve cuánto lleva', /^\d+ s$/.test((await page.textContent('.aviso-cola .espera-reloj')).trim()))

const antes = await folio()
await page.evaluate(() => document.activeElement?.blur?.())
await page.keyboard.press('ArrowRight')
await page.waitForTimeout(900)
paso('**y se sigue leyendo mientras traduce**', (await folio()) !== antes,
  `${antes} → ${await folio()}`)

/* --- Y mandar otra desde la página nueva --- */
await pedir('too big to fight')
paso('**se puede mandar otra sin esperar a la primera**', (await page.locator('.panel-src').count()) === 1,
  'era lo pedido: no quedarse parado mirando')
paso('**pero solo una habla con Google a la vez**', (await enVuelo()) === 1,
  'cada una espera a la anterior; el nivel gratuito limita por minuto')
paso('y se dice cuántas hay', (await page.textContent('.barra-burbuja .btn')).includes('2'))
await page.click('.panel-top .icono')
await page.waitForTimeout(300)
// La tira de «va por detrás» solo sale con el panel cerrado: con el panel
// abierto ya estás mirando la cola, y repetirla sería decir dos veces lo mismo.
paso('la tira dice cuántas quedan detrás', (await page.textContent('.aviso-cola .cola-cuenta')).trim() === '+1')

/* --- Lo que llega avisa, no interrumpe --- */
await contestar('Tiene recursos infinitos.')
paso('**lo que termina avisa sin abrir nada**', (await page.locator('.panel').count()) === 0,
  'abrirse solo encima de la página es justo lo que rompe la lectura')
paso('y el aviso dice cuál es', (await page.textContent('.aviso-cola')).includes('endless resources'))
paso('**y entonces arranca la siguiente**', (await enVuelo()) === 1,
  'la cola avanza sola, sin tener que volver a pedirla')

await page.click('.aviso-cola:has-text("endless") .icono:has-text("Ver")')
await page.waitForSelector('.panel-natural', { timeout: 8000 })
paso('«Ver» abre la traducción', (await page.textContent('.panel-natural')).includes('recursos infinitos'))
paso('y con lo demás en sus pestañas', (await page.locator('.solapa').count()) >= 2)
await page.waitForSelector('.guardar-voc:not(.tenue)', { timeout: 8000 })
paso('**se guardó en la página donde la pediste**, no en la que estás',
  (await page.textContent('.guardar-voc')).includes('página 1'),
  `${await page.textContent('.guardar-voc')} · estás en ${await folio()}`)

await page.click('.panel-top .icono')
await page.waitForTimeout(300)
paso('cerrar una ya vista la retira del montón', (await page.locator('.aviso-cola:has-text("endless")').count()) === 0)

/* --- La segunda, igual --- */
await contestar('Es demasiado grande para pelear.')
paso('la segunda también avisa al terminar',
  (await page.textContent('.aviso-cola')).includes('too big to fight'))
paso('y ya no queda nada hablando con Google', (await enVuelo()) === 0)

/* --- Las dos quedan en el vocabulario, cada una en su sitio --- */
await page.click('.chrome.arriba .icono.volver').catch(() => {})
await page.evaluate(() => document.activeElement?.blur?.())
await page.click('.escena', { position: { x: 206, y: 450 } })
await page.waitForTimeout(400)
await page.click('.chrome.arriba .icono.volver')
await page.waitForSelector('.rejilla .libro', { timeout: 10000 })
await page.click('.biblio-top .icono:has-text("Vocabulario")')
await page.waitForSelector('.voc-fila', { timeout: 8000 })
paso('las dos quedan guardadas', (await page.locator('.voc-fila').count()) === 2)
const deLaUna = await page.textContent('.voc-fila:has(.voc-en:text-is("endless resources")) .voc-de')
const deLaOtra = await page.textContent('.voc-fila:has(.voc-en:text-is("too big to fight")) .voc-de')
paso('**cada una en la página desde la que se pidió**',
  deLaUna.includes('pág. 1') && deLaOtra.includes('pág. 2'),
  `${deLaUna.trim()} · ${deLaOtra.trim()}`)

paso('sin errores en la consola', errores.length === 0, errores.join(' · '))

await browser.close()
console.log(process.exitCode ? '\nHay fallos.' : '\nTodo en orden.')
