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
  /**
   * Cómo se llamaba el archivo al traerlo.
   *
   * El título lo reescribes tú, y al hacerlo se pierde lo que el nombre traía
   * y el título no dice: el idioma, el número de tomo, el año. Eso le sirve al
   * generador de portadas para acertar con la obra (D-13). Los libros traídos
   * antes de esto no lo tienen, y la línea simplemente no aparece.
   */
  nombreOriginal?: string
  anadidoEn: number
  /** Página por la que va, 1-based. Se guarda sola (R16 / P15). */
  pagina: number
  abiertoEn: number
  /** Portada generada fuera y traída a mano (D-13). */
  portada?: Blob

  /**
   * Cuándo se tocó por última vez. Es lo que decide quién gana al sincronizar:
   * entre dos versiones del mismo libro, la más reciente.
   */
  actualizadoEn?: number
  /** Si el PDF ya está en la nube. El archivo pesa; el dato de si subió, no. */
  archivoEnNube?: boolean
  /** Marcado para no volver a bajar aquí lo que ya se borró. */
  borrado?: boolean

  /**
   * Si está en **tu** estantería.
   *
   * Todo lo que sube cualquiera va al catálogo de la casa, que es común y se
   * busca entero. La estrella es lo que decide qué se queda en tu perfil: lo
   * que marcas aparece en tu estantería y baja a tu aparato; lo demás existe,
   * se busca y se puede abrir, pero no te llena la estantería.
   *
   * Lo que traes tú nace marcado: si lo subiste, es porque lo querías.
   */
  estrella?: boolean
  /** Si llegó del estante: de quién es. Vacío en los tuyos. */
  de?: string
  /** Y cómo se llama quien lo puso, que es lo que se enseña. */
  deNombre?: string
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
  actualizadoEn?: number
  /**
   * Marcada como quitada, no borrada del todo.
   *
   * Sin esto, quitar una frase aquí no dejaba rastro y la nube te la devolvía
   * entera en la siguiente sincronización. Con el guardado automático se quitan
   * frases a menudo, así que deja de ser un detalle.
   */
  borrado?: boolean
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
