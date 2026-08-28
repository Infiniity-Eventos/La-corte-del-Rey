import { readFileSync } from 'node:fs'
import { chromium } from 'playwright'
import { exigirCompilacionAlDia } from './fresco.mjs'

/**
 * Abrir un PDF desde fuera de la app.
 *
 * Lo que se prueba aquí es la cadena entera del camino de Android: un POST con
 * el archivo, como el que manda el menú de Compartir, lo recoge el service
 * worker, y la app lo encuentra al arrancar y lo importa.
 *
 * Ese POST no se puede probar «casi»: o el service worker lo intercepta y
 * responde, o el navegador se queda en una página de error. Y no da ningún
 * aviso al construir, porque es código que solo corre dentro del worker.
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
const page = await ctx.newPage()
page.on('pageerror', e => errores.push(`pageerror: ${e.message}`))
page.on('console', m => { if (m.type() === 'error') errores.push(`console: ${m.text()}`) })

await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' })
await page.waitForSelector('.vacio')

/* --- El manifiesto declara los dos caminos --- */
const manifiesto = await page.evaluate(async () => (await (await fetch('manifest.webmanifest')).json()))
paso('el manifiesto ofrece Vellum para compartir', !!manifiesto.share_target)
paso('y pide los archivos por POST, que es lo que manda Android',
  manifiesto.share_target?.method === 'POST' && manifiesto.share_target?.enctype === 'multipart/form-data')
paso('acepta PDF', JSON.stringify(manifiesto.share_target?.params?.files ?? []).includes('application/pdf'))
paso('y en escritorio se registra para «Abrir con»',
  JSON.stringify(manifiesto.file_handlers ?? []).includes('application/pdf'))

/* --- El service worker está vivo y trae el recogedor --- */
await page.evaluate(() => navigator.serviceWorker.ready)
paso('el service worker está activo', true)
const sw = await page.evaluate(async () => {
  const r = await navigator.serviceWorker.getRegistration()
  return (await (await fetch(r.active.scriptURL)).text()).includes('compartir-sw')
})
paso('y carga el recogedor de compartidos', sw)

/* --- El POST de verdad, como el que manda Android --- */
// Con un PDF de verdad: uno inventado pasaría el POST y moriría al abrirlo, y
// entonces la prueba diría que el camino funciona cuando no llega al final.
const bytes = [...readFileSync(`${SC}/Cronica_de_una_prueba.pdf`)]

const resultado = await page.evaluate(async bytes => {
  const cuerpo = new FormData()
  const datos = new Blob([new Uint8Array(bytes)], { type: 'application/pdf' })
  cuerpo.append('archivos', new File([datos], 'Desde_Compartir.pdf', { type: 'application/pdf' }))
  const r = await fetch('compartir', { method: 'POST', body: cuerpo, redirect: 'manual' })
  return { tipo: r.type, url: r.url, estado: r.status }
}, bytes)
paso('el POST no acaba en un error del navegador', resultado.tipo !== 'error',
  `tipo: ${resultado.tipo}`)

const buzon = await page.evaluate(async () => {
  const c = await caches.open('vellum-compartido')
  const llaves = await c.keys()
  if (!llaves.length) return null
  const r = await c.match(llaves[0])
  return { cuantos: llaves.length, nombre: decodeURIComponent(r.headers.get('X-Nombre') ?? '') }
})
paso('**el service worker guardó el archivo**', buzon !== null && buzon.cuantos === 1,
  buzon ? `${buzon.cuantos} en el buzón` : 'el buzón está vacío')
paso('con su nombre, no con el de la ruta', buzon?.nombre === 'Desde_Compartir.pdf',
  buzon?.nombre ?? '—')

/* --- Y la app lo encuentra al abrirse --- */
await page.goto('http://127.0.0.1:4173/?compartidos=1', { waitUntil: 'networkidle' })
// Esperando y comprobando, no dando por hecho: un `paso(..., true)` detrás de un
// `waitForSelector` no comprueba nada, revienta la prueba entera si falla.
const llegoLaFicha = await page.locator('.ficha').waitFor({ timeout: 25000 }).then(() => true, () => false)
paso('al abrir la app, el archivo entra solo y abre su ficha', llegoLaFicha)
const titulo = llegoLaFicha ? await page.inputValue('.campo input[placeholder="Cómo se llama"]') : ''
paso('con el título sacado del nombre que traía', titulo === 'Desde Compartir', `«${titulo}»`)
await page.keyboard.press('Escape')
await page.waitForTimeout(400)

paso('la marca se quita de la dirección', !page.url().includes('compartidos'),
  page.url())

const vacio = await page.evaluate(async () => (await caches.keys()).includes('vellum-compartido'))
paso('y el buzón se vacía, para no importarlo otra vez al volver', !vacio)

/* --- Sin marca en la dirección no se toca nada --- */
await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
paso('abrir la app normal no importa nada de más',
  (await page.locator('.rejilla .libro .portada-tit').count()) === 1,
  `${await page.locator('.rejilla .libro .portada-tit').count()} libro(s), el que llegó compartido`)
paso('y no aparece la ficha otra vez', (await page.locator('.ficha').count()) === 0)

await page.screenshot({ path: `${SC}/compartir.png` })
console.log(errores.length ? `\nErrores de consola:\n${errores.join('\n')}` : '\nSin errores de consola.')
await browser.close()
