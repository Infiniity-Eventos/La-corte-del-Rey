/**
 * El estante de la casa, sin red y sin cuenta.
 *
 * Es la parte que puede hacer daño en silencio: borrar el libro de otra
 * persona, resucitar uno que retiró, o volver a subir el mismo PDF en cada
 * sincronización. Nada de eso da un error en pantalla.
 */
import { execSync } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const dir = mkdtempSync(join(tmpdir(), 'vellum-'))
const salida = join(dir, 'estante.mjs')
execSync(`npx esbuild src/lib/estante.ts --format=esm --outfile=${salida}`, { stdio: 'pipe' })
const { repartir, esAjeno } = await import(salida)

let rojos = 0
const paso = (n, ok, extra = '') => {
  console.log(`${ok ? '  OK  ' : ' FALLA'} ${n}${extra ? ' — ' + extra : ''}`)
  if (!ok) rojos++
}
const ids = xs => xs.map(x => x.id ?? x).sort().join(',')
const YO = 'yo'
const OTRA = 'otra'

/* --- Todo lo que traes va al catálogo --- */
let r = repartir([{ id: 'a', actualizadoEn: 5 }], [], YO)
paso('lo que traes va al catálogo de la casa', ids(r.aSubir) === 'a')
paso('y va marcado como tuyo', r.aSubir[0].de === YO)

/* --- Y no hace falta marcarlo: subirlo es ponerlo --- */
r = repartir([{ id: 'a', estrella: false, actualizadoEn: 5 }], [], YO)
paso('quitarle la estrella no lo saca del catálogo', ids(r.aSubir) === 'a',
  'la estrella es tuya, el catálogo es de la casa')

/* --- No se vuelve a subir lo que no cambió --- */
r = repartir(
  [{ id: 'a', actualizadoEn: 5 }],
  [{ id: 'a', de: YO, actualizadoEn: 5 }],
  YO,
)
paso('**lo que no cambió no se vuelve a subir**', r.aSubir.length === 0,
  'si no, cada sincronización resubiría todos los PDF')

r = repartir(
  [{ id: 'a', actualizadoEn: 9 }],
  [{ id: 'a', de: YO, actualizadoEn: 5 }],
  YO,
)
paso('pero un cambio sí se sube', ids(r.aSubir) === 'a')

/* --- Borrarlo sí lo retira, y para todos --- */
r = repartir(
  [{ id: 'a', borrado: true, actualizadoEn: 9 }],
  [{ id: 'a', de: YO, actualizadoEn: 5 }],
  YO,
)
paso('borrar el libro lo saca del catálogo, para todos', ids(r.aQuitar) === 'a')

r = repartir([], [{ id: 'a', de: YO, actualizadoEn: 5 }], YO)
paso('y si ya no existe aquí, igual', ids(r.aQuitar) === 'a')

/* --- Lo de la otra persona llega, y no se toca --- */
r = repartir([], [{ id: 'b', de: OTRA, deNombre: 'Ana', actualizadoEn: 5 }], YO)
paso('lo que sube la otra persona llega al catálogo de aquí', ids(r.aTraer) === 'b')
paso('con su nombre', r.aTraer[0].deNombre === 'Ana')
paso('**y nunca se retira lo de otra persona**', r.aQuitar.length === 0,
  'sacar del catálogo es solo de quien lo subió')

/* --- Ni se resucita lo que retiró --- */
r = repartir([{ id: 'b', de: OTRA, actualizadoEn: 5 }], [], YO)
paso('si lo retira, se va de aquí', ids(r.aOlvidar) === 'b')
paso('y no se sube de vuelta', r.aSubir.length === 0,
  'sin esto, retirarlo no serviría de nada: se lo devolvería el otro aparato')

/* --- Lo suyo no se mezcla con lo mío --- */
r = repartir(
  [
    { id: 'a', actualizadoEn: 5 },
    { id: 'b', de: OTRA, actualizadoEn: 5 },
  ],
  [
    { id: 'a', de: YO, actualizadoEn: 5 },
    { id: 'b', de: OTRA, actualizadoEn: 5 },
  ],
  YO,
)
paso('con las dos cosas a la vez, no se toca nada de más',
  r.aSubir.length === 0 && r.aQuitar.length === 0 && r.aTraer.length === 0 && r.aOlvidar.length === 0,
  'todo estaba al día')

/* --- Una versión más nueva de lo suyo se actualiza --- */
r = repartir(
  [{ id: 'b', de: OTRA, titulo: 'viejo', actualizadoEn: 5 }],
  [{ id: 'b', de: OTRA, titulo: 'nuevo', actualizadoEn: 9 }],
  YO,
)
paso('si la otra persona lo cambia, llega el cambio', r.aTraer[0]?.titulo === 'nuevo')

/* --- Quién puede editar qué --- */
paso('un libro de otra persona es ajeno', esAjeno({ id: 'b', de: OTRA }, YO))
paso('el mío no', !esAjeno({ id: 'a' }, YO))
paso('y sin sesión, tampoco lo que subí yo', !esAjeno({ id: 'a' }, null))

/* --- Quitarse la estrella no toca el catálogo de nadie --- */
r = repartir(
  [{ id: 'b', de: OTRA, estrella: false, actualizadoEn: 9 }],
  [{ id: 'b', de: OTRA, actualizadoEn: 5 }],
  YO,
)
paso('desmarcar lo de otra persona no lo saca del catálogo', r.aQuitar.length === 0)
paso('ni lo vuelve a traer encima', r.aTraer.length === 0,
  'la marca de aquí es más nueva: nadie la pisa')

console.log(rojos ? `\n${rojos} fallo(s)` : '\nTodo en orden.')
process.exitCode = rojos ? 1 : 0
