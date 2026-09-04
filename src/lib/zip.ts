/**
 * Abrir un zip, sin librerías.
 *
 * Hacen falta dos cosas y son la misma: un `.cbz` **es** un zip con las páginas
 * dentro, y un zip de descargas trae los tomos dentro. Con esto se resuelven
 * las dos.
 *
 * No se añade una dependencia porque no hace falta: descomprimir ya viene en el
 * navegador desde 2022 —`DecompressionStream`— y lo demás es leer una tabla.
 * Doscientas líneas propias que se entienden pesan menos, literalmente, que
 * cualquier librería de zip, y aquí el tamaño del paquete es una regla (R19).
 *
 * Se lee **el directorio central**, que está al final del archivo, y no las
 * cabeceras que preceden a cada fichero. Es lo correcto y no un detalle: los
 * zip creados «al vuelo» dejan el tamaño a cero en la cabecera de cada fichero
 * y lo escriben solo en esa tabla del final. Leyendo lo primero, media colección
 * saldría vacía.
 */

/** Un fichero dentro del zip. */
export interface Entrada {
  nombre: string
  /** 0 = guardado tal cual, 8 = desinflado. Lo demás no se sabe abrir. */
  metodo: number
  comprimido: number
  tamano: number
  /** Dónde empieza su cabecera propia dentro del archivo. */
  offset: number
  /** Si pide contraseña. */
  cerrado: boolean
}

export class ErrorZip extends Error {}

const FIRMA_FINAL = 0x06054b50
const FIRMA_FINAL_64 = 0x06064b50
const FIRMA_LOCALIZADOR_64 = 0x07064b50
const FIRMA_CENTRAL = 0x02014b50
const FIRMA_LOCAL = 0x04034b50

/** Los dos primeros bytes de todo zip. También los de un `.cbz` y un `.epub`. */
export function pareceZip(datos: ArrayBuffer): boolean {
  if (datos.byteLength < 4) return false
  const b = new Uint8Array(datos, 0, 4)
  return b[0] === 0x50 && b[1] === 0x4b
}

/**
 * El nombre, decodificado.
 *
 * El bit 11 de las banderas promete UTF-8. Cuando no está, lo correcto sería
 * CP437; en la práctica lo que hay ahí son nombres con tildes escritos en
 * Windows, y `windows-1252` los acierta. Peor sería enseñar «Cr¢nica».
 */
function nombreDe(bytes: Uint8Array, banderas: number): string {
  const utf8 = (banderas & 0x800) !== 0
  try {
    return new TextDecoder(utf8 ? 'utf-8' : 'windows-1252').decode(bytes)
  } catch {
    return new TextDecoder().decode(bytes)
  }
}

/** Busca el final del zip hacia atrás: detrás puede haber un comentario. */
function buscarFinal(v: DataView): number {
  const desde = Math.max(0, v.byteLength - 22 - 0xffff)
  for (let i = v.byteLength - 22; i >= desde; i--) {
    if (v.getUint32(i, true) === FIRMA_FINAL) return i
  }
  return -1
}

/**
 * Dónde empieza la tabla y cuántas entradas tiene.
 *
 * Con más de 65.535 ficheros o más de 4 GB, esos números no caben en el final
 * normal y el zip escribe otro final, más grande, justo antes. Un tomo suelto
 * nunca llega ahí; una colección entera, sí.
 */
function situarCentral(v: DataView): { inicio: number; cuantas: number } {
  const fin = buscarFinal(v)
  if (fin < 0) throw new ErrorZip('no parece un zip')

  let cuantas = v.getUint16(fin + 10, true)
  let inicio = v.getUint32(fin + 16, true)

  const loc = fin - 20
  if (loc >= 0 && v.getUint32(loc, true) === FIRMA_LOCALIZADOR_64) {
    const donde = Number(v.getBigUint64(loc + 8, true))
    if (donde >= 0 && donde + 56 <= v.byteLength && v.getUint32(donde, true) === FIRMA_FINAL_64) {
      cuantas = Number(v.getBigUint64(donde + 32, true))
      inicio = Number(v.getBigUint64(donde + 48, true))
    }
  }
  return { inicio, cuantas }
}

/**
 * El campo extra de un zip grande.
 *
 * Cuando un tamaño no cabe en cuatro bytes, ahí va escrito `0xFFFFFFFF` y el
 * valor de verdad viaja aquí, en un apartado propio, **solo para los campos que
 * desbordaron y en este orden**. Por eso se leen en cadena y no por posición.
 */
function leerExtra64(
  v: DataView,
  desde: number,
  largo: number,
  campos: { tamano: number; comprimido: number; offset: number },
): void {
  let i = desde
  const hasta = desde + largo
  while (i + 4 <= hasta) {
    const id = v.getUint16(i, true)
    const largoCampo = v.getUint16(i + 2, true)
    if (id === 0x0001) {
      let j = i + 4
      const toca = () => j + 8 <= i + 4 + largoCampo
      if (campos.tamano === 0xffffffff && toca()) { campos.tamano = Number(v.getBigUint64(j, true)); j += 8 }
      if (campos.comprimido === 0xffffffff && toca()) { campos.comprimido = Number(v.getBigUint64(j, true)); j += 8 }
      if (campos.offset === 0xffffffff && toca()) { campos.offset = Number(v.getBigUint64(j, true)); j += 8 }
      return
    }
    i += 4 + largoCampo
  }
}

