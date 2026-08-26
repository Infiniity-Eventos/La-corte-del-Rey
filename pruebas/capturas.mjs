import { chromium } from 'playwright'
const SC = process.env.SC ?? '/tmp'
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
const ctx = await b.newContext({ viewport: { width: 412, height: 892 }, deviceScaleFactor: 2, hasTouch: true })
const p = await ctx.newPage()
const errs = []
p.on('pageerror', e => errs.push(String(e.message)))
p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) })

await p.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' })
const T = '.campo input[placeholder="Cómo se llama"]'
const E = '.campo input[placeholder^="Escribe"]'
const libro = async (archivo, titulo, tipo, etiquetas, portada) => {
  await p.setInputFiles('input[type=file]:not(.ficha input)', `${SC}/${archivo}`)
  await p.waitForSelector('.ficha', { timeout: 25000 })
  await p.fill(T, titulo)
  if (tipo === 'comic') await p.click('.segmento-op:nth-child(2)')
  for (const e of etiquetas) { await p.fill(E, e); await p.keyboard.press('Enter') }
  if (portada) { await p.setInputFiles('.ficha input[type=file]', `${SC}/${portada}`); await p.waitForTimeout(400) }
  await p.waitForTimeout(300)
  if (archivo.startsWith('Cronica')) await p.screenshot({ path: `${SC}/v-ficha.png` })
  await p.click('.ficha-pie .btn:last-child')
  await p.waitForSelector('.ficha', { state: 'detached' })
  await p.waitForTimeout(400)
}
await libro('Cronica_de_una_prueba.pdf', 'Crónica de una prueba', 'comic', ['aventura', 'pendiente'], 'portada.png')
await libro('Manual_de_vuelo.pdf', 'Manual de vuelo', 'libro', ['técnico'])
await libro('El_jardin_de_al_lado.pdf', 'El jardín de al lado', 'libro', ['novela', 'pendiente'])
await libro('Notas_sueltas.pdf', 'Notas sueltas', 'libro', ['apuntes'])
await p.waitForTimeout(700)
await p.screenshot({ path: `${SC}/v-biblioteca.png` })

await p.click('.rejilla .libro:first-child .libro-abrir')
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
await p.waitForSelector('.seguir'); await p.click('.seguir-abrir')
await p.waitForSelector('.aviso', { timeout: 15000 }); await p.waitForTimeout(500)
await p.screenshot({ path: `${SC}/v-aviso.png` })

const fuente = await p.evaluate(() => {
  const el = document.querySelector('.folio')
  return { cargadas: document.fonts.size, estado: document.fonts.status }
})
console.log('fuentes:', JSON.stringify(fuente))
console.log(errs.length ? 'errores: ' + errs.join(' | ') : 'sin errores de consola')
await b.close()
