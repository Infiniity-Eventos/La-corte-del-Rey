import type { Libro } from './tipos'

/**
 * Las portadas: se buscan fuera y se traen a mano.
 *
 * Vellum no genera ni compone nada. Dos botones y ya: uno abre Google Imágenes
 * buscando la portada de la obra, el otro sube el archivo que hayas guardado.
 *
 * Antes esto era un encargo para Gemini con un estilo idéntico para toda la
 * colección. La idea era que cincuenta portadas parecieran una colección; en el
 * uso resultó que **la portada de verdad de un libro sirve mejor que una
 * ilustración bonita que no es la suya**, y que buscarla cuesta cinco segundos.
 */

/**
 * A dónde se manda a buscar.
 *
 * `tbm=isch` es la pestaña de imágenes de Google. Es la forma que lleva años
 * funcionando; Google también acepta `udm=2` desde 2024. Si algún día deja de
 * ir, es una línea — y ya se sabe por experiencia que cualquier identificador
 * de un servicio ajeno escrito en el código acaba caducando.
 */
export function buscarPortada(libro: Libro): string {
  // Se recorta el conjunto: un libro sin título dejaría un espacio colgando al
  // final de la búsqueda.
  const que = `portada ${libro.titulo.trim()}`.trim()
  return `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(que)}`
}
