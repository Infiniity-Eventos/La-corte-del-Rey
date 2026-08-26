import { chromium } from 'playwright'
const SC = process.env.SC ?? '/tmp'
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
const ctx = await b.newContext({ viewport: { width: 412, height: 892 }, deviceScaleFactor: 2, hasTouch: true })
const p = await ctx.newPage()
const errs = []
p.on('pageerror', e => errs.push(String(e.message)))
p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) })

await p.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' })
await p.setInputFiles('input[type=file]', `${SC}/Prueba_de_Lectura.pdf`)
await p.waitForSelector('.rejilla .libro', { timeout: 20000 })
await p.waitForTimeout(600)
await p.screenshot({ path: `${SC}/v-biblioteca.png` })

await p.click('.rejilla .libro')
await p.waitForSelector('.hoja.debajo canvas', { timeout: 20000 })
await p.waitForTimeout(700)
await p.screenshot({ path: `${SC}/v-leyendo.png` })

// A mitad del volteo, para ver el pliegue
const c = await p.locator('.escena').boundingBox()
const y = c.y + c.height / 2
await p.mouse.move(c.x + c.width * 0.88, y); await p.mouse.down()
for (let i = 1; i <= 8; i++) { await p.mouse.move(c.x + c.width * (0.88 - 0.45 * (i / 8)), y); await p.waitForTimeout(14) }
await p.screenshot({ path: `${SC}/v-volteo.png` })
await p.mouse.up(); await p.waitForTimeout(900)

await p.click('.escena', { position: { x: 200, y: 430 } })
await p.waitForTimeout(320)
await p.screenshot({ path: `${SC}/v-chrome.png` })

// tema oscuro
await p.click('.chrome.arriba .icono:last-child'); await p.waitForTimeout(200)
await p.click('.chrome.arriba .icono:last-child'); await p.waitForTimeout(320)
await p.screenshot({ path: `${SC}/v-oscuro.png` })

// aviso de retomar
await p.click('.chrome.arriba .icono:first-child')
await p.waitForSelector('.seguir'); await p.click('.seguir')
await p.waitForSelector('.aviso', { timeout: 15000 }); await p.waitForTimeout(500)
await p.screenshot({ path: `${SC}/v-aviso.png` })

const fuente = await p.evaluate(() => {
  const el = document.querySelector('.folio')
  return { cargadas: document.fonts.size, estado: document.fonts.status }
})
console.log('fuentes:', JSON.stringify(fuente))
console.log(errs.length ? 'errores: ' + errs.join(' | ') : 'sin errores de consola')
await b.close()
