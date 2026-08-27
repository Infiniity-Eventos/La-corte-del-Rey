/**
 * La app se actualiza sola, sin reinstalarla nunca.
 *
 * Instalada, Vellum guarda una copia de sí misma para funcionar sin internet.
 * El precio es que una versión nueva no se ve hasta que esa copia se reemplaza.
 *
 * El reparto de papeles es esto, y es lo que se hizo mal la primera vez:
 *
 * - **El service worker toma el mando en cuanto se instala**, sin esperar a que
 *   nadie le dé paso. Cuando esperaba, la página que tenía que darle paso era la
 *   vieja —que no sabe hacerlo— y la actualización se quedaba bloqueada.
 * - **Recargar lo decide el lector.** Cuando el mando cambia de manos, el código
 *   que está corriendo ya es viejo, así que se avisa y se espera. Recargar de
 *   golpe a mitad de un libro te sacaría de la página.
 *
 * El registro se hace a mano en vez de con el ayudante del empaquetador, para
 * que ese reparto quede aquí escrito y no dependa de una opción.
 */

const RUTA = `${import.meta.env.BASE_URL}sw.js`
const MEDIA_HORA = 30 * 60 * 1000

let registro: ServiceWorkerRegistration | null = null

export function vigilarActualizaciones(alHaberUna: () => void): void {
  if (!('serviceWorker' in navigator)) return

  // Si no había nadie al mando, este es el primer arranque: que tome el control
  // no significa que haya versión nueva, significa que acaba de instalarse.
  const habiaMando = !!navigator.serviceWorker.controller
  let yaAvisado = false

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!habiaMando || yaAvisado) return
    yaAvisado = true
    alHaberUna()
  })

  void navigator.serviceWorker
    .register(RUTA, { scope: import.meta.env.BASE_URL })
    .then(reg => {
      registro = reg
      const mirar = () => { void reg.update().catch(() => {}) }
      window.setInterval(mirar, MEDIA_HORA)
      // Volver a la app es el mejor momento para mirar: es cuando toca esperar
      // menos y cuando es más probable que haya pasado el tiempo suficiente.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') mirar()
      })
    })
    .catch(() => {
      // Sin service worker la app funciona igual; solo deja de abrir sin red.
    })
}

/**
 * Busca ahora mismo, sin esperar al reloj. Dice si hay algo nuevo llegando.
 *
 * Es lo que pasa al tocar el número de versión: la pregunta de fondo no es
 * «¿qué versión tengo?» sino «¿estoy viendo lo último?».
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
  window.location.reload()
}
