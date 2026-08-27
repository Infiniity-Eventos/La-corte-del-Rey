import { chromium } from 'playwright'
import { exigirCompilacionAlDia } from './fresco.mjs'

/**
 * El botón de atrás del teléfono.
 *
 * Lo que se comprueba no es que cierre algo: es que cierre **una cosa cada vez,
 * de dentro hacia fuera, y que no se salte ninguna**. Y sobre todo, que cerrar
 * algo con su propio botón no deje una entrada de historial huérfana: eso no
 * rompe nada visible, pero luego hay que pulsar atrás tres veces para que pase
 * algo, y nadie sabría por qué.
 */

const SC = process.env.SC ?? '/tmp'
const errores = []
const paso = (n, ok, extra = '') => {
  console.log(`${ok ? '  OK  ' : ' FALLA'} ${n}${extra ? ' — ' + extra : ''}`)
  if (!ok) process.exitCode = 1
}

exigirCompilacionAlDia()

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
const ctx = await browser.newContext({ viewport: { width: 412, height: 900 }, deviceScaleFactor: 2, hasTouch: true })
await ctx.addInitScript(() => {
  const real = window.fetch.bind(window)
  window.fetch = async (e, o) => {
    const url = typeof e === 'string' ? e : e.url
    if (!url.includes('generativelanguage')) return real(e, o)
    if (url.includes('/models?')) {
      return new Response(JSON.stringify({
        models: [{ name: 'models/gemini-3.7-flash-lite', supportedGenerationMethods: ['generateContent'] }],
      }), { status: 200 })
    }
    const json = JSON.stringify({
      natural: 'Estaba loquito de la dicha.',
      literal: 'Estaba sobre la luna.',
      contexto: 'Alegría enorme.',
    })
    return new Response(new ReadableStream({
      start(c) {
        c.enqueue(new TextEncoder().encode('data: ' + JSON.stringify({ candidates: [{ content: { parts: [{ text: json }] } }] }) + '\n\n'))
        c.close()
      },
    }), { status: 200, headers: { 'Content-Type': 'text/event-stream' } })
  }
})
const page = await ctx.newPage()
page.on('pageerror', e => errores.push(`pageerror: ${e.message}`))
page.on('console', m => { if (m.type() === 'error') errores.push(`console: ${m.text()}`) })

const atras = async () => { await page.goBack(); await page.waitForTimeout(450) }
const hay = sel => page.locator(sel).count()

await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' })
await page.waitForSelector('.vacio')
await page.setInputFiles('input[type=file]', `${SC}/Cronica_de_una_prueba.pdf`)
await page.waitForSelector('.ficha', { timeout: 25000 })
await page.fill('.campo input[placeholder="Cómo se llama"]', 'Crónica de una prueba')
await page.click('.ficha-pie .btn:last-child')
await page.waitForSelector('.rejilla .libro', { timeout: 15000 })

/* --- La ficha --- */
await page.click('.rejilla .libro .mas')
await page.waitForSelector('.ficha')
await atras()
paso('atrás cierra la ficha', (await hay('.ficha')) === 0)
paso('y no saca de la app', (await hay('.rejilla')) === 1)

/* --- Los ajustes y el vocabulario --- */
await page.click('.biblio-top .icono:has-text("Ajustes")')
await page.waitForSelector('.titulo-pantalla')
await page.fill('.campo-fila input', 'AQ.AbFalsaParaLaPrueba')
await page.click('.fila-botones .btn:text-is("Guardar")')
await page.waitForTimeout(300)
await atras()
paso('atrás vuelve de los ajustes a la biblioteca', (await hay('.rejilla')) === 1)

/* --- El libro --- */
await page.click('.rejilla .libro .libro-abrir')
await page.waitForSelector('.hoja.debajo canvas', { timeout: 30000 })
await atras()
paso('atrás cierra el libro y vuelve a la biblioteca', (await hay('.rejilla')) === 1,
  (await hay('.lector')) === 0 ? 'el lector se fue' : 'el lector sigue ahí')

