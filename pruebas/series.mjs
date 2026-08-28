/**
 * Las series, sin navegador.
 *
 * Aquí lo que puede salir mal es el **orden**, y el orden se equivoca en
 * silencio: nadie ve un error, simplemente el número 10 aparece antes que el 2
 * y «seguir leyendo» te manda al capítulo que no era. Por eso todo esto se
 * prueba sin pantalla, que es donde se ve de verdad.
 */
import { execSync } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const dir = mkdtempSync(join(tmpdir(), 'vellum-'))
const salida = join(dir, 'series.mjs')
execSync(`npx esbuild src/lib/series.ts --format=esm --outfile=${salida}`, { stdio: 'pipe' })
const { agrupar, anadirA, clavear, dondeIba, mover, nombresDeSerie, ordenar, vecino } =
  await import(salida)

let rojos = 0
const paso = (n, ok, extra = '') => {
  console.log(`${ok ? '  OK  ' : ' FALLA'} ${n}${extra ? ' — ' + extra : ''}`)
  if (!ok) rojos++
}
const titulos = xs => xs.map(x => x.titulo).join(',')

/** Un número de cómic, con lo justo para lo que se prueba aquí. */
const num = (titulo, extra = {}) => ({
  id: titulo,
  titulo,
  paginas: 30,
  pagina: 1,
  abiertoEn: 0,
  ...extra,
})

/* --- Agrupar --- */
const sueltoA = num('Dune')
const bat1 = num('Batman Absolute #1', { serie: 'Batman Absolute' })
const bat2 = num('Batman Absolute #2', { serie: 'BATMAN ABSOLUTE' })
const bat10 = num('Batman Absolute #10', { serie: 'batman  absolute' })

let g = agrupar([sueltoA, bat1, bat10, bat2])
paso('los libros sin serie quedan sueltos', titulos(g.sueltos) === 'Dune')
paso('los de la misma serie se juntan en una sola', g.series.length === 1)
paso('aunque esté escrita con otras mayúsculas o espacios', g.series[0].numeros.length === 3,
  'nadie escribe el nombre igual dos veces')
paso('y se enseña como lo escribió el primer número', g.series[0].nombre === 'Batman Absolute')

/* --- El orden, que es lo que importa --- */
paso('**el 2 va antes que el 10**', titulos(g.series[0].numeros).startsWith('Batman Absolute #1,Batman Absolute #2,'),
  'ordenar por texto pone el 10 antes que el 2')
paso('y el 10 al final', titulos(g.series[0].numeros).endsWith('#10'))

paso(
  'un orden puesto a mano manda sobre el título',
  titulos(ordenar([num('A', { orden: 1 }), num('B', { orden: 0 })])) === 'B,A',
)
paso(
  'y los que no lo tienen se van detrás, ordenados entre ellos',
  titulos(ordenar([num('C'), num('A', { orden: 0 }), num('B')])) === 'A,B,C',
)

/* --- Una serie de uno sigue siendo una serie --- */
g = agrupar([num('Solo', { serie: 'Colección' })])
paso('una serie con un solo número existe igual', g.series.length === 1,
  'si apareciera al llegar el segundo, el primero se movería solo')

/* --- Las series salen donde estaba su primer número --- */
g = agrupar([sueltoA, bat2, num('X', { serie: 'Otra' }), bat1])
paso('el orden de las series lo pone el primero que aparece', g.series[0].clave === 'batman absolute')
paso(
  '**el nombre no depende de por cuál empieces a mirar**',
  g.series[0].nombre === 'Batman Absolute',
  'la estantería se reordena sola, y la serie cambiaba de mayúsculas con ella',
)

/* --- Nombres para sugerir --- */
const nombres = nombresDeSerie([bat1, bat2, num('X', { serie: 'Otra' }), sueltoA])
paso('las series conocidas se ofrecen sin repetir', nombres.length === 2)
paso('y en orden alfabético', nombres[0] === 'Batman Absolute')

/* --- El de al lado --- */
const serie = agrupar([bat1, bat2, bat10]).series[0]
paso('después del 1 viene el 2', vecino(serie.numeros, bat1, 'siguiente')?.titulo === 'Batman Absolute #2')
paso('antes del 2 está el 1', vecino(serie.numeros, bat2, 'anterior')?.titulo === 'Batman Absolute #1')
paso('después del último no hay nada', vecino(serie.numeros, bat10, 'siguiente') === null)
paso('ni antes del primero', vecino(serie.numeros, bat1, 'anterior') === null)
paso('un libro que no es de la serie no tiene vecinos', vecino(serie.numeros, sueltoA, 'siguiente') === null)

