import type { Libro } from '../lib/tipos'

/**
 * La portada tipográfica (R46 / P74).
 *
 * En P74 elegiste que fuera siempre tipográfica, incluso cuando el PDF trae una
 * portada propia. El color no es aleatorio: sale del título, así que un mismo
 * libro se ve igual siempre y dos libros distintos casi nunca coinciden. Es lo
 * que permite reconocer un libro de un vistazo sin necesidad de imagen.
 */

const TINTES = [
  '#C4A87A', '#B08968', '#A3A380', '#9C7C6C',
  '#8FA3A3', '#B39B8C', '#A08C64', '#94826E',
]

function tinte(titulo: string): string {
  let h = 0
  for (let i = 0; i < titulo.length; i++) h = (h * 31 + titulo.charCodeAt(i)) >>> 0
  return TINTES[h % TINTES.length]
}

function glifo(titulo: string): string {
  const palabras = titulo.split(/\s+/).filter(p => /\p{L}/u.test(p))
  if (palabras.length === 0) return '§'
  if (palabras.length === 1) return palabras[0].slice(0, 1).toUpperCase()
  return (palabras[0][0] + palabras[palabras.length - 1][0]).toUpperCase()
}

export function Portada({ libro, grande = false }: { libro: Libro; grande?: boolean }) {
  return (
    <div
      className={grande ? 'portada grande' : 'portada'}
      style={{ ['--marca-color' as string]: tinte(libro.titulo) }}
    >
      <span className="portada-glifo" aria-hidden="true">
        {glifo(libro.titulo)}
      </span>
      <span className="portada-regla" aria-hidden="true" />
      <span className="portada-tit">{libro.titulo}</span>
    </div>
  )
}
