import type { Libro } from './tipos'
import { anadirLibro, buscarPorHash, pedirPermanencia } from './almacen'
import { contarPaginas, formatoDe } from './cuaderno'
import type { Formato } from './cuaderno'
import { ErrorZip, esBasura, extension, listar, pareceZip, sacar } from './zip'

/**
 * Traer libros de fuera.
 *
 * Entra un PDF, un CBZ o **un zip con varios dentro**, que es como llegan las
 * colecciones de verdad: nadie descarga doce números de uno en uno. Un zip se
 * abre, se mira qué hay dentro y entra todo lo que sirva; lo demás —los `.txt`,
 * las carpetas de macOS— se ignora sin decir nada, porque no es un problema.
 */

async function sha256(datos: BufferSource): Promise<string> {
  const d = await crypto.subtle.digest('SHA-256', datos)
  return Array.from(new Uint8Array(d))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

/** Hasta aquí se resume el archivo entero. Un tomo de cómic pasa de largo. */
const CABE_ENTERO = 64 * 1024 * 1024

/**
 * La huella que reconoce un repetido (R24 / P37).
 *
 * Con un archivo normal es el SHA-256 de todo, como siempre. Con uno grande no
 * puede serlo: resumir trescientos megas obliga a tenerlos en memoria, y eso en
 * un teléfono es justo lo que hace que la importación falle sin explicación.
 * Ahí se resume **el principio, el final y el tamaño**, que para archivos de
 * verdad distingue igual de bien.
 *
 * Va con marca delante para que las dos formas no se mezclen nunca: un archivo
 * grande resumido de la forma corta jamás puede parecerse a uno pequeño
 * resumido entero.
 */
async function huella(archivo: Blob): Promise<string> {
  if (archivo.size <= CABE_ENTERO) return sha256(await archivo.arrayBuffer())
  const punta = 4 * 1024 * 1024
  const [a, b] = await Promise.all([
    archivo.slice(0, punta).arrayBuffer(),
    archivo.slice(archivo.size - punta).arrayBuffer(),
  ])
  const junto = new Uint8Array(a.byteLength + b.byteLength)
  junto.set(new Uint8Array(a), 0)
  junto.set(new Uint8Array(b), a.byteLength)
  return `r${archivo.size}:${await sha256(junto)}`
}

/**
 * Del nombre del archivo sale un título de partida. Casi siempre es un
 * desastre — guiones bajos, años, la web de donde salió — así que se limpia
 * lo obvio y ya lo corriges tú, que es lo que pediste en P42.
 */
export function tituloDesdeNombre(nombre: string): string {
  const limpio = nombre
    .replace(/\.(pdf|cbz|cbr|zip)$/i, '')
    .replace(/[_+]+/g, ' ')
    .replace(/\s*[-–]\s*/g, ' — ')
    .replace(/\b(pdf|cbz|cbr|ebook|epub|scan|escaneado|www?\.[^\s]+|z-?lib(rary)?)\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
  if (!limpio) return 'Sin título'
  return limpio.charAt(0).toUpperCase() + limpio.slice(1)
}

/** Lo que se sabe abrir. El resto de lo que haya en un zip no molesta a nadie. */
const SIRVE = /^(pdf|cbz)$/
const ES_CAJA = /^zip$/
/**
 * El CBR: se mira por dentro antes de rendirse.
 *
 * Un CBR debería ser un cómic comprimido con RAR, que es un formato cerrado y
 * no viene en ningún navegador. Pero **una buena parte de los `.cbr` que
 * circulan son zips con el nombre cambiado**: alguien recomprimió el tomo y le
 * dejó la extensión de antes. Esos se abren perfectamente, así que se comprueba
 * el contenido y solo se rechaza lo que de verdad es RAR.
 */
const ES_RAR = /^cbr$/
/**
 * Un CBR de verdad: se convierte a CBZ al traerlo y se guarda ya convertido.
 *
 * El descompresor de RAR pesa 600 KB y se descarga aquí, la primera vez que
 * hace falta. Convertir una vez y guardar el resultado es lo que hace que ese
 * precio se pague una sola vez y no cada vez que abres el tomo.
 */
async function convertir(archivo: Blob): Promise<{ cbz: Blob } | { motivo: string }> {
  try {
    const { convertirCbr } = await import('./rar')
    const r = await convertirCbr(archivo)
    return r.ok ? { cbz: r.cbz } : { motivo: r.motivo }
  } catch {
    return { motivo: 'no se pudo cargar el descompresor de RAR' }
  }
}

/** El nombre que le queda a un CBR una vez convertido. */
function yaConvertido(nombre: string): string {
  return nombre.replace(/\.cbr$/i, '.cbz')
}

/**
 * La carpeta que comparten todos, si comparten alguna.
 *
 * Un zip de una colección casi siempre trae una carpeta con el nombre de la
 * obra y los tomos dentro. Ese nombre es mejor que el del archivo comprimido,
 * que suele venir con la web de donde salió pegada detrás.
 */
export function carpetaComun(nombres: string[]): string | null {
  if (nombres.length < 2) return null
  const primera = nombres[0].includes('/') ? nombres[0].split('/')[0] : null
  if (!primera) return null
  return nombres.every(n => n.split('/')[0] === primera) ? primera : null
}

export type Resultado =
  | { estado: 'anadido'; libro: Libro }
  | { estado: 'repetido'; libro: Libro }
  | { estado: 'error'; nombre: string; motivo: string }

/** Por dónde va la importación, para poder contarlo mientras dura. */
export interface Marcha {
  hecho: number
  total: number
  nombre: string
}

/**
 * Un archivo suelto, ya sea traído a mano o sacado de un zip.
 *
 * `extras` es lo que sabe quien lo llama y el archivo no dice: de qué serie es
 * y qué puesto ocupa. Sale de la carpeta en la que venía.
 */
async function meter(
  archivo: Blob,
  nombre: string,
  extras: Partial<Libro> = {},
): Promise<Resultado> {
  try {
    const hash = await huella(archivo)
    // R24 / P37: avisar y no duplicar.
    const ya = await buscarPorHash(hash)
    if (ya) return { estado: 'repetido', libro: ya }

    // El formato lo puede saber quien llama mejor que el nombre: un `.cbr` que
    // por dentro es un zip es un cómic, se llame como se llame.
    const formato: Formato = extras.formato ?? formatoDe(nombre)
    const paginas = await contarPaginas(archivo, formato)
    if (paginas === 0) throw new Error('no tiene ninguna página')

    const ahora = Date.now()
    const id = crypto.randomUUID()
    const libro: Libro = {
      id,
      hash,
      titulo: tituloDesdeNombre(nombre.split('/').pop() ?? nombre),
      // Un CBZ es un cómic por definición: nadie guarda una novela en imágenes.
      tipo: formato === 'cbz' ? 'comic' : 'libro',
      formato,
      etiquetas: [],
      paginas,
      bytes: archivo.size,
      archivo: `${id}.${formato}`,
      nombreOriginal: nombre,
      // Lo que traes tú nace en tu estantería: si lo subiste, lo querías.
      estrella: true,
      anadidoEn: ahora,
      pagina: 1,
      abiertoEn: ahora,
      ...extras,
    }

    await anadirLibro(libro, archivo)
    void pedirPermanencia()
    return { estado: 'anadido', libro }
  } catch (e) {
    // Traer una colección entera es justo cuando se acaba el sitio, y el
    // mensaje del navegador para eso no lo entiende nadie.
    const sinSitio = e instanceof DOMException && /quota|space/i.test(`${e.name} ${e.message}`)
    const motivo = sinSitio
      ? 'se acabó el espacio en este aparato'
      : e instanceof Error ? e.message : 'no se pudo leer el archivo'
    return { estado: 'error', nombre, motivo }
  }
}

/**
 * Si el archivo empieza por `%PDF`.
 *
 * Se mira el principio y no la extensión porque el selector de archivos del
 * teléfono ya no filtra nada: ahí se ve todo, y con todo se puede elegir una
 * foto por error. Vale más una frase que lo diga que el error crudo de pdf.js.
 *
 * Se busca en el primer kilobyte y no en el byte cero: hay PDF con basura
 * delante, y pdf.js los abre igual.
 */
async function parecePdf(archivo: Blob): Promise<boolean> {
  const cabeza = new Uint8Array(await archivo.slice(0, 1024).arrayBuffer())
  for (let i = 0; i + 4 <= cabeza.length; i++) {
    if (cabeza[i] === 0x25 && cabeza[i + 1] === 0x50 && cabeza[i + 2] === 0x44 && cabeza[i + 3] === 0x46) return true
  }
  return false
}

/**
 * Meter un archivo, convirtiéndolo antes si hace falta.
 *
 * Es donde se decide qué es un `.cbr`: si por dentro es un zip, es un cómic y
 * ya está; si es RAR de verdad, se convierte. Lo mismo vale para un archivo
 * traído a mano y para uno sacado de un zip.
 */
async function entrar(archivo: Blob, nombre: string, extras: Partial<Libro> = {}): Promise<Resultado> {
  if (!ES_RAR.test(extension(nombre))) return meter(archivo, nombre, extras)

  if (await pareceZip(archivo)) return meter(archivo, nombre, { ...extras, formato: 'cbz' })

  const r = await convertir(archivo)
  if ('motivo' in r) return { estado: 'error', nombre, motivo: r.motivo }
  return meter(r.cbz, yaConvertido(nombre), { ...extras, formato: 'cbz' })
}

/** Cuántas cajas dentro de cajas se abren. Más que esto ya es alguien jugando. */
const FONDO = 3

/**
 * Abrir un zip y meter todo lo que traiga dentro.
 *
 * El orden importa: se meten por nombre, comparado como lo compararía una
 * persona, para que el 2 vaya antes que el 10 y la serie quede derecha desde el
 * primer momento.
 */
async function abrirCaja(
  archivo: Blob,
  nombreCaja: string,
  avisar: ((m: Marcha) => void) | undefined,
  contador: { hecho: number; total: number },
  fondo: number,
): Promise<Resultado[]> {
  let dentro
  try {
    dentro = await listar(archivo)
  } catch (e) {
    return [{ estado: 'error', nombre: nombreCaja, motivo: e instanceof ErrorZip ? e.message : 'no se pudo abrir' }]
  }

  const utiles = dentro
    .filter(e => !esBasura(e.nombre) && e.tamano > 0)
    .filter(e => SIRVE.test(extension(e.nombre)) || (fondo > 0 && ES_CAJA.test(extension(e.nombre))))

  // Los `.cbr` entran igual que lo demás: los que por dentro son zip —que son
  // muchos, con la extensión sin cambiar— se abren tal cual, y los que son RAR
  // de verdad se convierten al traerlos.
  const dudosos = dentro.filter(e => !esBasura(e.nombre) && e.tamano > 0 && ES_RAR.test(extension(e.nombre)))
  utiles.push(...dudosos)
  utiles.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { numeric: true, sensitivity: 'base' }))

  if (utiles.length === 0) {
    return [{ estado: 'error', nombre: nombreCaja, motivo: 'no hay ningún PDF ni CBZ dentro' }]
  }

  // La serie se decide antes de meter nada: es la carpeta que comparten todos
  // o, si no la hay, el nombre del propio zip. Con un solo libro dentro no hay
  // serie que valga — una serie de uno es solo un libro.
  const serie = utiles.length > 1
    ? carpetaComun(utiles.map(e => e.nombre)) ?? tituloDesdeNombre(nombreCaja)
    : undefined

  contador.total += utiles.length - 1
  const salida: Resultado[] = []
  let puesto = 0

  for (const entrada of utiles) {
    avisar?.({ hecho: contador.hecho, total: contador.total, nombre: entrada.nombre.split('/').pop() ?? entrada.nombre })
    try {
      // Un `sacar` de algo guardado tal cual no copia nada: es un trozo del
      // archivo. Así se saca un tomo de 300 MB de un zip de dos gigas.
      const dentroDe = await sacar(archivo, entrada)
      if (ES_CAJA.test(extension(entrada.nombre))) {
        salida.push(...(await abrirCaja(dentroDe, entrada.nombre, avisar, contador, fondo - 1)))
      } else {
        salida.push(await entrar(dentroDe, entrada.nombre, serie ? { serie, orden: puesto++ } : {}))
      }
    } catch (e) {
      salida.push({
        estado: 'error',
        nombre: entrada.nombre,
        motivo: e instanceof ErrorZip ? e.message : 'no se pudo sacar del zip',
      })
    }
    contador.hecho++
  }
  return salida
}

