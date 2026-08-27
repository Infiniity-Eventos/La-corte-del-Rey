/**
 * Almacenamiento local (D-03).
 *
 * Los archivos van al sistema de archivos privado del origen (OPFS) porque es lo
 * único que funciona igual en Android y en el escritorio. El índice va a
 * IndexedDB. Si el navegador no trae OPFS, los archivos caen a IndexedDB
 * también: es más lento con archivos grandes, pero nunca deja al usuario sin app.
 *
 * La nube (D-12) es el hito 4. Aquí no aparece: la fuente principal siempre es
 * el aparato, y esto no cambia cuando llegue Firebase.
 */
import type { Ajustes, Libro, Palabra } from './tipos'
import { AJUSTES_POR_DEFECTO } from './tipos'

const BD = 'vellum'
const VERSION = 2
const LIBROS = 'libros'
const ARCHIVOS = 'archivos'
const AJUSTES = 'ajustes'
const VOCABULARIO = 'vocabulario'

let cache: Promise<IDBDatabase> | null = null

function abrir(): Promise<IDBDatabase> {
  if (cache) return cache
  cache = new Promise((res, rej) => {
    const req = indexedDB.open(BD, VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(LIBROS)) {
        db.createObjectStore(LIBROS, { keyPath: 'id' }).createIndex('hash', 'hash', { unique: false })
      }
      if (!db.objectStoreNames.contains(ARCHIVOS)) db.createObjectStore(ARCHIVOS)
      if (!db.objectStoreNames.contains(AJUSTES)) db.createObjectStore(AJUSTES)
      if (!db.objectStoreNames.contains(VOCABULARIO)) {
        db.createObjectStore(VOCABULARIO, { keyPath: 'id' }).createIndex('fecha', 'fecha')
      }
    }
    req.onsuccess = () => res(req.result)
    req.onerror = () => rej(req.error)
  })
  return cache
}

function tx<T>(store: string, modo: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return abrir().then(
    db =>
      new Promise<T>((res, rej) => {
        const t = db.transaction(store, modo)
        const req = fn(t.objectStore(store))
        req.onsuccess = () => res(req.result)
        req.onerror = () => rej(req.error)
      }),
  )
}

/* ---------------------------------- OPFS --------------------------------- */

async function carpeta(): Promise<FileSystemDirectoryHandle | null> {
  try {
    if (!navigator.storage?.getDirectory) return null
    const raiz = await navigator.storage.getDirectory()
    return await raiz.getDirectoryHandle('libros', { create: true })
  } catch {
    return null
  }
}

async function guardarArchivo(nombre: string, datos: Blob): Promise<void> {
  const dir = await carpeta()
  if (dir) {
    const h = await dir.getFileHandle(nombre, { create: true })
    const w = await h.createWritable()
    await w.write(datos)
    await w.close()
    return
  }
  await tx(ARCHIVOS, 'readwrite', s => s.put(datos, nombre))
}

export async function leerArchivo(nombre: string): Promise<Blob | null> {
  const dir = await carpeta()
  if (dir) {
    try {
      return await (await dir.getFileHandle(nombre)).getFile()
    } catch {
      /* puede haber quedado en IndexedDB de una sesión anterior */
    }
  }
  return (await tx<Blob | undefined>(ARCHIVOS, 'readonly', s => s.get(nombre))) ?? null
}

async function borrarArchivo(nombre: string): Promise<void> {
  const dir = await carpeta()
  if (dir) {
    try {
      await dir.removeEntry(nombre)
    } catch {
      /* si no está, no hay nada que borrar */
    }
  }
  await tx(ARCHIVOS, 'readwrite', s => s.delete(nombre))
}

/**
 * Pide al sistema que no desaloje la biblioteca cuando falte espacio.
 * En una app instalada, Chrome suele concederlo sin preguntar.
 */
export async function pedirPermanencia(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false
    if (await navigator.storage.persisted()) return true
    return await navigator.storage.persist()
  } catch {
    return false
  }
}

/* --------------------------------- Libros -------------------------------- */

/** Los libros que se ven. Las lápidas de los borrados quedan fuera. */
export async function listarLibros(): Promise<Libro[]> {
  const libros = await listarLibrosCrudo()
  return libros.filter(l => !l.borrado).sort((a, b) => b.abiertoEn - a.abiertoEn)
}

