import { chromium } from 'playwright'
import { exigirCompilacionAlDia } from './fresco.mjs'

/**
 * Prueba del hito 3 sin gastar cuota de Gemini.
 *
 * En vez de un servidor falso, se sustituye `fetch` dentro de la propia página
 * y se construye el flujo de respuesta a mano, con retardos reales entre
 * trozos. Así se ejerce el cliente entero —el lector del cuerpo, el troceado
 * SSE, el parseo a medias— y se puede comprobar lo único que importa de todo el
 * streaming: que la traducción natural aparece **antes** que el resto.
 */

const SC = process.env.SC ?? '/tmp'
const errores = []
const paso = (n, ok, extra = '') => {
  console.log(`${ok ? '  OK  ' : ' FALLA'} ${n}${extra ? ' — ' + extra : ''}`)
  if (!ok) process.exitCode = 1
}

const RESPUESTA = {
  natural: 'Estaba loquito de la dicha.',
  literal: 'Estaba sobre la luna por ello.',
  contexto: 'Expresa una alegría enorme y algo infantil, de las que no se disimulan.',
  aviso: 'Es un modismo: «over the moon» no tiene nada que ver con la luna.',
}
const PALABRA = {
  natural: 'inquebrantable',
  literal: 'inquebrantable',
  contexto: 'Se usa para una voluntad o una promesa que no cede.',
  palabra: {
    pronunciacion: 'an-BREI-ka-bol',
    significado: 'Que no se puede romper.',
    ejemplo: 'An unbreakable promise.',
    ejemploTraducido: 'Una promesa inquebrantable.',
  },
}

exigirCompilacionAlDia()

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
const ctx = await browser.newContext({ viewport: { width: 412, height: 900 }, deviceScaleFactor: 2, hasTouch: true })

// El guion vive en localStorage para que sobreviva a las recargas.
await ctx.addInitScript(({ RESPUESTA, PALABRA }) => {
  const real = window.fetch.bind(window)
  window.fetch = async (entrada, opciones) => {
    const url = typeof entrada === 'string' ? entrada : entrada.url
    if (!url.includes('generativelanguage.googleapis.com')) return real(entrada, opciones)

    const guion = localStorage.getItem('__guion') || 'normal'

    // La app pregunta primero qué modelos tiene la clave. Se devuelve una
    // lista revuelta a propósito, con basura dentro, para comprobar que elige
    // bien y no simplemente el primero.
    if (url.includes('/models?')) {
      if (guion === 'clave-mala') return new Response('{"error":{"message":"API key not valid"}}', { status: 400 })
      if (guion === 'sin-modelos') return new Response(JSON.stringify({ models: [] }), { status: 200 })
      return new Response(JSON.stringify({
        models: [
          { name: 'models/text-embedding-004', supportedGenerationMethods: ['embedContent'] },
          { name: 'models/gemini-3.7-pro', supportedGenerationMethods: ['generateContent'] },
          { name: 'models/gemini-2.5-flash-lite', supportedGenerationMethods: ['generateContent'] },
          { name: 'models/gemini-3.7-flash-lite-preview', supportedGenerationMethods: ['generateContent'] },
          { name: 'models/gemini-3.7-flash-lite', supportedGenerationMethods: ['generateContent'] },
          { name: 'models/imagen-4.0-generate', supportedGenerationMethods: ['predict'] },
          { name: 'models/gemini-3.7-flash', supportedGenerationMethods: ['generateContent'] },
        ],
      }), { status: 200 })
    }

    if (guion === 'modelo-retirado') {
      // Falla una vez con 404 y a la siguiente funciona: así se comprueba que
      // vuelve a preguntar y reintenta sola.
      if (!localStorage.getItem('__ya404')) {
        localStorage.setItem('__ya404', '1')
        return new Response('{"error":{"message":"not found"}}', { status: 404 })
      }
    }
    const jsonError = m => new Response(JSON.stringify({ error: { message: m } }), {
      status: { cuota: 429, 'clave-mala': 400, ocupado: 503 }[guion],
      headers: { 'Content-Type': 'application/json' },
    })
    if (guion === 'cuota') return jsonError('Resource exhausted')
    if (guion === 'clave-mala') return jsonError('API key not valid')
    if (guion === 'ocupado') return jsonError('overloaded')
    if (guion === 'sin-red') throw new TypeError('Failed to fetch')

    const json = JSON.stringify(guion === 'palabra' ? PALABRA : RESPUESTA)
    // Se parte como lo haría el modelo, con una pausa larga tras el primero:
    // ahí es donde se ve si la natural sale antes que las pestañas.
    const trozos = [json.slice(0, 46), json.slice(46, 120), json.slice(120)]
    const cuerpo = new ReadableStream({
      async start(c) {
        const cod = new TextEncoder()
        for (let i = 0; i < trozos.length; i++) {
          await new Promise(r => setTimeout(r, i === 0 ? 0 : 700))
          const trama = { candidates: [{ content: { parts: [{ text: trozos[i] }] } }] }
          c.enqueue(cod.encode('data: ' + JSON.stringify(trama) + '\n\n'))
        }
        c.close()
      },
    })
    return new Response(cuerpo, { status: 200, headers: { 'Content-Type': 'text/event-stream' } })
  }
}, { RESPUESTA, PALABRA })

