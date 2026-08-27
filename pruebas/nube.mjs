import { chromium } from 'playwright'

/**
 * El hito 4 sin cuenta de Google.
 *
 * Iniciar sesión de verdad abre una ventana de Google que no se puede
 * automatizar, así que aquí se comprueba lo que sí se puede y lo que más
 * importa: que **sin sesión, Vellum no descarga Firebase ni depende de él**.
 * Esa es la promesa de D-08, y es la que se rompería sin que nadie lo note.
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

const pedidos = []
page.on('request', r => pedidos.push(r.url()))
// Los trozos de Firebase llevan su nombre en el archivo justo para esto: sin
// él, la comprobación pasaría en falso porque el empaquetador los llama
// «index.esm» y no habría forma de reconocerlos.
const firebasePedido = () =>
  pedidos.filter(u => /firebase-|firestore\.googleapis|identitytoolkit/i.test(u))

await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' })
await page.waitForSelector('.vacio')
paso('la app arranca sin cuenta', true)
paso('sin sesión no se descarga Firebase', firebasePedido().length === 0,
  firebasePedido().slice(0, 2).join(' | ') || 'ninguna petición')

/* --- Leer, traducir y organizar siguen sin cuenta --- */
await page.setInputFiles('input[type=file]', `${SC}/Cronica_de_una_prueba.pdf`)
await page.waitForSelector('.ficha', { timeout: 25000 })
await page.fill('.campo input[placeholder="Cómo se llama"]', 'Sin cuenta')
await page.click('.ficha-pie .btn:last-child')
await page.waitForSelector('.rejilla .libro', { timeout: 15000 })
paso('se puede importar sin cuenta', true)
await page.click('.rejilla .libro .libro-abrir')
await page.waitForSelector('.hoja.debajo canvas', { timeout: 30000 })
paso('y leer sin cuenta', true)
await page.click('.escena', { position: { x: 200, y: 300 } })
await page.click('.chrome.arriba .icono:first-child')
await page.waitForSelector('.rejilla .libro', { timeout: 10000 })

paso('sigue sin descargarse Firebase después de usarla', firebasePedido().length === 0,
  firebasePedido().slice(0, 2).join(' | ') || 'ninguna petición')
paso('sin sesión no hay indicador de nube', (await page.locator('.nube').count()) === 0)

/* --- La invitación a entrar, en los ajustes --- */
await page.click('.biblio-top .icono:has-text("Ajustes")')
await page.waitForSelector('.tarjeta')
const cuenta = await page.textContent('.tarjeta')
paso('los ajustes explican para qué sirve entrar',
  /viajen entre el celular y la PC/.test(cuenta))
paso('y dejan claro que sin cuenta funciona todo',
  /Sin cuenta, Vellum funciona entero/.test(cuenta))
paso('hay un botón para entrar con Google',
  (await page.locator('.btn:has-text("Entrar con Google")').count()) === 1)

const donde = await page.textContent('.tarjeta:last-of-type')
paso('dice dónde vive todo, y que sin sesión no sale de aquí',
  /Sin sesión, no sale de aquí/.test(donde))
paso('y que la clave de Gemini nunca viaja',
  /esa no viaja nunca/.test(donde))

paso('abrir los ajustes tampoco descarga Firebase', firebasePedido().length === 0,
  firebasePedido().slice(0, 2).join(' | ') || 'ninguna petición')

/* --- Solo al pulsar entrar se trae el SDK --- */
await page.click('.btn:has-text("Entrar con Google")')
await page.waitForTimeout(3500)
const trozos = firebasePedido().map(u => (u.match(/firebase-[a-z]+/) || [''])[0])
paso('al pulsar entrar sí se descarga', trozos.length > 0, trozos.join(', ') || 'nada')
paso('y solo lo de la sesión, no los datos ni los archivos',
  trozos.includes('firebase-sesion') && !trozos.includes('firebase-datos'),
  trozos.join(', '))

await page.screenshot({ path: `${SC}/n-ajustes.png` })
console.log(errores.length ? `\nErrores de consola:\n${errores.join('\n')}` : '\nSin errores de consola.')
await browser.close()
