import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
  listarLibros,
  listarVocabulario,
} from './lib/almacen'
import { importarPdf } from './lib/importar'
import { Biblioteca } from './components/Biblioteca'
import { FichaLibro } from './components/FichaLibro'
import { Ajustes as PantallaAjustes } from './components/Ajustes'
import { Vocabulario } from './components/Vocabulario'
import { buscarAhora, entrarEnLaNueva, vigilarActualizaciones } from './lib/actualizacion'

/**
 * pdf.js pesa medio megabyte. Si entra en el paquete principal, la biblioteca
 * tarda en aparecer aunque no vaya a abrir ningún libro — justo lo que prohíbe
 * R4. Se carga aparte y se va buscando en cuanto la biblioteca está en
 * pantalla, así que para cuando tocas un libro ya está descargado.
 */
const Lector = lazy(() => import('./components/Lector').then(m => ({ default: m.Lector })))

export default function App() {
  const [libros, setLibros] = useState<Libro[]>([])
  const [ajustes, setAjustes] = useState<Ajustes>(AJUSTES_POR_DEFECTO)
  const [abierto, setAbierto] = useState<Libro | null>(null)
  const [enFicha, setEnFicha] = useState<Libro | null>(null)
  const [clave, setClave] = useState('')
  const [vocabulario, setVocabulario] = useState<Palabra[]>([])
  const [pantalla, setPantalla] = useState<'biblioteca' | 'ajustes' | 'vocabulario'>('biblioteca')
  const [hayVersionNueva, setHayVersionNueva] = useState(false)
  const [comprobando, setComprobando] = useState(false)

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
      const [ls, aj, cl, voc] = await Promise.all([
        listarLibros(),
        leerAjustes(),
        leerClave(),
        listarVocabulario(),
      ])
      setLibros(ls)
      setAjustes(aj)
      setClave(cl)
      setVocabulario(voc)
      setArrancando(false)
    })()
  }, [])

  useEffect(() => {
    vigilarActualizaciones(() => setHayVersionNueva(true))
  }, [])

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
    setLibros(await listarLibros())
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
    await guardarClave(nueva)
    setClave(nueva.trim())
    setNota(nueva.trim() ? 'Clave guardada' : 'Clave borrada')
  }, [])

  const quitarPalabra = useCallback(async (id: string) => {
    await borrarPalabra(id)
    setVocabulario(await listarVocabulario())
  }, [])

  const abrir = useCallback((libro: Libro) => {
    setAbierto(libro)
    void actualizarLibro({ ...libro, abiertoEn: Date.now() })
  }, [])

  const cerrar = useCallback(async () => {
    // Guardar primero y leer después. Al revés, la lista se leía antes de que
    // se escribiera lo último y la biblioteca aparecía sin el progreso.
    await guardarAhora()
    setAbierto(null)
    const [ls, voc] = await Promise.all([listarLibros(), listarVocabulario()])
    setLibros(ls)
    setVocabulario(voc)
  }, [guardarAhora])

  const guardarFicha = useCallback(async (libro: Libro) => {
    await actualizarLibro(libro)
    setLibros(await listarLibros())
    setEnFicha(null)
    setNota('Guardado')
  }, [])

  const quitar = useCallback(async (libro: Libro) => {
    await borrarLibro(libro)
    setLibros(await listarLibros())
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
          clave={clave}
          onGuardar={c => void cambiarClave(c)}
          onCerrar={() => setPantalla('biblioteca')}
        />
        {nota && <div className="aviso" style={{ bottom: '1.4rem' }}><span>{nota}</span></div>}
      </>
    )
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
        importando={importando}
        onImportar={importar}
        onAbrir={abrir}
        onEditar={setEnFicha}
        vocabulario={vocabulario.length}
        onAjustes={() => setPantalla('ajustes')}
        onVocabulario={() => setPantalla('vocabulario')}
        onComprobarVersion={() => void comprobarVersion()}
        comprobando={comprobando}
      />
      {enFicha && (
        <FichaLibro
          key={enFicha.id}
          libro={enFicha}
          etiquetasConocidas={etiquetasConocidas}
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
