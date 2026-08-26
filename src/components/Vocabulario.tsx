import { useMemo, useState } from 'react'
import type { Palabra } from '../lib/tipos'

/**
 * La lista de vocabulario (R17 / P57).
 *
 * Guarda lo que pediste: lo consultado, su traducción, y de qué libro y qué
 * página salió. Esto último es lo que la convierte en algo útil meses después:
 * sin saber de dónde venía, una palabra suelta no dice nada.
 */

interface Props {
  palabras: Palabra[]
  onBorrar: (id: string) => void
  onCerrar: () => void
}

function cuando(ms: number): string {
  const dias = Math.floor((Date.now() - ms) / 86400000)
  if (dias === 0) return 'hoy'
  if (dias === 1) return 'ayer'
  if (dias < 30) return `hace ${dias} días`
  return new Date(ms).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}

export function Vocabulario({ palabras, onBorrar, onCerrar }: Props) {
  const [busqueda, setBusqueda] = useState('')

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return palabras
    return palabras.filter(
      p => p.texto.toLowerCase().includes(q) || p.traduccion.toLowerCase().includes(q),
    )
  }, [palabras, busqueda])

  return (
    <div className="biblio">
      <div className="biblio-top">
        <button className="icono volver" onClick={onCerrar}>← Biblioteca</button>
        {palabras.length > 0 && (
          <span className="cuenta mono">
            {palabras.length} {palabras.length === 1 ? 'entrada' : 'entradas'}
          </span>
        )}
      </div>

      <h1 className="display titulo-pantalla">Vocabulario</h1>

      {palabras.length === 0 ? (
        <div className="vacio">
          <h2 className="display">Todavía no hay nada</h2>
          <p>
            Cuando traduzcas algo mientras lees, puedes guardarlo aquí con la frase
            donde apareció y la página de la que salió.
          </p>
        </div>
      ) : (
        <>
          {palabras.length > 5 && (
            <div className="buscador">
              <input
                type="search"
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                placeholder="Buscar en tu vocabulario"
                aria-label="Buscar"
              />
            </div>
          )}

          {visibles.length === 0 ? (
            <p className="sin-nada">Nada con eso.</p>
          ) : (
            <ul className="voc">
              {visibles.map(p => (
                <li key={p.id} className="voc-fila">
                  <div className="voc-cuerpo">
                    <p className="voc-en">{p.texto}</p>
                    <p className="voc-es">{p.traduccion}</p>
                    <p className="voc-de mono">
                      {p.libroTitulo} · pág. {p.pagina} · {cuando(p.fecha)}
                    </p>
                  </div>
                  <button
                    className="mas suelto"
                    onClick={() => onBorrar(p.id)}
                    aria-label={`Quitar ${p.texto}`}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