/* --- Las capas de dentro, una a una --- */
await page.click('.rejilla .libro .libro-abrir')
await page.waitForSelector('.hoja.debajo canvas', { timeout: 30000 })

// 1. Acercar
const escena = await page.locator('.escena').boundingBox()
const p = { x: escena.x + escena.width * 0.3, y: escena.y + escena.height * 0.35 }
await page.mouse.click(p.x, p.y)
await page.mouse.click(p.x, p.y, { delay: 30 })
await page.waitForTimeout(500)
paso('la página está acercada', (await hay('.escena.lupa')) === 1)

// 2. Traducir, encima del acercamiento
await page.fill('.barra-burbuja textarea', 'he was over the moon about it')
await page.click('.barra-burbuja .btn')
await page.waitForSelector('.guardada .icono', { timeout: 15000 })
paso('y encima está el traductor', (await hay('.panel-traduccion, .panel-natural')) > 0)

await atras()
paso('el primer atrás cierra el traductor', (await hay('.panel-natural')) === 0)
paso('y deja el acercamiento donde estaba', (await hay('.escena.lupa')) === 1,
  'no se saltó una capa')

// 3. Y encima del acercamiento, las notas de la página
await page.click('.marca-notas')
await page.waitForSelector('.notas', { timeout: 5000 })
await atras()
paso('atrás cierra las notas de la página', (await hay('.notas')) === 0)
paso('sin tocar el acercamiento', (await hay('.escena.lupa')) === 1)

await atras()
paso('el siguiente atrás quita el acercamiento', (await hay('.escena.lupa')) === 0)
paso('y sigues en el libro', (await hay('.lector')) === 1)

// 4. El modo de seleccionar texto también es una capa
await page.click('.escena', { position: { x: 200, y: 300 } })
await page.waitForTimeout(300)
await page.click('.chrome.abajo .icono:has-text("Seleccionar")')
await page.waitForTimeout(300)
paso('el modo selección está puesto', (await hay('.escena.seleccionando')) === 1)
await atras()
paso('atrás sale del modo selección, no del libro',
  (await hay('.escena.seleccionando')) === 0 && (await hay('.lector')) === 1)

await atras()
paso('y el último atrás vuelve a la biblioteca', (await hay('.rejilla')) === 1)

/* --- Cerrar a mano no deja basura en el historial --- */
// Es el fallo que no se ve: si cerrar con el botón propio no quita su entrada,
// atrás se queda deshaciendo cosas que ya no están.
await page.click('.rejilla .libro .libro-abrir')
await page.waitForSelector('.hoja.debajo canvas', { timeout: 30000 })
await page.mouse.click(p.x, p.y)
await page.mouse.click(p.x, p.y, { delay: 30 })
await page.waitForTimeout(500)
await page.mouse.click(p.x, p.y)
await page.mouse.click(p.x, p.y, { delay: 30 })
await page.waitForTimeout(600)
paso('quitar el acercamiento con doble toque', (await hay('.escena.lupa')) === 0)
await atras()
paso('y entonces un solo atrás sale del libro', (await hay('.rejilla')) === 1,
  (await hay('.lector')) === 1 ? 'se quedó en el lector: hay entradas de más' : 'salió a la primera')

/* --- Sin nada abierto, atrás no tiene nada que deshacer --- */
// Cada capa deja su marca en el estado del historial. Si en la biblioteca, con
// todo cerrado, sigue habiendo una, es que algo no se limpió: el siguiente
// atrás no saldría de la app, se comería una entrada fantasma.
const marca = await page.evaluate(() => window.history.state?.vellum ?? null)
paso('en la biblioteca no queda ninguna capa apilada', marca === null,
  marca === null ? 'historial limpio' : `queda la capa ${marca}`)

await page.screenshot({ path: `${SC}/atras-final.png` })
console.log(errores.length ? `\nErrores de consola:\n${errores.join('\n')}` : '\nSin errores de consola.')
await browser.close()
