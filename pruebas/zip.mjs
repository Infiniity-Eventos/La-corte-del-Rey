/**
 * El lector de zip, sin navegador.
 *
 * Es código que lee bytes a mano, y equivocarse aquí no da un error bonito: da
 * un PDF vacío, un nombre con símbolos raros o medio tomo. Por eso los zips de
 * esta prueba **los hace otro programa** —el `zipfile` de Python— y no nosotros
 * mismos: si los escribiéramos con el mismo entendimiento del formato que
 * tenemos al leerlos, un malentendido pasaría desapercibido.
 */
import { execSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const dir = mkdtempSync(join(tmpdir(), 'vellum-'))
const salida = join(dir, 'zip.mjs')
execSync(`npx esbuild src/lib/zip.ts --bundle --format=esm --outfile=${salida}`, { stdio: 'pipe' })
const { ErrorZip, esBasura, extension, listar, pareceZip, sacar } = await import(salida)

let rojos = 0
const paso = (n, ok, extra = '') => {
  console.log(`${ok ? '  OK  ' : ' FALLA'} ${n}${extra ? ' — ' + extra : ''}`)
  if (!ok) rojos++
}

const guion = `
import sys, zipfile, os
d = sys.argv[1]

# Uno normal: comprimido, con carpeta dentro, con basura de macOS y con tilde.
with zipfile.ZipFile(os.path.join(d, 'normal.zip'), 'w', zipfile.ZIP_DEFLATED) as z:
    z.writestr('Batman Absolute/01.pdf', b'%PDF-1.4 uno' + b' relleno' * 400)
    z.writestr('Batman Absolute/02.cbz', b'PK\\x03\\x04 dos' + b' relleno' * 400)
    z.writestr('Batman Absolute/lee me.txt', b'nada que ver')
    z.writestr('Crónica de una prueba.pdf', b'%PDF-1.4 con tilde')
    z.writestr('__MACOSX/Batman Absolute/._01.pdf', b'basura')
    z.writestr('Batman Absolute/.DS_Store', b'basura')

# Sin comprimir: el otro método que existe de verdad.
with zipfile.ZipFile(os.path.join(d, 'crudo.zip'), 'w', zipfile.ZIP_STORED) as z:
    z.writestr('suelto.pdf', b'%PDF-1.4 sin comprimir')

# Con contraseña: no se puede abrir, pero hay que saber decirlo. El bit se
# enciende a mano porque zipfile lo recalcula al escribir.
ruta = os.path.join(d, 'cerrado.zip')
with zipfile.ZipFile(ruta, 'w') as z:
    z.writestr('secreto.pdf', b'%PDF-1.4 cerrado')
b = bytearray(open(ruta, 'rb').read())
b[6] |= 1                                   # bandera de la cabecera del fichero
c = b.find(b'PK\x01\x02')
b[c + 8] |= 1                               # y la de la tabla del final
open(ruta, 'wb').write(bytes(b))

# Con comentario detrás del final: el final hay que buscarlo hacia atrás.
with zipfile.ZipFile(os.path.join(d, 'comentado.zip'), 'w', zipfile.ZIP_DEFLATED) as z:
    z.writestr('uno.pdf', b'%PDF-1.4 comentado' + b' x' * 300)
    z.comment = b'A' * 2000

# Con más ficheros de los que caben en el final normal: el número de entradas
# no entra en dos bytes y el zip escribe además el final de 64 bits.
with zipfile.ZipFile(os.path.join(d, 'muchos.zip'), 'w', zipfile.ZIP_STORED) as z:
    for i in range(65536):
        z.writestr('p%05d.txt' % i, b'x')
    z.writestr('tomo.pdf', b'%PDF-1.4 el ultimo')

# Con los tamanos marcados como «no caben»: es la forma exacta que tiene un zip
# de mas de 4 GB, y la unica manera de probarla sin fabricar 4 GB de verdad.
import struct
ruta = os.path.join(d, 'desbordado.zip')
with zipfile.ZipFile(ruta, 'w', zipfile.ZIP_STORED) as z:
    z.writestr('tocho.pdf', b'%PDF-1.4 desbordado')
b = bytearray(open(ruta, 'rb').read())
c = b.find(b'PK\\x01\\x02')
comp = struct.unpack_from('<I', b, c + 20)[0]
size = struct.unpack_from('<I', b, c + 24)[0]
off = struct.unpack_from('<I', b, c + 42)[0]
nlen = struct.unpack_from('<H', b, c + 28)[0]
struct.pack_into('<I', b, c + 20, 0xFFFFFFFF)
struct.pack_into('<I', b, c + 24, 0xFFFFFFFF)
struct.pack_into('<I', b, c + 42, 0xFFFFFFFF)
extra = struct.pack('<HHQQQ', 0x0001, 24, size, comp, off)
struct.pack_into('<H', b, c + 30, len(extra))
b[c + 46 + nlen:c + 46 + nlen] = extra
e = b.find(b'PK\\x05\\x06')
struct.pack_into('<I', b, e + 12, struct.unpack_from('<I', b, e + 12)[0] + len(extra))
open(ruta, 'wb').write(bytes(b))
`
// El guion va a un archivo y no a `python3 -c`: por la línea de órdenes, los
// saltos de línea se pierden por el camino.
const guionPy = join(dir, 'hacer-zips.py')
writeFileSync(guionPy, guion)
execSync(`python3 ${guionPy} ${dir}`, { stdio: 'pipe' })

const abrir = n => {
  const b = readFileSync(join(dir, n))
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)
}
const texto = u8 => new TextDecoder().decode(u8)

