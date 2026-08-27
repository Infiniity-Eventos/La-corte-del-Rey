import { chromium } from 'playwright'

const SC = process.env.SC ?? '/tmp'
const errores = []
const paso = (n, ok, extra = '') => {
  console.log(`${ok ? '  OK  ' : ' FALLA'} ${n}${extra ? ' — ' + extra : ''}`)
  if (!ok) process.exitCode = 1
}

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
const ctx = await browser.newContext({
  viewport: { width: 412, height: 900 }, deviceScaleFactor: 2, hasTouch: true,
  // Para poder leer lo que el botón «Crear portada» deja en el portapapeles.
  permissions: ['clipboard-read', 'clipboard-write'],
})
// El generador no existe desde aquí. Se responde en su lugar para que abrirlo
// no deje la prueba esperando a una red que no hay.
await ctx.route('**://gemini.google.com/**', r => r.fulfill({ contentType: 'text/html', body: 'ok' }))
const page = await ctx.newPage()
page.on('pageerror', e => errores.push(`pageerror: ${e.message}`))
page.on('console', m => { if (m.type() === 'error') errores.push(`console: ${m.text()}`) })

const T = '.campo input[placeholder="Cómo se llama"]'
const E = '.campo input[placeholder^="Escribe"]'
// El hueco de «Traer un PDF» también es una portada: para contar libros de
// verdad hay que dejarlo fuera.
const LIBROS = '.rejilla .portada:not(.hueca)'
const titulos = () => page.locator(`${LIBROS} .portada-tit`).allTextContents()

async function ficha(titulo, nuevoTitulo, tipo, etiquetas) {
  await page.click(`.rejilla .libro:has(.portada-tit:text-is("${titulo}")) .mas`)
  await page.waitForSelector('.ficha')
  await page.fill(T, nuevoTitulo)
  if (tipo === 'comic') await page.click('.segmento-op:nth-child(2)')
  for (const e of etiquetas) {
    await page.fill(E, e)
    await page.keyboard.press('Enter')
  }
  await page.click('.ficha-pie .btn:last-child')
  await page.waitForSelector('.ficha', { state: 'detached', timeout: 8000 })
  await page.waitForTimeout(300)
}

await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' })
await page.waitForSelector('.vacio')

/* --- Traer varios de golpe --- */
await page.setInputFiles('input[type=file]', [
  `${SC}/Cronica_de_una_prueba.pdf`,
  `${SC}/Manual_de_vuelo.pdf`,
  `${SC}/El_jardin_de_al_lado.pdf`,
  `${SC}/Notas_sueltas.pdf`,
])
await page.waitForSelector(LIBROS, { timeout: 30000 })
await page.waitForTimeout(1200)
paso('trae cuatro PDF de una vez', (await page.locator(LIBROS).count()) === 4)
paso('con varios no interroga con la ficha', (await page.locator('.ficha').count()) === 0)
paso('el buscador aparece con la estantería llena', (await page.locator('.buscador input').count()) === 1)

/* --- La ficha se abre sola con uno solo (P42) --- */
await page.setInputFiles('input[type=file]', `${SC}/Prueba_de_Lectura.pdf`)
await page.waitForSelector('.ficha', { timeout: 20000 })
paso('traer un solo PDF abre su ficha', true)
paso('propone título limpio desde el archivo', (await page.inputValue(T)) === 'Prueba de Lectura')
paso('empieza como libro, no como cómic', (await page.getAttribute('.segmento-op', 'aria-pressed')) === 'true')
await page.click('.ficha-pie .btn.fantasma')
await page.click('.ficha-pie .btn.peligro')
await page.waitForTimeout(700)
paso('se puede quitar desde la ficha', (await page.locator(LIBROS).count()) === 4)

/* --- Título, tipo y etiquetas --- */
await ficha('Cronica de una prueba', 'Crónica de una prueba', 'comic', ['Aventura', 'pendiente'])
paso('el título nuevo va en la portada', (await titulos()).includes('Crónica de una prueba'))

await page.click('.rejilla .libro:has(.portada-tit:text-is("Crónica de una prueba")) .mas')
await page.waitForSelector('.ficha')
paso('guardó que es cómic', (await page.getAttribute('.segmento-op:nth-child(2)', 'aria-pressed')) === 'true')
const chips = await page.locator('.ficha .fichas:not(.sueltas) .ficha-eti').allTextContents()
paso('guardó las etiquetas', chips.length === 2, chips.join(', '))
paso('las normaliza a minúsculas', chips[0].startsWith('aventura'), chips[0])
await page.fill(E, 'aventura')
await page.keyboard.press('Enter')
paso('no repite una etiqueta ya puesta',
  (await page.locator('.ficha .fichas:not(.sueltas) .ficha-eti').count()) === 2)