const page = await ctx.newPage()
const guionar = v => page.evaluate(v => localStorage.setItem('__guion', v), v)
page.on('pageerror', e => errores.push(`pageerror: ${e.message}`))
page.on('console', m => { if (m.type() === 'error') errores.push(`console: ${m.text()}`) })

const abrirLibro = async () => {
  await page.click('.rejilla .libro:first-child .libro-abrir')
  await page.waitForSelector('.hoja.debajo canvas', { timeout: 25000 })
}
const pedir = async texto => {
  await page.fill('.barra-burbuja textarea', texto)
  await page.click('.barra-burbuja .btn')
}

await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' })
await page.waitForSelector('.vacio')
await page.setInputFiles('input[type=file]', `${SC}/Cronica_de_una_prueba.pdf`)
await page.waitForSelector('.ficha', { timeout: 25000 })
await page.fill('.campo input[placeholder="Cómo se llama"]', 'Crónica de una prueba')
await page.click('.ficha-pie .btn:last-child')
await page.waitForSelector('.rejilla .libro', { timeout: 10000 })

/* --- Sin clave, lo dice y ofrece el camino (P31) --- */
await abrirLibro()
paso('la barra del traductor está siempre visible', (await page.locator('.barra-burbuja').count()) === 1)
await pedir('he was over the moon about it')
await page.waitForSelector('.panel-fallo', { timeout: 8000 })
paso('sin clave lo explica', (await page.textContent('.fallo-tit')) === 'Falta la clave de Gemini')
paso('y ofrece ir a los ajustes', (await page.locator('.panel-fallo .btn').count()) === 1)

/* --- Guardar la clave --- */
await page.click('.panel-fallo .btn')
await page.waitForSelector('.tarjeta', { timeout: 8000 })
paso('el botón lleva a los ajustes', (await page.textContent('.titulo-pantalla')) === 'Ajustes')
// Formato nuevo de clave: desde 2026, AI Studio las entrega como AQ.Ab…
await page.fill('.campo-fila input', 'AQ.Ab8FalsaParaLaPrueba123')

await page.click('.fila-botones .btn.fantasma')
await page.waitForSelector('.prueba', { timeout: 10000 })
paso('el botón de probar la clave la prueba de verdad',
  (await page.locator('.prueba.bien').count()) === 1,
  (await page.textContent('.prueba')).trim())

const elegido = await page.textContent('.prueba.bien')
paso('elige el mejor modelo de los que ofrece la clave',
  elegido.includes('gemini-3.7-flash-lite') && !elegido.includes('preview'),
  elegido.replace(/\s+/g, ' ').trim())

await guionar('clave-mala')
await page.click('.fila-botones .btn.fantasma')
await page.waitForSelector('.prueba.mal', { timeout: 10000 })
paso('y dice el motivo cuando no vale',
  (await page.textContent('.prueba.mal')).includes('no vale'))
await guionar('normal')

