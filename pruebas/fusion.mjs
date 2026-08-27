/**
 * La fusión, probada sin red, sin cuenta y sin navegador.
 *
 * Es la parte de la sincronización que puede fallar en silencio: perder una
 * nota, resucitar un libro borrado, mandar de vuelta lo que acabas de quitar.
 * Nada de eso da un error en pantalla, así que aquí se comprueba a mano.
 */
import { execSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// El módulo está en TypeScript; se compila al vuelo con esbuild, que ya viene
// con Vite. Así la prueba mira el código de verdad y no una copia.
const dir = mkdtempSync(join(tmpdir(), 'vellum-'))
const salida = join(dir, 'fusion.mjs')
execSync(`npx esbuild src/lib/fusion.ts --format=esm --outfile=${salida}`, { stdio: 'pipe' })
const { fusionar, lapida } = await import(salida)

let rojos = 0
const paso = (n, ok, extra = '') => {
  console.log(`${ok ? '  OK  ' : ' FALLA'} ${n}${extra ? ' — ' + extra : ''}`)
  if (!ok) rojos++
}
const ids = xs => xs.map(x => x.id).sort().join(',')

/* --- Lo que solo está en un lado, viaja al otro --- */
let f = fusionar([{ id: 'a', actualizadoEn: 1 }], [])
paso('lo que solo está aquí se manda a la nube', ids(f.paraAlla) === 'a')
paso('y no se pide nada de vuelta', f.paraAqui.length === 0)

f = fusionar([], [{ id: 'b', actualizadoEn: 1 }])
paso('lo que solo está en la nube se trae', ids(f.paraAqui) === 'b')

/* --- Con el mismo en los dos lados, gana el más reciente --- */
f = fusionar([{ id: 'c', actualizadoEn: 20 }], [{ id: 'c', actualizadoEn: 10 }])
paso('gana la versión más reciente, y aquí es la de aquí', ids(f.paraAlla) === 'c' && f.paraAqui.length === 0)

f = fusionar([{ id: 'c', actualizadoEn: 10 }], [{ id: 'c', actualizadoEn: 20 }])
paso('y al revés, la de la nube', ids(f.paraAqui) === 'c' && f.paraAlla.length === 0)

f = fusionar([{ id: 'c', actualizadoEn: 5 }], [{ id: 'c', actualizadoEn: 5 }])
paso('si están iguales no se mueve nada',
  f.paraAqui.length === 0 && f.paraAlla.length === 0 && f.quitarAqui.length === 0)

/* --- Borrar tiene que ser posible --- */
f = fusionar([{ id: 'd', actualizadoEn: 5 }], [{ id: 'd', actualizadoEn: 9, borrado: true }])
paso('un borrado más reciente se aplica aquí', f.quitarAqui.join() === 'd')
paso('y no se trae el libro de vuelta', f.paraAqui.length === 0)

f = fusionar([], [{ id: 'e', actualizadoEn: 9, borrado: true }])
paso('un borrado que aquí ya no existe no resucita nada',
  f.paraAqui.length === 0 && f.quitarAqui.length === 0)

f = fusionar([{ id: 'g', actualizadoEn: 30 }], [{ id: 'g', actualizadoEn: 9, borrado: true }])
paso('si lo volviste a añadir después del borrado, se queda',
  ids(f.paraAlla) === 'g' && f.quitarAqui.length === 0)

const l = lapida('h')
paso('la lápida lleva fecha y marca de borrado', l.borrado === true && l.actualizadoEn > 0)

/* --- Varios a la vez, que es lo normal --- */
f = fusionar(
  [{ id: '1', actualizadoEn: 10 }, { id: '2', actualizadoEn: 5 }, { id: '3', actualizadoEn: 1 }],
  [{ id: '2', actualizadoEn: 50 }, { id: '3', actualizadoEn: 1 }, { id: '4', actualizadoEn: 7 }],
)
paso('con muchos, cada uno va por su lado',
  ids(f.paraAlla) === '1' && ids(f.paraAqui) === '2,4' && f.quitarAqui.length === 0,
  `alla=${ids(f.paraAlla)} aqui=${ids(f.paraAqui)}`)

/* --- Sin fecha, lo de la nube no debe machacar lo de aquí sin más --- */
f = fusionar([{ id: 'x' }], [{ id: 'x' }])
paso('dos sin fecha se dejan en paz', f.paraAqui.length === 0 && f.paraAlla.length === 0)
f = fusionar([{ id: 'y', actualizadoEn: 1 }], [{ id: 'y' }])
paso('lo que tiene fecha gana a lo que no la tiene', ids(f.paraAlla) === 'y')

console.log(rojos === 0 ? '\nSin fallos.' : `\n${rojos} fallo(s).`)
process.exitCode = rojos === 0 ? 0 : 1
