/**
 * La nube: sesión con Google, datos en Firestore y archivos en Storage.
 *
 * Tres reglas mandan aquí, y las tres vienen de la Guía:
 *
 * 1. **Nada de esto se carga al arrancar.** El SDK de Firebase pesa más que
 *    toda la app junta. Se trae la primera vez que hace falta, igual que
 *    pdf.js. Si no inicias sesión, nunca se descarga.
 * 2. **La nube nunca hace esperar.** Todo se escribe primero aquí y se
 *    sincroniza después. Si falla, la app sigue funcionando igual (D-08).
 * 3. **Los PDF pesan.** Subirlos y bajarlos respeta el wifi (P68).
 */
import type { FirebaseApp } from 'firebase/app'
import type { Auth, User } from 'firebase/auth'
import type { Firestore } from 'firebase/firestore'
import type { FirebaseStorage } from 'firebase/storage'
import { CONFIG_FIREBASE } from './nube-config'

/**
 * Cada parte de Firebase llega cuando se usa, no antes.
 *
 * Entrar solo necesita la sesión; los datos y los archivos vienen después. Con
 * todo junto, pulsar «entrar» en un teléfono se traía casi un mega de golpe.
 */
let elApp: Promise<FirebaseApp> | null = null
let elAuth: Promise<Auth> | null = null
let laBd: Promise<Firestore> | null = null
let losArchivos: Promise<FirebaseStorage> | null = null

function app(): Promise<FirebaseApp> {
  elApp ??= (async () => {
    const { initializeApp, getApps } = await import('firebase/app')
    return getApps()[0] ?? initializeApp(CONFIG_FIREBASE)
  })()
  return elApp
}

function auth(): Promise<Auth> {
  elAuth ??= (async () => {
    const [a, { getAuth }] = await Promise.all([app(), import('firebase/auth')])
    return getAuth(a)
  })()
  return elAuth
}

function bd(): Promise<Firestore> {
  laBd ??= (async () => {
    const [a, { getFirestore }] = await Promise.all([app(), import('firebase/firestore')])
    return getFirestore(a)
  })()
  return laBd
}

function archivos(): Promise<FirebaseStorage> {
  losArchivos ??= (async () => {
    const [a, { getStorage }] = await Promise.all([app(), import('firebase/storage')])
    return getStorage(a)
  })()
  return losArchivos
}

/* --------------------------------- Sesión -------------------------------- */

export interface Quien {
  uid: string
  nombre: string
  correo: string
  foto: string | null
}

function retrato(u: User): Quien {
  return {
    uid: u.uid,
    nombre: u.displayName ?? u.email ?? 'Tú',
    correo: u.email ?? '',
    foto: u.photoURL,
  }
}

export type FalloSesion = 'cancelada' | 'dominio' | 'sin-red' | 'raro'

export class ErrorSesion extends Error {
  constructor(readonly fallo: FalloSesion, readonly detalle = '') {
    super(fallo)
  }
}

export async function entrar(): Promise<Quien> {
  const [a, { GoogleAuthProvider, signInWithPopup }] = await Promise.all([auth(), import('firebase/auth')])
  try {
    const r = await signInWithPopup(a, new GoogleAuthProvider())
    return retrato(r.user)
  } catch (e) {
    const codigo = (e as { code?: string }).code ?? ''
    if (/popup-closed|cancelled-popup|popup-blocked/.test(codigo)) throw new ErrorSesion('cancelada')
    if (/unauthorized-domain/.test(codigo)) throw new ErrorSesion('dominio')
    if (/network/.test(codigo)) throw new ErrorSesion('sin-red')
    throw new ErrorSesion('raro', codigo)
  }
}

export async function salir(): Promise<void> {
  const [a, { signOut }] = await Promise.all([auth(), import('firebase/auth')])
  await signOut(a)
}

/**
 * Avisa de quién está dentro, ahora y cada vez que cambie.
 *
 * Se llama solo si ya hubo sesión alguna vez: si no, encender Firebase para
 * descubrir que no hay nadie sería descargarse el SDK para nada.
 */
export async function vigilarSesion(alCambiar: (q: Quien | null) => void): Promise<() => void> {
  const [a, { onAuthStateChanged }] = await Promise.all([auth(), import('firebase/auth')])
  return onAuthStateChanged(a, u => alCambiar(u ? retrato(u) : null))
}