// Por texto y no por posición: al llegar la tarjeta de la cuenta, «el primer
// botón de la primera tarjeta» dejó de ser Guardar y la clave nunca se guardaba.
await page.click('.fila-botones .btn:text-is("Guardar")')
await page.waitForTimeout(500)
await page.reload({ waitUntil: 'networkidle' })
await page.waitForSelector('.rejilla .libro', { timeout: 10000 })
await page.click('.biblio-top .icono:has-text("Ajustes")')
await page.waitForSelector('.campo-fila input')
paso('la clave sobrevive a recargar', (await page.inputValue('.campo-fila input')).length > 10)
paso('la clave llega oculta', (await page.getAttribute('.campo-fila input', 'type')) === 'password')
await page.click('.campo-fila .icono')
paso('se puede mirar si hace falta', (await page.getAttribute('.campo-fila input', 'type')) === 'text')
await page.click('.icono.volver')
await page.waitForSelector('.rejilla .libro')

/* --- Traducir: la natural antes que el resto (R19 / P54) --- */
await abrirLibro()
await pedir('he was over the moon about it')
await page.waitForSelector('.panel-natural:not(.esperando)', { timeout: 8000 })
const antesDeSolapas = await page.locator('.solapas').count()
const naturalPronto = await page.textContent('.panel-natural')
paso('la traducción aparece antes que las pestañas', antesDeSolapas === 0,
  `natural: "${naturalPronto.slice(0, 40)}…"`)

await page.waitForSelector('.solapas', { timeout: 8000 })
paso('luego llegan las pestañas', true)
paso('la natural es la definitiva', (await page.textContent('.panel-natural')) === RESPUESTA.natural)

const pestanas = await page.locator('.solapa').allTextContents()
paso('con modismo, la pestaña de aviso va primero', pestanas[0] === 'Ojo', pestanas.join(' · '))
paso('y es la que se abre sola',
  (await page.getAttribute('.solapa', 'aria-selected')) === 'true')
paso('el aviso dice lo suyo', (await page.textContent('.hoja-solapa .ojo')) === RESPUESTA.aviso)

await page.click('.solapa:has-text("Literal")')
paso('la pestaña literal funciona', (await page.textContent('.hoja-solapa .literal')) === RESPUESTA.literal)
await page.click('.solapa:has-text("En contexto")')
paso('la pestaña de contexto funciona', (await page.textContent('.hoja-solapa p')) === RESPUESTA.contexto)

/* --- El campo se vacía al mandar, para poder seguir --- */
paso('al traducir, el campo queda vacío',
  (await page.inputValue('.barra-burbuja textarea')) === '',
  `«${await page.inputValue('.barra-burbuja textarea')}»`)
paso('pero lo que mandaste sigue a la vista',
  (await page.textContent('.panel-src')) === 'he was over the moon about it')

/* --- Se guarda sola, sin botón (R17 / P57) --- */
await page.waitForSelector('.guardada .icono', { timeout: 8000 })
paso('la traducción se guarda sola, sin pulsar nada',
  /^Guardada en la página \d+$/.test((await page.textContent('.guardar-voc')).trim()),
  (await page.textContent('.guardar-voc')).trim())
paso('y no queda ningún botón de guardar',
  (await page.locator('.btn:has-text("Guardar en la página")').count()) === 0)

/* --- Traducir lo mismo otra vez no duplica --- */
await page.click('.panel-top .icono')
await pedir('he was over the moon about it')
await page.waitForSelector('.guardada .icono', { timeout: 10000 })
paso('traducir lo mismo dos veces no crea dos marcas',
  (await page.textContent('.marca-notas .marca-n')) === '1',
  `la marca dice ${await page.textContent('.marca-notas .marca-n')}`)

/* --- Y se puede deshacer desde la propia burbuja --- */
await page.click('.guardada .icono')
await page.waitForTimeout(400)
paso('«Quitar» la borra y la marca desaparece',
  (await page.locator('.marca-notas').count()) === 0)
// Se vuelve a traducir para seguir con el resto de comprobaciones.
await page.click('.panel-top .icono')
await pedir('he was over the moon about it')
await page.waitForSelector('.guardada .icono', { timeout: 10000 })
paso('y volver a traducirla la devuelve', (await page.locator('.marca-notas').count()) === 1)

