import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { Ajustes, Libro, Palabra, Tema } from '../lib/tipos'
import { borrarPalabra, leerArchivo, listarVocabulario } from '../lib/almacen'
import { Cuaderno } from '../lib/pdf'
import { clicDePagina, despertarSonido, toqueCorto } from '../lib/sonido'
import { Burbuja } from './Burbuja'

const TEMAS: Tema[] = ['papel', 'sepia', 'oscuro']
const NOMBRE_TEMA: Record<Tema, string> = { papel: 'Papel', sepia: 'Sepia', oscuro: 'Oscuro' }

/** Fracción de la pantalla que hay que arrastrar para que la página pase. */
const UMBRAL = 0.3
/** Por debajo de esto no es un arrastre, es un toque. */
const TOQUE = 8
/** Dos toques más separados que esto ya son dos toques, no uno doble. */
const DOBLE = 320
/** Cuánto acerca el doble toque. Suficiente para leer una viñeta pequeña. */
const AUMENTO = 2.6
/** Tope del pellizco. Más allá se ven los píxeles del PDF y no se lee mejor. */
const MAXIMO = 5

interface Lupa { s: number; x: number; y: number }

/** Que la vista no se salga de la página al acercar o al arrastrar. */
function encajar(l: Lupa, caja: { w: number; h: number }): Lupa {
  return {
    s: l.s,
    x: Math.min(0, Math.max(caja.w - caja.w * l.s, l.x)),
    y: Math.min(0, Math.max(caja.h - caja.h * l.s, l.y)),
  }
}

type Direccion = 'siguiente' | 'anterior' | null

interface Medida { w: number; h: number }

interface Props {
  libro: Libro
  ajustes: Ajustes
  clave: string
  onAjustes: (a: Ajustes) => void
  onPagina: (pagina: number) => void
  onCerrar: () => void
  onIrAAjustes: () => void
}

/**
 * Todas las hojas miden lo mismo: el área de lectura.
 *
 * Antes cada una tomaba el tamaño de su página, y en un cómic con dobles
 * páginas eso dejaba a la de atrás asomando alrededor de la de delante. Ahora
 * cada página va centrada sobre una hoja de papel del mismo tamaño, así que una
 * tapa a la otra por completo.
 */
function sitio(a: Medida & { x: number; y: number }): React.CSSProperties {
  return { position: 'absolute', width: a.w, height: a.h, left: a.x, top: a.y }
}

/** El hueco exacto de la página dentro de la hoja. */
function medida(m: Medida): React.CSSProperties {
  return { width: m.w, height: m.h }
}

function mismas(
  a: { abajo: Medida | null; arriba: Medida | null },
  b: { abajo: Medida | null; arriba: Medida | null },
): boolean {
  const igual = (x: Medida | null, y: Medida | null) =>
    x === y || (!!x && !!y && x.w === y.w && x.h === y.h)
  return igual(a.abajo, b.abajo) && igual(a.arriba, b.arriba)
}

