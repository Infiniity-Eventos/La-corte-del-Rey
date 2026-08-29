import { useCallback, useEffect, useRef, useState } from 'react'
import type { Libro, Palabra } from '../lib/tipos'
import { ErrorTraductor, explicar, traducir } from '../lib/traductor'
import type { Fallo, Traduccion } from '../lib/traductor'
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
 *
 * Y desde D-38 esto es **una cola, no una espera**. Traducir tarda lo que tarda
 * —a veces medio minuto—, y quedarse mirando media pantalla tapada hasta que
 * llegue rompe justo lo que la app existe para no romper: la lectura. Ahora
 * mandas, sigues leyendo, mandas otra, y la app avisa cuando cada una está.
 */

type Solapa = 'literal' | 'contexto' | 'palabra' | 'aviso'

/**
 * Una traducción encargada.
 *
 * Guarda la página **en la que la pediste**, no en la que estés cuando llegue:
 * con una cola en marcha se pasan páginas mientras se traduce, y la marca tiene
 * que quedar donde estaba la frase.
 */
interface Encargo {
  id: string
  texto: string
  pagina: number
  estado: 'esperando' | 'traduciendo' | 'lista' | 'fallo'
  /** Lo que va asomando mientras llega. */
  natural: string
  resultado: Traduccion | null
  fallo: { tipo: Fallo['tipo']; titulo: string; detalle: string } | null
  guardada: Palabra | null
  /** Cuándo empezó a traducirse. Es lo que cuenta el reloj. */
  empezado: number
}

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
  /** Todo lo pedido y todavía no visto: lo que espera, lo que va y lo que ya está. */
  const [cola, setCola] = useState<Encargo[]>([])
  /** Cuál se está mirando en el panel grande. */
  const [viendo, setViendo] = useState<string | null>(null)
  const [solapa, setSolapa] = useState<Solapa>('contexto')
  /**
   * Cuántos segundos lleva la que se está traduciendo.
   *
   * Está a la vista a propósito. «Traduciendo…» quieto no dice si va o si se
   * rompió, y esa duda es lo que hace mirar una pantalla cinco minutos. Un
   * número que sube dice «sigue vivo».
   */
  const [segundos, setSegundos] = useState(0)
  // El teclado de kana. Solo existe leyendo en japonés, y se abre a mano: el
  // del teléfono sigue siendo el bueno para todo lo demás.
  const [kana, setKana] = useState(false)
  const [katakana, setKatakana] = useState(false)
  const campo = useRef<HTMLTextAreaElement>(null)
  /** Un corte por encargo: cancelar uno no puede tumbar la cola entera. */
  const cortes = useRef(new Map<string, AbortController>())

  const cambiar = useCallback((id: string, parche: Partial<Encargo>) => {
    setCola(c => c.map(e => (e.id === id ? { ...e, ...parche } : e)))
  }, [])

  const enCurso = cola.find(e => e.estado === 'traduciendo') ?? null
  /** Si lo que miras tiene a otra por delante. Sola, no espera a nadie. */
  const haciendoCola = !!enCurso && enCurso.id !== viendo
  const enEspera = cola.filter(e => e.estado === 'esperando').length
  const mirando = cola.find(e => e.id === viendo) ?? null
  // Lo que ya está y todavía no has abierto. Es el aviso, y no interrumpe.
  const avisos = cola.filter(e => e.id !== viendo && (e.estado === 'lista' || e.estado === 'fallo'))

  // Una selección sobre la página entra directa en la burbuja (R31 / P56).
  useEffect(() => {
    if (!seleccion) return
    setTexto(seleccion)
    setAbierta(true)
    onUsarSeleccion()
    campo.current?.focus()
  }, [seleccion, onUsarSeleccion])

  // Al cerrar el libro se cortan todas: nada sigue hablando con Google cuando
  // ya no hay a dónde entregarlo.
  const todos = cortes.current
  useEffect(() => () => { for (const c of todos.values()) c.abort() }, [todos])

  useEffect(() => {
    if (!enCurso) {
      setSegundos(0)
      return
    }
    const arranque = enCurso.empezado
    const contar = () => setSegundos(Math.round((Date.now() - arranque) / 1000))
    contar()
    // Medio segundo: el número tiene que moverse pronto para que se lea como un
    // reloj y no como un cartel.
    const t = window.setInterval(contar, 500)
    return () => window.clearInterval(t)
  }, [enCurso])

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

  useEffect(() => {
    onEnUso(abierta || !!viendo)
  }, [abierta, viendo, onEnUso])

  const trabajar = useCallback(async (encargo: Encargo) => {
    const control = new AbortController()
    cortes.current.set(encargo.id, control)
    cambiar(encargo.id, { estado: 'traduciendo', empezado: Date.now() })

    try {
      const r = await traducir({
        clave,
        texto: encargo.texto,
        idioma: ajustes.idioma,
        senal: control.signal,
        alAsomar: n => cambiar(encargo.id, { natural: n }),
      })
      if (control.signal.aborted) return
      cambiar(encargo.id, { estado: 'lista', resultado: r, natural: r.natural })

      // Se guarda sola, en cuanto la traducción está entera. No se guarda lo
      // que va llegando a medias: media traducción en el vocabulario no vale
      // para nada y habría que corregirla después.
      const p = await guardarTraduccion({
        texto: encargo.texto,
        traduccion: r.natural,
        frase: encargo.texto,
        libroId: libro.id,
        libroTitulo: libro.titulo,
        pagina: encargo.pagina,
      })
      if (control.signal.aborted) return
      cambiar(encargo.id, { guardada: p })
      onGuardada(p)
    } catch (e) {
      if (control.signal.aborted) return
      const f: Fallo = e instanceof ErrorTraductor ? e.fallo : { tipo: 'raro', detalle: 'inesperado' }
      cambiar(encargo.id, { estado: 'fallo', fallo: { tipo: f.tipo, ...explicar(f) } })
    } finally {
      cortes.current.delete(encargo.id)
    }
  }, [cambiar, clave, ajustes.idioma, libro.id, libro.titulo, onGuardada])

  /**
   * La cola, de una en una.
   *
   * De una en una y no todas a la vez, que es lo que pediste y además lo
   * correcto: el nivel gratuito de Gemini limita las peticiones **por minuto**,
   * y mandarle cuatro de golpe es la forma más rápida de que te conteste que no
   * a todas.
   */
  useEffect(() => {
    if (cola.some(e => e.estado === 'traduciendo')) return
    const siguiente = cola.find(e => e.estado === 'esperando')
    if (siguiente) void trabajar(siguiente)
  }, [cola, trabajar])

  const encargar = () => {
    const t = texto.trim()
    if (!t) return
    const encargo: Encargo = {
      id: crypto.randomUUID(),
      texto: t,
      pagina,
      estado: 'esperando',
      natural: '',
      resultado: null,
      fallo: null,
      guardada: null,
      empezado: 0,
    }
    setCola(c => [...c, encargo])
    setViendo(encargo.id)
    setSolapa('contexto')
    // El campo se vacía al mandar: lo normal es traducir varias frases seguidas
    // y tener que borrar la anterior a mano cada vez estorba. Lo que mandaste
    // sigue a la vista arriba del panel, así que no se pierde de vista.
    setTexto('')
  }

  /** Sacar un encargo de la cola, cortándolo si estaba en marcha. */
  const soltar = useCallback((id: string, devolverTexto = false) => {
    cortes.current.get(id)?.abort()
    cortes.current.delete(id)
    setCola(c => {
      const e = c.find(x => x.id === id)
      // Lo escrito vuelve al campo solo si el campo está libre: con una cola en
      // marcha puedes estar escribiendo la siguiente, y pisarla sería peor que
      // perder lo cancelado.
      if (e && devolverTexto) setTexto(t => (t.trim() ? t : e.texto))
      return c.filter(x => x.id !== id)
    })
    setViendo(v => (v === id ? null : v))
  }, [])

  const quitar = async (encargo: Encargo) => {
    if (!encargo.guardada) return
    await borrarPalabra(encargo.guardada.id)
    onQuitada(encargo.guardada.id)
    cambiar(encargo.id, { guardada: null })
  }

  /** Volver a encargar lo que falló, sin escribirlo otra vez. */
  const reintentar = (encargo: Encargo) => {
    cambiar(encargo.id, { estado: 'esperando', fallo: null, natural: '', empezado: 0 })
  }

  const cerrarPanel = () => {
    setKana(false)
    setAbierta(false)
    if (viendo) {
      const e = cola.find(x => x.id === viendo)
      // Cerrar una que sigue traduciéndose no la mata: se va a la cola y avisa
      // cuando esté. Cerrar una ya vista sí la retira, que ya la leíste.
      if (e && (e.estado === 'lista' || e.estado === 'fallo')) soltar(e.id)
      else setViendo(null)
    }
  }

  /**
   * Atrás cierra la traducción, exactamente igual que la ×.
   *
   * La capa es el panel, no el campo: con el teclado abierto, atrás lo cierra
   * el propio sistema y a la app no le llega nada. Así el primer atrás baja el
   * teclado, el segundo cierra la traducción y el tercero sale del libro, que
   * es el orden en el que las cosas están puestas encima.
   */
  useAtras(!!viendo, cerrarPanel)

  const resultado = mirando?.resultado ?? null
  const solapas: { id: Solapa; nombre: string }[] = [
    ...(resultado?.palabra ? [{ id: 'palabra' as const, nombre: 'La palabra' }] : []),
    ...(resultado?.aviso ? [{ id: 'aviso' as const, nombre: 'Ojo' }] : []),
    { id: 'contexto', nombre: 'En contexto' },
    { id: 'literal', nombre: 'Literal' },
  ]

  // La pestaña que se abre sola depende del resultado, y el resultado llega
  // después. Se elige aquí, cuando cambia lo que se está mirando.
  useEffect(() => {
    if (!resultado) return
    setSolapa(resultado.palabra ? 'palabra' : resultado.aviso ? 'aviso' : 'contexto')
  }, [resultado])

  return (
    <div className={`burbuja${abierta ? ' abierta' : ''}`}>
      {/* Lo que ya está y no has abierto. Avisa sin interrumpir: en mitad de una
          página, abrirse solo sería exactamente lo que rompe la lectura. */}
      {avisos.map(e => (
        <div key={e.id} className="aviso-cola" data-fallo={e.estado === 'fallo'}>
          <span className="aviso-cola-txt">
            {e.estado === 'fallo' ? 'No salió: ' : 'Ya está: '}
            <span className="mono">{e.texto}</span>
          </span>
          <button className="icono peq" onClick={() => { setViendo(e.id); setAbierta(false) }}>Ver</button>
          <button className="icono peq" onClick={() => soltar(e.id)} aria-label="Descartar el aviso">×</button>
        </div>
      ))}

      {/* Traduciendo por detrás, con el panel cerrado. Es la prueba de que
          sigue vivo mientras lees. */}
      {enCurso && !viendo && (
        <div className="aviso-cola trabajando">
          <span className="aviso-cola-txt">
            Traduciendo <span className="mono">{enCurso.texto}</span>
          </span>
          <span className="mono espera-reloj">{segundos} s</span>
          {enEspera > 0 && <span className="mono cola-cuenta">+{enEspera}</span>}
          <button className="icono peq" onClick={() => setViendo(enCurso.id)}>Ver</button>
        </div>
      )}

      {mirando && (
        <div className="panel">
          <div className="panel-top">
            <span className="panel-src mono">{mirando.texto}</span>
            <button className="icono" onClick={cerrarPanel} aria-label="Cerrar la traducción">×</button>
          </div>

          {mirando.fallo ? (
            <div className="panel-fallo">
              <p className="fallo-tit">{mirando.fallo.titulo}</p>
              <p className="fallo-det">{mirando.fallo.detalle}</p>
              {(mirando.fallo.tipo === 'sin-clave' || mirando.fallo.tipo === 'clave-mala') && (
                <button className="btn peq" onClick={onIrAAjustes}>Ir a los ajustes</button>
              )}
              {/* Lo que falló por la red o por el reloj se reintenta de un
                  toque: el texto sigue guardado en el encargo. */}
              {(mirando.fallo.tipo === 'tardo' || mirando.fallo.tipo === 'sin-red' || mirando.fallo.tipo === 'ocupado') && (
                <button className="btn peq" onClick={() => reintentar(mirando)}>Reintentar</button>
              )}
            </div>
          ) : (
            <>
              <p className={`panel-natural${!mirando.natural ? ' esperando' : ''}`}>
                {/* «En cola» solo si de verdad hay otra por delante. Sola,
                    arranca en el mismo instante, y decir que espera sería
                    mentir durante un fotograma. */}
                {mirando.natural || (mirando.estado === 'esperando' && haciendoCola ? 'En cola…' : 'Traduciendo…')}
              </p>

              {/* A partir de tres segundos: cuánto lleva y la salida. Antes no,
                  que la mayoría acaban antes y un contador parpadeando es
                  ruido. */}
              {mirando.estado === 'traduciendo' && segundos >= 3 && (
                <p className="panel-espera">
                  <span className="mono espera-reloj">{segundos} s</span>
                  <span className="espera-dice">
                    {mirando.natural
                      ? 'Sigue llegando.'
                      : segundos < 10
                        ? 'Sigue en camino.'
                        : 'Está tardando más de lo normal.'}
                  </span>
                  <button className="icono peq" onClick={() => soltar(mirando.id, true)}>Cancelar</button>
                </p>
              )}

              {mirando.estado === 'esperando' && haciendoCola && (
                <p className="panel-espera">
                  <span className="espera-dice">Va después de la que está en marcha.</span>
                  <button className="icono peq" onClick={() => soltar(mirando.id, true)}>Cancelar</button>
                </p>
              )}

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
                  {mirando.guardada ? (
                    <p className="guardada">
                      <span className="guardar-voc">Guardada en la página {mirando.guardada.pagina}</span>
                      <button className="icono peq" onClick={() => void quitar(mirando)}>Quitar</button>
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
              encargar()
            }
          }}
          aria-label="Texto para traducir"
        />
        {/* Nunca se bloquea: mandar otra mientras una va es justo lo que hace
            que traducir no pare la lectura. */}
        <button className="btn peq" onClick={encargar} disabled={!texto.trim()}>
          Traducir
          {enCurso && <span className="mono cola-cuenta">{enEspera + 1}</span>}
        </button>
      </div>
    </div>
  )
}
