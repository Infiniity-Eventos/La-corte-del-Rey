import { useEffect, useRef, useState } from 'react'
import type { Libro, Palabra } from '../lib/tipos'
import { ErrorTraductor, explicar, traducir } from '../lib/traductor'
import type { Traduccion } from '../lib/traductor'
import { borrarPalabra, guardarTraduccion } from '../lib/almacen'
import { useAtras } from '../lib/atras'
import { Kana } from './Kana'
import { transformar } from '../lib/kana'
import type { Ajustes } from '../lib/tipos'

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
  ajustes: Ajustes
  clave: string
  libro: Libro
  pagina: number
  /** Texto que llega de una selección sobre la página, si la hubo. */
  seleccion: string
  onUsarSeleccion: () => void
  onIrAAjustes: () => void
  /** El lector necesita saberlo para apartar lo que estorba mientras escribes. */
  onEnUso: (enUso: boolean) => void
  /** Para que la página se entere en el momento y ponga su marca. */
  onGuardada: (palabra: Palabra) => void
  /** Y de que la has quitado, para que la marca desaparezca sola. */
  onQuitada: (id: string) => void
}

export function Burbuja({ ajustes, clave, libro, pagina, seleccion, onUsarSeleccion, onIrAAjustes, onEnUso, onGuardada, onQuitada }: Props) {
  const [texto, setTexto] = useState('')
  const [abierta, setAbierta] = useState(false)
  const [pidiendo, setPidiendo] = useState(false)
  const [natural, setNatural] = useState('')
  const [resultado, setResultado] = useState<Traduccion | null>(null)
  const [fallo, setFallo] = useState<{ titulo: string; detalle: string } | null>(null)
  const [solapa, setSolapa] = useState<Solapa>('contexto')
  /**
   * La frase queda guardada sola, sin botón.
   *
   * Aquí se recuerda cuál, para poder decirlo y para poder deshacerlo: guardar
   * sin avisar y sin salida sería peor que no guardar.
   */
  const [guardada, setGuardada] = useState<Palabra | null>(null)
  const [consultado, setConsultado] = useState('')
  // El teclado de kana. Solo existe leyendo en japonés, y se abre a mano: el
  // del teléfono sigue siendo el bueno para todo lo demás.
  const [kana, setKana] = useState(false)
  const [katakana, setKatakana] = useState(false)
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
    setGuardada(null)
    setConsultado(t)
    // El campo se vacía al mandar: lo normal es traducir varias frases seguidas
    // y tener que borrar la anterior a mano cada vez estorba. Lo que mandaste
    // sigue a la vista arriba del panel, así que no se pierde de vista.
    setTexto('')
    // Una copia local: para cuando llegue la respuesta, el estado puede haber
    // cambiado, y lo que se guarda tiene que ser lo que se preguntó.
    const consultadoAhora = t
    setSolapa('contexto')

    try {
      const r = await traducir({
        clave,
        texto: t,
        idioma: ajustes.idioma,
        senal: control.signal,
        alAsomar: setNatural,
      })
      if (control.signal.aborted) return
      setResultado(r)
      setNatural(r.natural)
      setSolapa(r.palabra ? 'palabra' : r.aviso ? 'aviso' : 'contexto')

      // Se guarda sola, en cuanto la traducción está entera. No se guarda lo
      // que va llegando a medias: media traducción en el vocabulario no vale
      // para nada y habría que corregirla después.
      const p = await guardarTraduccion({
        texto: consultadoAhora,
        traduccion: r.natural,
        frase: consultadoAhora,
        libroId: libro.id,
        libroTitulo: libro.titulo,
        pagina,
      })
      if (control.signal.aborted) return
      setGuardada(p)
      onGuardada(p)
    } catch (e) {
      if (control.signal.aborted) return
      setFallo(explicar(e instanceof ErrorTraductor ? e.fallo : { tipo: 'raro', detalle: 'inesperado' }))
      // Si falló, lo escrito vuelve al campo: reintentar no puede obligarte a
      // teclearlo otra vez.
      setTexto(t)
    } finally {
      if (!control.signal.aborted) setPidiendo(false)
    }
  }

  const quitar = async () => {
    if (!guardada) return
    await borrarPalabra(guardada.id)
    onQuitada(guardada.id)
    setGuardada(null)
  }

  const limpiar = () => {
    corte.current?.abort()
    setKana(false)
    setTexto('')
    setAbierta(false)
    setResultado(null)
    setNatural('')
    setFallo(null)
    setPidiendo(false)
    setConsultado('')
  }

  /**
   * Atrás cierra la traducción, exactamente igual que la ×.
   *
   * La capa es el panel, no el campo: con el teclado abierto, atrás lo cierra
   * el propio sistema y a la app no le llega nada. Así el primer atrás baja el
   * teclado, el segundo cierra la traducción y el tercero sale del libro, que
   * es el orden en el que las cosas están puestas encima.
   */
  useAtras(hayPanelAbierto, limpiar)

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

                  {/* Ya no hay botón de guardar: se guarda sola. Pero se dice
                      que pasó y se deja la salida, porque guardar en silencio y
                      sin poder deshacerlo sería peor que no guardar. */}
                  {guardada ? (
                    <p className="guardada">
                      <span className="guardar-voc">Guardada en la página {guardada.pagina}</span>
                      <button className="icono peq" onClick={() => void quitar()}>Quitar</button>
                    </p>
                  ) : (
                    <p className="guardada"><span className="guardar-voc tenue">Guardando…</span></p>
                  )}
                </>
              )}
            </>
          )}
        </div>
      )}

      {kana && ajustes.idioma === 'japones' && (
        <Kana
          katakana={katakana}
          onKatakana={setKatakana}
          onEscribir={k => setTexto(t => t + k)}
          onTransformar={tabla => setTexto(t => transformar(t, tabla))}
          onBorrar={() => setTexto(t => t.slice(0, -1))}
          onCerrar={() => setKana(false)}
        />
      )}

      <div className="barra-burbuja">
        {ajustes.idioma === 'japones' && (
          <button
            className="icono kana-abrir"
            aria-pressed={kana}
            onClick={() => {
              // Se le quita el foco al campo: si no, el teclado del teléfono se
              // queda encima del de kana y no cabe ninguno de los dos.
              if (!kana) campo.current?.blur()
              setKana(v => !v)
            }}
            aria-label="Teclado japonés"
          >
            あ
          </button>
        )}
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
          aria-label="Texto para traducir"
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