export function explicarSesion(f: FalloSesion): { titulo: string; detalle: string } {
  switch (f) {
    case 'cancelada':
      return { titulo: 'Se cerró la ventana', detalle: 'No pasa nada: la app funciona igual sin cuenta.' }
    case 'dominio':
      return {
        titulo: 'Este sitio no está autorizado',
        detalle:
          'En la consola de Firebase: Authentication → Settings → Authorized domains, ' +
          'y añade el dominio desde el que abres Vellum.',
      }
    case 'sin-red':
      return { titulo: 'Sin conexión', detalle: 'Leer sigue funcionando; entrar necesita internet.' }
    default:
      return { titulo: 'No se pudo entrar', detalle: 'Inténtalo otra vez en un momento.' }
  }
}

/* --------------------------------- Datos --------------------------------- */

/** Lo que se guarda de cada persona, y dónde. */
const CAJONES = { libros: 'libros', vocabulario: 'vocabulario' } as const
export type Cajon = keyof typeof CAJONES

export async function leerCajon<T>(uid: string, cajon: Cajon): Promise<T[]> {
  const [d, { collection, getDocs }] = await Promise.all([bd(), import('firebase/firestore')])
  const r = await getDocs(collection(d, 'gente', uid, CAJONES[cajon]))
  return r.docs.map(d => ({ ...(d.data() as T), id: d.id }))
}

export async function escribirCajon<T extends { id: string }>(
  uid: string,
  cajon: Cajon,
  cosas: T[],
): Promise<void> {
  if (cosas.length === 0) return
  const [d, { doc, writeBatch }] = await Promise.all([bd(), import('firebase/firestore')])
  // Firestore admite 500 por tanda. Con menos de cincuenta libros nunca se
  // llega, pero el vocabulario sí puede crecer.
  for (let i = 0; i < cosas.length; i += 400) {
    const tanda = writeBatch(d)
    for (const c of cosas.slice(i, i + 400)) {
      // Firestore no admite `undefined`, y un Blob no cabe en un documento.
      const limpio: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(c) as [string, unknown][]) {
        // Firestore no admite `undefined`, y un Blob —la portada— no cabe en
        // un documento: eso va a Storage o se queda en el aparato.
        if (v === undefined || v instanceof Blob) continue
        limpio[k] = v
      }
      tanda.set(doc(d, 'gente', uid, CAJONES[cajon], c.id), limpio)
    }
    await tanda.commit()
  }
}

export async function leerAjustesNube(uid: string): Promise<Record<string, unknown> | null> {
  const [b, { doc, getDoc }] = await Promise.all([bd(), import('firebase/firestore')])
  const d = await getDoc(doc(b, 'gente', uid, 'preferencias', 'ajustes'))
  return d.exists() ? (d.data() as Record<string, unknown>) : null
}

export async function escribirAjustesNube(uid: string, ajustes: object): Promise<void> {
  const [b, { doc, setDoc }] = await Promise.all([bd(), import('firebase/firestore')])
  await setDoc(doc(b, 'gente', uid, 'preferencias', 'ajustes'), { ...ajustes })
}

/* -------------------------------- Archivos ------------------------------- */

function rutaPdf(uid: string, libroId: string): string {
  return `gente/${uid}/libros/${libroId}.pdf`
}

export async function subirPdf(uid: string, libroId: string, datos: Blob): Promise<void> {
  const [st, { ref, uploadBytes }] = await Promise.all([archivos(), import('firebase/storage')])
  await uploadBytes(ref(st, rutaPdf(uid, libroId)), datos, {
    contentType: 'application/pdf',
  })
}

export async function bajarPdf(uid: string, libroId: string): Promise<Blob | null> {
  const [st, { ref, getBlob }] = await Promise.all([archivos(), import('firebase/storage')])
  try {
    return await getBlob(ref(st, rutaPdf(uid, libroId)))
  } catch {
    return null
  }
}

export async function borrarPdfNube(uid: string, libroId: string): Promise<void> {
  const [st, { ref, deleteObject }] = await Promise.all([archivos(), import('firebase/storage')])
  try {
    await deleteObject(ref(st, rutaPdf(uid, libroId)))
  } catch {
    // Si no está, ya está borrado.
  }
}
