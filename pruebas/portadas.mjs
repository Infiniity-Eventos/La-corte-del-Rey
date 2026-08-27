/**
 * El encargo de las portadas, sin navegador.
 *
 * Lo que hay que vigilar aquí no es que el texto salga: es que **salga igual**.
 * La promesa de D-13 es que cincuenta portadas hechas en cincuenta momentos
 * distintos parezcan una colección, y eso se rompe el día que alguien meta una
 * variable dentro del bloque de estilo sin darse cuenta. Un cambio así no da
 * ningún error: simplemente, a los seis meses la biblioteca deja de verse
 * entera. Estas comprobaciones son lo único que lo notaría.
 */
import { execSync } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const dir = mkdtempSync(join(tmpdir(), 'vellum-'))
const salida = join(dir, 'portadas.mjs')
execSync(`npx esbuild src/lib/portadas.ts --format=esm --outfile=${salida}`, { stdio: 'pipe' })
const { promptPortada, GENERADOR } = await import(salida)

let rojos = 0
const paso = (n, ok, extra = '') => {
  console.log(`${ok ? '  OK  ' : ' FALLA'} ${n}${extra ? ' — ' + extra : ''}`)
  if (!ok) rojos++
}

const libro = (extra = {}) => ({
  id: 'x', hash: 'h', titulo: 'La sombra del viento', tipo: 'libro',
  etiquetas: ['misterio', 'barcelona'], paginas: 100, bytes: 1000,
  archivo: 'x.pdf', anadidoEn: 0, pagina: 1, abiertoEn: 0, ...extra,
})

/* --- Lo que dice del libro --- */
const a = promptPortada(libro())
paso('nombra el título entre comillas', a.includes('Obra: «La sombra del viento»'))
paso('pone las etiquetas como temas', a.includes('Temas: misterio, barcelona'))
paso('dice que es un libro', a.includes('portada para libro'))
paso('y cómic cuando lo es',
  promptPortada(libro({ tipo: 'comic' })).includes('portada para cómic'))

/* --- El estilo, que es lo que hace la colección --- */
paso('impone la paleta y la cierra', a.includes('#EDE6D6') && a.includes('Ningún otro color'))
paso('pide 2:3 vertical', a.includes('vertical 2:3'))
paso('prohíbe los rostros', a.includes('Nada de personajes con rostro'))
paso('deja sitio para el título', a.includes('tercio inferior despejado'))
paso('y prohíbe que el generador escriba nada',
  a.includes('No escribas ningún texto en la imagen'))
paso('invita a recoger la obra, sin heredar su estilo',
  a.includes('El formato manda siempre'))

/* --- La promesa: solo cambia el sujeto --- */
const b = promptPortada(libro({
  titulo: 'Watchmen', tipo: 'comic', etiquetas: ['superhéroes'],
}))
// El estilo empieza donde deja de hablarse de este libro en concreto.
const MARCA = 'Si conoces esta obra'
const estilo = t => t.slice(t.indexOf(MARCA))
const encabezado = t => t.slice(0, t.indexOf(MARCA))

paso('el estilo se encuentra donde debe', a.includes(MARCA) && estilo(a).length > 400)
paso('**entre dos obras distintas, el estilo es idéntico palabra por palabra**',
  estilo(a) === estilo(b),
  estilo(a) === estilo(b) ? `${estilo(a).length} caracteres iguales` : 'se ha ido por su lado')
paso('y lo que las distingue va todo en el encabezado',
  encabezado(a) !== encabezado(b))
paso('cada una nombra su propia obra, y solo la suya',
  a.includes('«La sombra del viento»') && !a.includes('Watchmen')
  && b.includes('«Watchmen»') && !b.includes('La sombra del viento'))

/* --- Las líneas que no tienen nada que decir no se ponen --- */
const sinNada = promptPortada(libro({ etiquetas: [] }))
paso('sin etiquetas no hay línea de temas vacía', !sinNada.includes('Temas:'))
paso('sin nombre de archivo tampoco', !sinNada.includes('Nombre del archivo'))
paso('con nombre de archivo, lo incluye',
  promptPortada(libro({ nombreOriginal: 'Watchmen_v01_ES_1986.pdf' }))
    .includes('Nombre del archivo original: Watchmen_v01_ES_1986.pdf'))

/* --- Detalles que se rompen solos --- */
paso('el título se recorta',
  promptPortada(libro({ titulo: '  Rayuela  ' })).includes('Obra: «Rayuela»'))
paso('no quedan llaves de plantilla sin rellenar', !/\{[a-zá-ú|-]+\}/.test(a), a.match(/\{[^}]*\}/)?.[0] ?? '')
paso('el generador es la web de Gemini', GENERADOR === 'https://gemini.google.com/app')

console.log(rojos ? `\n${rojos} fallo(s)` : '\nTodo en orden.')
process.exitCode = rojos ? 1 : 0
