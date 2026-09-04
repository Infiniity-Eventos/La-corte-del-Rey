/**
 * Envoltura de pdf.js.
 *
 * La regla que manda aquí es R4: nada de pantallas de carga. Eso se traduce en
 * una cosa concreta — las páginas vecinas se dibujan por adelantado, así que
 * cuando el dedo empieza a arrastrar, la página siguiente ya está lista y el
 * volteo no se entrecorta. Esa parte, junto con la caché, vive en
 * `CuadernoBase`: aquí queda solo lo que es de PDF.
 */
import * as pdfjs from 'pdfjs-dist'
import type { PageViewport, PDFDocumentProxy } from 'pdfjs-dist'
import trabajador from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { CuadernoBase } from './cuaderno'
import type { Hoja } from './cuaderno'

pdfjs.GlobalWorkerOptions.workerSrc = trabajador

export class CuadernoPdf extends CuadernoBase {
  readonly paginas: number
  private doc: PDFDocumentProxy
  /**
   * La vista con la que se dibujó cada página.
   *
   * Hace falta para colocar la capa de texto justo encima del dibujo, y se tira
   * al cambiar el tamaño: una vista vieja pone el texto descolocado.
   */
  private vistas = new Map<number, PageViewport>()

  private constructor(doc: PDFDocumentProxy) {
    super()
    this.doc = doc
    this.paginas = doc.numPages
  }

  static async abrir(datos: ArrayBuffer): Promise<CuadernoPdf> {
    const doc = await pdfjs.getDocument({ data: datos }).promise
    return new CuadernoPdf(doc)
  }

  /** Cuenta las páginas sin quedarse el documento abierto. */
  static async contarPaginas(datos: ArrayBuffer): Promise<number> {
    const doc = await pdfjs.getDocument({ data: datos }).promise
    const n = doc.numPages
    await doc.destroy()
    return n
  }

  protected alRedimensionar(): void {
    this.vistas.clear()
  }

  protected async pintar(n: number): Promise<Hoja> {
    const pag = await this.doc.getPage(n)
    const base = pag.getViewport({ scale: 1 })
    const { escala, dpr } = this.encajar(base.width, base.height)
    const vista = pag.getViewport({ scale: escala })
    this.vistas.set(n, vista)

    const { lienzo, ctx } = this.lienzoDe(vista.width, vista.height, dpr)
    await pag.render({ canvasContext: ctx, viewport: vista, transform: [dpr, 0, 0, dpr, 0, 0] }).promise

    return { lienzo, ancho: vista.width, alto: vista.height }
  }

  /**
   * Dibuja el texto invisible encima de la página, para poder seleccionarlo
   * (R31 / P56). Solo funciona donde el PDF lleva texto de verdad; en un
   * escaneado no hay nada que colocar y devuelve falso, que es lo que la
   * interfaz necesita saber para decirlo con palabras.
   */
  async capaDeTexto(n: number, contenedor: HTMLElement): Promise<boolean> {
    const vista = this.vistas.get(n)
    if (!vista) return false
    const pag = await this.doc.getPage(n)
    const contenido = await pag.getTextContent()
    if (contenido.items.length === 0) return false

    contenedor.replaceChildren()
    contenedor.style.setProperty('--scale-factor', String(vista.scale))
    const capa = new pdfjs.TextLayer({
      textContentSource: contenido,
      container: contenedor,
      viewport: vista,
    })
    await capa.render()
    return true
  }

  cerrar(): void {
    super.cerrar()
    this.vistas.clear()
    void this.doc.destroy()
  }
}
