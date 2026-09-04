/**
 * Traer cómics y colecciones: CBZ sueltos y zips con cosas dentro.
 *
 * Lo que se prueba aquí no es «se abre el zip» —de eso se encarga `zip.mjs` sin
 * navegador— sino lo que pasa después: que un CBZ **se lea de verdad**, que sus
 * páginas salgan en el orden en que las leería una persona, y que un zip con
 * doce tomos entre como doce libros y no como uno roto.
 */
import { chromium } from 'playwright'
import { exigirCompilacionAlDia } from './fresco.mjs'

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

const LIBROS = '.rejilla .portada:not(.hueca)'
const T = '.campo input[placeholder="Cómo se llama"]'
/**
 * Traer archivos y quedarse con lo que la app cuenta al terminar.
 *
 * El aviso se va solo a los pocos segundos, así que se lee aquí mismo: leerlo
 * más tarde es leer una pantalla vacía y confundir eso con un fallo.
 */
const traer = async (...nombres) => {
  await page.setInputFiles('input[type=file]', nombres.map(n => `${SC}/${n}`))
  await page.waitForSelector('.importando', { state: 'detached', timeout: 40000 })
  await page.waitForTimeout(500)
  // Cuando todo va bien es un aviso que se va solo; cuando algo falla es un
  // resumen que se queda, con el porqué. Se lee lo que haya y se cierra, que si
  // no tapa lo de debajo.
  const dicho = ((await page.textContent('.aviso span').catch(() => '')) ?? '')
    + ((await page.textContent('.resumen').catch(() => '')) ?? '')
  if (await page.locator('.resumen').count()) {
    await page.click('.resumen .icono')
    await page.waitForTimeout(200)
  }
  return dicho
}
const folio = async () => (await page.textContent('.folio')).trim()
/** Salir del lector, enseñando la interfaz antes si estaba escondida. */
const salir = async () => {
  for (let i = 0; i < 4; i++) {
    if ((await page.getAttribute('.chrome.arriba', 'data-visible')) === 'true') break
    await page.click('.escena', { position: { x: 206, y: 450 } })
    await page.waitForTimeout(400)
  }
  await page.click('.chrome.arriba .icono.volver')
  await page.waitForSelector('.rejilla .libro', { timeout: 10000 })
}

/** El tamaño real del lienzo que se está enseñando. */
const hoja = () => page.evaluate(() => {
  const c = document.querySelector('.hoja.debajo canvas')
  return c ? { w: c.clientWidth, h: c.clientHeight } : null
})

await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' })
await page.waitForSelector('.vacio')
paso('la estantería vacía invita a traer también cómics',
  (await page.textContent('.vacio p')).includes('CBZ'))
// El selector no puede filtrar por tipo: en Android eso esconde los zip, que es
// justo lo que había que poder elegir.
paso('**el selector de archivos no filtra por tipo**',
  (await page.getAttribute('input[type=file]', 'accept')) === null,
  'con filtro, en el teléfono solo se veían los PDF')

/* --- Un CBZ suelto --- */
await traer('Tomo_solo.cbz')
await page.waitForSelector('.ficha', { timeout: 20000 })
paso('un CBZ entra como un libro más', true)
paso('**y cuenta sus páginas**', (await page.textContent('.ficha-datos')).includes('3 pág.'),
  (await page.textContent('.ficha-datos')).trim())
paso('y nace marcado como cómic, no como libro',
  (await page.getAttribute('.segmento-op:nth-child(2)', 'aria-pressed')) === 'true')
paso('el ComicInfo.xml no cuenta como página',
  !(await page.textContent('.ficha-datos')).includes('4 pág.'))
await page.click('.ficha-pie .btn:last-child')
await page.waitForSelector('.rejilla .libro', { timeout: 10000 })

/* --- Y se lee --- */
await page.click('.rejilla .libro:first-child .libro-abrir')
await page.waitForSelector('.hoja.debajo canvas', { timeout: 20000 })
await page.waitForTimeout(700)
paso('**un cómic en CBZ se abre y se dibuja**', (await folio()) === '1 / 3')
const primera = await hoja()
paso('la primera página es alta, como su imagen', primera.h > primera.w,
  `${primera.w}×${primera.h}`)

await page.evaluate(() => document.activeElement?.blur?.())
await page.keyboard.press('ArrowRight')
await page.waitForTimeout(1200)
paso('se pasa de página igual que en un PDF', (await folio()) === '2 / 3')
const segunda = await hoja()
paso('**y la segunda es la que toca, no la que ordenaría un ordenador**',
  segunda.w > segunda.h,
  `${segunda.w}×${segunda.h} · ordenado como texto, aquí saldría «10.png», que es alta`)

