/**
 * Las series, ya montadas: la estantería, el orden y leer sin parar.
 *
 * Lo de `series.mjs` es la decisión —qué va antes que qué, dónde ibas—; esto es
 * lo que se ve. Aquí lo que puede romperse es lo que no se prueba solo: que la
 * tapa de la serie ocupe un sitio y no doce, que el orden **sobreviva a cerrar
 * la app**, y que pasarse del final del número tres abra el cuatro en vez de
 * echarte a la biblioteca.
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
const ctx = await browser.newContext({
  viewport: { width: 412, height: 900 }, deviceScaleFactor: 2, hasTouch: true,
})
const page = await ctx.newPage()
page.on('pageerror', e => errores.push(`pageerror: ${e.message}`))
page.on('console', m => { if (m.type() === 'error') errores.push(`console: ${m.text()}`) })

const T = '.campo input[placeholder="Cómo se llama"]'
const S = '.campo input[list="series-conocidas"]'
const LIBROS = '.rejilla .portada:not(.hueca)'
const folio = async () => (await page.textContent('.folio')).trim()
/** Un toque en el centro enseña la interfaz del lector; otro la esconde. */
const mostrarChrome = async () => {
  await page.click('.escena', { position: { x: 206, y: 450 } })
  await page.waitForTimeout(400)
}

/** Poner un libro en una serie desde su ficha. */
async function meterEnSerie(titulo, serie) {
  await page.click(`.rejilla .libro:has(.portada-tit:text-is("${titulo}")) .mas`)
  await page.waitForSelector('.ficha')
  await page.fill(S, serie)
  await page.click('.ficha-pie .btn:last-child')
  await page.waitForSelector('.ficha', { state: 'detached', timeout: 8000 })
  await page.waitForTimeout(300)
}

await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' })
await page.waitForSelector('.vacio')

await page.setInputFiles('input[type=file]', [
  `${SC}/Tomo_1.pdf`,
  `${SC}/Tomo_2.pdf`,
  `${SC}/Tomo_3.pdf`,
  `${SC}/Notas_sueltas.pdf`,
])
await page.waitForSelector(LIBROS, { timeout: 30000 })
await page.waitForTimeout(1200)
paso('parten como cuatro libros sueltos', (await page.locator(LIBROS).count()) === 4)
paso('y sin ninguna serie a la vista', (await page.locator('.libro.pila').count()) === 0)

/* --- Montar la serie --- */
await meterEnSerie('Tomo 1', 'Batman Absolute')
paso('un solo número ya hace serie', (await page.locator('.libro.pila').count()) === 1)
// Escrito distinto a propósito: nadie teclea el mismo nombre igual tres veces.
await meterEnSerie('Tomo 2', 'BATMAN ABSOLUTE')
await meterEnSerie('Tomo 3', 'batman absolute')

paso('**los tres números ocupan un solo sitio**', (await page.locator('.libro.pila').count()) === 1,
  'era justo lo que sobraba: tres tapas casi iguales en fila')
paso('y se dice cuántos son', (await page.textContent('.sello-serie')).trim() === '3')
paso('con el nombre debajo', (await page.textContent('.libro.pila .libro-sub')).trim() === 'Batman Absolute')
paso('el libro suelto sigue suelto', (await page.locator('.libro:not(.pila) .portada-tit:text-is("Notas sueltas")').count()) === 1)

/* --- El buscador encuentra por serie --- */
await page.fill('.buscador input', 'batman')
await page.waitForTimeout(300)
paso('buscar por la serie encuentra sus números', (await page.locator('.libro.pila').count()) === 1,
  'ninguno se llama «Batman» a secas')
await page.fill('.buscador input', '')
await page.waitForTimeout(300)

/* --- Dentro de la serie --- */
await page.click('.libro.pila .libro-abrir')
await page.waitForSelector('.serie-tit')
paso('entrar en la serie enseña su nombre', (await page.textContent('.serie-tit')).trim() === 'Batman Absolute')
paso('y dentro están los tres números', (await page.locator(LIBROS).count()) === 3)
paso('**con el botón de seguir leyendo arriba**', (await page.locator('.seguir-eti').textContent()) === 'Seguir leyendo')
paso('que apunta al primero, que es por donde se empieza',
  (await page.textContent('.seguir-tit')).trim() === 'Tomo 1')

const orden = async () => (await page.locator(`${LIBROS} .portada-tit`).allTextContents()).map(t => t.trim())
paso('el orden de partida sale del título', (await orden()).join(',') === 'Tomo 1,Tomo 2,Tomo 3')

/* --- Acomodar el orden --- */
await page.click('.libro:has(.portada-tit:text-is("Tomo 3")) .flecha[aria-label^="Subir"]')
await page.waitForTimeout(500)
paso('subir un número lo adelanta', (await orden()).join(',') === 'Tomo 1,Tomo 3,Tomo 2')
paso('y el primero no se puede subir más',
  await page.locator('.libro:has(.portada-tit:text-is("Tomo 1")) .flecha[aria-label^="Subir"]').isDisabled())
paso('ni el último bajar',
  await page.locator('.libro:has(.portada-tit:text-is("Tomo 2")) .flecha[aria-label^="Bajar"]').isDisabled())

