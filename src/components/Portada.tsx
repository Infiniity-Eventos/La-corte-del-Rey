import { useEffect, useState } from 'react'
import type { Libro } from '../lib/tipos'

/**
 * La portada.
 *
 * Sin imagen es tipográfica (R46 / P74): en P74 elegiste que fuera siempre así,
 * incluso cuando el PDF trae portada propia. El color no es aleatorio — sale del
 * título — así que un libro se ve igual siempre y dos libros casi nunca
 * coinciden. Es lo que permite reconocerlo de un vistazo.
 *
 * Con imagen, **Vellum compone el título encima** (D-15). En P73 pediste que el
 * título apareciera escrito en la portada, y aparece; lo que no hace es
 * escribirlo el generador, que lo haría mal y con una letra distinta cada vez.
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

/** Un blob no se puede pintar directo: hace falta una URL, y hay que soltarla. */
export function useUrlDeBlob(blob: Blob | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!blob) {
      setUrl(null)
      return
    }
    const u = URL.createObjectURL(blob)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [blob])
  return url
}

export function Portada({ libro, grande = false }: { libro: Libro; grande?: boolean }) {
  const url = useUrlDeBlob(libro.portada)

  return (
    <div
      className={`portada${grande ? ' grande' : ''}${url ? ' conImagen' : ''}`}
      style={{ ['--marca-color' as string]: tinte(libro.titulo) }}
    >
      {url ? (
        <img src={url} alt="" className="portada-img" />
      ) : (
        <>
          <span className="portada-glifo" aria-hidden="true">{glifo(libro.titulo)}</span>
          <span className="portada-regla" aria-hidden="true" />
        </>
      )}
      <span className="portada-tit">{libro.titulo}</span>
    </div>
  )
}