/* --- No tiene texto, y se dice --- */
await page.click('.escena', { position: { x: 206, y: 450 } })
await page.waitForTimeout(400)
await page.click('.chrome.abajo .icono:has-text("Seleccionar")')
await page.waitForTimeout(900)
paso('en un escaneado se dice que no hay texto que seleccionar',
  (await page.textContent('.aviso.modo')).includes('es una imagen'))
await page.click('.aviso.modo button')
await page.waitForTimeout(300)
await salir()

/* --- Un zip con una colección dentro --- */
const dijo = await traer('Coleccion Batman.zip')
paso('**un zip trae todos los libros que lleva dentro**',
  (await page.locator('.libro.pila').count()) === 1 && (await page.textContent('.sello-serie')).trim() === '3',
  `${await page.locator(LIBROS).count()} casillas en la estantería`)
paso('con varios dentro no interroga con la ficha', (await page.locator('.ficha').count()) === 0)
paso('y lo cuenta al terminar', dijo.includes('3 libros añadidos'), dijo)
paso('**la carpeta de dentro les da nombre de serie**',
  (await page.textContent('.libro.pila .libro-sub')).trim() === 'Batman Absolute',
  'un zip de una colección ya viene ordenado; solo hay que no perderlo')

await page.click('.libro.pila .libro-abrir')
await page.waitForSelector('.serie-tit', { timeout: 8000 })
const orden = (await page.locator(`${LIBROS} .portada-tit`).allTextContents()).map(t => t.trim())
paso('y quedan en el orden en que venían', orden.join(',') === '01,02,03', orden.join(','))
paso('el leeme.txt no entra como libro', orden.length === 3)
await page.click('.biblio-top .icono.volver')
await page.waitForSelector('.rejilla .libro')

/* --- Traer el mismo zip otra vez no duplica --- */
const otraVez = await traer('Coleccion Batman.zip')
paso('**el mismo zip dos veces no duplica nada**', otraVez.includes('ya estaban'), otraVez)
paso('y la estantería no crece', (await page.textContent('.sello-serie')).trim() === '3')

/* --- Mezcla de formatos, sin carpeta común --- */
const mezcla = await traer('Mezcla.zip')
paso('un zip con un PDF y un CBZ mete los dos', mezcla.includes('2 libros'), mezcla)
paso('sin carpeta dentro, la serie se llama como el zip',
  (await page.locator('.libro.pila:has-text("Mezcla")').count()) === 1)

/* --- Borrar y volver a traer: la lápida no puede bloquearlo --- */
// Al borrar queda una lápida con el hash, para que la nube no lo resucite. Esa
// lápida bloqueaba volver a traer el archivo: el libro no se veía y la app
// decía «ya estaba en la estantería», sin forma de salir de ahí.
// Puede estar en la rejilla o arriba, en «seguir leyendo»: se le dejó a medias
// unas líneas más arriba.
const suyo = ':is(.seguir, .libro):has(.portada-tit:text-is("Tomo solo"))'
await page.locator(`${suyo} .mas`).first().click()
await page.waitForSelector('.ficha')
await page.click('.ficha-pie .btn.fantasma')
await page.click('.ficha-pie .btn.peligro')
await page.waitForTimeout(800)
paso('un cómic se quita de la estantería',
  (await page.locator('.portada-tit:text-is("Tomo solo")').count()) === 0)

const vuelve = await traer('Tomo_solo.cbz')
paso('**y volver a traerlo lo devuelve**', vuelve.includes('1 libro añadido'), vuelve)
// Solo en la estantería: la ficha se abre sola al traer uno suelto y enseña su
// portada, que cuenta como otra aparición del título.
paso('y está otra vez en la estantería',
  (await page.locator(':is(.rejilla, .seguir) .portada-tit:text-is("Tomo solo")').count()) === 1,
  `${await page.locator('.portada-tit:text-is("Tomo solo")').count()} en pantalla`)
if (await page.locator('.ficha').count()) {
  await page.click('.ficha-pie .btn:last-child')
  await page.waitForTimeout(400)
}
await page.locator(`${suyo} :is(.seguir-abrir, .libro-abrir)`).first().click()
await page.waitForSelector('.hoja.debajo canvas', { timeout: 25000 })
await page.waitForTimeout(600)
paso('**y se abre: el archivo volvió, no solo la ficha**', (await folio()).endsWith('/ 3'),
  await folio())
await salir()