/* --- Dónde iba --- */
const s = ns => ({ clave: 'x', nombre: 'X', numeros: ordenar(ns) })

paso(
  'sin empezar nada, seguir leyendo abre el primero',
  dondeIba(s([bat1, bat2, bat10]))?.libro.titulo === 'Batman Absolute #1',
)

let d = dondeIba(s([
  num('#1', { serie: 'X', pagina: 30, abiertoEn: 10, orden: 0 }),
  num('#2', { serie: 'X', pagina: 7, abiertoEn: 20, orden: 1 }),
]))
paso('con uno a medias, vuelve ahí', d?.libro.titulo === '#2' && d?.pagina === 7)

d = dondeIba(s([
  num('#1', { serie: 'X', pagina: 30, abiertoEn: 20, orden: 0 }),
  num('#2', { serie: 'X', pagina: 1, abiertoEn: 5, orden: 1 }),
]))
paso('**terminado uno, seguir leyendo es empezar el siguiente**', d?.libro.titulo === '#2' && d?.pagina === 1,
  'si no, el botón te devolvería a la última página de lo que ya leíste')

d = dondeIba(s([
  num('#1', { serie: 'X', pagina: 5, abiertoEn: 10, orden: 0 }),
  num('#2', { serie: 'X', pagina: 12, abiertoEn: 20, orden: 1 }),
]))
paso('con dos a medias, manda el último que abriste', d?.libro.titulo === '#2' && d?.pagina === 12)

d = dondeIba(s([
  num('#1', { serie: 'X', pagina: 5, abiertoEn: 30, orden: 0 }),
  num('#2', { serie: 'X', pagina: 12, abiertoEn: 20, orden: 1 }),
]))
paso('aunque sea uno de más atrás en la serie', d?.libro.titulo === '#1' && d?.pagina === 5,
  'volver a hojear el 1 y salir no puede mandarte al 2')

d = dondeIba(s([num('#1', { serie: 'X', pagina: 30, abiertoEn: 20, orden: 0 })]))
paso('y si no hay siguiente, se queda donde está', d?.libro.titulo === '#1' && d?.pagina === 30)

paso('una serie vacía no manda a ningún sitio', dondeIba(s([])) === null)

/* --- Mover --- */
let lista = mover([bat1, bat2, bat10], bat2.id, 'arriba')
paso('subir un número lo adelanta', titulos(lista).startsWith('Batman Absolute #2,Batman Absolute #1'))
paso('**y todos quedan con su orden escrito**', lista.every((l, i) => l.orden === i),
  'a medias, unos con orden y otros sin él, mover el tercero lo mandaba al final')

lista = mover([bat1, bat2, bat10], bat1.id, 'arriba')
paso('subir el primero no lo saca de la lista', titulos(lista) === titulos(ordenar([bat1, bat2, bat10])))
paso('y aun así deja el orden escrito', lista.every((l, i) => l.orden === i))

lista = mover([bat1, bat2, bat10], bat10.id, 'abajo')
paso('bajar el último tampoco lo pierde', lista.length === 3)

lista = mover([bat1, bat2, bat10], 'no-existe', 'abajo')
paso('mover algo que no está no rompe nada', lista.length === 3)

/* --- Añadir a una serie --- */
const conOrden = { clave: 'x', nombre: 'Batman Absolute', numeros: [num('a', { orden: 0 }), num('b', { orden: 1 })] }
let nuevo = anadirA(conOrden, sueltoA)
paso('un libro añadido a una serie entra con su nombre', nuevo.serie === 'Batman Absolute')
paso('y al final, no donde caiga por título', nuevo.orden === 2,
  'lo añades a mano porque el título no dice el número')

nuevo = anadirA({ clave: 'x', nombre: 'X', numeros: [num('a')] }, sueltoA)
paso('en una serie sin orden escrito, entra en el puesto 0', nuevo.orden === 0)

/* --- La clave --- */
paso('la clave ignora tildes y mayúsculas', clavear('  Crónica  DEL   Rey ') === 'cronica del rey')

console.log(rojos ? `\n${rojos} fallo(s)` : '\nTodo en orden.')
process.exitCode = rojos ? 1 : 0