/* --- Reconocerlo --- */
const normal = abrir('normal.zip')
paso('un zip se reconoce por sus dos primeras letras', pareceZip(normal))
paso('y un PDF no', !pareceZip(new TextEncoder().encode('%PDF-1.4 hola').buffer))

/* --- La lista --- */
const todo = listar(normal)
const nombres = todo.map(e => e.nombre)
paso('se listan todos los ficheros', nombres.length === 6, nombres.join(' · '))
paso('con su ruta dentro del zip', nombres.includes('Batman Absolute/01.pdf'))
paso('**los nombres con tilde se leen bien**', nombres.includes('Crónica de una prueba.pdf'),
  'un nombre roto se convierte en un título roto')

const utiles = todo.filter(e => !esBasura(e.nombre))
paso('**la morralla de macOS se descarta**', !utiles.some(e => e.nombre.includes('__MACOSX')),
  'si no, cada tomo entraría dos veces y uno de ellos vacío')
paso('y los ficheros ocultos también', !utiles.some(e => e.nombre.endsWith('.DS_Store')))
paso('lo demás se queda', utiles.length === 4)

paso('la extensión sale del nombre', extension('Batman Absolute/01.PDF') === 'pdf')
paso('y una carpeta con punto no cuenta como extensión', extension('v1.5/tomo') === '')

/* --- Sacarlo --- */
const uno = todo.find(e => e.nombre === 'Batman Absolute/01.pdf')
paso('un fichero comprimido se saca entero',
  texto(await sacar(normal, uno)).startsWith('%PDF-1.4 uno'))
paso('y con su tamaño de verdad', (await sacar(normal, uno)).length === uno.tamano,
  `${(await sacar(normal, uno)).length} de ${uno.tamano}`)

const conTilde = todo.find(e => e.nombre.startsWith('Cr'))
paso('también los de nombre raro', texto(await sacar(normal, conTilde)).includes('con tilde'))

const crudo = abrir('crudo.zip')
paso('**y los que van sin comprimir**',
  texto(await sacar(crudo, listar(crudo)[0])).includes('sin comprimir'),
  'un zip hecho por el teléfono suele guardar los PDF tal cual')

/* --- Los casos que rompen --- */
const cerrado = listar(abrir('cerrado.zip'))[0]
paso('un zip con contraseña se detecta', cerrado.cerrado)
let e = null
try { await sacar(abrir('cerrado.zip'), cerrado) } catch (x) { e = x }
paso('y se dice con palabras', e instanceof ErrorZip && /contraseña/.test(e.message), e?.message)

const comentado = abrir('comentado.zip')
paso('**un comentario largo al final no despista**', listar(comentado).length === 1,
  'el final del zip hay que buscarlo hacia atrás, no está en el último byte')
paso('y lo de dentro sigue saliendo',
  texto(await sacar(comentado, listar(comentado)[0])).includes('comentado'))

const muchos = abrir('muchos.zip')
const m = listar(muchos)
paso('**con más de 65.535 ficheros se leen todos**', m.length === 65537, `${m.length} entrada(s)`,)
paso('incluido el último, que es el que se perdería',
  texto(await sacar(muchos, m[m.length - 1])).includes('el ultimo'))

const desbordado = abrir('desbordado.zip')
const dz = listar(desbordado)
paso('**y un zip de más de 4 GB también**', dz.length === 1 && dz[0].tamano === 19,
  `tamaño leído: ${dz[0]?.tamano}`)
paso('sacando bien lo de dentro', texto(await sacar(desbordado, dz[0])).includes('desbordado'))

let roto = null
try { listar(new TextEncoder().encode('esto no es un zip ni de lejos').buffer) } catch (x) { roto = x }
paso('lo que no es un zip se dice, no se revienta', roto instanceof ErrorZip, roto?.message)

console.log(rojos ? `\n${rojos} fallo(s)` : '\nTodo en orden.')
process.exitCode = rojos ? 1 : 0
