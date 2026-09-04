import { CuadernoBase } from './cuaderno'
import type { Hoja } from './cuaderno'
import { esBasura, extension, listar, sacar } from './zip'
import type { Entrada } from './zip'

/**
 * Cómics en CBZ.
 *
 * Un `.cbz` no es un formato: es un zip con las páginas dentro, una imagen por
 * página, y **el orden lo pone el nombre de los archivos**. No hay índice, ni
 * metadatos, ni nada que consultar; hay que ordenarlos como los ordenaría una
 * persona, que es la única razón por la que esto tiene alguna dificultad.
 *
 * Aquí no hay capa de texto y nunca la habrá: son imágenes escaneadas. La app
 * ya sabe decirlo con palabras cuando alguien intenta seleccionar.
 */

const IMAGENES = /^(jpe?g|png|webp|gif|avif|bmp)$/

/**
 * Las páginas, en orden.
 *
 * `numeric` es todo el asunto: sin él, «10.jpg» va antes que «2.jpg» y el cómic
 * se lee desordenado sin que nada avise. Es el mismo criterio con el que se
 * ordenan los números de una serie (D-36), y falla en el mismo sitio si se
 * olvida.
 */
export async function paginasDe(archivo: Blob): Promise<Entrada[]> {
  const dentro = await listar(archivo)
  return dentro
    .filter(e => !esBasura(e.nombre) && IMAGENES.test(extension(e.nombre)) && e.tamano > 0)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { numeric: true, sensitivity: 'base' }))
}

export async function contarPaginasCbz(archivo: Blob): Promise<number> {
  return (await paginasDe(archivo)).length
}

/**
 * Un cómic abierto.
 *
 * Se queda con el archivo, no con su contenido: las páginas se sacan de una en
 * una según hacen falta. Un tomo de 300 MB en memoria es medio teléfono, y son
 * doscientas imágenes de las que solo se miran tres a la vez.
 */
export class CuadernoCbz extends CuadernoBase {
  readonly paginas: number
  private archivo: Blob
  private hojas: Entrada[]

  private constructor(archivo: Blob, hojas: Entrada[]) {
    super()
    this.archivo = archivo
    this.hojas = hojas
    this.paginas = hojas.length
  }

  static async abrir(archivo: Blob): Promise<CuadernoCbz> {
    const hojas = await paginasDe(archivo)
    if (hojas.length === 0) throw new Error('el cómic no tiene ninguna imagen dentro')
    return new CuadernoCbz(archivo, hojas)
  }

  protected async pintar(n: number): Promise<Hoja> {
    const entrada = this.hojas[n - 1]
    const bytes = await sacar(this.archivo, entrada)
    // `createImageBitmap` descodifica fuera del hilo de la interfaz. Con
    // `<img>` y una URL, una página de cómic de 4000 píxeles congelaba el
    // volteo justo mientras el dedo estaba arrastrando.
    const imagen = await createImageBitmap(bytes)
    try {
      const { escala, dpr } = this.encajar(imagen.width, imagen.height)
      const ancho = imagen.width * escala
      const alto = imagen.height * escala
      const { lienzo, ctx } = this.lienzoDe(ancho, alto, dpr)
      ctx.drawImage(imagen, 0, 0, Math.floor(ancho * dpr), Math.floor(alto * dpr))
      return { lienzo, ancho, alto }
    } finally {
      // Sin cerrarla, cada página deja su mapa de bits suelto en memoria; en un
      // tomo de doscientas páginas eso es medio giga.
      imagen.close()
    }
  }

  /** Un escaneado no tiene texto que colocar, y decirlo es la respuesta útil. */
  async capaDeTexto(): Promise<boolean> {
    return false
  }
}
