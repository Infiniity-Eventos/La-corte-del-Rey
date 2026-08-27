import { chromium } from 'playwright'

/**
 * Un cómic de verdad mezcla páginas verticales con dobles páginas horizontales.
 * Durante el volteo hay dos en pantalla a la vez, y si comparten una sola
 * medida, la que no encaja se estira dentro del marco de la otra: eso es la
 * página «achatada» que salió en el uso real.
 */

const SC = process.env.SC ?? '/tmp'
const errores = []
const paso = (n, ok, extra = '') => {
  console.log(`${ok ? '  OK  ' : ' FALLA'} ${n}${extra ? ' — ' + extra : ''}`)
  if (!ok) process.exitCode = 1
}

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
const ctx = await browser.newContext({ viewport: { width: 412, height: 892 }, deviceScaleFactor: 2, hasTouch: true })
const page = await ctx.newPage()
page.on('pageerror', e => errores.push(`pageerror: ${e.message}`))
page.on('console', m => { if (m.type() === 'error') errores.push(`console: ${m.text()}`) })

/**
 * La página dibujada contra el hueco que la contiene. Si no coinciden, el
 * navegador la está estirando.
 *
 * Se mide `.pagina` y no `.hoja`: la hoja es la tarjeta de papel, siempre del
 * mismo tamaño, y la página va centrada encima.
 */
const proporciones = () =>
  page.evaluate(() =>
    [...document.querySelectorAll('.hoja')]
      .filter(h => h.offsetParent !== null && h.querySelector('canvas'))
      .map(h => {
        const c = h.querySelector('canvas')
        const p = h.querySelector('.pagina')
        // offsetWidth y no getBoundingClientRect: una hoja girando aparece
        // escorzada y su rectángulo proyectado no dice nada de su forma real.
        return {
          hoja: p.offsetWidth / p.offsetHeight,
          lienzo: c.width / c.height,
          ancho: p.offsetWidth,
          papel: h.offsetWidth + 'x' + h.offsetHeight,
        }
      }))

await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' })
await page.waitForSelector('.vacio')
await page.setInputFiles('input[type=file]', `${SC}/Comic_doble_pagina.pdf`)
await page.waitForSelector('.ficha', { timeout: 25000 })
await page.click('.ficha-pie .btn:last-child')
await page.waitForSelector('.rejilla .libro', { timeout: 15000 })
await page.click('.rejilla .libro .libro-abrir')
await page.waitForSelector('.hoja.debajo canvas', { timeout: 30000 })
await page.waitForTimeout(600)

const p1 = (await proporciones())[0]
paso('la página vertical se dibuja sin deformar',
  Math.abs(p1.hoja - p1.lienzo) < 0.02, `caja ${p1.hoja.toFixed(2)} · lienzo ${p1.lienzo.toFixed(2)}`)
paso('y es más alta que ancha', p1.hoja < 1, p1.hoja.toFixed(2))

// A mitad del volteo conviven las dos, cada una con su forma
const caja = await page.locator('.escena').boundingBox()
const y = caja.y + caja.height / 2
await page.mouse.move(caja.x + caja.width * 0.88, y)
await page.mouse.down()
for (let i = 1; i <= 6; i++) { await page.mouse.move(caja.x + caja.width * (0.88 - 0.36 * (i / 6)), y); await page.waitForTimeout(16) }
await page.waitForTimeout(120)

const durante = await proporciones()
paso('durante el volteo hay dos hojas en pantalla', durante.length === 2, `${durante.length}`)
const deformada = durante.find(h => Math.abs(h.hoja - h.lienzo) >= 0.02)
paso('ninguna de las dos se deforma', !deformada,
  durante.map(h => `${h.hoja.toFixed(2)} vs ${h.lienzo.toFixed(2)}`).join(' · '))
paso('tienen formas distintas, como en el cómic',
  Math.abs(durante[0].hoja - durante[1].hoja) > 0.5,
  durante.map(h => h.hoja.toFixed(2)).join(' y '))

// Lo que impide que se vea la página de detrás asomando por los lados.
paso('las dos hojas de papel miden lo mismo',
  durante[0].papel === durante[1].papel, durante.map(h => h.papel).join(' y '))

const relleno = await page.evaluate(() => {
  const papel = document.querySelector('.hoja.movil .papel')
  if (!papel) return null
  // El fondo de lectura lo pone el lector, no la escena.
  const lector = document.querySelector('.lector')
  return {
    papel: getComputedStyle(papel).backgroundColor,
    fondo: getComputedStyle(lector).backgroundColor,
  }
})
// Opaco y del color del fondo: no se ve la hoja, pero sí tapa a la de detrás.
paso('el papel sobrante toma el color del fondo',
  relleno && relleno.papel === relleno.fondo && !/rgba\(0, 0, 0, 0\)/.test(relleno.papel),
  relleno && relleno.papel)

// Se completa el volteo: por debajo del umbral la página vuelve y seguiríamos
// mirando la misma.
for (let i = 1; i <= 6; i++) { await page.mouse.move(caja.x + caja.width * (0.52 - 0.44 * (i / 6)), y); await page.waitForTimeout(16) }
await page.mouse.up()
await page.waitForTimeout(1200)

const p2 = (await proporciones())[0]
paso('la doble página se dibuja sin deformar',
  Math.abs(p2.hoja - p2.lienzo) < 0.02, `caja ${p2.hoja.toFixed(2)} · lienzo ${p2.lienzo.toFixed(2)}`)
paso('y es más ancha que alta', p2.hoja > 1, p2.hoja.toFixed(2))
paso('aprovecha el ancho de la pantalla', p2.ancho > caja.width * 0.9, `${p2.ancho}px de ${Math.round(caja.width)}`)

