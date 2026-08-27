import { useMemo, useRef, useState } from 'react'
import type { Libro } from '../lib/tipos'
import type { Quien } from '../lib/nube'
import { Portada } from './Portada'

interface Props {
  /** Tu estantería: lo marcado con estrella. */
  libros: Libro[]
  /** Todo lo que hay en la casa, tuyo o de la otra persona. */
  catalogo: Libro[]
  onEstrella: (libro: Libro, puesta: boolean) => void
  importando: boolean
  onImportar: (archivos: FileList) => void
  onAbrir: (libro: Libro) => void
  onEditar: (libro: Libro) => void
  vocabulario: number
  onAjustes: () => void
  onVocabulario: () => void
  onComprobarVersion: () => void
  comprobando: boolean
  quien: Quien | null
  estadoNube: string
  nubeOcupada: boolean
  onSincronizar: () => void
}

function porcentaje(l: Libro): number {
  if (l.paginas <= 1) return 100
  return Math.round(((l.pagina - 1) / (l.paginas - 1)) * 100)
}

/** Sin tildes y en minúsculas: buscar "cronica" tiene que encontrar "Crónica". */
function plano(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

/** El día y la hora en que se compiló lo que estás viendo. */
function compilado(): string {
  try {
    return new Date(__COMPILADO__).toLocaleString('es-ES', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return ''
  }
}

export function Biblioteca({
  libros, catalogo, onEstrella, importando, onImportar, onAbrir, onEditar, vocabulario,
  onAjustes, onVocabulario, onComprobarVersion, comprobando, quien, estadoNube,
  nubeOcupada, onSincronizar,
}: Props) {
  const input = useRef<HTMLInputElement>(null)
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState<string | null>(null)
  /**
   * Dos vistas del mismo sitio: tu estantería y el catálogo de la casa.
   *
   * La pestaña solo aparece cuando hay algo que no está en tu estantería. Con
   * un aparato y una persona no hay dos vistas que elegir, y una pestaña que
   * siempre lleva al mismo sitio es ruido.
   */
  const [vista, setVista] = useState<'mia' | 'casa'>('mia')
  // Con la sesión abierta hay catálogo, aunque todavía sea solo lo tuyo. Antes
  // esto esperaba a que la otra persona hubiera subido algo, y el resultado era
  // que no se veía por ningún lado la mitad de la app.
  const hayCasa = !!quien
  const fuente = vista === 'casa' && hayCasa ? catalogo : libros

  const etiquetas = useMemo(() => {
    const cuenta = new Map<string, number>()
    for (const l of fuente) for (const e of l.etiquetas) cuenta.set(e, (cuenta.get(e) ?? 0) + 1)
    return [...cuenta.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([e]) => e)
  }, [fuente])

  const visibles = useMemo(() => {
    const q = plano(busqueda.trim())
    return fuente.filter(l => {
      if (filtro && !l.etiquetas.includes(filtro)) return false
      if (!q) return true
      // R27 / P41: por título. Las etiquetas entran también porque son las que
      // hacen el trabajo que haría el autor, que quitaste en P42.
      return plano(l.titulo).includes(q) || l.etiquetas.some(e => plano(e).includes(q))
    })
  }, [fuente, busqueda, filtro])

  // R25 / P39: arriba lo que estoy leyendo; debajo, el resto. Solo cuando no
  // estás buscando: si buscas, quieres una lista, no un destacado.
  const filtrando = busqueda.trim() !== '' || filtro !== null
  const leyendo = filtrando ? undefined : visibles.find(l => l.pagina > 1)
  const resto = leyendo ? visibles.filter(l => l.id !== leyendo.id) : visibles

  return (
    <div className="biblio">
      <div className="biblio-top">
        <h1 className="marca display">Infiniity <em>Vellum</em></h1>
        <div className="fila">
          {quien && (
            <button
              className="nube"
              data-estado={nubeOcupada ? 'trabajando' : /no se pudo|faltan/i.test(estadoNube) ? 'error' : 'al-dia'}
              onClick={onSincronizar}
              disabled={nubeOcupada}
              title={estadoNube || 'Sincronizar ahora'}
            >
              <i aria-hidden="true" />
              {nubeOcupada ? 'Nube…' : 'Nube'}
            </button>
          )}
          {vocabulario > 0 && (
            <button className="icono" onClick={onVocabulario}>
              Vocabulario <span className="mono">{vocabulario}</span>
            </button>
          )}
          <button className="icono" onClick={onAjustes}>Ajustes</button>
        </div>
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

      {hayCasa && (
        <div className="segmento vistas">
          <button className="segmento-op" aria-pressed={vista === 'mia'} onClick={() => setVista('mia')}>
            Mi estantería <span className="mono">{libros.length}</span>
          </button>
          <button className="segmento-op" aria-pressed={vista === 'casa'} onClick={() => setVista('casa')}>
            Toda la casa <span className="mono">{catalogo.length}</span>
          </button>
        </div>
      )}

      {fuente.length === 0 && vista === 'mia' ? (
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
          {/* El buscador aparece en cuanto hay algo que buscar. Esperar a tener
              cuatro libros lo escondía justo cuando más falta hace explicar
              dónde vive. */}
          {fuente.length > 1 && (
            <div className="buscador">
              <input
                type="search"
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                placeholder={vista === 'casa'
                  ? 'Buscar en toda la casa'
                  : 'Buscar por título o etiqueta'}
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

          {vista === 'casa' && !filtrando && (
            <p className="pista-vista">
              Todo lo que subís los dos. Toca la estrella para tenerlo en tu estantería.
            </p>
          )}

          {visibles.length === 0 ? (
            <p className="sin-nada">
              {vista === 'casa'
                ? 'Nada con eso en toda la casa.'
                : filtrando
                  ? 'Nada con eso. Está en «Toda la casa»?'
                  : 'Nada con eso. Prueba con menos letras.'}
            </p>
          ) : (
            <div className="rejilla">
              {resto.map(l => (
                <div key={l.id} className="libro">
                  <button className="libro-abrir" onClick={() => onAbrir(l)} title={l.titulo}>
                    <Portada libro={l} />
                  </button>
                  <button className="mas" onClick={() => onEditar(l)} aria-label={`Ficha de ${l.titulo}`}>⋯</button>
                  {/* De quién es, cuando no es tuyo. Sin esto, un catálogo
                      común se vuelve un cajón de cosas sin dueño. */}
                  {l.de && <span className="sello-prestado" title={`Lo subió ${l.deNombre}`}>{(l.deNombre || '?')[0]}</span>}
                  {/* La estrella va debajo de la portada, no encima: sobre la
                      tapa se comía el título, que es lo que hay que leer para
                      decidir si la marcas. Y solo cuando hay catálogo: sin otra
                      persona, todo lo tuyo está en tu estantería y ya está. */}
                  <span className="libro-pie">
                    {hayCasa && (
                      <button
                        className="estrella"
                        aria-pressed={l.estrella !== false}
                        onClick={() => onEstrella(l, l.estrella === false)}
                        aria-label={l.estrella !== false
                          ? `Quitar ${l.titulo} de mi estantería`
                          : `Poner ${l.titulo} en mi estantería`}
                        title={l.estrella !== false ? 'En tu estantería' : 'Ponerlo en tu estantería'}
                      >
                        {l.estrella !== false ? '★' : '☆'}
                      </button>
                    )}
                    <span className="libro-sub mono">
                      {l.paginas} pág.{l.pagina > 1 ? ` · ${porcentaje(l)} %` : ''}
                    </span>
                  </span>
                </div>
              ))}
              {!filtrando && vista === 'mia' && (
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

      {/* La versión es el commit del que salió esta compilación: cambia con cada
          cambio. Se toca para preguntar si hay algo más nuevo, que es la duda
          real detrás de mirarla. */}
      <button className="version mono" onClick={onComprobarVersion} disabled={comprobando}>
        {comprobando ? 'Comprobando…' : `Vellum ${__VERSION__} · ${compilado()}`}
      </button>
    </div>
  )
}
