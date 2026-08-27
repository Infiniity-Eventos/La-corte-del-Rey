import { useEffect, useRef, useState } from 'react'
import type { Libro, Palabra } from '../lib/tipos'
import { ErrorTraductor, explicar, traducir } from '../lib/traductor'
import type { Traduccion } from '../lib/traductor'
import { guardarPalabra } from '../lib/almacen'

/**
 * La burbuja del traductor: una barra fija abajo, siempre lista (P55).
 *
 * El orden de la respuesta es la parte importante. En P28 pediste cinco cosas y
 * en P23 dijiste que lo primero que se salva es que nada se sienta lento. La
 * traducción natural aparece en cuanto asoma, en grande, y el resto llega
 * detrás y se queda en pestañas (P54, opción B).
 */

type Solapa = 'literal' | 'contexto' | 'palabra' | 'aviso'

interface Props {
  clave: string
  libro: Libro
  pagina: number
  /** Texto que llega de una selección sobre la página, si la hubo. */
  seleccion: string
  onUsarSeleccion: () => void
  onIrAAjustes: () => void
  /** El lector necesita saberlo para apartar lo que estorba mientras escribes. */
  onEnUso: (enUso: boolean) => void
}

export function Burbuja({ clave, libro, pagina, seleccion, onUsarSeleccion, onIrAAjustes, onEnUso }: Props) {
  const [texto, setTexto] = useState('')
  const [abierta, setAbierta] = useState(false)
  const [pidiendo, setPidiendo] = useState(false)
  const [natural, setNatural] = useState('')
  const [resultado, setResultado] = useState<Traduccion | null>(null)
  const [fallo, setFallo] = useState<{ titulo: string; detalle: string } | null>(null)
  const [solapa, setSolapa] = useState<Solapa>('contexto')
  const [guardada, setGuardada] = useState(false)
  const [consultado, setConsultado] = useState('')
  const campo = useRef<HTMLTextAreaElement>(null)
  const corte = useRef<AbortController | null>(null)

  // Una selección sobre la página entra directa en la burbuja (R31 / P56).
  useEffect(() => {
    if (!seleccion) return
    setTexto(seleccion)
    setAbierta(true)
    onUsarSeleccion()
    campo.current?.focus()
  }, [seleccion, onUsarSeleccion])

  useEffect(() => () => corte.current?.abort(), [])

  /**
   * Un textarea de una línea corta el texto en cuanto se pasa. Se estira con lo
   * escrito, hasta el tope que pone el CSS.
   */
  useEffect(() => {
    const el = campo.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [texto])

  const hayPanelAbierto = pidiendo || !!natural || !!resultado || !!fallo
  useEffect(() => {
    onEnUso(abierta || hayPanelAbierto)
  }, [abierta, hayPanelAbierto, onEnUso])

  const pedir = async () => {
    const t = texto.trim()
    if (!t || pidiendo) return

    corte.current?.abort()
    const control = new AbortController()
    corte.current = control

    setPidiendo(true)
    setResultado(null)
    setNatural('')
    setFallo(null)
    setGuardada(false)
    setConsultado(t)
    setSolapa('contexto')

    try {
      const r = await traducir({
        clave,
        texto: t,
        senal: control.signal,
        alAsomar: setNatural,
      })
      if (control.signal.aborted) return
      setResultado(r)
      setNatural(r.natural)
      setSolapa(r.palabra ? 'palabra' : r.aviso ? 'aviso' : 'contexto')
    } catch (e) {
      if (control.signal.aborted) return
      setFallo(explicar(e instanceof ErrorTraductor ? e.fallo : { tipo: 'raro', detalle: 'inesperado' }))
    } finally {
      if (!control.signal.aborted) setPidiendo(false)
    }
  }

  const alVocabulario = async () => {
    if (!resultado) return
    const p: Palabra = {
      id: crypto.randomUUID(),
      texto: consultado,
      traduccion: resultado.natural,
      frase: consultado,
      libroId: libro.id,
      libroTitulo: libro.titulo,
      pagina,
      fecha: Date.now(),
    }
    await guardarPalabra(p)
    setGuardada(true)
  }

  const limpiar = () => {
    corte.current?.abort()
    setTexto('')
    setAbierta(false)
    setResultado(null)
    setNatural('')
    setFallo(null)
    setPidiendo(false)
    setConsultado('')
  }

  const solapas: { id: Solapa; nombre: string }[] = [
    ...(resultado?.palabra ? [{ id: 'palabra' as const, nombre: 'La palabra' }] : []),
    ...(resultado?.aviso ? [{ id: 'aviso' as const, nombre: 'Ojo' }] : []),
    { id: 'contexto', nombre: 'En contexto' },
    { id: 'literal', nombre: 'Literal' },
  ]

  return (
    <div className={`burbuja${abierta ? ' abierta' : ''}`}>
      {hayPanelAbierto && (
        <div className="panel">
          <div className="panel-top">
            <span className="panel-src mono">{consultado}</span>
            <button className="icono" onClick={limpiar} aria-label="Cerrar la traducción">×</button>
          </div>

          {fallo ? (
            <div className="panel-fallo">
              <p className="fallo-tit">{fallo.titulo}</p>
              <p className="fallo-det">{fallo.detalle}</p>
              {(fallo.titulo.includes('clave') || fallo.titulo.includes('vale')) && (
                <button className="btn peq" onClick={onIrAAjustes}>Ir a los ajustes</button>
              )}
            </div>
          ) : (
            <>
              <p className={`panel-natural${pidiendo && !natural ? ' esperando' : ''}`}>
                {natural || 'Traduciendo…'}
              </p>

              {resultado && (
                <>
                  <div className="solapas" role="tablist">
                    {solapas.map(s => (
                      <button
                        key={s.id}
                        role="tab"
                        className="solapa"
                        aria-selected={solapa === s.id}
                        onClick={() => setSolapa(s.id)}
                      >
                        {s.nombre}
                      </button>
                    ))}
                  </div>

                  <div className="hoja-solapa">
                    {solapa === 'literal' && <p className="literal">{resultado.literal}</p>}
                    {solapa === 'contexto' && <p>{resultado.contexto}</p>}
                    {solapa === 'aviso' && <p className="ojo">{resultado.aviso}</p>}
                    {solapa === 'palabra' && resultado.palabra && (
                      <div className="palabra">
                        <p className="pron mono">{resultado.palabra.pronunciacion}</p>
                        <p>{resultado.palabra.significado}</p>
                        <p className="ejemplo">
                          <span>{resultado.palabra.ejemplo}</span>
                          <span className="ejemplo-es">{resultado.palabra.ejemploTraducido}</span>
                        </p>
                      </div>
                    )}
                  </div>

                  <button
                    className="btn fantasma peq guardar-voc"
                    onClick={alVocabulario}
                    disabled={guardada}
                  >
                    {guardada ? 'En tu vocabulario ✓' : 'Guardar en vocabulario'}
                  </button>
                </>
              )}
            </>
          )}
        </div>
      )}

      <div className="barra-burbuja">
        <textarea
          ref={campo}
          value={texto}
          rows={1}
          placeholder="¿Qué no entiendes?"
          onFocus={() => setAbierta(true)}
          // Al salir del campo, los controles del lector vuelven, haya o no
          // texto escrito. Condicionarlo al contenido dejaba la interfaz
          // escondida para siempre en cuanto escribías algo y no lo borrabas.
          onBlur={() => setAbierta(false)}
          onChange={e => setTexto(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              void pedir()
            }
          }}
          aria-label="Texto en inglés para traducir"
        />
        <button
          className="btn peq"
          onClick={() => void pedir()}
          disabled={!texto.trim() || pidiendo}
        >
          {pidiendo ? '…' : 'Traducir'}
        </button>
      </div>
    </div>
  )
}
