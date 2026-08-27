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

// Proporción real del dibujo contra la caja que lo contiene. Si no coinciden,
// el navegador lo está estirando.
const proporciones = () =>
  page.evaluate(() =>
    [...document.querySelectorAll('.hoja')]
      .filter(h => h.offsetParent !== null && h.querySelector('canvas'))
      .map(h => {
        const c = h.querySelector('canvas')
        // offsetWidth y no getBoundingClientRect: una hoja girando aparece
        // escorzada y su rectángulo proyectado no dice nada de su forma real.
        return {
          hoja: h.offsetWidth / h.offsetHeight,
          lienzo: c.width / c.height,
          ancho: h.offsetWidth,
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

await page.screenshot({ path: `${SC}/comic-doble.png` })
console.log(errores.length ? `\nErrores de consola:\n${errores.join('\n')}` : '\nSin errores de consola.')
await browser.close()