/**
 * La puerta de entrada. Acepta un PDF, un CBZ o un zip con varios dentro, y
 * devuelve una lista porque un solo archivo puede traer doce libros.
 */
export async function importar(archivo: File, avisar?: (m: Marcha) => void): Promise<Resultado[]> {
  const ext = extension(archivo.name)
  if (ES_RAR.test(ext)) {
    avisar?.({ hecho: 0, total: 1, nombre: archivo.name })
    return [await entrar(archivo, archivo.name)]
  }

  // Nunca se lee el archivo entero: aquí se miran cuatro bytes. Traerse a
  // memoria un zip de dos gigas para ver si es un zip era exactamente el fallo
  // que decía «no se pudo leer el archivo» sin decir por qué.
  //
  // Un `.cbz` también es un zip, y aquí es donde se decide que uno es un cómic
  // y el otro una caja con cómics. Un zip sin extensión reconocible se mira por
  // dentro: alguien que comparte por WhatsApp pierde el nombre a menudo.
  const esCaja = ES_CAJA.test(ext) || (!SIRVE.test(ext) && (await pareceZip(archivo)))

  const contador = { hecho: 0, total: 1 }
  if (esCaja) return abrirCaja(archivo, archivo.name, avisar, contador, FONDO)

  // Un `.cbz` no lleva `%PDF` dentro y aquí es de los buenos, así que la
  // comprobación solo vale para lo que ni siquiera dice ser un libro.
  if (!SIRVE.test(ext) && !(await parecePdf(archivo))) {
    return [{
      estado: 'error',
      nombre: archivo.name,
      motivo: 'no es un PDF ni un cómic. Entran PDF, CBZ y zips con eso dentro',
    }]
  }

  avisar?.({ hecho: 0, total: 1, nombre: archivo.name })
  return [await meter(archivo, archivo.name)]
}
