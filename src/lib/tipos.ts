/** Un libro, tal como lo define D-17: título a mano, etiquetas, tipo, progreso. */
export interface Libro {
  id: string
  /** SHA-256 del archivo. Es lo que detecta los repetidos (R24 / P37). */
  hash: string
  titulo: string
  tipo: 'libro' | 'comic'
  etiquetas: string[]
  paginas: number
  bytes: number
  archivo: string
  anadidoEn: number
  /** Página por la que va, 1-based. Se guarda sola (R16 / P15). */
  pagina: number
  abiertoEn: number
  /** Portada generada fuera y traída a mano (D-13). */
  portada?: Blob
  /** Cuando la propia imagen ya trae el título escrito, Vellum no lo compone. */
  tituloEnPortada?: boolean
}

export type Tema = 'papel' | 'sepia' | 'oscuro'

/** Una entrada del vocabulario, con todo lo que pediste en P57. */
export interface Palabra {
  id: string
  /** Lo que mandaste a traducir. */
  texto: string
  /** La traducción natural. */
  traduccion: string
  /** La frase entera donde apareció, si la mandaste completa. */
  frase: string
  libroId: string
  libroTitulo: string
  pagina: number
  fecha: number
}

export interface Ajustes {
  tema: Tema
  sonido: boolean
  vibracion: boolean
}

/**
 * La clave de Gemini se guarda aparte de los ajustes a propósito.
 *
 * En el hito 4 los ajustes se sincronizan con Firebase (P47). La clave no tiene
 * por qué viajar —en P48 dijiste que la repartes tú por WhatsApp— y guardarla
 * en el mismo saco haría fácil que acabara subiendo sin querer. Separarla hace
 * que eso no pueda pasar por descuido.
 */

export const AJUSTES_POR_DEFECTO: Ajustes = {
  // P59: el que se abre por defecto es papel
  tema: 'papel',
  sonido: true,
  vibracion: true,
}