/** Todo, lápidas incluidas. Lo necesita la sincronización, nadie más. */
export async function listarLibrosCrudo(): Promise<Libro[]> {
  return tx<Libro[]>(LIBROS, 'readonly', s => s.getAll())
}

/** Marca cuándo se tocó algo. Es lo que decide quién gana al sincronizar. */
function sellar<T extends { actualizadoEn?: number }>(x: T): T {
  return { ...x, actualizadoEn: Date.now() }
}

export async function buscarPorHash(hash: string): Promise<Libro | null> {
  const db = await abrir()
  return new Promise((res, rej) => {
    const req = db.transaction(LIBROS, 'readonly').objectStore(LIBROS).index('hash').get(hash)
    req.onsuccess = () => res((req.result as Libro) ?? null)
    req.onerror = () => rej(req.error)
  })
}

export async function anadirLibro(libro: Libro, datos: Blob): Promise<void> {
  await guardarArchivo(libro.archivo, datos)
  await tx(LIBROS, 'readwrite', s => s.put(sellar(libro)))
}

export async function actualizarLibro(libro: Libro): Promise<void> {
  await tx(LIBROS, 'readwrite', s => s.put(sellar(libro)))
}

/** Guarda tal cual, sin tocar la fecha. Lo usa la sincronización al traer. */
export async function guardarLibroTalCual(libro: Libro): Promise<void> {
  await tx(LIBROS, 'readwrite', s => s.put(libro))
}

/**
 * Borrar deja una lápida en vez de olvidar sin más.
 *
 * Sin ella, el otro aparato ve un libro que él tiene y que aquí «falta», lo da
 * por nuevo y lo vuelve a mandar: borrar sería imposible.
 */
export async function borrarLibro(libro: Libro): Promise<void> {
  await borrarArchivo(libro.archivo)
  await tx(LIBROS, 'readwrite', s =>
    s.put(sellar({
      ...libro,
      borrado: true,
      portada: undefined,
      archivoEnNube: false,
    })),
  )
}

/** Para cuando la lápida ya viajó a todas partes y no hace falta guardarla. */
export async function olvidarLibro(id: string): Promise<void> {
  await tx(LIBROS, 'readwrite', s => s.delete(id))
}

/* -------------------------------- Ajustes -------------------------------- */

export async function leerAjustes(): Promise<Ajustes> {
  const g = await tx<Partial<Ajustes> | undefined>(AJUSTES, 'readonly', s => s.get('ajustes'))
  return { ...AJUSTES_POR_DEFECTO, ...(g ?? {}) }
}

export async function guardarAjustes(a: Ajustes): Promise<void> {
  await tx(AJUSTES, 'readwrite', s => s.put(a, 'ajustes'))
}

/* --------------------------------- Clave --------------------------------- */

/** Guarda el archivo de un libro que llega de la nube. */
export async function guardarArchivoDeLibro(nombre: string, datos: Blob): Promise<void> {
  await guardarArchivo(nombre, datos)
}

/** Si el PDF está en este aparato. Un libro puede estar solo en la nube. */
export async function hayArchivo(nombre: string): Promise<boolean> {
  return (await leerArchivo(nombre)) !== null
}

/** Va en su propio cajón, no en los ajustes: ver el comentario en tipos.ts. */
export async function leerClave(): Promise<string> {
  return (await tx<string | undefined>(AJUSTES, 'readonly', s => s.get('claveGemini'))) ?? ''
}

export async function guardarClave(clave: string): Promise<void> {
  await tx(AJUSTES, 'readwrite', s => s.put(clave.trim(), 'claveGemini'))
}

/* ------------------------------ Vocabulario ------------------------------ */

export async function listarVocabulario(): Promise<Palabra[]> {
  const todas = await listarVocabularioCrudo()
  return todas.filter(p => !(p as { borrado?: boolean }).borrado).sort((a, b) => b.fecha - a.fecha)
}

export async function listarVocabularioCrudo(): Promise<Palabra[]> {
  return tx<Palabra[]>(VOCABULARIO, 'readonly', s => s.getAll())
}

export async function guardarPalabra(p: Palabra): Promise<void> {
  await tx(VOCABULARIO, 'readwrite', s => s.put(sellar(p)))
}

export async function guardarPalabraTalCual(p: Palabra): Promise<void> {
  await tx(VOCABULARIO, 'readwrite', s => s.put(p))
}

export async function borrarPalabra(id: string): Promise<void> {
  await tx(VOCABULARIO, 'readwrite', s => s.delete(id))
}
