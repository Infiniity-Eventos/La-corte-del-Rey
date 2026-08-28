import { useMemo, useState } from 'react'
import type { Libro } from '../lib/tipos'
import type { Serie as Coleccion } from '../lib/series'
import { dondeIba } from '../lib/series'
import { Portada } from './Portada'

/**
 * Dentro de una serie.
 *
 * Es la pantalla que hace que doce archivos se lean como un cómic y no como
 * doce archivos. Manda el botón de arriba: **seguir leyendo** es lo que se hace
 * el noventa por ciento de las veces que se entra aquí, y por eso es lo primero
 * y lo más grande. Debajo están los números por si quieres ir a uno concreto, y
 * las flechas por si el orden no es el que tú tienes en la cabeza.
 */

interface Props {
  serie: Coleccion
  /** Los libros que todavía no están en ninguna serie, para poder meterlos. */
  sueltos: Libro[]
  onAbrir: (libro: Libro) => void
  onEditar: (libro: Libro) => void
  onMover: (libro: Libro, hacia: 'arriba' | 'abajo') => void
  onAnadir: (libro: Libro) => void
  onCerrar: () => void
}

function porcentaje(l: Libro): number {
  if (l.paginas <= 1) return 100
  return Math.round(((l.pagina - 1) / (l.paginas - 1)) * 100)
}

function plano(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

export function Serie({ serie, sueltos, onAbrir, onEditar, onMover, onAnadir, onCerrar }: Props) {
  const [anadiendo, setAnadiendo] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const sigue = useMemo(() => dondeIba(serie), [serie])

  const candidatos = useMemo(() => {
    const q = plano(busqueda.trim())
    const libres = sueltos.filter(l => !l.borrado)
    return q ? libres.filter(l => plano(l.titulo).includes(q)) : libres
  }, [sueltos, busqueda])

  const leidos = serie.numeros.filter(l => l.pagina >= l.paginas).length

  return (
    <div className="biblio">
      <div className="biblio-top">
        <button className="icono volver" onClick={onCerrar}>← Biblioteca</button>
      </div>

      <h1 className="display titulo-pantalla serie-tit">{serie.nombre}</h1>
      <p className="pista-vista">
        {serie.numeros.length} {serie.numeros.length === 1 ? 'número' : 'números'}
        {leidos > 0 && ` · ${leidos} ${leidos === 1 ? 'terminado' : 'terminados'}`}
      </p>

      {/* Lo primero de la pantalla, y lo único grande: al entrar aquí casi
          siempre vienes a seguir, no a elegir. */}
      {sigue && (
        <div className="seguir">
          <button className="seguir-abrir" onClick={() => onAbrir(sigue.libro)}>
            <Portada libro={sigue.libro} grande />
            <span className="seguir-cuerpo">
              <span className="seguir-eti mono">Seguir leyendo</span>
              <span className="seguir-tit display">{sigue.libro.titulo}</span>
              <span className="seguir-sub mono">
                página {sigue.pagina} de {sigue.libro.paginas} · {porcentaje(sigue.libro)} %
              </span>
              <span className="barra"><i style={{ width: `${porcentaje(sigue.libro)}%` }} /></span>
            </span>
          </button>
        </div>
      )}

      <div className="rejilla">
        {serie.numeros.map((l, i) => (
          <div key={l.id} className="libro">
            <button className="libro-abrir" onClick={() => onAbrir(l)} title={l.titulo}>
              <Portada libro={l} />
            </button>
            <button className="mas" onClick={() => onEditar(l)} aria-label={`Ficha de ${l.titulo}`}>⋯</button>
            {/* El puesto, encima de la tapa. En una serie, «cuál es este» es la
                pregunta que se hace de un vistazo, y los títulos de los cómics
                se parecen todos entre sí. */}
            <span className="sello-numero" aria-hidden="true">{i + 1}</span>
            <span className="libro-pie">
              {/* El orden se toca aquí y no en la ficha: se ve lo que se está
                  moviendo y contra qué. Arrastrar sería más bonito y mucho más
                  fácil de hacer sin querer con el dedo. */}
              <span className="flechas">
                <button
                  className="flecha"
                  onClick={() => onMover(l, 'arriba')}
                  disabled={i === 0}
                  aria-label={`Subir ${l.titulo}`}
                  title="Subir"
                >
                  ↑
                </button>
                <button
                  className="flecha"
                  onClick={() => onMover(l, 'abajo')}
                  disabled={i === serie.numeros.length - 1}
                  aria-label={`Bajar ${l.titulo}`}
                  title="Bajar"
                >
                  ↓
                </button>
              </span>
              <span className="libro-sub mono">
                {l.pagina > 1 ? `${porcentaje(l)} %` : `${l.paginas} pág.`}
              </span>
            </span>
          </div>
        ))}
      </div>

      <div className="serie-anadir">
        {anadiendo ? (
          <>
            <div className="fila entre">
              <span className="campo-eti">Traer un libro a la serie</span>
              <button className="icono" onClick={() => { setAnadiendo(false); setBusqueda('') }}>
                Listo
              </button>
            </div>
            {sueltos.length > 6 && (
              <div className="buscador">
                <input
                  type="search"
                  value={busqueda}
                  onChange={e => setBusqueda(e.target.value)}
                  placeholder="Buscar por título"
                  aria-label="Buscar entre los sueltos"
                />
              </div>
            )}
            {candidatos.length === 0 ? (
              <p className="sin-nada">
                {sueltos.length === 0
                  ? 'No queda ningún libro fuera de una serie.'
                  : 'Nada con eso.'}
              </p>
            ) : (
              <ul className="sueltos">
                {candidatos.map(l => (
                  <li key={l.id}>
                    <button className="suelto" onClick={() => onAnadir(l)}>
                      <span className="suelto-tit">{l.titulo}</span>
                      <span className="suelto-mas" aria-hidden="true">+</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <button className="btn fantasma peq" onClick={() => setAnadiendo(true)}>
            Añadir números
          </button>
        )}
      </div>

      <p className="serie-nota">
        Al terminar un número, el siguiente se abre solo. Y desde su primera
        página, volver atrás te devuelve al final del anterior.
      </p>
    </div>
  )
}
