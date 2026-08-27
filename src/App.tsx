import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAtras } from './lib/atras'
import type { Ajustes, Libro, Palabra } from './lib/tipos'
import { AJUSTES_POR_DEFECTO } from './lib/tipos'
import {
  actualizarLibro,
  borrarLibro,
  borrarPalabra,
  guardarAjustes,
  guardarClave,
  leerAjustes,
  leerClave,
  listarCatalogo,
  listarLibros,
  listarVocabulario,
} from './lib/almacen'
import { importarPdf } from './lib/importar'
import { Biblioteca } from './components/Biblioteca'
import { FichaLibro } from './components/FichaLibro'
import { Ajustes as PantallaAjustes } from './components/Ajustes'
import { Vocabulario } from './components/Vocabulario'
import { Tutorial } from './components/Tutorial'
import { buscarAhora, entrarEnLaNueva, vigilarActualizaciones } from './lib/actualizacion'
import type { Quien } from './lib/nube'
import type { Traida } from './lib/sincronizacion'

/**
 * pdf.js pesa medio megabyte. Si entra en el paquete principal, la biblioteca
 * tarda en aparecer aunque no vaya a abrir ningún libro — justo lo que prohíbe
 * R4. Se carga aparte y se va buscando en cuanto la biblioteca está en
 * pantalla, así que para cuando tocas un libro ya está descargado.
 */
const Lector = lazy(() => import('./components/Lector').then(m => ({ default: m.Lector })))

