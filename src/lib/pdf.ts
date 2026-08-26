/**
 * Envoltura de pdf.js.
 *
 * La regla que manda aquí es R4: nada de pantallas de carga. Eso se traduce en
 * una cosa concreta — las páginas vecinas se dibujan por adelantado, así que
 * cuando el dedo empieza a arrastrar, la página siguiente ya está lista y el
 * volteo no se entrecorta.
 */
import * as pdfjs from 'pdfjs-dist'
import type { PageViewport, PDFDocumentProxy } from 'pdfjs-dist'
import trabajador from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjs.GlobalWorkerOptions.workerSrc = trabajador

export interface Pagina {
  lienzo: HTMLCanvasElement
  ancho: number
  alto: number
  /** Hace falta para colocar la capa de texto justo encima del dibujo. */
  vista: PageViewport
}

const TOPE_CACHE = 6

export class Cuaderno {
  private doc: PDFDocumentProxy
  private cache = new Map<number, Pagina>()
  private enCurso = new Map<number, Promise<Pagina>>()
  private caja = { w: 0, h: 0 }

  readonly paginas: number

  private constructor(doc: PDFDocumentProxy) {
    this.doc = doc
    this.paginas = doc.numPages
  }

  static async abrir(datos: ArrayBuffer): Promise<Cuaderno> {
    const doc = await pdfjs.getDocument({ data: datos }).promise
    return new Cuaderno(doc)
  }

  /** Cuenta las páginas sin quedarse el documento abierto. */
  static async contarPaginas(datos: ArrayBuffer): Promise<number> {
    const doc = await pdfjs.getDocument({ data: datos }).promise
    const n = doc.numPages
    await doc.destroy()
    return n
  }

  /** Al cambiar el tamaño de la ventana lo dibujado ya no sirve. */
  redimensionar(w: number, h: number): void {
    if (Math.abs(w - this.caja.w) < 2 && Math.abs(h - this.caja.h) < 2) return
    this.caja = { w, h }
    this.cache.clear()
    this.enCurso.clear()
  }

  hecha(n: number): Pagina | undefined {
    return this.cache.get(n)
  }

  async dibujar(n: number): Promise<Pagina> {
    if (n < 1 || n > this.paginas) throw new Error(`página ${n} fuera de rango`)
    const lista = this.cache.get(n)
    if (lista) return lista
    const yendo = this.enCurso.get(n)
    if (yendo) return yendo

    const tarea = this.dibujarDeVerdad(n).then(p => {
      this.enCurso.delete(n)
      this.cache.set(n, p)
      // Se descartan las más viejas para no acumular lienzos en memoria.
      while (this.cache.size > TOPE_CACHE) {
        const vieja = this.cache.keys().next().value
        if (vieja === undefined) break
        this.cache.delete(vieja)
      }
      return p
    })
    this.enCurso.set(n, tarea)
    return tarea
  }

  private async dibujarDeVerdad(n: number): Promise<Pagina> {
    const pag = await this.doc.getPage(n)
    const base = pag.getViewport({ scale: 1 })
    // La página no llega a los bordes: queda como una hoja apoyada sobre el
    // pergamino, y además le deja aire al giro para que no choque con el borde.
    const { w, h } = this.caja
    const escala = Math.min((w * 0.94) / base.width, (h * 0.96) / base.height)
    const vista = pag.getViewport({ scale: escala })

    // Se dibuja a la densidad real de la pantalla, con tope: en un móvil de
    // 3x un PDF grande puede pedir un lienzo enorme y quedarse sin memoria.
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5)
    const lienzo = document.createElement('canvas')
    lienzo.width = Math.floor(vista.width * dpr)
    lienzo.height = Math.floor(vista.height * dpr)

    const ctx = lienzo.getContext('2d', { alpha: false })
    if (!ctx) throw new Error('sin contexto 2d')
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, lienzo.width, lienzo.height)

    await pag.render({ canvasContext: ctx, viewport: vista, transform: [dpr, 0, 0, dpr, 0, 0] }).promise

    return { lienzo, ancho: vista.width, alto: vista.height, vista }
  }

  /**
   * Dibuja el texto invisible encima de la página, para poder seleccionarlo
   * (R31 / P56). Solo funciona donde el PDF lleva texto de verdad; en un
   * escaneado no hay nada que colocar y devuelve falso, que es lo que la
   * interfaz necesita saber para decirlo con palabras.
   */
  async capaDeTexto(n: number, contenedor: HTMLElement): Promise<boolean> {
    const p = this.cache.get(n)
    if (!p) return false
    const pag = await this.doc.getPage(n)
    const contenido = await pag.getTextContent()
    if (contenido.items.length === 0) return false

    contenedor.replaceChildren()
    contenedor.style.setProperty('--scale-factor', String(p.vista.scale))
    const capa = new pdfjs.TextLayer({
      textContentSource: contenido,
      container: contenedor,
      viewport: p.vista,
    })
    await capa.render()
    return true
  }

  /** Prepara las vecinas sin bloquear nada. Si fallan, no pasa nada. */
  adelantar(n: number): void {
    for (const v of [n + 1, n - 1, n + 2]) {
      if (v >= 1 && v <= this.paginas && !this.cache.has(v)) void this.dibujar(v).catch(() => {})
    }
  }

  cerrar(): void {
    this.cache.clear()
    this.enCurso.clear()
    void this.doc.destroy()
  }
}
