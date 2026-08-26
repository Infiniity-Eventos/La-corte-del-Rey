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
  /** Portada generada fuera y traída a mano (D-13). Aún no en el hito 1. */
  portada?: Blob
}

export type Tema = 'papel' | 'sepia' | 'oscuro'

export interface Ajustes {
  tema: Tema
  sonido: boolean
  vibracion: boolean
}

export const AJUSTES_POR_DEFECTO: Ajustes = {
  // P59: el que se abre por defecto es papel
  tema: 'papel',
  sonido: true,
  vibracion: true,
}
