import { useEffect, useRef, useState } from 'react'
import type { Libro } from '../lib/tipos'
import { GENERADOR, copiar, promptPortada } from '../lib/portadas'
import { Portada } from './Portada'

/**
 * La ficha de un libro: lo que P42 llamó «control total».
 *
 * El título lo escribes tú, siempre. No hay campo de autor, que lo quitaste
 * expresamente: las etiquetas hacen ese trabajo (D-17).
 */

interface Props {
  libro: Libro
  etiquetasConocidas: string[]
  /** Quién eres ahora mismo. Sin sesión no hay estante que compartir. */
  miUid: string | null
  onGuardar: (libro: Libro) => void
  onBorrar: (libro: Libro) => void
  onCerrar: () => void
}

function normalizar(e: string): string {
  return e.trim().toLowerCase().replace(/\s+/g, ' ')
}

/** En megabytes, un PDF de apuntes sale como «0.0 MB», que no dice nada. */
function tamano(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} kB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function FichaLibro({ libro, etiquetasConocidas, miUid, onGuardar, onBorrar, onCerrar }: Props) {
  const [titulo, setTitulo] = useState(libro.titulo)
  const [tipo, setTipo] = useState(libro.tipo)
  const [etiquetas, setEtiquetas] = useState<string[]>(libro.etiquetas)
  const [portada, setPortada] = useState<Blob | undefined>(libro.portada)
  const [tituloEnPortada, setTituloEnPortada] = useState(libro.tituloEnPortada ?? false)
  const [nueva, setNueva] = useState('')
  const [confirmando, setConfirmando] = useState(false)
  // El encargo de la portada, cuando lo has pedido: qué se copió, si se copió y
  // si el generador llegó a abrirse.
  const [encargo, setEncargo] = useState<
    { texto: string; copiado: boolean; abrio: boolean } | null
  >(null)
  const imagen = useRef<HTMLInputElement>(null)
  const campoTitulo = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Se selecciona el título de entrada: casi siempre lo primero que haces al
    // abrir la ficha es reemplazar el nombre del archivo por uno decente.
    campoTitulo.current?.select()
  }, [])

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar() }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onCerrar])

  const anadirEtiqueta = (texto: string) => {
    const e = normalizar(texto)
    if (!e) return
    setEtiquetas(prev => (prev.includes(e) ? prev : [...prev, e]))
    setNueva('')
  }

  const guardar = () => {
    onGuardar({
      ...libro,
      titulo: titulo.trim() || libro.titulo,
      tipo,
      etiquetas,
      portada,
      tituloEnPortada: portada ? tituloEnPortada : false,
    })
  }

  // Un libro de otra persona se lee, no se edita: lo que ves de él es suyo.
  const ajeno = !!libro.de && libro.de !== miUid
  const sugerencias = etiquetasConocidas.filter(e => !etiquetas.includes(e)).slice(0, 8)
  // Lo que estás editando ahora mismo, sin haber guardado todavía. Sirve para
  // la portada de arriba y, sobre todo, para el encargo: si acabas de marcar
  // «Cómic» y de poner tres etiquetas, el encargo tiene que llevarlas.
  const vistaPrevia: Libro = {
    ...libro,
    titulo: titulo.trim() || libro.titulo,
    tipo,
    etiquetas,
    portada,
    tituloEnPortada: portada ? tituloEnPortada : false,
  }

  /**
   * Copiar primero y abrir después, y en ese orden.
   *
   * El portapapeles exige que la página tenga el foco, y abrir el generador se
   * lo quita. Al revés, el encargo se perdería justo cuando ya no estás mirando.
   */
  const crearPortada = async () => {
    const texto = promptPortada(vistaPrevia)
    const copiado = await copiar(texto)
    // Con 'noopener' en las opciones, window.open **siempre devuelve null**, y
    // entonces no hay forma de distinguir «se abrió» de «lo bloquearon». Se
    // abre sin esa opción y se corta el enlace de vuelta a mano, que consigue
    // lo mismo sin quedarse ciego.
    const ventana = window.open(GENERADOR, '_blank')
    if (ventana) ventana.opener = null
    setEncargo({ texto, copiado, abrio: ventana !== null })
  }


  return (
    <div className="telon" onPointerDown={e => { if (e.target === e.currentTarget) onCerrar() }}>
      <div className="ficha" role="dialog" aria-label="Ficha del libro">
        <div className="ficha-asa" aria-hidden="true" />

        <div className="ficha-cabeza">
          <Portada libro={vistaPrevia} grande />
          {ajeno ? null : (
          <div className="ficha-acciones">
            <button className="btn fantasma peq" onClick={() => imagen.current?.click()}>
              {portada ? 'Cambiar portada' : 'Poner portada'}
            </button>
            {portada && (
              <button className="btn fantasma peq" onClick={() => setPortada(undefined)}>
                Quitar portada
              </button>
            )}
            <button className="btn fantasma peq" onClick={() => void crearPortada()}>
              Crear portada
            </button>
            {portada ? (
              <label className="casilla">
                <input
                  type="checkbox"
                  checked={tituloEnPortada}
                  onChange={e => setTituloEnPortada(e.target.checked)}
                />
                <span>
                  El título ya está en la imagen
                  <em>
                    Normalmente lo compone Vellum encima, para que todas las portadas
                    lleven la misma letra. Marca esto si esta lo trae ya escrito.
                  </em>
                </span>
              </label>
            ) : (
              <p className="ficha-pista">Sin imagen, la portada se compone con el título.</p>
            )}
          </div>
          )}
        </div>

        {encargo && (
          <div className="encargo">
            <div className="encargo-top">
              <span className="encargo-tit">
                {encargo.copiado ? 'Encargo copiado' : 'Cópialo tú'}
              </span>
              <button
                className="btn fantasma peq"
                onClick={() => void copiar(encargo.texto).then(ok =>
                  setEncargo(e => (e ? { ...e, copiado: ok } : e)))}
              >
                Copiar otra vez
              </button>
              <button className="icono" onClick={() => setEncargo(null)} aria-label="Cerrar el encargo">
                ✕
              </button>
            </div>
            <pre className="encargo-txt">{encargo.texto}</pre>
            <p className="encargo-pista">
              {encargo.abrio
                ? 'Pégalo en Gemini, genera la portada y guárdala. Luego vuelve aquí y pulsa «Poner portada».'
                : 'El navegador no dejó abrir Gemini. Ábrelo tú, pega el encargo y vuelve con la imagen.'}
            </p>
            {!encargo.abrio && (
              <a className="btn peq" href={GENERADOR} target="_blank" rel="noopener">
                Abrir Gemini
              </a>
            )}
          </div>
        )}

        <input
          ref={imagen}
          type="file"
          accept="image/*"
          hidden
          onChange={e => {
            const f = e.target.files?.[0]
            if (f) setPortada(f)
            e.target.value = ''
          }}
        />

        {!ajeno && (
        <label className="campo">
          <span className="campo-eti">Título</span>
          <input
            ref={campoTitulo}
            value={titulo}
            onChange={e => setTitulo(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') guardar() }}
            placeholder="Cómo se llama"
          />
        </label>
        )}

        {!ajeno && (<>
        <div className="campo">
          <span className="campo-eti">Qué es</span>
          <div className="segmento">
            {(['libro', 'comic'] as const).map(t => (
              <button
                key={t}
                className="segmento-op"
                aria-pressed={tipo === t}
                onClick={() => setTipo(t)}
              >
                {t === 'libro' ? 'Libro' : 'Cómic'}
              </button>
            ))}
          </div>
        </div>

        <div className="campo">
          <span className="campo-eti">Etiquetas</span>
          {etiquetas.length > 0 && (
            <div className="fichas">
              {etiquetas.map(e => (
                <button
                  key={e}
                  className="ficha-eti"
                  onClick={() => setEtiquetas(prev => prev.filter(x => x !== e))}
                  aria-label={`Quitar ${e}`}
                >
                  {e} <span aria-hidden="true">×</span>
                </button>
              ))}
            </div>
          )}
          <input
            value={nueva}
            onChange={e => setNueva(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault()
                anadirEtiqueta(nueva)
              }
            }}
            placeholder="Escribe una y pulsa intro"
          />
          {sugerencias.length > 0 && (
            <div className="fichas sueltas">
              {sugerencias.map(e => (
                <button key={e} className="ficha-eti fantasma" onClick={() => anadirEtiqueta(e)}>
                  + {e}
                </button>
              ))}
            </div>
          )}
        </div>
        </>)}

        {ajeno ? (
          <div className="prestado">
            <p className="prestado-tit">Lo comparte {libro.deNombre || 'la otra persona'}</p>
            <p className="prestado-txt">
              Puedes leerlo y traducirlo, y <strong>por dónde vas es tuyo</strong>.
              El título, las etiquetas y la portada son suyos y se actualizan
              solos: por eso aquí no se editan. Si lo quita del catálogo,
              desaparece también de aquí.
            </p>
          </div>
        ) : miUid ? (
          <p className="ficha-pista compartir">
            Con la sesión abierta, lo que traes va al catálogo de la casa: la otra
            persona puede encontrarlo y leerlo.
          </p>
        ) : null}

        <div className="ficha-pie">
          {confirmando ? (
            <>
              <span className="ficha-pregunta">
                {ajeno
                  ? '¿Seguro? Se quita de tu estantería; quien lo subió lo conserva.'
                  : '¿Seguro? Sale del catálogo de la casa, para todos.'}
              </span>
              <button className="btn fantasma peq" onClick={() => setConfirmando(false)}>No</button>
              <button className="btn peligro peq" onClick={() => onBorrar(libro)}>Sí, borrar</button>
            </>
          ) : (
            <>
              <button className="btn fantasma peq" onClick={() => setConfirmando(true)}>
                {ajeno ? 'Quitar de aquí' : 'Quitar'}
              </button>
              <span className="ficha-datos mono">
                {libro.paginas} pág. · {tamano(libro.bytes)}
              </span>
              {!ajeno && <button className="btn" onClick={guardar}>Guardar</button>}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