/* --- El zoom con doble toque --- */
const marco = () => page.evaluate(() => {
  const m = document.querySelector('.marco')
  const cs = getComputedStyle(m)
  return { transform: cs.transform, escala: Number((cs.transform.match(/matrix\(([\d.]+)/) || [0, 1])[1]) }
})
paso('sin doble toque no hay zoom', (await marco()).escala === 1)

const c2 = await page.locator('.escena').boundingBox()
const punto = { x: c2.x + c2.width * 0.28, y: c2.y + c2.height * 0.32 }
await page.mouse.click(punto.x, punto.y)
await page.mouse.click(punto.x, punto.y, { delay: 30 })
await page.waitForTimeout(500)
const conZoom = await marco()
paso('el doble toque acerca la página', conZoom.escala > 2, `×${conZoom.escala.toFixed(1)}`)

// Lo tocado tiene que acabar cerca del centro, no en otro sitio.
const centrado = await page.evaluate(({ px, py, s }) => {
  const m = document.querySelector('.marco')
  const t = new DOMMatrix(getComputedStyle(m).transform)
  const r = document.querySelector('.escena').getBoundingClientRect()
  const dondeQueda = { x: t.e + px * s, y: t.f + py * s }
  return { dx: Math.abs(dondeQueda.x - r.width / 2), dy: Math.abs(dondeQueda.y - r.height / 2) }
}, { px: punto.x - c2.x, py: punto.y - c2.y, s: conZoom.escala })
paso('y centra lo que tocaste', centrado.dx < 60 && centrado.dy < 60,
  `a ${Math.round(centrado.dx)}px y ${Math.round(centrado.dy)}px del centro`)

// Arrastrar acercado mueve la vista en vez de pasar página
const antesDePasear = (await marco()).transform
const yy = c2.y + c2.height / 2
await page.mouse.move(c2.x + c2.width * 0.7, yy)
await page.mouse.down()
for (let i = 1; i <= 6; i++) { await page.mouse.move(c2.x + c2.width * (0.7 - 0.4 * (i / 6)), yy); await page.waitForTimeout(16) }
await page.mouse.up()
await page.waitForTimeout(400)
paso('arrastrar acercado mueve la vista', (await marco()).transform !== antesDePasear)
paso('y no pasa de página', (await page.textContent('.folio')).trim() === '2 / 6',
  (await page.textContent('.folio')).trim())

/* --- Con el teclado abierto, la página no se mueve --- */
// No se puede abrir un teclado de verdad, pero lo que hace es esto: encoger la
// ventana. Con el campo del traductor en uso, encogerla no debe mover nada.
const hoja = () => page.evaluate(() => {
  const r = document.querySelector('.hoja.debajo').getBoundingClientRect()
  return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }
})
const lienzoDe = () => page.evaluate(() => {
  const c = document.querySelector('.hoja.debajo canvas')
  return c ? `${c.width}x${c.height}` : 'sin lienzo'
})

const medidaOriginal = page.viewportSize()
const antesTransform = (await marco()).transform
const antesHoja = await hoja()
const antesLienzo = await lienzoDe()

await page.focus('.barra-burbuja textarea')
await page.waitForTimeout(250)
await page.setViewportSize({ width: medidaOriginal.width, height: medidaOriginal.height - 380 })
await page.waitForTimeout(700)

paso('con el teclado abierto el zoom no se mueve', (await marco()).transform === antesTransform,
  (await marco()).transform === antesTransform ? 'igual' : `${antesTransform} → ${(await marco()).transform}`)
const ahoraHoja = await hoja()
paso('ni la página cambia de sitio ni de tamaño',
  JSON.stringify(ahoraHoja) === JSON.stringify(antesHoja),
  `${JSON.stringify(antesHoja)} → ${JSON.stringify(ahoraHoja)}`)
paso('y no se vuelve a dibujar', (await lienzoDe()) === antesLienzo,
  `${antesLienzo} → ${await lienzoDe()}`)

// Al cerrarse el teclado vuelve a medir, por si algo cambió de verdad.
await page.evaluate(() => document.querySelector('.barra-burbuja textarea').blur())
await page.setViewportSize(medidaOriginal)
await page.waitForTimeout(900)
paso('al cerrarse, la página vuelve a ocupar lo suyo',
  JSON.stringify(await hoja()) === JSON.stringify(antesHoja),
  JSON.stringify(await hoja()))

// Y si el tamaño cambia de verdad mientras estaba congelada, se entera al soltar.
await page.focus('.barra-burbuja textarea')
await page.waitForTimeout(250)
await page.setViewportSize({ width: medidaOriginal.width - 120, height: medidaOriginal.height })
await page.waitForTimeout(700)
paso('un cambio de verdad tampoco mueve nada mientras escribes',
  JSON.stringify(await hoja()) === JSON.stringify(antesHoja))
await page.evaluate(() => document.querySelector('.barra-burbuja textarea').blur())
await page.waitForTimeout(900)
paso('pero al soltar el campo sí se entera',
  JSON.stringify(await hoja()) !== JSON.stringify(antesHoja),
  JSON.stringify(await hoja()))
await page.setViewportSize(medidaOriginal)
await page.waitForTimeout(800)

await page.mouse.click(punto.x, punto.y)
await page.mouse.click(punto.x, punto.y, { delay: 30 })
await page.waitForTimeout(500)
paso('otro doble toque la devuelve a su sitio', (await marco()).escala === 1)

await page.screenshot({ path: `${SC}/comic-doble.png` })
console.log(errores.length ? `\nErrores de consola:\n${errores.join('\n')}` : '\nSin errores de consola.')
await browser.close()
