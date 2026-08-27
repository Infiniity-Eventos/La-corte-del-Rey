/**
 * La sincronización: qué se manda, qué se trae y cuándo.
 *
 * El orden importa y es siempre el mismo: **primero se escribe aquí, después se
 * sincroniza**. Si la red falla, la app no se entera (D-08).
 *
 * Los datos —progreso, etiquetas, títulos, vocabulario— viajan siempre, porque
 * pesan nada. Los PDF pesan, así que respetan el wifi (P68).
 */
import type { Ajustes, Libro, Palabra } from './tipos'
import { fusionar } from './fusion'
import {
  actualizarLibro,
  guardarAjustes,
  guardarArchivoDeLibro,
  guardarLibroTalCual,
  guardarPalabraTalCual,
  hayArchivo,
  leerAjustes,
  leerArchivo,
  listarLibrosCrudo,
  listarVocabularioCrudo,
  olvidarLibro,
  olvidarPalabra,
} from './almacen'
import {
  bajarPdf,
  borrarPdfNube,
  escribirAjustesNube,
  escribirCajon,
  leerAjustesNube,
  leerCajon,
  subirPdf,
} from './nube'

/**
 * Si la conexión es de datos móviles.
 *
 * Solo se frena cuando **se sabe** que es móvil. El navegador no siempre lo
 * dice, y preguntar «¿seguro?» cada vez que no está seguro sería peor que el
 * problema que resuelve.
 */
export function porDatos(): boolean {
  const c = (navigator as { connection?: { type?: string; saveData?: boolean } }).connection
  if (!c) return false
  if (c.saveData) return true
  return c.type === 'cellular'
}

export interface Resumen {
  traidos: number
  mandados: number
  quitados: number
  archivosPendientes: number
}

/** Un ciclo completo de datos. No toca archivos: eso va aparte. */
export async function sincronizarDatos(uid: string): Promise<Resumen> {
  const [libros, vocabulario] = await Promise.all([listarLibrosCrudo(), listarVocabularioCrudo()])
  const [librosNube, vocNube] = await Promise.all([
    leerCajon<Libro>(uid, 'libros'),
    leerCajon<Palabra>(uid, 'vocabulario'),
  ])

  const fl = fusionar(libros, librosNube)
  const fv = fusionar(vocabulario, vocNube)

  for (const l of fl.paraAqui) {
    // La portada es un Blob y no viaja por Firestore: se respeta la de aquí.
    const mia = libros.find(x => x.id === l.id)
    await guardarLibroTalCual({ ...l, portada: mia?.portada })
  }
  for (const id of fl.quitarAqui) await olvidarLibro(id)
  for (const p of fv.paraAqui) await guardarPalabraTalCual(p)
  // Lo que ya se quitó en todas partes se puede borrar del todo aquí. Sin esta
  // línea las lápidas se acumulaban para siempre.
  for (const id of fv.quitarAqui) await olvidarPalabra(id)

  await escribirCajon(uid, 'libros', fl.paraAlla)
  await escribirCajon(uid, 'vocabulario', fv.paraAlla)

  await sincronizarAjustes(uid)

  const tras = await listarLibrosCrudo()
  const pendientes = tras.filter(l => !l.borrado && !l.archivoEnNube).length

  return {
    traidos: fl.paraAqui.length + fv.paraAqui.length,
    mandados: fl.paraAlla.length + fv.paraAlla.length,
    quitados: fl.quitarAqui.length,
    archivosPendientes: pendientes,
  }
}

async function sincronizarAjustes(uid: string): Promise<void> {
  const aqui = await leerAjustes()
  const alla = (await leerAjustesNube(uid)) as (Ajustes & { actualizadoEn?: number }) | null
  const mios = aqui as Ajustes & { actualizadoEn?: number }
  if (!alla) {
    await escribirAjustesNube(uid, { ...mios, actualizadoEn: mios.actualizadoEn ?? Date.now() })
    return
  }
  if ((alla.actualizadoEn ?? 0) > (mios.actualizadoEn ?? 0)) {
    await guardarAjustes(alla)
  } else if ((mios.actualizadoEn ?? 0) > (alla.actualizadoEn ?? 0)) {
    await escribirAjustesNube(uid, { ...mios })
  }
}

/* -------------------------------- Archivos ------------------------------- */

export interface Aviso {
  (mensaje: string): void
}

/**
 * Sube los PDF que aún no están arriba.
 *
 * Uno a uno y a propósito: un cómic son decenas de megas, y subir cinco a la
 * vez por datos móviles es la clase de cosa que se nota en la factura del
 * teléfono, no en la de Google.
 */
export async function subirArchivosPendientes(
  uid: string,
  permitirDatos: boolean,
  avisar?: Aviso,
): Promise<number> {
  if (porDatos() && !permitirDatos) return 0

  const libros = (await listarLibrosCrudo()).filter(l => !l.borrado && !l.archivoEnNube)
  let subidos = 0
  for (const l of libros) {
    const datos = await leerArchivo(l.archivo)
    if (!datos) continue
    try {
      avisar?.(`Subiendo «${l.titulo}»`)
      await subirPdf(uid, l.id, datos)
      await actualizarLibro({ ...l, archivoEnNube: true })
      subidos++
    } catch {
      // Se reintenta en la siguiente sincronización. No es un error del que
      // haya que avisar: el libro se lee igual desde aquí.
      break
    }
  }
  return subidos
}

/** Limpia de la nube los archivos de los libros que ya borraste. */
export async function limpiarBorrados(uid: string): Promise<void> {
  const lapidas = (await listarLibrosCrudo()).filter(l => l.borrado && l.archivoEnNube)
  for (const l of lapidas) {
    await borrarPdfNube(uid, l.id)
    await guardarLibroTalCual({ ...l, archivoEnNube: false })
  }
}

export type Traida =
  | { estado: 'ya-estaba' }
  | { estado: 'traido' }
  | { estado: 'hace-falta-permiso' }
  | { estado: 'no-esta' }

/**
 * Se asegura de que el PDF esté en este aparato antes de abrirlo.
 *
 * Es el único momento en que la nube puede hacer esperar, y por eso pregunta
 * antes cuando la conexión es de datos (P68).
 */
export async function asegurarArchivo(
  uid: string,
  libro: Libro,
  permitirDatos: boolean,
): Promise<Traida> {
  if (await hayArchivo(libro.archivo)) return { estado: 'ya-estaba' }
  if (!libro.archivoEnNube) return { estado: 'no-esta' }
  if (porDatos() && !permitirDatos) return { estado: 'hace-falta-permiso' }

  const datos = await bajarPdf(uid, libro.id)
  if (!datos) return { estado: 'no-esta' }
  await guardarArchivoDeLibro(libro.archivo, datos)
  return { estado: 'traido' }
}
