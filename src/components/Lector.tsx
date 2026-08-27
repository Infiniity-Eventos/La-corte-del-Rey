import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { Ajustes, Libro, Tema } from '../lib/tipos'
import { leerArchivo } from '../lib/almacen'
import { Cuaderno } from '../lib/pdf'
import { clicDePagina, despertarSonido, toqueCorto } from '../lib/sonido'
import { Burbuja } from './Burbuja'

const TEMAS: Tema[] = ['papel', 'sepia', 'oscuro']
const NOMBRE_TEMA: Record<Tema, string> = { papel: 'Papel', sepia: 'Sepia', oscuro: 'Oscuro' }

/** Fracción de la pantalla que hay que arrastrar para que la página pase. */
const UMBRAL = 0.3
/** Por debajo de esto no es un arrastre, es un toque. */
const TOQUE = 8

type Direccion = 'siguiente' | 'anterior' | null

interface Props {
  libro: Libro
  ajustes: Ajustes
  clave: string
  onAjustes: (a: Ajustes) => void
  onPagina: (pagina: number) => void
  onCerrar: () => void
  onIrAAjustes: () => void
}

export function Lector({ libro, ajustes, clave, onAjustes, onPagina, onCerrar, onIrAAjustes }: Props) {
  const escenaRef = useRef<HTMLDivElement>(null)
  const movilRef = useRef<HTMLDivElement>(null)
  const debajoRef = useRef<HTMLDivElement>(null)
  const cuadernoRef = useRef<Cuaderno | null>(null)

  const [caja, setCaja] = useState({ w: 0, h: 0 })
  const [hoja, setHoja] = useState({ w: 0, h: 0 })
  const [pagina, setPagina] = useState(libro.pagina)
  const [dir, setDir] = useState<Direccion>(null)
  const [lista, setLista] = useState(false)
  const [chrome, setChrome] = useState(false)
  const [salto, setSalto] = useState('')
  // Sube cada vez que termina de dibujarse una página. Es lo que despierta al
  // efecto que cuelga los lienzos, sin meter los lienzos en el estado.
  const [sello, setSello] = useState(0)
  const [volverAlInicio, setVolverAlInicio] = useState(libro.pagina > 1)
  const [traduciendo, setTraduciendo] = useState(false)
  // Modo de selección. Va aparte del leer normal a propósito: arrastrar para
  // pasar página y arrastrar para seleccionar son el mismo gesto, y si compiten
  // gana el que no querías. Se elige uno.
  const [seleccionando, setSeleccionando] = useState(false)
  const [hayTexto, setHayTexto] = useState<boolean | null>(null)
  const [seleccion, setSeleccion] = useState('')
  const textoRef = useRef<HTMLDivElement>(null)
  const zonaRef = useRef<HTMLDivElement>(null)
  const lectorRef = useRef<HTMLDivElement>(null)

  // El arrastre vive en refs, no en el estado: mover el dedo no puede provocar
  // un renderizado de React por fotograma o se nota el tirón.
  const gesto = useRef({ activo: false, x0: 0, dx: 0, p: 0, dir: null as Direccion, asentando: false })

  /* ------------------------------ medir ------------------------------ */

  useEffect(() => {
    const el = escenaRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect
      setCaja({ w: Math.floor(width), h: Math.floor(height) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  /* ------------------------------ abrir ------------------------------ */

  useEffect(() => {
    let vivo = true
    let cuaderno: Cuaderno | null = null
    setLista(false)
    ;(async () => {
      const blob = await leerArchivo(libro.archivo)
      if (!blob || !vivo) return
      cuaderno = await Cuaderno.abrir(await blob.arrayBuffer())
      if (!vivo) {
        cuaderno.cerrar()
        return
      }
      cuadernoRef.current = cuaderno
      setLista(true)
    })()
    return () => {
      vivo = false
      cuaderno?.cerrar()
      cuadernoRef.current = null
    }
  }, [libro.archivo])

  /* ---------------------------- dibujar ------------------------------ */

  const montar = useCallback((destino: HTMLDivElement | null, n: number | null) => {
    if (!destino) return
    if (n === null) {
      destino.replaceChildren()
      return
    }
    const p = cuadernoRef.current?.hecha(n)
    if (p && destino.firstChild !== p.lienzo) destino.replaceChildren(p.lienzo)
  }, [])

  const cuales = useCallback(
    (): { abajo: number; arriba: number | null } => ({
      abajo: dir === 'siguiente' ? pagina + 1 : pagina,
      arriba: dir === 'siguiente' ? pagina : dir === 'anterior' ? pagina - 1 : null,
    }),
    [dir, pagina],
  )

  const pintar = useCallback(async () => {
    const c = cuadernoRef.current
    if (!c || caja.w === 0) return
    c.redimensionar(caja.w, caja.h)

    const { abajo, arriba } = cuales()
    const p = await c.dibujar(abajo).catch(() => null)
    // Sin comparar antes, cada pasada crearía un objeto nuevo y el efecto se
    // volvería a disparar para siempre.
    if (p) setHoja(h => (h.w === p.ancho && h.h === p.alto ? h : { w: p.ancho, h: p.alto }))
    if (arriba !== null) await c.dibujar(arriba).catch(() => null)

    setSello(s => s + 1)
    c.adelantar(pagina)
  }, [caja, cuales, pagina])

  useEffect(() => {
    if (lista) void pintar()
  }, [lista, pintar])

  /**
   * Colgar los lienzos va aparte del dibujarlos, y después de que React haya
   * pintado. Si se hiciera dentro de `pintar`, la primera vez el contenedor aún
   * no existe —lo crea el propio `setHoja` de esa misma pasada— y la página se
   * quedaría en blanco para siempre.
   */
  useLayoutEffect(() => {
    const { abajo, arriba } = cuales()
    montar(debajoRef.current, abajo)
    montar(movilRef.current, arriba)
  }, [cuales, hoja, sello, montar])

  /**
   * El aviso de «vas por la página X» se va solo. Es útil el primer segundo y
   * estorba a partir del quinto, sobre todo si abres el teclado y se junta con
   * la barra del traductor.
   */
  useEffect(() => {
    if (!volverAlInicio) return
    const t = window.setTimeout(() => setVolverAlInicio(false), 7000)
    return () => window.clearTimeout(t)
  }, [volverAlInicio])

  /**
   * La burbuja y los controles del lector quieren los dos el borde de abajo.
   * En vez de que uno tape al otro, se mide lo que ocupa la burbuja y todo lo
   * demás se apoya encima. Se mide en vez de calcularse porque la burbuja
   * cambia de alto: crece al escribir y mucho más al abrirse el panel.
   */
  useEffect(() => {
    const zona = zonaRef.current
    const lector = lectorRef.current
    if (!zona || !lector) return
    const ro = new ResizeObserver(([e]) => {
      lector.style.setProperty('--alto-burbuja', `${Math.round(e.contentRect.height)}px`)
    })
    ro.observe(zona)
    return () => ro.disconnect()
  }, [])

  /* ------------------------ seleccionar texto ------------------------ */

  useEffect(() => {
    const capa = textoRef.current
    if (!capa) return
    if (!seleccionando || dir) {
      capa.replaceChildren()
      return
    }
    let vivo = true
    void cuadernoRef.current?.capaDeTexto(pagina, capa).then(ok => {
      if (vivo) setHayTexto(ok)
    })
    return () => { vivo = false }
  }, [seleccionando, pagina, dir, sello])

  useEffect(() => {
    if (!seleccionando) return
    const mirar = () => {
      const s = window.getSelection()?.toString().trim() ?? ''
      if (s.length > 1) setSeleccion(s)
    }
    document.addEventListener('selectionchange', mirar)
    return () => document.removeEventListener('selectionchange', mirar)
  }, [seleccionando])

  /* ---------------------------- el volteo ---------------------------- */

  const aplicar = useCallback((p: number, d: Direccion) => {
    const el = movilRef.current
    if (!el) return
    const angulo = d === 'siguiente' ? -p * 180 : -180 + p * 180
    el.style.transform = `rotateY(${angulo}deg)`
    // El pliegue se marca al principio del giro y se va al final: es la
    // diferencia entre parecer papel y parecer una diapositiva.
    el.style.setProperty('--pliegue', String(Math.sin(p * Math.PI) * 0.9))
  }, [])

  const asentar = useCallback(
    (completa: boolean, d: Direccion) => {
      const el = movilRef.current
      if (!el || !d) return
      const g = gesto.current
      g.asentando = true

      if (completa) {
        if (ajustes.sonido) clicDePagina()
        if (ajustes.vibracion) toqueCorto()
      }

      const ms = Number.parseInt(getComputedStyle(document.documentElement).getPropertyValue('--volteo')) || 450
      el.style.transition = `transform ${ms}ms var(--curva)`
      aplicar(completa ? 1 : 0, d)

      window.setTimeout(() => {
        el.style.transition = 'none'
        el.style.removeProperty('--pliegue')
        g.asentando = false
        g.dir = null
        setDir(null)
        if (completa) {
          const nueva = d === 'siguiente' ? pagina + 1 : pagina - 1
          setPagina(nueva)
          onPagina(nueva)
          setVolverAlInicio(false)
        }
      }, ms + 20)
    },
    [ajustes.sonido, ajustes.vibracion, aplicar, pagina, onPagina],
  )

  const alBajar = (e: React.PointerEvent) => {
    const g = gesto.current
    if (!lista || g.asentando || seleccionando) return
    despertarSonido()
    g.activo = true
    g.x0 = e.clientX
    g.dx = 0
    g.p = 0
    g.dir = null
    if (movilRef.current) movilRef.current.style.transition = 'none'
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      /* algunos navegadores lo rechazan; el gesto sigue funcionando igual */
    }
  }

  const alMover = (e: React.PointerEvent) => {
    const g = gesto.current
    if (!g.activo) return
    g.dx = e.clientX - g.x0

    if (!g.dir) {
      if (Math.abs(g.dx) < TOQUE) return
      const quiere: Direccion = g.dx < 0 ? 'siguiente' : 'anterior'
      // No hay hacia dónde ir: se ignora el gesto en vez de fingir un rebote.
      if (quiere === 'siguiente' && pagina >= libro.paginas) return
      if (quiere === 'anterior' && pagina <= 1) return
      g.dir = quiere
      setDir(quiere)
      return
    }

    const ancho = escenaRef.current?.clientWidth || 1
    g.p = Math.max(0, Math.min(1, Math.abs(g.dx) / ancho))
    aplicar(g.p, g.dir)
  }

  const alSoltar = () => {
    const g = gesto.current
    if (!g.activo) return
    g.activo = false

    // Sin dirección y sin recorrido: era un toque. Aparece la interfaz (P62).
    if (!g.dir) {
      if (Math.abs(g.dx) < TOQUE) setChrome(c => !c)
      return
    }
    asentar(g.p > UMBRAL, g.dir)
  }

  /* ---------------------------- controles ---------------------------- */

  const irA = (n: number) => {
    const destino = Math.max(1, Math.min(libro.paginas, n))
    if (destino === pagina) return
    setPagina(destino)
    onPagina(destino)
    setVolverAlInicio(false)
  }

  const enviarSalto = (e: React.FormEvent) => {
    e.preventDefault()
    const n = Number.parseInt(salto, 10)
    if (Number.isFinite(n)) irA(n)
    setSalto('')
    ;(document.activeElement as HTMLElement | null)?.blur()
  }

  const siguienteTema = () => {
    const i = TEMAS.indexOf(ajustes.tema)
    onAjustes({ ...ajustes, tema: TEMAS[(i + 1) % TEMAS.length] })
  }

  useEffect(() => {
    const teclas = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return
      if (e.key === 'ArrowRight' || e.key === 'PageDown') irA(pagina + 1)
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') irA(pagina - 1)
      else if (e.key === 'Escape') onCerrar()
    }
    window.addEventListener('keydown', teclas)
    return () => window.removeEventListener('keydown', teclas)
  })

  const avance = libro.paginas > 1 ? ((pagina - 1) / (libro.paginas - 1)) * 100 : 100

  return (
    <div className="lector" ref={lectorRef} data-tema={ajustes.tema} data-chrome={chrome}>
      <div className="chrome arriba" data-visible={chrome && !traduciendo}>
        <div className="fila entre">
          <button className="icono" onClick={onCerrar}>← Biblioteca</button>
          <span className="titulo-lector">{libro.titulo}</span>
          <button className="icono" onClick={siguienteTema}>{NOMBRE_TEMA[ajustes.tema]}</button>
        </div>
      </div>

      <div
        className={`escena${seleccionando ? ' seleccionando' : ''}`}
        ref={escenaRef}
        onPointerDown={alBajar}
        onPointerMove={alMover}
        onPointerUp={alSoltar}
        onPointerCancel={alSoltar}
      >
        {!lista && <span className="cargando">Abriendo</span>}
        {hoja.w > 0 && (
          <div
            className="marco"
            style={{
              width: hoja.w,
              height: hoja.h,
              left: (caja.w - hoja.w) / 2,
              top: (caja.h - hoja.h) / 2,
            }}
          >
            <div className="hoja debajo" ref={debajoRef} style={{ inset: 0, position: 'absolute' }} />
            <div
              className="hoja movil"
              ref={movilRef}
              style={{
                inset: 0,
                position: 'absolute',
                display: dir ? 'block' : 'none',
                transform: dir === 'anterior' ? 'rotateY(-180deg)' : 'rotateY(0deg)',
              }}
            />
            {/* Hermana de las hojas, no hija: al redibujar la página se
                reemplazan los hijos de la hoja, y ahí dentro la capa de texto
                desaparecía en silencio. */}
            <div className="capaTexto" ref={textoRef} />
          </div>
        )}
      </div>

      <div className="folio">{pagina} / {libro.paginas}</div>
      <div className="progreso"><i style={{ width: `${avance}%` }} /></div>

      {seleccionando && !traduciendo && (
        <div className="aviso modo">
          <span>
            {hayTexto === false
              ? 'Esta página es una imagen: no tiene texto que seleccionar.'
              : 'Selecciona y se va a la burbuja. Para pasar página, usa el número.'}
          </span>
          <button onClick={() => setSeleccionando(false)}>Salir</button>
        </div>
      )}

      {volverAlInicio && !traduciendo && (
        <div className="aviso">
          <span>Vas por la página {libro.pagina}</span>
          <button onClick={() => { irA(1); setVolverAlInicio(false) }}>Al principio</button>
        </div>
      )}

      <div className="zona-burbuja" ref={zonaRef}>
        <Burbuja
          clave={clave}
          libro={libro}
          pagina={pagina}
          seleccion={seleccion}
          onUsarSeleccion={() => setSeleccion('')}
          onIrAAjustes={onIrAAjustes}
          onEnUso={setTraduciendo}
        />
      </div>

      {/* Mientras escribes en la burbuja, los controles del lector se apartan.
          Con el teclado abierto no cabe todo, y lo que sobra es esto. */}
      <div className="chrome abajo" data-visible={chrome && !traduciendo}>
        <div className="fila entre">
          <form className="salto" onSubmit={enviarSalto}>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={libro.paginas}
              placeholder={String(pagina)}
              value={salto}
              onChange={e => setSalto(e.target.value)}
              aria-label="Ir a la página"
            />
            <button className="icono" type="submit">Ir</button>
          </form>
          <div className="fila">
            <button
              className="icono"
              aria-pressed={seleccionando}
              onClick={() => { setSeleccionando(v => !v); setHayTexto(null) }}
            >
              Seleccionar
            </button>
            <button
              className="icono"
              aria-pressed={ajustes.sonido}
              onClick={() => onAjustes({ ...ajustes, sonido: !ajustes.sonido })}
            >
              {ajustes.sonido ? 'Sonido' : 'Silencio'}
            </button>
            <button
              className="icono"
              aria-pressed={ajustes.vibracion}
              onClick={() => onAjustes({ ...ajustes, vibracion: !ajustes.vibracion })}
            >
              Vibrar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