/* --- Y queda marcado en la página donde lo tradujiste --- */
const paginaDeLaNota = Number((await page.textContent('.folio')).split('/')[0].trim())
paso('la página se marca en el momento, sin recargar',
  (await page.locator('.marca-notas').count()) === 1)
paso('la marca dice cuántas hay', (await page.textContent('.marca-notas .marca-n')) === '1')

await page.click('.marca-notas')
await page.waitForSelector('.notas', { timeout: 5000 })
paso('al pulsarla se abre lo traducido aquí', (await page.locator('.nota').count()) === 1)
paso('con la frase original', (await page.textContent('.nota-orig')) === 'he was over the moon about it')
paso('y su traducción', (await page.textContent('.nota-trad')) === RESPUESTA.natural)
paso('dice de qué página es', (await page.textContent('.notas-tit')) === `En la página ${paginaDeLaNota}`)

// La marca vive en el borde derecho a media altura justamente para no pelearse
// con nada. Se comprueba, porque ya pasó una vez con el aviso de retomar.
const caja = async sel => await page.locator(sel).first().boundingBox()
const pisa = (a, b) => !!a && !!b
  && a.x < b.x + b.width && b.x < a.x + a.width
  && a.y < b.y + b.height && b.y < a.y + a.height
const marca = await caja('.marca-notas')
paso('la marca no se pisa con la burbuja', !pisa(marca, await caja('.zona-burbuja')))
paso('ni el panel con la burbuja', !pisa(await caja('.notas'), await caja('.zona-burbuja')))

// Se busca un punto que no sea del panel ni de la burbuja, en vez de acertar a
// ojo: el panel se mueve si cambia su alto y la prueba se rompería sola.
const cajaNotas = await caja('.notas')
await page.click('.notas-telon', { position: { x: 40, y: Math.max(20, cajaNotas.y / 2) } })
await page.waitForTimeout(300)
paso('tocar fuera cierra el panel', (await page.locator('.notas').count()) === 0)
await page.click('.marca-notas')
await page.waitForSelector('.notas', { timeout: 5000 })

/* --- Al cambiar de página, la marca no se queda pegada --- */
// Se cierra el panel de la traducción y se suelta el campo: con la burbuja en
// uso, los controles del lector están apartados y no hay dónde escribir la
// página. Es lo que haría cualquiera antes de seguir leyendo.
await page.click('.notas .icono')
await page.click('.panel-top .icono')
await page.evaluate(() => document.querySelector('.barra-burbuja textarea').blur())
await page.waitForTimeout(400)
await page.click('.escena', { position: { x: 200, y: 300 } })
await page.waitForTimeout(250)
await page.fill('.salto input', String(paginaDeLaNota + 1))
await page.press('.salto input', 'Enter')
await page.waitForTimeout(900)
paso('y en una página sin nada traducido no hay marca',
  (await page.locator('.marca-notas').count()) === 0)

/* --- Y al volver, sigue ahí: es lo que se pidió --- */
await page.fill('.salto input', String(paginaDeLaNota))
await page.press('.salto input', 'Enter')
await page.waitForTimeout(900)
paso('**al volver a la página, la marca sigue ahí**',
  (await page.locator('.marca-notas').count()) === 1)

/* --- Y sobrevive a cerrar el libro y volver a abrirlo --- */
await page.click('.chrome.arriba .icono:first-child')
await page.waitForSelector('.rejilla .libro', { timeout: 10000 })
await abrirLibro()
await page.waitForTimeout(600)
const dondeAbrio = Number((await page.textContent('.folio')).split('/')[0].trim())
paso('y sobrevive a cerrar el libro',
  dondeAbrio !== paginaDeLaNota || (await page.locator('.marca-notas').count()) === 1,
  `reabrió en la página ${dondeAbrio}`)
if (dondeAbrio !== paginaDeLaNota) {
  await page.click('.escena', { position: { x: 200, y: 300 } })
  await page.fill('.salto input', String(paginaDeLaNota))
  await page.press('.salto input', 'Enter')
  await page.waitForTimeout(900)
  paso('al ir a la página de la nota, ahí está',
    (await page.locator('.marca-notas').count()) === 1)
} else {
  paso('al ir a la página de la nota, ahí está', true, 'ya estaba en ella')
}