/** Todo lo que hay dentro, sin descomprimir nada todavía. */
export function listar(datos: ArrayBuffer): Entrada[] {
  const v = new DataView(datos)
  const { inicio, cuantas } = situarCentral(v)

  const entradas: Entrada[] = []
  let i = inicio
  for (let n = 0; n < cuantas; n++) {
    if (i + 46 > v.byteLength || v.getUint32(i, true) !== FIRMA_CENTRAL) break
    const banderas = v.getUint16(i + 8, true)
    const metodo = v.getUint16(i + 10, true)
    const largoNombre = v.getUint16(i + 28, true)
    const largoExtra = v.getUint16(i + 30, true)
    const largoComentario = v.getUint16(i + 32, true)

    const campos = {
      tamano: v.getUint32(i + 24, true),
      comprimido: v.getUint32(i + 20, true),
      offset: v.getUint32(i + 42, true),
    }
    if (campos.tamano === 0xffffffff || campos.comprimido === 0xffffffff || campos.offset === 0xffffffff) {
      leerExtra64(v, i + 46 + largoNombre, largoExtra, campos)
    }

    const nombre = nombreDe(new Uint8Array(datos, i + 46, largoNombre), banderas)
    entradas.push({
      nombre,
      metodo,
      comprimido: campos.comprimido,
      tamano: campos.tamano,
      offset: campos.offset,
      // El bit 0 dice que el contenido va cifrado. Sin la contraseña no hay
      // nada que hacer, pero hay que saberlo para poder decirlo.
      cerrado: (banderas & 0x1) !== 0,
    })
    i += 46 + largoNombre + largoExtra + largoComentario
  }
  return entradas
}

/** Saca un fichero del zip, ya descomprimido. */
export async function sacar(datos: ArrayBuffer, e: Entrada): Promise<Uint8Array> {
  if (e.cerrado) throw new ErrorZip('el zip pide contraseña')
  if (e.metodo !== 0 && e.metodo !== 8) throw new ErrorZip(`compresión desconocida (${e.metodo})`)

  const v = new DataView(datos)
  if (e.offset + 30 > v.byteLength || v.getUint32(e.offset, true) !== FIRMA_LOCAL) {
    throw new ErrorZip('el zip está roto')
  }
  // El nombre y el extra de aquí pueden medir distinto que los de la tabla del
  // final: hay que leerlos otra vez para saber dónde empiezan los datos.
  const largoNombre = v.getUint16(e.offset + 26, true)
  const largoExtra = v.getUint16(e.offset + 28, true)
  const desde = e.offset + 30 + largoNombre + largoExtra

  const crudo = new Uint8Array(datos, desde, Math.min(e.comprimido, datos.byteLength - desde))
  if (e.metodo === 0) return crudo.slice()

  const Descomprimir = (globalThis as { DecompressionStream?: typeof DecompressionStream }).DecompressionStream
  if (!Descomprimir) throw new ErrorZip('este navegador no sabe descomprimir')

  // `deflate-raw` y no `deflate`: dentro de un zip los datos van sin la
  // envoltura zlib, así que el otro modo falla con «incorrect header check».
  const flujo = new Blob([crudo]).stream().pipeThrough(new Descomprimir('deflate-raw'))
  const trozos: Uint8Array[] = []
  let total = 0
  const lector = flujo.getReader()
  for (;;) {
    const { done, value } = await lector.read()
    if (done) break
    trozos.push(value)
    total += value.length
  }
  const salida = new Uint8Array(total)
  let p = 0
  for (const t of trozos) { salida.set(t, p); p += t.length }
  return salida
}

/** Las carpetas y la morralla que meten los sistemas al comprimir. */
export function esBasura(nombre: string): boolean {
  if (nombre.endsWith('/')) return true
  const hoja = nombre.split('/').pop() ?? ''
  // `__MACOSX` es la carpeta de metadatos de macOS: dentro hay un «._Tomo1.pdf»
  // por cada fichero de verdad, del mismo nombre y sin contenido. Sin esto, la
  // mitad de los zips de un Mac entrarían por duplicado y en blanco.
  return nombre.startsWith('__MACOSX/') || nombre.includes('/__MACOSX/') || hoja.startsWith('.') || hoja === ''
}

/** La extensión, en minúsculas y sin el punto. */
export function extension(nombre: string): string {
  const hoja = nombre.split('/').pop() ?? ''
  const punto = hoja.lastIndexOf('.')
  return punto > 0 ? hoja.slice(punto + 1).toLowerCase() : ''
}