/* --- Un CBR de verdad: RAR, no un zip con el nombre cambiado --- */
const rar = await traer('Tomo_rar.cbr')
paso('**un CBR en RAR de verdad entra**', rar.includes('1 libro añadido'), rar)
await page.waitForSelector('.ficha', { timeout: 30000 })
paso('con sus páginas contadas', (await page.textContent('.ficha-datos')).includes('3 pág.'),
  (await page.textContent('.ficha-datos')).trim())
paso('y sin arrastrar el .cbr en el título', !(await page.inputValue(T)).includes('.cbr'),
  await page.inputValue(T))
await page.click('.ficha-pie .btn:last-child')
await page.waitForSelector('.rejilla .libro', { timeout: 10000 })

await page.click('.rejilla .libro:has(.portada-tit:text-is("Tomo rar")) .libro-abrir')
await page.waitForSelector('.hoja.debajo canvas', { timeout: 25000 })
await page.waitForTimeout(700)
paso('se abre y se dibuja como cualquier otro', (await folio()) === '1 / 3')
await page.evaluate(() => document.activeElement?.blur?.())
await page.keyboard.press('ArrowRight')
await page.waitForTimeout(1200)
const dosRar = await hoja()
paso('**y sus páginas quedan en el orden bueno**', dosRar.w > dosRar.h,
  `${dosRar.w}×${dosRar.h} · ordenado como texto, la segunda sería «10.png», que es alta`)
await salir()

// Convertir dos veces el mismo CBR tiene que dar el mismo cómic, byte a byte:
// si no, cada vez entraría como uno nuevo.
const otraVezRar = await traer('Tomo_rar.cbr')
paso('**convertir el mismo CBR dos veces no crea otro libro**',
  otraVezRar.includes('ya estaba'), otraVezRar)

/* --- Una colección con un RAR dentro --- */
const conRarDentro = await traer('Con_rar.zip')
paso('un zip con un RAR dentro los mete todos', conRarDentro.includes('2 libros añadidos'), conRarDentro)
paso('y quedan juntos en su serie',
  (await page.locator('.libro.pila:has-text("Serie X")').count()) === 1)

/* --- Como llegan de verdad: .cbr y .cbz mezclados --- */
const mixto = await traer('Mixto.zip')
paso('**un .cbr que por dentro es un zip entra igual**', mixto.includes('3 libros añadidos'), mixto)
paso('y el que sí es RAR se convierte al traerlo', !mixto.includes('no se pudo'), mixto)
await page.click('.libro.pila:has-text("Rick y Morty") .libro-abrir')
await page.waitForSelector('.serie-tit', { timeout: 8000 })
const rym = (await page.locator(`${LIBROS} .portada-tit`).allTextContents()).map(t => t.trim())
paso('los tres quedan en su serie y en orden',
  rym.length === 3 && /v01/i.test(rym[0]) && /v03/i.test(rym[2]), rym.join(' · '))
paso('y sin arrastrar la extensión en el título', !rym.some(t => /\.(cbr|cbz)/i.test(t)),
  rym.join(' · '))
await page.click('.biblio-top .icono.volver')
await page.waitForSelector('.rejilla .libro')

/* --- Lo que no lleva nada --- */
// Antes de leerlo, se comprueba que el resumen se queda quieto: un fallo que
// desaparece en tres segundos no se llega a leer.
await page.setInputFiles('input[type=file]', `${SC}/Vacio.zip`)
await page.waitForSelector('.resumen', { timeout: 20000 })
await page.waitForTimeout(4500)
paso('**el resumen de lo que falló no se va solo**', (await page.locator('.resumen').count()) === 1,
  'con doce tomos, saber cuáles no entraron es lo único que sirve')
const vacio = (await page.textContent('.resumen')) ?? ''
paso('**un zip sin nada dentro lo dice con palabras**',
  vacio.includes('no hay ningún PDF ni CBZ'), vacio.replace(/\s+/g, ' ').trim())
paso('y dice cuántos por cada motivo', vacio.includes('1'), vacio.replace(/\s+/g, ' ').trim())
await page.click('.resumen .icono')
await page.waitForTimeout(300)
paso('y se cierra cuando lo cierras', (await page.locator('.resumen').count()) === 0)

const roto = await traer('Solo_rar.zip')
paso('y un CBR que no hay por dónde cogerlo se dice, sin tumbar nada',
  roto.includes('no tiene ninguna imagen'), roto.replace(/\s+/g, ' ').trim())

// Se ve todo en el selector, así que elegir una foto por error es fácil.
const foto = await traer('portada.png')
paso('**una foto no se cuela como libro, y se dice en una frase**',
  foto.includes('no es un PDF ni un cómic'), foto)

paso('sin errores en la consola', errores.length === 0, errores.join(' · '))

await browser.close()
console.log(process.exitCode ? '\nHay fallos.' : '\nTodo en orden.')