/* --- Una palabra suelta trae su ficha (P28) --- */
await guionar('palabra')
// El panel puede estar ya cerrado —la comprobación de la marca lo cierra— así
// que se cierra solo si sigue abierto, en vez de dar por hecho que está.
if (await page.locator('.panel-top .icono').count()) await page.click('.panel-top .icono')
await pedir('unbreakable')
await page.waitForSelector('.solapas', { timeout: 10000 })
const p2 = await page.locator('.solapa').allTextContents()
paso('con una palabra suelta, su pestaña va primero', p2[0] === 'La palabra', p2.join(' · '))
paso('trae la pronunciación', (await page.textContent('.palabra .pron')) === PALABRA.palabra.pronunciacion)
paso('trae un ejemplo traducido', (await page.textContent('.ejemplo-es')) === PALABRA.palabra.ejemploTraducido)
await guionar('normal')

/* --- Si el modelo se retira, vuelve a preguntar y reintenta --- */
await page.click('.panel-top .icono')
await page.evaluate(() => localStorage.removeItem('__ya404'))
await guionar('modelo-retirado')
await pedir('a retired model')
await page.waitForSelector('.solapas', { timeout: 12000 })
paso('si el modelo se retira, busca otro y reintenta sola',
  (await page.textContent('.panel-natural')) === RESPUESTA.natural)
await guionar('normal')

/* --- La cuota (P31) --- */
// Si la traducción falla, lo escrito tiene que volver al campo: reintentar no
// puede obligarte a teclearlo otra vez.
await guionar('cuota')
await page.click('.panel-top .icono')
await pedir('another sentence')
await page.waitForSelector('.panel-fallo', { timeout: 8000 })
paso('avisa cuando se acaba la cuota',
  (await page.textContent('.fallo-tit')) === 'Se acabaron las traducciones de hoy')
const cuando = await page.textContent('.fallo-det')
paso('y dice cuándo vuelve', /Vuelven el .+/.test(cuando), cuando.slice(0, 60) + '…')
paso('cuando falla, lo escrito vuelve al campo',
  (await page.inputValue('.barra-burbuja textarea')) === 'another sentence',
  `«${await page.inputValue('.barra-burbuja textarea')}»`)

/* --- Clave mala --- */
await guionar('clave-mala')
await page.click('.panel-top .icono')
await pedir('otra vez')
await page.waitForSelector('.panel-fallo', { timeout: 8000 })
paso('detecta una clave inválida', (await page.textContent('.fallo-tit')) === 'Esa clave no vale')

/* --- Servidor saturado --- */
await guionar('ocupado')
await page.click('.panel-top .icono')
await pedir('otra mas')
await page.waitForSelector('.panel-fallo', { timeout: 8000 })
paso('distingue «saturado» de «culpa tuya»',
  (await page.textContent('.fallo-det')).includes('No es cosa tuya'))

/* --- Sin red --- */
await guionar('sin-red')
await page.click('.panel-top .icono')
await pedir('sin internet')
await page.waitForSelector('.panel-fallo', { timeout: 8000 })
paso('sin red lo dice y recuerda que leer sigue',
  (await page.textContent('.fallo-det')).includes('Leer sigue funcionando'))
await guionar('normal')

/* --- Nada se amontona mientras escribes --- */
await page.click('.panel-top .icono')
await page.click('.escena', { position: { x: 200, y: 240 } })
await page.waitForTimeout(320)
paso('con la interfaz abierta se ven los controles',
  (await page.getAttribute('.chrome.abajo', 'data-visible')) === 'true')
await page.click('.barra-burbuja textarea')
await page.fill('.barra-burbuja textarea', 'something long enough to matter here')
await page.waitForTimeout(320)
paso('al escribir, los controles del lector se apartan',
  (await page.getAttribute('.chrome.abajo', 'data-visible')) === 'false')
paso('y la barra de arriba también',
  (await page.getAttribute('.chrome.arriba', 'data-visible')) === 'false')