export function Lector({ libro, ajustes, clave, onAjustes, onPagina, onCerrar, onIrAAjustes }: Props) {
  const escenaRef = useRef<HTMLDivElement>(null)
  const movilRef = useRef<HTMLDivElement>(null)
  const caraRef = useRef<HTMLDivElement>(null)
  const debajoRef = useRef<HTMLDivElement>(null)
  const cuadernoRef = useRef<Cuaderno | null>(null)

  const [caja, setCaja] = useState({ w: 0, h: 0 })
  /**
   * Cada hoja se mide por su cuenta.
   *
   * En un cómic conviven páginas verticales con dobles páginas horizontales, y
   * durante el volteo hay dos en pantalla a la vez. Con una sola medida
   * compartida, la que no encajaba se estiraba dentro del marco de la otra: eso
   * era la página «achatada y cuadrada».
   */
  const [hojas, setHojas] = useState<{ abajo: Medida | null; arriba: Medida | null }>({
    abajo: null,
    arriba: null,
  })
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
  const [lupa, setLupa] = useState<Lupa | null>(null)
  const [acercando, setAcercando] = useState(false)
  /**
   * Lo que has traducido y guardado en este libro.
   *
   * Se carga entero una vez al abrirlo, no en cada página: son unas decenas de
   * frases y buscarlas en cada volteo sería trabajo por nada, justo en el
   * momento en el que la app no puede permitirse ninguno.
   */
  const [notas, setNotas] = useState<Palabra[]>([])
  const [notasAbiertas, setNotasAbiertas] = useState(false)
  const textoRef = useRef<HTMLDivElement>(null)
  const zonaRef = useRef<HTMLDivElement>(null)
  const lectorRef = useRef<HTMLDivElement>(null)

  // El arrastre vive en refs, no en el estado: mover el dedo no puede provocar
  // un renderizado de React por fotograma o se nota el tirón.
  const gesto = useRef({ activo: false, x0: 0, dx: 0, p: 0, dir: null as Direccion, asentando: false })
  // Del doble toque solo hace falta recordar cuándo y dónde fue el anterior.
  const ultimoToque = useRef({ t: 0, x: 0, y: 0 })
  const arrastreLupa = useRef({ x: 0, y: 0, ox: 0, oy: 0 })
  // Los dedos que hay puestos ahora mismo. Con dos, el gesto deja de ser pasar
  // página y pasa a ser pellizcar.
  const dedos = useRef(new Map<number, { x: number; y: number }>())
  const pellizco = useRef<
    { d0: number; s0: number; x0: number; y0: number; m0: { x: number; y: number } } | null
  >(null)
  // El volteo pedido con el teclado, esperando a que la hoja esté dibujada.
  const auto = useRef<'siguiente' | 'anterior' | null>(null)

  /* ------------------------------ medir ------------------------------ */

  /**
   * El teclado no es un cambio de tamaño: es algo que se pone delante.
   *
   * La ventana se encoge al abrirlo, y si el lector le hace caso vuelve a
   * repartir la página y a redibujarla — con el zoom puesto, eso mueve de sitio
   * justo lo que estabas mirando. Mientras la burbuja está en uso, la medida se
   * queda congelada: la página no se mueve un pixel y el teclado tapa lo que
   * tenga que tapar, que es lo que se pidió.
   *
   * Y si tocas la página mientras escribes —para acercar, por ejemplo—, el
   * campo pierde el foco y el teclado se cierra, así que la medida congelada es
   * justo la que va a valer un instante después. Por eso el doble toque acierta
   * el centro aunque se dé con el teclado todavía delante.
   */
  const congelada = useRef(false)
  useEffect(() => { congelada.current = traduciendo }, [traduciendo])

  useEffect(() => {
    const el = escenaRef.current
    if (!el) return
    let espera = 0
    const ro = new ResizeObserver(([e]) => {
      // Al abrirse y cerrarse el teclado, la ventana cambia de alto varias
      // veces seguidas. Sin esperar a que se asiente, cada paso dispara un
      // redibujado y la página aparece deformada un instante.
      window.clearTimeout(espera)
      const { width, height } = e.contentRect
      espera = window.setTimeout(() => {
        if (congelada.current) return
        setCaja({ w: Math.floor(width), h: Math.floor(height) })
      }, 180)
    })
    ro.observe(el)
    return () => { window.clearTimeout(espera); ro.disconnect() }
  }, [])

  /**
   * Al soltar la burbuja se vuelve a mirar una vez, por si el tamaño cambió de
   * verdad mientras estaba congelada —girar el aparato con el teclado abierto—.
   * Se espera a que la ventana se asiente; medir en el momento pillaría la
   * pantalla aún encogida, que es exactamente el salto que esto evita. Si nada
   * cambió, `setCaja` devuelve el mismo objeto y no hay renderizado.
   */
  useEffect(() => {
    if (traduciendo) return
    const t = window.setTimeout(() => {
      const el = escenaRef.current
      if (!el) return
      const w = el.clientWidth
      const h = el.clientHeight
      setCaja(c => (c.w === w && c.h === h ? c : { w, h }))
    }, 320)
    return () => window.clearTimeout(t)
  }, [traduciendo])

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

  // Cada redibujado lleva número. Dibujar tarda, y si mientras tanto cambia el
  // tamaño o la página, el resultado que llega tarde ya no vale: aplicarlo era
  // lo que dejaba la página achatada, con un lienzo viejo estirado dentro de un
  // marco nuevo.
  const turno = useRef(0)

  const pintar = useCallback(async () => {
    const c = cuadernoRef.current
    if (!c || caja.w === 0) return
    const mio = ++turno.current
    c.redimensionar(caja.w, caja.h)

    const { abajo, arriba } = cuales()
    const a = await c.dibujar(abajo).catch(() => null)
    if (mio !== turno.current) return
    const b = arriba !== null ? await c.dibujar(arriba).catch(() => null) : null
    if (mio !== turno.current) return

    const medir = (p: typeof a): Medida | null => (p ? { w: p.ancho, h: p.alto } : null)
    const nuevas = { abajo: medir(a), arriba: medir(b) }
    // Sin comparar antes, cada pasada crearía un objeto nuevo y el efecto se
    // volvería a disparar para siempre.
    setHojas(v => (mismas(v, nuevas) ? v : nuevas))

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
    montar(caraRef.current, arriba)
  }, [cuales, hojas, sello, montar])

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

  /* --------------------- lo traducido en la página -------------------- */

  useEffect(() => {
    let vivo = true
    void listarVocabulario().then(todas => {
      if (vivo) setNotas(todas.filter(p => p.libroId === libro.id))
    })
    return () => { vivo = false }
  }, [libro.id])

  // El panel es de esta página. Al cambiarla se cierra solo: dejarlo abierto
  // enseñaría las notas de una página que ya no estás mirando.
  useEffect(() => { setNotasAbiertas(false) }, [pagina])

  const quitarNota = async (id: string) => {
    await borrarPalabra(id)
    setNotas(ns => ns.filter(n => n.id !== id))
  }

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

  /**
   * La hoja gira 90°, no 180.
   *
   * Con media vuelta entera, al volver atrás la página pasaba la primera mitad
   * del gesto **fuera de la pantalla**, a la izquierda del lomo: arrastrabas y
   * no se movía nada hasta pasada la mitad. Con un cuarto de vuelta, la hoja
   * gira hasta quedar de canto —donde deja de verse igualmente— y las dos
   * direcciones ocurren enteras dentro de la pantalla, con el mismo recorrido.
   */
  const aplicar = useCallback((p: number, d: Direccion) => {
    const el = movilRef.current
    if (!el) return
    const angulo = d === 'siguiente' ? -p * 90 : -90 + p * 90
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
          setLupa(null)
          const nueva = d === 'siguiente' ? pagina + 1 : pagina - 1
          setPagina(nueva)
          onPagina(nueva)
          setVolverAlInicio(false)
        }
      }, ms + 20)
    },
    [ajustes.sonido, ajustes.vibracion, aplicar, pagina, onPagina],
  )

  /**
   * Pasar página con el teclado, con el mismo volteo que con el dedo.
   *
   * No basta con cambiar de página: hay que poner la hoja en su sitio, esperar
   * a que esté dibujada y entonces soltarla. Si se anima antes de que la página
   * vecina exista, lo que gira es una hoja en blanco.
   */
  const voltear = useCallback((d: 'siguiente' | 'anterior') => {
    const g = gesto.current
    if (!lista || g.activo || g.asentando || auto.current) return
    if (d === 'siguiente' && pagina >= libro.paginas) return
    if (d === 'anterior' && pagina <= 1) return
    setLupa(null)
    g.p = 0
    g.dir = d
    auto.current = d
    setDir(d)
  }, [lista, pagina, libro.paginas])

  useEffect(() => {
    const d = auto.current
    if (!d || dir !== d) return
    // La hoja que gira tiene que tener su página dentro antes de moverse.
    if (!movilRef.current?.querySelector('canvas')) return
    auto.current = null
    // Un fotograma de por medio: el efecto de abajo acaba de poner la hoja en
    // su sitio sin transición, y sin dejar pasar un fotograma el navegador
    // junta las dos cosas y no anima nada.
    //
    // Sin limpieza a propósito: cancelarlo al volver a renderizar —y se
    // renderiza— mataría el volteo antes de que empiece. Si el lector se cierra
    // antes, `asentar` no encuentra la hoja y se va sin hacer nada.
    requestAnimationFrame(() => asentar(true, d))
  }, [dir, sello, hojas, asentar])

  /**
   * Después de cada renderizado, la hoja vuelve a donde la dejó el dedo.
   *
   * El giro se aplicaba en el estilo del renderizado, así que cualquier
   * repintado a mitad del gesto —y hay varios, porque dibujar la página vecina
   * provoca uno— devolvía la hoja a su posición de partida. Al avanzar se
   * notaba poco, porque partir de cero es casi lo mismo que empezar. Al volver,
   * la posición de partida es «de canto e invisible», así que la página
   * desaparecía y luego aparecía de golpe.
   */
  useLayoutEffect(() => {
    const el = movilRef.current
    if (!el || !dir) return
    el.style.transition = 'none'
    aplicar(gesto.current.p, dir)
  }, [dir, sello, hojas, aplicar])

  const alBajar = (e: React.PointerEvent) => {
    const g = gesto.current
    if (!lista || g.asentando || seleccionando) return
    despertarSonido()
    setAcercando(false)

    dedos.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    // Dos dedos: se deja de pasar página y se empieza a pellizcar. Si el volteo
    // ya había arrancado se ignora el segundo dedo, que interrumpirlo a medias
    // dejaría la hoja colgando.
    if (dedos.current.size === 2 && !g.dir) {
      const escena = escenaRef.current
      const [a, b] = [...dedos.current.values()]
      if (escena) {
        const r = escena.getBoundingClientRect()
        pellizco.current = {
          d0: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
          s0: lupa?.s ?? 1,
          x0: lupa?.x ?? 0,
          y0: lupa?.y ?? 0,
          m0: { x: (a.x + b.x) / 2 - r.left, y: (a.y + b.y) / 2 - r.top },
        }
        g.activo = false
        return
      }
    }
    if (pellizco.current) return
    if (lupa) {
      // Acercado, arrastrar mueve la vista. Pasar página aquí no tendría
      // sentido: no se ve la página entera.
      arrastreLupa.current = { x: e.clientX, y: e.clientY, ox: lupa.x, oy: lupa.y }
    }
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

    if (dedos.current.has(e.pointerId)) {
      dedos.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    }

    const pz = pellizco.current
    if (pz && dedos.current.size >= 2) {
      const escena = escenaRef.current
      if (!escena) return
      const [a, b] = [...dedos.current.values()]
      const d1 = Math.hypot(a.x - b.x, a.y - b.y)
      if (d1 < 1) return
      const r = escena.getBoundingClientRect()
      const mx = (a.x + b.x) / 2 - r.left
      const my = (a.y + b.y) / 2 - r.top
      const s = Math.max(1, Math.min(MAXIMO, pz.s0 * (d1 / pz.d0)))
      // El punto de la página que estaba entre los dedos se queda entre los
      // dedos: es lo que hace que pellizcar se sienta como agarrar el papel.
      const cx = (pz.m0.x - pz.x0) / pz.s0
      const cy = (pz.m0.y - pz.y0) / pz.s0
      setLupa(encajar({ s, x: mx - cx * s, y: my - cy * s }, caja))
      return
    }

    if (!g.activo) return

    if (lupa) {
      const a = arrastreLupa.current
      setLupa(encajar({ s: lupa.s, x: a.ox + (e.clientX - a.x), y: a.oy + (e.clientY - a.y) }, caja))
      g.dx = e.clientX - g.x0
      return
    }

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

  const alSoltar = (e: React.PointerEvent) => {
    const g = gesto.current
    dedos.current.delete(e.pointerId)

    if (pellizco.current) {
      if (dedos.current.size >= 2) return
      pellizco.current = null
      g.activo = false
      // Volver a tamaño natural quita el acercamiento del todo, en vez de
      // dejarlo en un 1,01 que no se ve pero sigue atrapando el arrastre.
      setLupa(l => (l && l.s <= 1.02 ? null : l))
      return
    }

    if (!g.activo) return
    g.activo = false

    // Sin dirección y sin recorrido: era un toque.
    if (!g.dir) {
      if (Math.abs(g.dx) < TOQUE) alTocar(e)
      return
    }
    asentar(g.p > UMBRAL, g.dir)
  }

  /**
   * Un toque muestra la interfaz (P62). Dos seguidos, además, acercan la
   * página al punto tocado, y otros dos la devuelven.
   *
   * El segundo toque vuelve a alternar la interfaz, así que un doble toque la
   * deja como estaba. Es lo que evita tener que esperar a ver si viene un
   * segundo toque antes de reaccionar al primero.
   */
  const alTocar = (e: React.PointerEvent) => {
    setChrome(c => !c)

    const ahora = Date.now()
    const u = ultimoToque.current
    const seguido = ahora - u.t < DOBLE && Math.hypot(e.clientX - u.x, e.clientY - u.y) < 40
    ultimoToque.current = { t: ahora, x: e.clientX, y: e.clientY }
    if (!seguido) return
    ultimoToque.current.t = 0

    const escena = escenaRef.current
    if (!escena) return
    setAcercando(true)
    if (lupa) {
      setLupa(null)
      return
    }
    const r = escena.getBoundingClientRect()
    const px = e.clientX - r.left
    const py = e.clientY - r.top
    // Lo tocado se queda en el centro de la pantalla.
    setLupa(encajar({ s: AUMENTO, x: caja.w / 2 - px * AUMENTO, y: caja.h / 2 - py * AUMENTO }, caja))
  }

  /* ---------------------------- controles ---------------------------- */

  const irA = (n: number) => {
    const destino = Math.max(1, Math.min(libro.paginas, n))
    if (destino === pagina) return
    setLupa(null)
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
      // TEXTAREA es el campo del traductor: sin esto, escribir una frase y
      // mover el cursor con las flechas pasaba de página por debajo.
      const donde = (e.target as HTMLElement)?.tagName
      if (donde === 'INPUT' || donde === 'TEXTAREA') return
      if (e.key === 'Escape') { onCerrar(); return }
      if (e.metaKey || e.ctrlKey || e.altKey) return

      // Las flechas voltean la hoja, no saltan de página: en la PC el libro se
      // pasa igual que en el teléfono, solo que el gesto lo hace la tecla.
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault()
        voltear('siguiente')
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault()
        voltear('anterior')
      }
    }
    window.addEventListener('keydown', teclas)
    return () => window.removeEventListener('keydown', teclas)
  })

  const avance = libro.paginas > 1 ? ((pagina - 1) / (libro.paginas - 1)) * 100 : 100

  // El mismo margen con el que se dibujan las páginas en lib/pdf.ts.
  const anchoArea = Math.round(caja.w * 0.94)
  const altoArea = Math.round(caja.h * 0.96)
  const area = {
    w: anchoArea,
    h: altoArea,
    x: Math.round((caja.w - anchoArea) / 2),
    y: Math.round((caja.h - altoArea) / 2),
  }

  const notasAqui = notas.filter(n => n.pagina === pagina)

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
        className={`escena${seleccionando ? ' seleccionando' : ''}${lupa ? ' lupa' : ''}`}
        ref={escenaRef}
        onPointerDown={alBajar}
        onPointerMove={alMover}
        onPointerUp={alSoltar}
        onPointerCancel={alSoltar}
      >
        {!lista && <span className="cargando">Abriendo</span>}
        {hojas.abajo && (
          <div
            className={`marco${acercando ? ' acercando' : ''}`}
            style={lupa ? { transform: `translate(${lupa.x}px, ${lupa.y}px) scale(${lupa.s})` } : undefined}
          >
            <div className="hoja debajo" style={sitio(area)}>
              <div className="cara">
                <div className="papel">
                  <div className="pagina" style={medida(hojas.abajo)}>
                    <div className="lienzo" ref={debajoRef} />
                    {/* Hermana del lienzo, no hija: al redibujar se reemplazan
                        los hijos y la capa de texto desaparecía en silencio. */}
                    <div className="capaTexto" ref={textoRef} />
                  </div>
                </div>
              </div>
            </div>

            {hojas.arriba && (
              <div
                className="hoja movil"
                ref={movilRef}
                style={{
                  ...sitio(area),
                  display: dir ? 'block' : 'none',
                }}
              >
                <div className="cara frente">
                  <div className="papel">
                    <div className="pagina" style={medida(hojas.arriba)}>
                      <div className="lienzo" ref={caraRef} />
                    </div>
                  </div>
                  <span className="pliegue" aria-hidden="true" />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* La marca de lo traducido. Va pegada al borde derecho de la escena, a
          media altura: ahí no compite con la barra de arriba, ni con el folio,
          ni con la burbuja, y se ve aunque la interfaz esté oculta.
          No se esconde mientras traduces, a propósito: el momento en que quieres
          verla aparecer es justo el de guardar. */}
      {notasAqui.length > 0 && (
        <button
          className="marca-notas"
          onClick={() => setNotasAbiertas(v => !v)}
          aria-expanded={notasAbiertas}
          aria-label={`${notasAqui.length} traducida${notasAqui.length > 1 ? 's' : ''} en esta página`}
        >
          <span className="marca-cinta" aria-hidden="true" />
          <span className="marca-n">{notasAqui.length}</span>
        </button>
      )}

      {notasAbiertas && notasAqui.length > 0 && (
        <div
          className="notas-telon"
          onPointerDown={() => setNotasAbiertas(false)}
          aria-hidden="true"
        />
      )}
      {notasAbiertas && notasAqui.length > 0 && (
        <div className="notas" role="dialog" aria-label="Lo que tradujiste en esta página">
          <div className="notas-top">
            <span className="notas-tit">En la página {pagina}</span>
            <button className="icono" onClick={() => setNotasAbiertas(false)} aria-label="Cerrar">✕</button>
          </div>
          <ul className="notas-lista">
            {notasAqui.map(n => (
              <li key={n.id} className="nota">
                <p className="nota-orig">{n.texto}</p>
                <p className="nota-trad">{n.traduccion}</p>
                <button className="icono peq" onClick={() => void quitarNota(n.id)}>Quitar</button>
              </li>
            ))}
          </ul>
          <p className="notas-pie">También las tienes todas juntas en tu vocabulario.</p>
        </div>
      )}

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

      {/* Todo lo que vive abajo va dentro de la misma zona, apilado. Cuando el
          aviso flotaba por su cuenta, aterrizaba justo encima de los controles
          del lector. */}
      <div className="zona-burbuja" ref={zonaRef}>
        {volverAlInicio && !traduciendo && (
          <div className="aviso enPila">
            <span>Vas por la página {libro.pagina}</span>
            <button onClick={() => { irA(1); setVolverAlInicio(false) }}>Al principio</button>
          </div>
        )}
        <Burbuja
          clave={clave}
          libro={libro}
          pagina={pagina}
          seleccion={seleccion}
          onUsarSeleccion={() => setSeleccion('')}
          onIrAAjustes={onIrAAjustes}
          onEnUso={setTraduciendo}
          // Reemplaza si ya estaba: volver a traducir lo mismo en la misma
          // página actualiza su entrada, no añade otra.
          onGuardada={p => setNotas(ns => [...ns.filter(n => n.id !== p.id), p])}
          onQuitada={id => setNotas(ns => ns.filter(n => n.id !== id))}
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
