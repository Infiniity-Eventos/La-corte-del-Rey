/**
 * Un libro abierto, sea lo que sea por dentro.
 *
 * D-02 dijo «solo PDF en la versión 1, pero con el formato separado del resto
 * para poder añadir CBZ después sin rehacer nada». Esto es ese sitio: el lector
 * pide páginas y no sabe —ni le hace falta— si vienen de pdf.js o de un montón
 * de imágenes dentro de un zip.
 *
 * Todo lo que comparten los dos —la caché de páginas dibujadas, adelantarse a
 * la siguiente, rehacerlas al girar el teléfono— vive aquí una sola vez. Lo que
 * cambia de verdad es una función: **cómo se pinta la página número n**.
 */

/** Una página ya dibujada, lista para colgar en su hoja. */
export interface Hoja {
  lienzo: HTMLCanvasElement
  ancho: number
  alto: number
}

export type Formato = 'pdf' | 'cbz'

export interface Cuaderno {
  readonly paginas: number
  redimensionar(w: number, h: number): void
  hecha(n: number): Hoja | undefined
  dibujar(n: number): Promise<Hoja>
  /**
   * Coloca el texto invisible encima de la página para poder seleccionarlo
   * (R31 / P56). En un cómic escaneado no hay texto que colocar, y decir que no
   * es lo que permite a la app explicarlo con palabras en vez de no reaccionar.
   */
  capaDeTexto(n: number, contenedor: HTMLElement): Promise<boolean>
  adelantar(n: number): void
  cerrar(): void
}

/** Cuántas páginas dibujadas se guardan. Más son lienzos ocupando memoria. */
const TOPE_CACHE = 6

export abstract class CuadernoBase implements Cuaderno {
  abstract readonly paginas: number
  protected caja = { w: 0, h: 0 }
  private cache = new Map<number, Hoja>()
  private enCurso = new Map<number, Promise<Hoja>>()

  /** Lo único que distingue a un formato de otro. */
  protected abstract pintar(n: number): Promise<Hoja>

  /** Para lo que cada formato tenga que tirar al cambiar el tamaño. */
  protected alRedimensionar(): void {}

  abstract capaDeTexto(n: number, contenedor: HTMLElement): Promise<boolean>

  /** Al cambiar el tamaño de la ventana lo dibujado ya no sirve. */
  redimensionar(w: number, h: number): void {
    if (Math.abs(w - this.caja.w) < 2 && Math.abs(h - this.caja.h) < 2) return
    this.caja = { w, h }
    this.cache.clear()
    this.enCurso.clear()
    this.alRedimensionar()
  }

  hecha(n: number): Hoja | undefined {
    return this.cache.get(n)
  }

  async dibujar(n: number): Promise<Hoja> {
    if (n < 1 || n > this.paginas) throw new Error(`página ${n} fuera de rango`)
    const lista = this.cache.get(n)
    if (lista) return lista
    const yendo = this.enCurso.get(n)
    if (yendo) return yendo

    const tarea = this.pintar(n).then(p => {
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

  /** Prepara las vecinas sin bloquear nada. Si fallan, no pasa nada. */
  adelantar(n: number): void {
    for (const v of [n + 1, n - 1, n + 2]) {
      if (v >= 1 && v <= this.paginas && !this.cache.has(v)) void this.dibujar(v).catch(() => {})
    }
  }

  cerrar(): void {
    this.cache.clear()
    this.enCurso.clear()
  }

  /**
   * El tamaño y la densidad con los que se dibuja una página.
   *
   * La página no llega a los bordes: queda como una hoja apoyada sobre el
   * pergamino, y además le deja aire al giro para que no choque con el borde.
   * La densidad va con tope porque en un móvil de 3× una página grande pide un
   * lienzo enorme y se queda sin memoria.
   */
  protected encajar(ancho: number, alto: number): { escala: number; dpr: number } {
    const { w, h } = this.caja
    return {
      escala: Math.min((w * 0.94) / ancho, (h * 0.96) / alto),
      dpr: Math.min(window.devicePixelRatio || 1, 2.5),
    }
  }

  /** Un lienzo del tamaño pedido, con el fondo ya blanco. */
  protected lienzoDe(ancho: number, alto: number, dpr: number): { lienzo: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
    const lienzo = document.createElement('canvas')
    lienzo.width = Math.floor(ancho * dpr)
    lienzo.height = Math.floor(alto * dpr)
    // Su tamaño real en pantalla, para poder centrarlo sobre la hoja en vez de
    // estirarlo hasta los bordes.
    lienzo.style.width = `${ancho}px`
    lienzo.style.height = `${alto}px`
    const ctx = lienzo.getContext('2d', { alpha: false })
    if (!ctx) throw new Error('sin contexto 2d')
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, lienzo.width, lienzo.height)
    return { lienzo, ctx }
  }
}

/**
 * Qué formato es, por el nombre del archivo.
 *
 * Por el nombre y no por el contenido a propósito: un `.cbz` y un `.zip` son el
 * mismo formato por dentro, y lo que los separa es para qué los quieres — uno
 * es un cómic, el otro es una caja con cómics.
 */
export function formatoDe(nombre: string): Formato {
  return /\.cbz$/i.test(nombre.trim()) ? 'cbz' : 'pdf'
}

/**
 * Cada formato se carga cuando se abre uno.
 *
 * pdf.js pesa medio megabyte: quien solo lee cómics no tiene por qué
 * descargarlo, y al revés igual.
 */
export async function abrirCuaderno(datos: ArrayBuffer, formato: Formato): Promise<Cuaderno> {
  if (formato === 'cbz') {
    const { CuadernoCbz } = await import('./cbz')
    return CuadernoCbz.abrir(datos)
  }
  const { CuadernoPdf } = await import('./pdf')
  return CuadernoPdf.abrir(datos)
}

/** Cuántas páginas tiene, sin quedarse el archivo abierto. */
export async function contarPaginas(datos: ArrayBuffer, formato: Formato): Promise<number> {
  if (formato === 'cbz') {
    const { contarPaginasCbz } = await import('./cbz')
    return contarPaginasCbz(datos)
  }
  const { CuadernoPdf } = await import('./pdf')
  return CuadernoPdf.contarPaginas(datos)
}
