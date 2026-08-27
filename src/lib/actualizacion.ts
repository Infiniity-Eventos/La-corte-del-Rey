import { registerSW } from 'virtual:pwa-register'

/**
 * La app se actualiza sola, sin reinstalarla nunca.
 *
 * Instalada como PWA, Vellum guarda una copia de sí misma para funcionar sin
 * internet. El precio es que una versión nueva no entra hasta que la copia se
 * reemplaza. Aquí se busca por su cuenta —al abrir, al volver a ella y cada
 * media hora— y cuando hay una lista se avisa, en vez de recargar de golpe:
 * recargar mientras lees te sacaría de la página.
 */

const MEDIA_HORA = 30 * 60 * 1000

let aplicar: ((recargar?: boolean) => Promise<void>) | null = null
let registro: ServiceWorkerRegistration | null = null

export function vigilarActualizaciones(alHaberUna: () => void): void {
  aplicar = registerSW({
    immediate: true,
    onNeedRefresh: alHaberUna,
    onRegisteredSW(_url, reg) {
      if (!reg) return
      registro = reg
      const mirar = () => { void reg.update().catch(() => {}) }
      window.setInterval(mirar, MEDIA_HORA)
      // Volver a la app es el mejor momento para mirar: es cuando toca esperar
      // menos y cuando es más probable que haya pasado el tiempo suficiente.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') mirar()
      })
    },
  })
}

/**
 * Busca ahora mismo, sin esperar al reloj. Devuelve si hay algo nuevo llegando.
 *
 * Es lo que pasa al tocar el número de versión: la pregunta de fondo no es
 * «¿qué versión tengo?» sino «¿estoy viendo lo último?», y esto la responde.
 */
export async function buscarAhora(): Promise<boolean> {
  if (!registro) return false
  try {
    await registro.update()
  } catch {
    return false
  }
  return !!(registro.installing || registro.waiting)
}

/** Entra en la versión nueva. Recarga, así que se ofrece, no se impone. */
export function entrarEnLaNueva(): void {
  void aplicar?.(true)
}