await page.click('.ficha .fichas:not(.sueltas) .ficha-eti:has-text("pendiente")')
paso('se puede quitar una etiqueta',
  (await page.locator('.ficha .fichas:not(.sueltas) .ficha-eti').count()) === 1)
await page.keyboard.press('Escape')
await page.waitForTimeout(300)
paso('salir con Escape no guarda',
  (await page.locator('.filtros .ficha-eti:has-text("pendiente")').count()) === 1)

await ficha('Manual de vuelo', 'Manual de vuelo', 'libro', ['técnico'])

/* --- Sugerencias --- */
await page.click('.rejilla .libro:has(.portada-tit:text-is("Notas sueltas")) .mas')
await page.waitForSelector('.ficha')
const sug = await page.locator('.ficha .fichas.sueltas .ficha-eti').allTextContents()
paso('sugiere etiquetas que ya usaste', sug.length >= 2, sug.join(', '))
await page.click('.ficha .fichas.sueltas .ficha-eti:has-text("técnico")')
paso('tocar una sugerencia la añade',
  (await page.locator('.ficha .fichas:not(.sueltas) .ficha-eti').count()) === 1)
await page.keyboard.press('Escape')
await page.waitForTimeout(300)

/* --- Recargar --- */
await page.reload({ waitUntil: 'networkidle' })
await page.waitForSelector(LIBROS)
paso('los cambios sobreviven a recargar', (await titulos()).includes('Crónica de una prueba'))

/* --- Filtrar por etiqueta (P38) --- */
await page.click('.filtros .ficha-eti:has-text("técnico")')
await page.waitForTimeout(350)
paso('filtrar deja solo lo suyo', (await page.locator(LIBROS).count()) === 1)
paso('el filtro se ve activo',
  (await page.getAttribute('.filtros .ficha-eti:has-text("técnico")', 'aria-pressed')) === 'true')
await page.click('.filtros .ficha-eti:has-text("técnico")')
await page.waitForTimeout(350)
paso('volver a tocarlo lo quita', (await page.locator(LIBROS).count()) === 4)

/* --- Buscar (R27 / P41) --- */
const buscar = async q => { await page.fill('.buscador input', q); await page.waitForTimeout(320) }
await buscar('manual')
paso('busca por título', (await titulos()).join() === 'Manual de vuelo')
await buscar('cronica')
paso('busca sin tildes y encuentra con tilde', (await titulos()).join() === 'Crónica de una prueba')
await buscar('AVENTURA')
paso('busca por etiqueta y sin distinguir mayúsculas', (await page.locator(LIBROS).count()) === 1)
await buscar('zzzz')
paso('sin resultados lo dice con palabras', (await page.locator('.sin-nada').count()) === 1)
await buscar('')

/* --- Portada propia (P40 / D-15) --- */
await page.click('.rejilla .libro:has(.portada-tit:text-is("Crónica de una prueba")) .mas')
await page.waitForSelector('.ficha')
await page.setInputFiles('.ficha input[type=file]', `${SC}/portada.png`)
await page.waitForTimeout(600)
paso('acepta una portada propia', (await page.locator('.ficha .portada-img').count()) === 1)
paso('el título se compone encima de la imagen (D-15)',
  (await page.locator('.ficha .portada.conImagen .portada-tit').count()) === 1)
await page.click('.ficha-pie .btn:last-child')
await page.waitForTimeout(800)
paso('la portada aparece en la estantería', (await page.locator('.rejilla .portada-img').count()) === 1)
await page.reload({ waitUntil: 'networkidle' })
await page.waitForSelector(LIBROS)
paso('la portada sobrevive a recargar', (await page.locator('.rejilla .portada-img').count()) === 1)

/* --- Crear portada: el encargo (D-13 / hito 5) --- */
await page.click('.rejilla .libro:has(.portada-tit:text-is("Notas sueltas")) .mas')
await page.waitForSelector('.ficha')
// Se cambia el tipo y se añade una etiqueta SIN guardar: el encargo tiene que
// llevarse lo que estás editando ahora, no lo que hay guardado.
await page.click('.ficha .segmento-op:has-text("Cómic")')
await page.fill(T, 'Tinta y ceniza')
await page.fill(E, 'grabado')
await page.press(E, 'Enter')

