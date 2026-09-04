/**
 * Abrir un zip, sin librerías y **sin traérselo a memoria**.
 *
 * Hacen falta dos cosas y son la misma: un `.cbz` es un zip con las páginas
 * dentro, y un zip de descargas trae los tomos dentro. Con esto se resuelven
 * las dos.
 *
 * Todo trabaja sobre un `Blob` y lee solo los trozos que necesita. No es una
 * optimización: una colección de cómics son **dos gigas y medio**, y pedirle al
 * navegador esa cantidad de memoria de golpe falla — el error que salía era «no
 * se pudo leer el archivo», y no había forma de saber que ese era el motivo.
 * Un `Blob.slice()` no copia nada; solo apunta a un trozo del archivo.
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

/** El final de un zip cabe siempre en los últimos 64 KB: 22 bytes y un comentario. */
const COLA = 22 + 0xffff

/** Un trozo del archivo, leído de verdad. Lo de fuera se recorta solo. */
async function trozo(archivo: Blob, desde: number, hasta: number): Promise<DataView> {
  const a = Math.max(0, desde)
  const b = Math.min(archivo.size, hasta)
  return new DataView(await archivo.slice(a, b).arrayBuffer())
}

/** Los dos primeros bytes de todo zip. También los de un `.cbz` y un `.epub`. */
export async function pareceZip(archivo: Blob): Promise<boolean> {
  if (archivo.size < 4) return false
  const v = await trozo(archivo, 0, 4)
  return v.getUint8(0) === 0x50 && v.getUint8(1) === 0x4b
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
  for (let i = v.byteLength - 22; i >= 0; i--) {
    if (v.getUint32(i, true) === FIRMA_FINAL) return i
  }
  return -1
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

/**
 * Dónde empieza la tabla del final, cuánto ocupa y cuántas entradas tiene.
 *
 * Con más de 65.535 ficheros o más de 4 GB, esos números no caben en el final
 * normal y el zip escribe otro final, más grande, justo antes. Un tomo suelto
 * nunca llega ahí; una colección entera, sí.
 */
async function situarCentral(
  archivo: Blob,
): Promise<{ inicio: number; largo: number; cuantas: number }> {
  const desdeCola = Math.max(0, archivo.size - COLA)
  const cola = await trozo(archivo, desdeCola, archivo.size)
  const fin = buscarFinal(cola)
  if (fin < 0) throw new ErrorZip('no parece un zip')

  let cuantas = cola.getUint16(fin + 10, true)
  let largo = cola.getUint32(fin + 12, true)
  let inicio = cola.getUint32(fin + 16, true)

  const loc = fin - 20
  if (loc >= 0 && cola.getUint32(loc, true) === FIRMA_LOCALIZADOR_64) {
    const donde = Number(cola.getBigUint64(loc + 8, true))
    const grande = await trozo(archivo, donde, donde + 56)
    if (grande.byteLength >= 56 && grande.getUint32(0, true) === FIRMA_FINAL_64) {
      cuantas = Number(grande.getBigUint64(32, true))
      largo = Number(grande.getBigUint64(40, true))
      inicio = Number(grande.getBigUint64(48, true))
    }
  }
  return { inicio, largo, cuantas }
}

/** Todo lo que hay dentro, sin descomprimir nada todavía. */
export async function listar(archivo: Blob): Promise<Entrada[]> {
  const { inicio, largo, cuantas } = await situarCentral(archivo)
  // Solo la tabla: unos pocos megas incluso con sesenta mil ficheros dentro.
  const v = await trozo(archivo, inicio, inicio + largo)

  const entradas: Entrada[] = []
  let i = 0
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

    const crudo = new Uint8Array(v.buffer, v.byteOffset + i + 46, largoNombre)
    entradas.push({
      nombre: nombreDe(crudo, banderas),
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

/**
 * Un fichero del zip, como Blob.
 *
 * Cuando va guardado tal cual —y **así es como van los cómics dentro de una
 * colección**, porque ya venían comprimidos— esto no copia ni un byte: devuelve
 * un trozo del archivo original. Es lo que permite sacar un tomo de 300 MB de
 * un zip de dos gigas sin gastar memoria.
 */
export async function sacar(archivo: Blob, e: Entrada): Promise<Blob> {
  if (e.cerrado) throw new ErrorZip('el zip pide contraseña')
  if (e.metodo !== 0 && e.metodo !== 8) throw new ErrorZip(`compresión desconocida (${e.metodo})`)

  const cab = await trozo(archivo, e.offset, e.offset + 30)
  if (cab.byteLength < 30 || cab.getUint32(0, true) !== FIRMA_LOCAL) {
    throw new ErrorZip('el zip está roto')
  }
  // El nombre y el extra de aquí pueden medir distinto que los de la tabla del
  // final: hay que leerlos otra vez para saber dónde empiezan los datos.
  const largoNombre = cab.getUint16(26, true)
  const largoExtra = cab.getUint16(28, true)
  const desde = e.offset + 30 + largoNombre + largoExtra

  const crudo = archivo.slice(desde, desde + e.comprimido)
  if (e.metodo === 0) return crudo

  const Descomprimir = (globalThis as { DecompressionStream?: typeof DecompressionStream }).DecompressionStream
  if (!Descomprimir) throw new ErrorZip('este navegador no sabe descomprimir')

  // `deflate-raw` y no `deflate`: dentro de un zip los datos van sin la
  // envoltura zlib, así que el otro modo falla con «incorrect header check».
  const flujo = crudo.stream().pipeThrough(new Descomprimir('deflate-raw'))
  return new Response(flujo).blob()
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

/* ------------------------------ Escribir ------------------------------- */

/**
 * Tabla del CRC32, la que pide el formato zip.
 *
 * Se construye la primera vez que se usa. Escribir un zip es cosa de los `.cbr`
 * convertidos, y quien no tenga ninguno no paga ni la tabla.
 */
let tabla: Uint32Array | null = null
function tablaCrc(): Uint32Array {
  if (tabla) return tabla
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  tabla = t
  return t
}

export function crc32(datos: Uint8Array): number {
  const t = tablaCrc()
  let c = 0xffffffff
  for (let i = 0; i < datos.length; i++) c = t[(c ^ datos[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

/**
 * Un fichero que va a entrar en el zip.
 *
 * El CRC y el tamaño se dan hechos a propósito: quien extrae las páginas de un
 * RAR las tiene en la mano en ese momento, y volver a leerlas después —ya
 * convertidas en Blob— sería leerse el tomo entero dos veces.
 */
export interface Aporte {
  nombre: string
  datos: Blob
  crc: number
  tamano: number
}

function u32(n: number): Uint8Array<ArrayBuffer> {
  const b = new Uint8Array(new ArrayBuffer(4))
  new DataView(b.buffer).setUint32(0, n >>> 0, true)
  return b
}
function u16(n: number): Uint8Array<ArrayBuffer> {
  const b = new Uint8Array(new ArrayBuffer(2))
  new DataView(b.buffer).setUint16(0, n & 0xffff, true)
  return b
}

/**
 * Escribir un zip, con todo guardado tal cual.
 *
 * Sin comprimir a propósito: lo que se mete aquí son páginas de cómic, que ya
 * son JPEG o PNG. Comprimirlas otra vez tarda mucho y no quita ni un uno por
 * ciento — y encima obliga a tener cada página entera en memoria.
 *
 * Existe para una sola cosa: convertir un `.cbr` en algo que la app sepa leer
 * sola, y guardarlo así de una vez. Convertir cada vez que se abre el tomo
 * sería repetir el trabajo caro doscientas veces.
 */
export function escribir(partes: Aporte[]): Blob {
  const trozos: BlobPart[] = []
  const central: BlobPart[] = []
  let donde = 0

  for (const p of partes) {
    const nombre = new TextEncoder().encode(p.nombre) as Uint8Array<ArrayBuffer>
    // La bandera 0x0800 promete que el nombre va en UTF-8. Sin ella, un nombre
    // con tilde se lee mal en cualquier otro programa que abra el archivo.
    const comun = [
      u16(20), u16(0x0800), u16(0), u16(0), u16(0),
      u32(p.crc), u32(p.tamano), u32(p.tamano), u16(nombre.length),
    ]
    trozos.push(u32(FIRMA_LOCAL), ...comun, u16(0), nombre, p.datos)

    central.push(
      u32(FIRMA_CENTRAL), u16(20), ...comun, u16(0), u16(0), u16(0), u16(0), u32(0), u32(donde), nombre,
    )
    donde += 30 + nombre.length + p.tamano
  }

  const largoCentral = central.reduce((n, t) => n + (t as Uint8Array).length, 0)
  const fin = [
    u32(FIRMA_FINAL), u16(0), u16(0), u16(partes.length), u16(partes.length),
    u32(largoCentral), u32(donde), u16(0),
  ]
  return new Blob([...trozos, ...central, ...fin], { type: 'application/vnd.comicbook+zip' })
}
