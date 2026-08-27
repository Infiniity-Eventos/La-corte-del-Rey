import { chromium } from 'playwright'

/**
 * Prueba contra la app publicada, no contra una compilación local.
 *
 * Es la única que puede fallar por motivos que no están en el código: una ruta
 * mal formada bajo la subcarpeta, una fuente que no llega, el service worker
 * mal registrado. Todo eso solo aparece cuando la app vive en una dirección de
 * verdad.
 */

const URL = process.env.URL ?? 'https://infiniity-eventos.github.io/La-corte-del-Rey/'
const SC = process.env.SC ?? '/tmp'
const errores = []
const paso = (n, ok, extra = '') => {
  console.log(`${ok ? '  OK  ' : ' FALLA'} ${n}${extra ? ' — ' + extra : ''}`)
  if (!ok) process.exitCode = 1
}

// Esta prueba sale a internet de verdad, así que el navegador tiene que usar
// el mismo proxy que el resto del entorno. Sin esto, la conexión se corta y
// parece que el sitio está caído cuando no lo está.
// Solo para direcciones de fuera. Una dirección local no pasa por el proxy.
const externa = !/^https?:\/\/(127\.0\.0\.1|localhost)/.test(URL)
const proxy = externa ? process.env.HTTPS_PROXY || process.env.https_proxy : undefined
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  ...(proxy ? { proxy: { server: proxy } } : {}),
})
const ctx = await browser.newContext({
  viewport: { width: 412, height: 892 },
  deviceScaleFactor: 2,
  hasTouch: true,
  ignoreHTTPSErrors: !!proxy,
})
const page = await ctx.newPage()
const fallidos = []
page.on('pageerror', e => errores.push(`pageerror: ${e.message}`))
page.on('console', m => { if (m.type() === 'error') errores.push(`console: ${m.text()}`) })
page.on('response', r => { if (r.status() >= 400) fallidos.push(`${r.status()} ${r.url()}`) })

const r = await page.goto(URL, { waitUntil: 'networkidle', timeout: 45000 })
paso('la dirección responde', r.status() === 200, `HTTP ${r.status()}`)
paso('la app arranca', (await page.locator('.vacio').count()) === 1)
paso('el título está puesto', (await page.title()) === 'Infiniity Vellum')

const fuentes = await page.evaluate(() => ({ n: document.fonts.size, estado: document.fonts.status }))
paso('las tipografías cargan desde la propia app', fuentes.n >= 2 && fuentes.estado === 'loaded',
  `${fuentes.n} cargadas`)

const marca = await page.evaluate(() =>
  getComputedStyle(document.querySelector('.vacio h2')).fontFamily)
paso('Fraunces se aplica de verdad', /Fraunces/.test(marca), marca)

const manifiesto = await page.evaluate(async () => {
  const enlace = document.querySelector('link[rel=manifest]')
  if (!enlace) return null
  const m = await (await fetch(enlace.href)).json()
  const icono = new URL(m.icons[0].src, enlace.href).href
  const resp = await fetch(icono)
  return { scope: m.scope, start: m.start_url, icono, iconoOk: resp.ok }
})
paso('el manifiesto se sirve', !!manifiesto)
paso('el ámbito apunta a la subcarpeta', manifiesto?.scope === '/La-corte-del-Rey/', manifiesto?.scope)
paso('los iconos existen donde dice el manifiesto', manifiesto?.iconoOk === true, manifiesto?.icono)

const sw = await page.evaluate(() =>
  navigator.serviceWorker.getRegistrations().then(rs => rs.length))
paso('el service worker queda registrado', sw > 0, `${sw} registro(s)`)

// Un PDF de verdad, traído desde la app publicada
await page.setInputFiles('input[type=file]', `${SC}/Cronica_de_una_prueba.pdf`)
await page.waitForSelector('.ficha', { timeout: 40000 })
await page.fill('.campo input[placeholder="Cómo se llama"]', 'Crónica de una prueba')
await page.click('.ficha-pie .btn:last-child')
await page.waitForSelector('.rejilla .libro', { timeout: 15000 })
paso('importa un PDF en producción', true)

await page.click('.rejilla .libro:first-child .libro-abrir')
await page.waitForSelector('.hoja.debajo canvas', { timeout: 40000 })
paso('pdf.js dibuja la página en producción', true)

const caja = await page.locator('.escena').boundingBox()
const y = caja.y + caja.height / 2
await page.mouse.move(caja.x + caja.width * 0.85, y)
await page.mouse.down()
for (let i = 1; i <= 10; i++) { await page.mouse.move(caja.x + caja.width * (0.85 - 0.72 * (i / 10)), y); await page.waitForTimeout(14) }
await page.mouse.up()
await page.waitForTimeout(900)
paso('se pasa página en producción', (await page.textContent('.folio')).trim() === '2 / 6')

await page.screenshot({ path: `${SC}/vivo.png` })

const graves = fallidos.filter(f => !/favicon/.test(f))
paso('no hay archivos que falten', graves.length === 0, graves.join(' | ') || 'ninguno')
console.log(errores.length ? `\nErrores de consola:\n${errores.join('\n')}` : '\nSin errores de consola.')
await browser.close()
