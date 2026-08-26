import { useRef } from 'react'
import type { Libro } from '../lib/tipos'
import { Portada } from './Portada'

interface Props {
  libros: Libro[]
  importando: boolean
  onImportar: (archivos: FileList) => void
  onAbrir: (libro: Libro) => void
}

function porcentaje(l: Libro): number {
  if (l.paginas <= 1) return 100
  return Math.round(((l.pagina - 1) / (l.paginas - 1)) * 100)
}

export function Biblioteca({ libros, importando, onImportar, onAbrir }: Props) {
  const input = useRef<HTMLInputElement>(null)

  // R25 / P39: arriba lo que estoy leyendo; debajo, el resto.
  const leyendo = libros.find(l => l.pagina > 1)
  const resto = leyendo ? libros.filter(l => l.id !== leyendo.id) : libros

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
          {leyendo && (
            <button className="seguir" onClick={() => onAbrir(leyendo)}>
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
          )}

          <div className="rejilla">
            {resto.map(l => (
              <button key={l.id} className="libro" onClick={() => onAbrir(l)} title={l.titulo}>
                <Portada libro={l} />
                <span className="libro-sub mono">{l.paginas} pág.</span>
              </button>
            ))}
            <button className="libro" onClick={() => input.current?.click()} disabled={importando}>
              <span className="portada hueca"><span aria-hidden="true">+</span></span>
              <span className="libro-sub mono">Traer un PDF</span>
            </button>
          </div>
        </>
      )}
    </div>
  )
}
