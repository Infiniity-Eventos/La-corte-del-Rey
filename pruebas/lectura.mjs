import { chromium } from 'playwright'

const SC = process.env.SC ?? '/tmp'
const PDF = `${SC}/Prueba_de_Lectura.pdf`
const errores = []

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
const ctx = await browser.newContext({ viewport: { width: 412, height: 900 }, deviceScaleFactor: 2, hasTouch: true })
const page = await ctx.newPage()
page.on('pageerror', e => errores.push(`pageerror: ${e.message}`))
page.on('console', m => { if (m.type() === 'error') errores.push(`console: ${m.text()}`) })

const paso = (n, ok, extra = '') => console.log(`${ok ? '  OK  ' : ' FALLA'} ${n}${extra ? ' — ' + extra : ''}`)

await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' })

// 1. La biblioteca vacía
await page.waitForSelector('.vacio', { timeout: 8000 })
paso('la biblioteca vacía aparece', true)

// 2. Importar. Al traer uno solo, la ficha se abre sola (P42); se cierra sin tocar nada.
await page.setInputFiles('input[type=file]', PDF)
await page.waitForSelector('.ficha', { timeout: 20000 })
await page.keyboard.press('Escape')
await page.waitForSelector('.rejilla .libro', { timeout: 20000 })
const titulo = await page.textContent('.rejilla .libro .portada-tit')
paso('importa el PDF', true, `título: "${titulo}"`)
paso('limpia el nombre del archivo', titulo === 'Prueba de Lectura', `esperado "Prueba de Lectura"`)

const paginas = await page.textContent('.rejilla .libro .libro-sub')
paso('cuenta las páginas', paginas.trim() === '6 pág.', `dice "${paginas.trim()}"`)

// 3. Repetido (R24 / P37)
await page.setInputFiles('input[type=file]', PDF)
await page.waitForTimeout(2500)
paso('un repetido no abre la ficha', (await page.locator('.ficha').count()) === 0)
const cuantos = await page.locator('.rejilla .libro').count()
paso('no duplica un PDF repetido', cuantos === 2, `${cuantos - 1} libro(s) + botón de traer`)
const aviso = await page.textContent('.aviso').catch(() => '')
paso('avisa del repetido', /ya estaba/.test(aviso), `aviso: "${aviso.trim()}"`)

// 4. Abrir y renderizar
await page.click('.rejilla .libro .libro-abrir')
await page.waitForSelector('.lector .hoja.debajo canvas', { timeout: 20000 })
const dims = await page.$eval('.hoja.debajo canvas', c => ({ w: c.width, h: c.height }))
paso('dibuja la página 1', dims.w > 100 && dims.h > 100, `lienzo ${dims.w}×${dims.h}`)
paso('tema por defecto es papel (P59)', (await page.getAttribute('.lector', 'data-tema')) === 'papel')
paso('la interfaz arranca oculta (P62)', (await page.getAttribute('.chrome.arriba', 'data-visible')) === 'false')
const folio1 = (await page.textContent('.folio')).trim()
paso('el número de página se ve (P53)', folio1 === '1 / 6', `dice "${folio1}"`)

// 5. Arrastrar para pasar página (P51)
const caja = await page.locator('.escena').boundingBox()
const y = caja.y + caja.height / 2
await page.mouse.move(caja.x + caja.width * 0.85, y)
await page.mouse.down()
for (let i = 1; i <= 12; i++) {
  await page.mouse.move(caja.x + caja.width * (0.85 - 0.72 * (i / 12)), y)
  await page.waitForTimeout(12)
}
await page.mouse.up()
await page.waitForTimeout(900)
const folio2 = (await page.textContent('.folio')).trim()
paso('arrastrar pasa a la página siguiente', folio2 === '2 / 6', `dice "${folio2}"`)

// 6. Arrastre corto: la página debe volver
await page.mouse.move(caja.x + caja.width * 0.8, y)
await page.mouse.down()
await page.mouse.move(caja.x + caja.width * 0.72, y)
await page.waitForTimeout(30)
await page.mouse.up()
await page.waitForTimeout(900)
paso('un arrastre corto no pasa la página', (await page.textContent('.folio')).trim() === '2 / 6')

// 7. Volver atrás
await page.mouse.move(caja.x + caja.width * 0.15, y)
await page.mouse.down()
for (let i = 1; i <= 12; i++) {
  await page.mouse.move(caja.x + caja.width * (0.15 + 0.72 * (i / 12)), y)
  await page.waitForTimeout(12)
}
await page.mouse.up()
await page.waitForTimeout(900)
paso('arrastrar al revés vuelve atrás', (await page.textContent('.folio')).trim() === '1 / 6')

// 8. Toque: aparece la interfaz (P62)
await page.mouse.click(caja.x + caja.width / 2, y)
await page.waitForTimeout(350)
paso('un toque muestra la interfaz', (await page.getAttribute('.chrome.arriba', 'data-visible')) === 'true')

// 9. Saltar a una página (P52)
await page.fill('.salto input', '5')
await page.press('.salto input', 'Enter')
await page.waitForTimeout(700)
paso('salta al número de página', (await page.textContent('.folio')).trim() === '5 / 6')

// 10. Temas
await page.click('.chrome.arriba .icono:last-child')
await page.waitForTimeout(250)
paso('cambia de tema', (await page.getAttribute('.lector', 'data-tema')) === 'sepia')

// 11. El progreso se guarda (R16) y reaparece "seguir leyendo" (P39/P63)
await page.click('.chrome.arriba .icono:first-child')
await page.waitForSelector('.seguir', { timeout: 8000 })
const sub = (await page.textContent('.seguir-sub')).trim()
paso('guarda por dónde iba', /página 5 de 6/.test(sub), `dice "${sub}"`)

// 12. Sobrevive a recargar (persistencia real)
await page.reload({ waitUntil: 'networkidle' })
await page.waitForSelector('.seguir', { timeout: 10000 })
paso('la biblioteca sobrevive a recargar', /página 5 de 6/.test((await page.textContent('.seguir-sub'))))

await page.click('.seguir-abrir')
await page.waitForSelector('.aviso', { timeout: 10000 })
paso('ofrece volver al principio (P63)', /Vas por la página 5/.test(await page.textContent('.aviso')))

await page.screenshot({ path: `${SC}/lector.png` })
await page.click('.aviso button')
await page.waitForTimeout(600)
paso('«Al principio» funciona', (await page.textContent('.folio')).trim() === '1 / 6')

await page.click('.escena', { position: { x: 200, y: 400 } })
await page.waitForTimeout(300)
await page.screenshot({ path: `${SC}/lector-chrome.png` })
await page.goBack().catch(() => {})

console.log(errores.length ? `\nErrores de consola (${errores.length}):\n` + errores.join('\n') : '\nSin errores de consola.')
await browser.close()
