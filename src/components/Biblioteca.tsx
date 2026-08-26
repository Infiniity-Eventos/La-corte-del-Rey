import { useMemo, useRef, useState } from 'react'
import type { Libro } from '../lib/tipos'
import { Portada } from './Portada'

interface Props {
  libros: Libro[]
  importando: boolean
  onImportar: (archivos: FileList) => void
  onAbrir: (libro: Libro) => void
  onEditar: (libro: Libro) => void
}

function porcentaje(l: Libro): number {
  if (l.paginas <= 1) return 100
  return Math.round(((l.pagina - 1) / (l.paginas - 1)) * 100)
}

/** Sin tildes y en minúsculas: buscar "cronica" tiene que encontrar "Crónica". */
function plano(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

export function Biblioteca({ libros, importando, onImportar, onAbrir, onEditar }: Props) {
  const input = useRef<HTMLInputElement>(null)
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState<string | null>(null)

  const etiquetas = useMemo(() => {
    const cuenta = new Map<string, number>()
    for (const l of libros) for (const e of l.etiquetas) cuenta.set(e, (cuenta.get(e) ?? 0) + 1)
    return [...cuenta.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([e]) => e)
  }, [libros])

  const visibles = useMemo(() => {
    const q = plano(busqueda.trim())
    return libros.filter(l => {
      if (filtro && !l.etiquetas.includes(filtro)) return false
      if (!q) return true
      // R27 / P41: por título. Las etiquetas entran también porque son las que
      // hacen el trabajo que haría el autor, que quitaste en P42.
      return plano(l.titulo).includes(q) || l.etiquetas.some(e => plano(e).includes(q))
    })
  }, [libros, busqueda, filtro])

  // R25 / P39: arriba lo que estoy leyendo; debajo, el resto. Solo cuando no
  // estás buscando: si buscas, quieres una lista, no un destacado.
  const filtrando = busqueda.trim() !== '' || filtro !== null
  const leyendo = filtrando ? undefined : visibles.find(l => l.pagina > 1)
  const resto = leyendo ? visibles.filter(l => l.id !== leyendo.id) : visibles

  return (
    <div className="biblio">
      <div className="biblio-top">
        <h1 className="marca display">Infiniity <em>Vellum</em></h1>
        {libros.length > 0 && (
          <span className="cuenta mono">{libros.length} {libros.length === 1 ? 'libro' : 'libros'}</span>
        )}
      </div>

      <input
        ref={input}
        type="file"
        accept="application/pdf,.pdf"
        multiple
        hidden
        onChange={e => {
          if (e.target.files?.length) onImportar(e.target.files)
          e.target.value = ''
        }}
      />

      {libros.length === 0 ? (
        <div className="vacio">
          <h2 className="display">La estantería está vacía</h2>
          <p>
            Trae un PDF y se queda en este aparato. No se sube a ningún sitio ni hace falta
            cuenta para leerlo.
          </p>
          <button className="btn" onClick={() => input.current?.click()} disabled={importando}>
            Traer un PDF
          </button>
        </div>
      ) : (
        <>
          {libros.length > 3 && (
            <div className="buscador">
              <input
                type="search"
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                placeholder="Buscar por título o etiqueta"
                aria-label="Buscar"
              />
            </div>
          )}

          {etiquetas.length > 0 && (
            <div className="fichas sueltas filtros">
              {etiquetas.map(e => (
                <button
                  key={e}
                  className="ficha-eti fantasma"
                  aria-pressed={filtro === e}
                  onClick={() => setFiltro(f => (f === e ? null : e))}
                >
                  {e}
                </button>
              ))}
            </div>
          )}

          {leyendo && (
            <div className="seguir">
              <button className="seguir-abrir" onClick={() => onAbrir(leyendo)}>
                <Portada libro={leyendo} grande />
                <span className="seguir-cuerpo">
                  <span className="seguir-eti mono">Seguir leyendo</span>
                  <span className="seguir-tit display">{leyendo.titulo}</span>
                  <span className="seguir-sub mono">
                    página {leyendo.pagina} de {leyendo.paginas} · {porcentaje(leyendo)} %
                  </span>
                  <span className="barra"><i style={{ width: `${porcentaje(leyendo)}%` }} /></span>
                </span>
              </button>
              <button className="mas" onClick={() => onEditar(leyendo)} aria-label={`Ficha de ${leyendo.titulo}`}>
                ⋯
              </button>
            </div>
          )}

          {visibles.length === 0 ? (
            <p className="sin-nada">Nada con eso. Prueba con menos letras.</p>
          ) : (
            <div className="rejilla">
              {resto.map(l => (
                <div key={l.id} className="libro">
                  <button className="libro-abrir" onClick={() => onAbrir(l)} title={l.titulo}>
                    <Portada libro={l} />
                  </button>
                  <button className="mas" onClick={() => onEditar(l)} aria-label={`Ficha de ${l.titulo}`}>⋯</button>
                  <span className="libro-sub mono">
                    {l.paginas} pág.{l.pagina > 1 ? ` · ${porcentaje(l)} %` : ''}
                  </span>
                </div>
              ))}
              {!filtrando && (
                <div className="libro">
                  <button
                    className="libro-abrir"
                    onClick={() => input.current?.click()}
                    disabled={importando}
                  >
                    <span className="portada hueca"><span aria-hidden="true">+</span></span>
                  </button>
                  <span className="libro-sub mono">Traer un PDF</span>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