const emergente = ctx.waitForEvent('page', { timeout: 8000 }).catch(() => null)
await page.click('.ficha-acciones .btn:has-text("Crear portada")')
await page.waitForSelector('.encargo', { timeout: 8000 })
const encargo = await page.textContent('.encargo-txt')

paso('«Crear portada» enseña el encargo', encargo.length > 500)
paso('dice que lo copió', (await page.textContent('.encargo-tit')) === 'Encargo copiado')
paso('el encargo lleva el título que estás escribiendo',
  encargo.includes('Obra: «Tinta y ceniza»'))
paso('y el tipo que acabas de marcar, sin haber guardado',
  encargo.includes('portada para cómic'))
paso('y la etiqueta que acabas de poner', encargo.includes('grabado'))
paso('lleva el nombre del archivo original',
  /Nombre del archivo original: .+\.pdf/.test(encargo), (encargo.match(/Nombre.*/) || [''])[0])
paso('impone la paleta de la casa', encargo.includes('Ningún otro color'))
paso('y le prohíbe escribir el título (D-15)',
  encargo.includes('No escribas ningún texto en la imagen'))

const enPortapapeles = await page.evaluate(() => navigator.clipboard.readText())
paso('lo que se ve es exactamente lo que se copió',
  enPortapapeles.trim() === encargo.trim())

const gemini = await emergente
paso('abre el generador', gemini !== null && /gemini\.google\.com/.test(gemini.url()),
  gemini ? gemini.url() : 'no se abrió ninguna ventana')
if (gemini) await gemini.close()

paso('dice qué hacer al volver',
  /vuelve aquí y pulsa/.test(await page.textContent('.encargo-pista')))
await page.click('.encargo .icono')
paso('el encargo se puede cerrar', (await page.locator('.encargo').count()) === 0)
await page.keyboard.press('Escape')
await page.waitForTimeout(300)

/* --- Leer y volver: el destacado (R25 / P39) --- */
await page.click('.rejilla .libro:has(.portada-tit:text-is("Manual de vuelo")) .libro-abrir')
await page.waitForSelector('.hoja.debajo canvas', { timeout: 25000 })
const caja = await page.locator('.escena').boundingBox()
const y = caja.y + caja.height / 2
await page.mouse.move(caja.x + caja.width * 0.85, y)
await page.mouse.down()
for (let i = 1; i <= 10; i++) { await page.mouse.move(caja.x + caja.width * (0.85 - 0.72 * (i / 10)), y); await page.waitForTimeout(14) }
await page.mouse.up()
await page.waitForTimeout(900)
await page.click('.escena', { position: { x: 200, y: 430 } })
await page.click('.chrome.arriba .icono:first-child')
await page.waitForSelector('.seguir', { timeout: 10000 })
paso('lo empezado sube arriba del todo',
  (await page.textContent('.seguir-tit')) === 'Manual de vuelo')

await buscar('cronica')
paso('al buscar no se destaca nada', (await page.locator('.seguir').count()) === 0)
await buscar('')

/* --- Quitar --- */
const antes = await page.locator(LIBROS).count()
await page.click('.rejilla .libro:has(.portada-tit:text-is("Notas sueltas")) .mas')
await page.waitForSelector('.ficha')
await page.click('.ficha-pie .btn.fantasma')
paso('pregunta antes de borrar', (await page.locator('.ficha-pregunta').count()) === 1)
await page.click('.ficha-pie .btn.peligro')
await page.waitForTimeout(900)
paso('quitar un libro lo quita', (await page.locator(LIBROS).count()) === antes - 1)
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(1300)
paso('el borrado sobrevive a recargar', (await page.locator(LIBROS).count()) === antes - 1)

/* --- La versión, al pie de la estantería --- */
const version = (await page.textContent('.version')).trim()
paso('la versión se ve en el inicio', /^Vellum [0-9a-f]{7} · /.test(version), version)
await page.click('.version')
await page.waitForSelector('.aviso', { timeout: 10000 })
paso('tocarla comprueba si hay algo más nuevo',
  /última versión/.test(await page.textContent('.aviso')),
  (await page.textContent('.aviso')).trim())

await page.screenshot({ path: `${SC}/b-final.png` })
console.log(errores.length ? `\nErrores de consola (${errores.length}):\n` + errores.join('\n') : '\nSin errores de consola.')
await browser.close()

