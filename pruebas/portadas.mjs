/**
 * La búsqueda de portada, sin navegador.
 *
 * Aquí solo hay una cosa que pueda salir mal y no dar ningún error: que la
 * dirección se arme mal y te lleve a buscar cualquier cosa menos la portada del
 * libro. Un título con acentos, con espacios o con un signo raro es lo normal en
 * una biblioteca en español.
 */
import { execSync } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const dir = mkdtempSync(join(tmpdir(), 'vellum-'))
const salida = join(dir, 'portadas.mjs')
execSync(`npx esbuild src/lib/portadas.ts --format=esm --outfile=${salida}`, { stdio: 'pipe' })
const { buscarPortada } = await import(salida)

let rojos = 0
const paso = (n, ok, extra = '') => {
  console.log(`${ok ? '  OK  ' : ' FALLA'} ${n}${extra ? ' — ' + extra : ''}`)
  if (!ok) rojos++
}
const libro = titulo => ({ titulo })
const consulta = t => new URL(buscarPortada(libro(t))).searchParams.get('q')

paso('lleva a Google Imágenes', buscarPortada(libro('Watchmen')).startsWith('https://www.google.com/search?'))
paso('y a la pestaña de imágenes, no a la web',
  new URL(buscarPortada(libro('Watchmen'))).searchParams.get('tbm') === 'isch')

paso('busca «portada» y el título', consulta('Watchmen') === 'portada Watchmen')
paso('con acentos, tal cual', consulta('La sombra del viento') === 'portada La sombra del viento')
paso('y sin romperse con la ñ', consulta('El año del pensamiento mágico') === 'portada El año del pensamiento mágico')

paso('los espacios se codifican, no se pierden',
  buscarPortada(libro('La sombra del viento')).includes('portada%20La%20sombra')
  || buscarPortada(libro('La sombra del viento')).includes('portada+La+sombra'),
  new URL(buscarPortada(libro('La sombra del viento'))).search.slice(0, 60) + '…')

paso('un signo raro no rompe la dirección',
  consulta('¿Sueñan los androides? & otros') === 'portada ¿Sueñan los androides? & otros')

paso('el título se recorta', consulta('  Rayuela  ') === 'portada Rayuela')

// Con el título vacío se busca «portada» a secas: es inútil, pero no rompe nada
// ni manda a ningún sitio raro.
paso('sin título no manda a ninguna parte rara', consulta('') === 'portada')

console.log(rojos ? `\n${rojos} fallo(s)` : '\nTodo en orden.')
process.exitCode = rojos ? 1 : 0
