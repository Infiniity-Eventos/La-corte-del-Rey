import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Ajustes, Libro } from './lib/tipos'
import { AJUSTES_POR_DEFECTO } from './lib/tipos'
import { actualizarLibro, borrarLibro, guardarAjustes, leerAjustes, listarLibros } from './lib/almacen'
import { importarPdf } from './lib/importar'
import { Biblioteca } from './components/Biblioteca'
import { FichaLibro } from './components/FichaLibro'

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
  const [importando, setImportando] = useState(false)
  const [nota, setNota] = useState<string | null>(null)
  const [arrancando, setArrancando] = useState(true)

  useEffect(() => {
    ;(async () => {
      const [ls, aj] = await Promise.all([listarLibros(), leerAjustes()])
      setLibros(ls)
      setAjustes(aj)
      setArrancando(false)
    })()
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

  useEffect(() => {
    if (!abierto) return
    const t = window.setInterval(() => {
      const p = pendiente.current
      if (p === null) return
      pendiente.current = null
      void actualizarLibro({ ...abierto, pagina: p, abiertoEn: Date.now() })
    }, 1500)
    return () => {
      window.clearInterval(t)
      const p = pendiente.current
      if (p !== null) {
        pendiente.current = null
        void actualizarLibro({ ...abierto, pagina: p, abiertoEn: Date.now() })
      }
    }
  }, [abierto])

  const abrir = useCallback((libro: Libro) => {
    setAbierto(libro)
    void actualizarLibro({ ...libro, abiertoEn: Date.now() })
  }, [])

  const cerrar = useCallback(async () => {
    setAbierto(null)
    setLibros(await listarLibros())
  }, [])

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
          onAjustes={cambiarAjustes}
          onPagina={guardarPagina}
          onCerrar={cerrar}
        />
      </Suspense>
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
    </>
  )
}