const alto = await page.evaluate(() => {
  const t = document.querySelector('.barra-burbuja textarea')
  return { alto: t.clientHeight, desborde: t.scrollHeight - t.clientHeight }
})
paso('el campo crece con el texto en vez de cortarlo', alto.desborde <= 2, `${alto.alto}px de alto`)
await page.fill('.barra-burbuja textarea', '')
await page.evaluate(() => document.querySelector('.barra-burbuja textarea').blur())
await page.waitForTimeout(320)
paso('al salir del campo, los controles vuelven',
  (await page.getAttribute('.chrome.abajo', 'data-visible')) === 'true')

/* --- Modo seleccionar (R31 / P56) --- */
// La interfaz ya está abierta del bloque anterior: tocar la página la cerraría.
await page.click('.chrome.abajo .icono:has-text("Seleccionar")')
await page.waitForTimeout(900)
paso('el modo selección avisa de cómo funciona', (await page.locator('.aviso.modo').count()) === 1)
paso('y aparece la capa de texto', (await page.locator('.capaTexto span').count()) > 0)

const hayTexto = await page.evaluate(() => {
  const capa = document.querySelector('.capaTexto')
  const spans = capa?.querySelectorAll('span')
  if (!spans || spans.length === 0) return null
  const r = document.createRange()
  r.selectNodeContents(spans[0])
  const s = window.getSelection()
  s.removeAllRanges()
  s.addRange(r)
  return spans[0].textContent
})
await page.waitForTimeout(500)
paso('seleccionar rellena la burbuja',
  (await page.inputValue('.barra-burbuja textarea')).trim() === hayTexto.trim(), `«${hayTexto}»`)

/* --- El vocabulario, con libro y página (P57) --- */
// La selección deja el foco en la burbuja, y con la burbuja en uso la barra de
// arriba se aparta. Se sale del campo primero, como haría cualquiera.
await page.evaluate(() => document.querySelector('.barra-burbuja textarea').blur())
await page.waitForTimeout(320)
await page.click('.chrome.arriba .icono:first-child')
await page.waitForSelector('.biblio-top', { timeout: 10000 })
await page.click('.biblio-top .icono:has-text("Vocabulario")')
await page.waitForSelector('.voc-fila', { timeout: 8000 })
// Ahora se guarda todo lo que traduces, así que hay varias entradas: se busca
// la que interesa en vez de dar por hecho que es la única.
const laFila = page.locator('.voc-fila:has(.voc-en:text-is("he was over the moon about it"))')
paso('el vocabulario guarda lo consultado', (await laFila.count()) === 1,
  `${await page.locator('.voc-fila').count()} entradas en total`)
paso('sin duplicarla aunque se traduzca dos veces', (await laFila.count()) === 1)
paso('y su traducción', (await laFila.locator('.voc-es').textContent()) === RESPUESTA.natural)
const de = await laFila.locator('.voc-de').textContent()
paso('y de qué libro y página salió', /Crónica de una prueba · pág\. \d+/.test(de), de)

await page.screenshot({ path: `${SC}/t-vocabulario.png` })
const antesDeQuitar = await page.locator('.voc-fila').count()
await laFila.locator('.mas').click()
await page.waitForTimeout(500)
paso('se puede quitar una entrada',
  (await page.locator('.voc-fila').count()) === antesDeQuitar - 1 && (await laFila.count()) === 0,
  `${antesDeQuitar} → ${await page.locator('.voc-fila').count()}`)

// Quitar deja lápida en vez de borrar: sin ella la nube devolvería la frase en
// la siguiente sincronización, y con el guardado automático se quitan a menudo.
const lapida = await page.evaluate(() => new Promise(res => {
  const q = indexedDB.open('vellum')
  q.onsuccess = () => {
    const bd = q.result
    const t = bd.transaction('vocabulario', 'readonly').objectStore('vocabulario').getAll()
    t.onsuccess = () => res(t.result.filter(p => p.borrado).length)
  }
}))
paso('y queda marcada como quitada, no borrada del todo', lapida === 1, `${lapida} lápida(s)`)
paso('pero ya no se ve en la lista', (await laFila.count()) === 0)

console.log(errores.length ? `\nErrores de consola (${errores.length}):\n` + errores.join('\n') : '\nSin errores de consola.')
await browser.close()