export default function App() {
  const [libros, setLibros] = useState<Libro[]>([])
  const [catalogo, setCatalogo] = useState<Libro[]>([])
  const [ajustes, setAjustes] = useState<Ajustes>(AJUSTES_POR_DEFECTO)
  const [abierto, setAbierto] = useState<Libro | null>(null)
  const [enFicha, setEnFicha] = useState<Libro | null>(null)
  const [clave, setClave] = useState('')
  const [vocabulario, setVocabulario] = useState<Palabra[]>([])
  const [pantalla, setPantalla] = useState<'biblioteca' | 'ajustes' | 'vocabulario' | 'tutorial'>('biblioteca')
  const [hayVersionNueva, setHayVersionNueva] = useState(false)
  const [comprobando, setComprobando] = useState(false)
  const [quien, setQuien] = useState<Quien | null>(null)
  const [estadoNube, setEstadoNube] = useState('')
  const [nubeOcupada, setNubeOcupada] = useState(false)
  const [permitirDatos, setPermitirDatos] = useState(false)
  const [pidePermiso, setPidePermiso] = useState<{ libro: Libro; mb: number } | null>(null)

  /**
   * Un ciclo completo con la nube.
   *
   * Nunca bloquea nada: si falla, se dice y la app sigue igual. Los datos van
   * siempre; los PDF respetan el wifi (P68).
   */
  /** Las dos listas salen del mismo sitio, así que se leen juntas. */
  const refrescar = useCallback(async () => {
    const [mios, todo] = await Promise.all([listarLibros(), listarCatalogo()])
    setLibros(mios)
    setCatalogo(todo)
  }, [])

  const marcarEstrella = useCallback(async (libro: Libro, puesta: boolean) => {
    await actualizarLibro({ ...libro, estrella: puesta })
    await refrescar()
  }, [refrescar])

  const sincronizar = useCallback(async (q: Quien) => {
    const uid = q.uid
    setNubeOcupada(true)
    setEstadoNube('Sincronizando…')
    try {
      const { sincronizarDatos, sincronizarEstante, subirArchivosPendientes, limpiarBorrados, porDatos } =
        await import('./lib/sincronizacion')
      const r = await sincronizarDatos(uid)
      // El estante va después de lo propio: compartir un libro es marcar el
      // tuyo, y hasta que ese cambio no ha viajado no hay nada que poner.
      await sincronizarEstante(q)
      const [voc, aj] = await Promise.all([listarVocabulario(), leerAjustes()])
      await refrescar()
      setVocabulario(voc)
      setAjustes(aj)

      await limpiarBorrados(uid)
      const subidos = await subirArchivosPendientes(uid, permitirDatos, setEstadoNube)
      const quedan = r.archivosPendientes - subidos

      setEstadoNube(
        quedan > 0 && porDatos()
          ? `Todo al día salvo ${quedan} ${quedan === 1 ? 'archivo' : 'archivos'}: esperan al wifi.`
          : quedan > 0
            ? `Quedan ${quedan} ${quedan === 1 ? 'archivo' : 'archivos'} por subir.`
            : 'Todo al día.',
      )
      await refrescar()
    } catch (e) {
      setEstadoNube(
        e instanceof Error && /permission|insufficient/i.test(e.message)
          ? 'Faltan las reglas de acceso en Firebase. Están en el repositorio, sin desplegar.'
          : 'No se pudo sincronizar. La app sigue funcionando igual.',
      )
    } finally {
      setNubeOcupada(false)
    }
  }, [permitirDatos])

  const entrarEnLaCuenta = useCallback(async () => {
    setNubeOcupada(true)
    setEstadoNube('')
    try {
      const { entrar } = await import('./lib/nube')
      const q = await entrar()
      setQuien(q)
      try { localStorage.setItem('vellum-hubo-sesion', '1') } catch { /* modo privado */ }
      setNubeOcupada(false)
      void sincronizar(q)
    } catch (e) {
      const { ErrorSesion, explicarSesion } = await import('./lib/nube')
      const f = e instanceof ErrorSesion ? explicarSesion(e.fallo) : null
      setEstadoNube(f ? `${f.titulo}. ${f.detalle}` : 'No se pudo entrar.')
      setNubeOcupada(false)
    }
  }, [sincronizar])

  const salirDeLaCuenta = useCallback(async () => {
    const { salir } = await import('./lib/nube')
    await salir()
    setQuien(null)
    setEstadoNube('')
    try { localStorage.removeItem('vellum-hubo-sesion') } catch { /* modo privado */ }
  }, [])

  const comprobarVersion = useCallback(async () => {
    setComprobando(true)
    const hay = await buscarAhora()
    setComprobando(false)
    if (hay) setHayVersionNueva(true)
    else setNota(`Estás en la última versión · ${__VERSION__}`)
  }, [])
  const [importando, setImportando] = useState(false)
  const [nota, setNota] = useState<string | null>(null)
  const [arrancando, setArrancando] = useState(true)

  useEffect(() => {
    ;(async () => {
      const [aj, cl, voc] = await Promise.all([
        leerAjustes(),
        leerClave(),
        listarVocabulario(),
      ])
      await refrescar()
      setAjustes(aj)
      setClave(cl)
      setVocabulario(voc)
      setArrancando(false)
    })()
  }, [])

  useEffect(() => {
    vigilarActualizaciones(() => setHayVersionNueva(true))
  }, [])

  /**
   * Solo se enciende Firebase si alguna vez hubo sesión.
   *
   * Preguntarle a Firebase «¿hay alguien?» cuesta descargar todo el SDK. Para
   * quien nunca ha entrado —o no piensa hacerlo— eso es medio megabyte por una
   * respuesta que ya sabemos.
   */
  useEffect(() => {
    let hubo = false
    try { hubo = localStorage.getItem('vellum-hubo-sesion') === '1' } catch { /* modo privado */ }
    if (!hubo) return
    let soltar: (() => void) | undefined
    void import('./lib/nube').then(async n => {
      soltar = await n.vigilarSesion(q => {
        setQuien(q)
        if (q) void sincronizar(q)
      })
    })
    return () => soltar?.()
  }, [sincronizar])

  useEffect(() => {
    const ocioso =
      (window as unknown as { requestIdleCallback?: (f: () => void) => number }).requestIdleCallback ??
      ((f: () => void) => window.setTimeout(f, 400))
    ocioso(() => void import('./components/Lector'))
  }, [])

  useEffect(() => {
    if (!nota) return
    const t = window.setTimeout(() => setNota(null), 3600)
    return () => window.clearTimeout(t)
  }, [nota])

  const cambiarAjustes = useCallback((a: Ajustes) => {
    setAjustes(a)
    void guardarAjustes(a)
  }, [])

  const importar = useCallback(async (archivos: FileList) => {
    setImportando(true)
    let nuevos = 0
    let repetidos = 0
    let fallos = 0
    let ultimo: Libro | null = null
    for (const archivo of Array.from(archivos)) {
      const r = await importarPdf(archivo)
      if (r.estado === 'anadido') { nuevos++; ultimo = r.libro }
      else if (r.estado === 'repetido') repetidos++
      else fallos++
    }
    await refrescar()
    setImportando(false)

    const partes: string[] = []
    if (nuevos) partes.push(`${nuevos} ${nuevos === 1 ? 'libro añadido' : 'libros añadidos'}`)
    // R24 / P37: avisar y no duplicar.
    if (repetidos) partes.push(`${repetidos} ya ${repetidos === 1 ? 'estaba' : 'estaban'} en la estantería`)
    if (fallos) partes.push(`${fallos} no se ${fallos === 1 ? 'pudo abrir' : 'pudieron abrir'}`)
    setNota(partes.join(' · ') || null)

    // El título sale del nombre del archivo, que casi siempre es un desastre.
    // En P42 pediste control total, así que si has traído uno solo, la ficha se
    // abre sola para que lo dejes como quieras. Con varios sería un
    // interrogatorio, y ahí no se abre.
    if (nuevos === 1 && ultimo) setEnFicha(ultimo)
  }, [])

  // El progreso se guarda solo, sin escribir en disco en cada página (R16).
  const pendiente = useRef<number | null>(null)
  const guardarPagina = useCallback(
    (pagina: number) => {
      if (!abierto) return
      pendiente.current = pagina
      setLibros(prev => prev.map(l => (l.id === abierto.id ? { ...l, pagina } : l)))
    },
    [abierto],
  )

  /**
   * Escribir en disco en cada página sería un desperdicio, así que se acumula y
   * se guarda cada segundo y medio. Pero eso abre una ventana en la que sales
   * del libro y lo último se pierde, y perder por dónde ibas es de las peores
   * cosas que puede hacer un lector. Por eso hay una forma de guardar ya.
   */
  const guardarAhora = useCallback(async () => {
    const p = pendiente.current
    if (p === null || !abierto) return
    pendiente.current = null
    await actualizarLibro({ ...abierto, pagina: p, abiertoEn: Date.now() })
  }, [abierto])

  useEffect(() => {
    if (!abierto) return
    const t = window.setInterval(() => void guardarAhora(), 1500)
    // Al irte de la app —cambiar de aplicación, apagar la pantalla— puede que
    // no haya otra oportunidad de escribir.
    const alOcultarse = () => { if (document.visibilityState === 'hidden') void guardarAhora() }
    document.addEventListener('visibilitychange', alOcultarse)
    return () => {
      window.clearInterval(t)
      document.removeEventListener('visibilitychange', alOcultarse)
      void guardarAhora()
    }
  }, [abierto, guardarAhora])

  const cambiarClave = useCallback(async (nueva: string) => {
    await guardarClave(nueva, quien?.uid ?? null)
    setClave(nueva.trim())
    setNota(nueva.trim() ? 'Clave guardada' : 'Clave borrada')
  }, [quien])

  // Cada perfil trae la suya. Al entrar y al salir se cambia de cajón, para que
  // dos personas en el mismo aparato no se gasten la cuota la una a la otra.
  useEffect(() => {
    let vivo = true
    void leerClave(quien?.uid ?? null).then(c => { if (vivo) setClave(c) })
    return () => { vivo = false }
  }, [quien])

  const quitarPalabra = useCallback(async (id: string) => {
    await borrarPalabra(id)
    setVocabulario(await listarVocabulario())
  }, [])

  const abrir = useCallback(async (libro: Libro) => {
    // Un libro puede estar en la nube y no aquí: en otro aparato lo importaste
    // tú, no este.
    if (quien) {
      const { asegurarArchivo } = await import('./lib/sincronizacion')
      const r: Traida = await asegurarArchivo(quien.uid, libro, permitirDatos)
      if (r.estado === 'hace-falta-permiso') {
        setPidePermiso({ libro, mb: Math.max(1, Math.round(libro.bytes / 1024 / 1024)) })
        return
      }
      if (r.estado === 'no-esta') {
        setNota('Ese libro no está en este aparato ni en tu cuenta.')
        return
      }
    }
    setAbierto(libro)
    void actualizarLibro({ ...libro, abiertoEn: Date.now() })
  }, [quien, permitirDatos])

  const cerrar = useCallback(async () => {
    // Guardar primero y leer después. Al revés, la lista se leía antes de que
    // se escribiera lo último y la biblioteca aparecía sin el progreso.
    await guardarAhora()
    setAbierto(null)
    const voc = await listarVocabulario()
    await refrescar()
    setVocabulario(voc)
  }, [guardarAhora])

  // El botón de atrás del teléfono, capa por capa: primero lo que tengas
  // encima, y solo al final salir de la app.
  useAtras(!!enFicha, () => setEnFicha(null))
  useAtras(!!abierto, () => { void cerrar() })
  useAtras(pantalla !== 'biblioteca', () => setPantalla('biblioteca'))

  const guardarFicha = useCallback(async (libro: Libro) => {
    await actualizarLibro(libro)
    await refrescar()
    setEnFicha(null)
    setNota('Guardado')
  }, [])

  const quitar = useCallback(async (libro: Libro) => {
    await borrarLibro(libro)
    await refrescar()
    setEnFicha(null)
    setNota(`«${libro.titulo}» ya no está en la estantería`)
  }, [])

  const etiquetasConocidas = useMemo(() => {
    const todas = new Set<string>()
    for (const l of libros) for (const e of l.etiquetas) todas.add(e)
    return [...todas].sort()
  }, [libros])

  // La única espera de toda la app, y solo mientras se lee el índice local.
  if (arrancando) return null

  if (abierto) {
    return (
      <Suspense fallback={<div className="lector" data-tema={ajustes.tema} />}>
        <Lector
          libro={abierto}
          ajustes={ajustes}
          clave={clave}
          onAjustes={cambiarAjustes}
          onPagina={guardarPagina}
          onCerrar={cerrar}
          onIrAAjustes={() => { void cerrar(); setPantalla('ajustes') }}
        />
      </Suspense>
    )
  }

  if (pantalla === 'ajustes') {
    return (
      <>
        <PantallaAjustes
          ajustes={ajustes}
          onCambiarAjustes={cambiarAjustes}
          clave={clave}
          onGuardar={c => void cambiarClave(c)}
          onCerrar={() => setPantalla('biblioteca')}
          quien={quien}
          estadoNube={estadoNube}
          ocupada={nubeOcupada}
          onTutorial={() => setPantalla('tutorial')}
          onEntrar={() => void entrarEnLaCuenta()}
          onSalir={() => void salirDeLaCuenta()}
          onSincronizar={() => quien && void sincronizar(quien)}
        />
        {nota && <div className="aviso" style={{ bottom: '1.4rem' }}><span>{nota}</span></div>}
      </>
    )
  }

  // El tutorial cuelga de los ajustes: se vuelve ahí, no a la estantería.
  if (pantalla === 'tutorial') {
    return <Tutorial onCerrar={() => setPantalla('ajustes')} />
  }

  if (pantalla === 'vocabulario') {
    return (
      <Vocabulario
        palabras={vocabulario}
        onBorrar={id => void quitarPalabra(id)}
        onCerrar={() => setPantalla('biblioteca')}
      />
    )
  }

  return (
    <>
      <Biblioteca
        libros={libros}
        catalogo={catalogo}
        onEstrella={(l, p) => void marcarEstrella(l, p)}
        importando={importando}
        onImportar={importar}
        onAbrir={l => void abrir(l)}
        onEditar={setEnFicha}
        vocabulario={vocabulario.length}
        onAjustes={() => setPantalla('ajustes')}
        onVocabulario={() => setPantalla('vocabulario')}
        onComprobarVersion={() => void comprobarVersion()}
        comprobando={comprobando}
        quien={quien}
        estadoNube={estadoNube}
        nubeOcupada={nubeOcupada}
        onSincronizar={() => quien && void sincronizar(quien)}
      />
      {pidePermiso && (
        <div className="telon" onPointerDown={e => { if (e.target === e.currentTarget) setPidePermiso(null) }}>
          <div className="ficha" role="dialog" aria-label="Descargar por datos">
            <div className="ficha-asa" aria-hidden="true" />
            <h2 className="display tarjeta-tit">Estás con datos móviles</h2>
            <p className="tarjeta-txt">
              «{pidePermiso.libro.titulo}» no está en este aparato. Traerlo son unos{' '}
              <strong>{pidePermiso.mb} MB</strong>.
            </p>
            <div className="ficha-pie">
              <button className="btn fantasma peq" onClick={() => setPidePermiso(null)}>Ahora no</button>
              <button
                className="btn"
                onClick={() => {
                  const l = pidePermiso.libro
                  setPermitirDatos(true)
                  setPidePermiso(null)
                  void (async () => {
                    const { asegurarArchivo } = await import('./lib/sincronizacion')
                    if (quien) await asegurarArchivo(quien.uid, l, true)
                    setAbierto(l)
                  })()
                }}
              >
                Descargar igual
              </button>
            </div>
          </div>
        </div>
      )}
      {enFicha && (
        <FichaLibro
          key={enFicha.id}
          libro={enFicha}
          etiquetasConocidas={etiquetasConocidas}
          miUid={quien?.uid ?? null}
          onGuardar={guardarFicha}
          onBorrar={quitar}
          onCerrar={() => setEnFicha(null)}
        />
      )}
      {importando && (
        <div className="importando">
          <div>
            <h2 className="display">Guardando</h2>
            <p>Se está copiando el PDF a este aparato.</p>
          </div>
        </div>
      )}
      {nota && <div className="aviso" style={{ bottom: '1.4rem' }}><span>{nota}</span></div>}
      {/* Solo en la biblioteca: interrumpir a mitad de un libro para ofrecer una
          actualización es exactamente lo que no queremos. */}
      {hayVersionNueva && !nota && (
        <div className="aviso" style={{ bottom: '1.4rem' }}>
          <span>Hay una versión nueva</span>
          <button onClick={entrarEnLaNueva}>Actualizar</button>
        </div>
      )}
    </>
  )
}