// Lo que de verdad importa del orden: que siga ahí mañana.
await page.reload({ waitUntil: 'networkidle' })
await page.waitForSelector('.rejilla .libro')
await page.click('.libro.pila .libro-abrir')
await page.waitForSelector('.serie-tit')
paso('**el orden aguanta cerrar la app**', (await orden()).join(',') === 'Tomo 1,Tomo 3,Tomo 2',
  'un orden que se pierde al salir no es un orden')

// Y se deja como estaba, que lo de abajo cuenta con 1 → 2 → 3.
await page.click('.libro:has(.portada-tit:text-is("Tomo 3")) .flecha[aria-label^="Bajar"]')
await page.waitForTimeout(500)
paso('bajarlo lo devuelve a su sitio', (await orden()).join(',') === 'Tomo 1,Tomo 2,Tomo 3')

/* --- Leer sin parar --- */
await page.click('.seguir-abrir')
await page.waitForSelector('.escena canvas', { timeout: 20000 })
await page.waitForTimeout(800)
paso('seguir leyendo abre el número por donde iba', (await folio()) === '1 / 2')

await page.evaluate(() => document.activeElement?.blur?.())
await page.keyboard.press('ArrowRight')
await page.waitForTimeout(900)
paso('la última página del tomo se alcanza normal', (await folio()) === '2 / 2')
paso('y ahí se avisa de lo que viene', (await page.locator('.sigue-tit').count()) === 1)
paso('con el nombre del siguiente', (await page.textContent('.sigue-tit')).includes('Tomo 2'))

await page.keyboard.press('ArrowRight')
await page.waitForSelector('.escena canvas', { timeout: 20000 })
await page.waitForTimeout(1000)
paso('**pasarse del final abre el siguiente número**', (await folio()) === '1 / 2',
  'era lo pedido: terminar uno y que siga el otro')
await mostrarChrome()
paso('y es el siguiente de verdad', (await page.textContent('.titulo-lector')).trim() === 'Tomo 2')
paso('desde una serie, salir del lector vuelve a la serie',
  (await page.textContent('.chrome.arriba .icono.volver')).includes('serie'))
await mostrarChrome()

await page.keyboard.press('ArrowLeft')
await page.waitForSelector('.escena canvas', { timeout: 20000 })
await page.waitForTimeout(1000)
paso('volver desde la primera página devuelve al final del anterior', (await folio()) === '2 / 2')
await mostrarChrome()
paso('y al tomo anterior, no a otro', (await page.textContent('.titulo-lector')).trim() === 'Tomo 1')

// El último número no lleva a ninguna parte: ahí no hay nada que seguir.
await page.click('.chrome.arriba .icono.volver')
await page.waitForSelector('.serie-tit', { timeout: 10000 })
await page.click('.libro:has(.portada-tit:text-is("Tomo 3")) .libro-abrir')
await page.waitForSelector('.escena canvas', { timeout: 20000 })
await page.waitForTimeout(800)
await page.evaluate(() => document.activeElement?.blur?.())
await page.keyboard.press('ArrowRight')
await page.waitForTimeout(900)
paso('en el último número no se avisa de ninguno siguiente', (await page.locator('.sigue-tit').count()) === 0)
const enElUltimo = await folio()
await page.keyboard.press('ArrowRight')
await page.waitForTimeout(900)
paso('y pasarse del final ahí no hace nada', (await folio()) === enElUltimo,
  'no puede echarte a la biblioteca sin avisar')

/* --- El botón de atrás, capa por capa --- */
await page.goBack()
await page.waitForSelector('.serie-tit', { timeout: 8000 })
paso('atrás desde un número vuelve a la serie', (await page.locator('.serie-tit').count()) === 1)
await page.goBack()
await page.waitForSelector('.marca', { timeout: 8000 })
paso('y otra vez, a la estantería', (await page.locator('.libro.pila').count()) === 1)

/* --- Traer un suelto a la serie --- */
await page.click('.libro.pila .libro-abrir')
await page.waitForSelector('.serie-tit')
await page.click('.serie-anadir .btn')
await page.waitForSelector('.sueltos')
paso('los libros de fuera se ofrecen para meterlos', (await page.locator('.suelto').count()) === 1)
await page.click('.suelto')
await page.waitForTimeout(600)
paso('meter uno lo pone en la serie', (await page.locator(LIBROS).count()) === 4)
paso('y al final, no en medio', (await orden()).pop() === 'Notas sueltas')

/* --- Y sacarlo --- */
await page.click('.libro:has(.portada-tit:text-is("Notas sueltas")) .mas')
await page.waitForSelector('.ficha')
paso('la ficha recuerda en qué serie está', (await page.inputValue(S)) === 'Batman Absolute')
await page.fill(S, '')
await page.click('.ficha-pie .btn:last-child')
await page.waitForTimeout(700)
paso('vaciar el campo lo saca de la serie', (await page.locator(LIBROS).count()) === 3)

await page.click('.biblio-top .icono.volver')
await page.waitForSelector('.marca')
paso('y vuelve a estar suelto en la estantería',
  (await page.locator('.libro:not(.pila) .portada-tit:text-is("Notas sueltas")').count()) === 1)

paso('sin errores en la consola', errores.length === 0, errores.join(' · '))

await browser.close()
console.log(process.exitCode ? '\nHay fallos.' : '\nTodo en orden.')
