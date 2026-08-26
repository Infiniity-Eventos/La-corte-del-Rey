import { chromium } from 'playwright'

const SC = process.env.SC ?? '/tmp'
const R = {
  natural: 'Estaba loquito de la dicha.',
  literal: 'Estaba sobre la luna por ello.',
  contexto: 'Expresa una alegría enorme y algo infantil, de las que no se disimulan.',
  aviso: 'Es un modismo: «over the moon» no tiene nada que ver con la luna.',
}
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
const ctx = await browser.newContext({ viewport: { width: 412, height: 892 }, deviceScaleFactor: 2, hasTouch: true })
await ctx.addInitScript(R => {
  const real = window.fetch.bind(window)
  window.fetch = async (e, o) => {
    const url = typeof e === 'string' ? e : e.url
    if (!url.includes('generativelanguage')) return real(e, o)
    const json = JSON.stringify(R)
    return new Response(`data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text: json }] } }] })}\n\n`,
      { status: 200, headers: { 'Content-Type': 'text/event-stream' } })
  }
}, R)
const p = await ctx.newPage()
const errs = []
p.on('pageerror', e => errs.push(String(e.message)))
p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) })

await p.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' })
await p.waitForSelector('.vacio')
await p.setInputFiles('input[type=file]', `${SC}/Cronica_de_una_prueba.pdf`)
await p.waitForSelector('.ficha', { timeout: 25000 })
await p.fill('.campo input[placeholder="Cómo se llama"]', 'Crónica de una prueba')
await p.click('.ficha-pie .btn:last-child')
await p.waitForSelector('.rejilla .libro')

await p.click('.biblio-top .icono:last-child')
await p.waitForSelector('.tarjeta')
await p.fill('.campo-fila input', 'AIzaFalsaParaLaCaptura123456')
await p.click('.tarjeta .btn')
await p.waitForTimeout(300)
await p.click('.comoseSaca summary')
await p.waitForTimeout(300)
await p.screenshot({ path: `${SC}/t-ajustes.png` })
await p.click('.icono.volver')
await p.waitForSelector('.rejilla .libro')

await p.click('.rejilla .libro:first-child .libro-abrir')
await p.waitForSelector('.hoja.debajo canvas', { timeout: 25000 })
await p.waitForTimeout(500)
await p.screenshot({ path: `${SC}/t-barra.png` })

await p.fill('.barra-burbuja textarea', 'he was over the moon about it')
await p.click('.barra-burbuja .btn')
await p.waitForSelector('.solapas', { timeout: 10000 })
await p.waitForTimeout(400)
await p.screenshot({ path: `${SC}/t-burbuja.png` })

await p.click('.escena', { position: { x: 200, y: 260 } })
await p.waitForTimeout(350)
await p.screenshot({ path: `${SC}/t-chrome.png` })

console.log(errs.length ? 'errores: ' + errs.join(' | ') : 'sin errores de consola')
await browser.close()
