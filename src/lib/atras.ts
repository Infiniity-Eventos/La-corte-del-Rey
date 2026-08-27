import { useEffect, useRef } from 'react'

/**
 * El botón de atrás cierra lo que tengas abierto, no la app.
 *
 * En una PWA instalada, atrás es el gesto más usado del teléfono y por defecto
 * hace lo peor posible: te saca. Aquí cada cosa que se abre —el traductor, el
 * acercamiento, la ficha, el libro— apila una entrada en el historial, y atrás
 * la va deshaciendo de dentro hacia fuera. Solo cuando no queda nada abierto
 * atrás hace lo de siempre y sale.
 *
 * El detalle que lo hace funcionar es el otro camino: **cerrar algo con su
 * propio botón también tiene que quitar su entrada del historial**. Si no, atrás
 * se queda deshaciendo cosas que ya no están y hay que pulsarlo tres veces para
 * que pase algo.
 */

interface Capa {
  cerrar: () => void
}

const pila: Capa[] = []
/** Vueltas atrás provocadas por la propia app: su popstate no cierra nada. */
let porIgnorar = 0
let escuchando = false

function arrancar() {
  if (escuchando || typeof window === 'undefined') return
  escuchando = true
  window.addEventListener('popstate', () => {
    if (porIgnorar > 0) {
      porIgnorar--
      return
    }
    // Se cierra la última que se abrió, que es la que tienes delante.
    pila.pop()?.cerrar()
  })
}

export function empujar(cerrar: () => void): Capa {
  arrancar()
  const capa: Capa = { cerrar }
  pila.push(capa)
  // Sin cambiar de dirección: solo hace falta una entrada donde volver.
  history.pushState({ vellum: pila.length }, '')
  return capa
}

export function quitar(capa: Capa): void {
  const i = pila.indexOf(capa)
  // Si ya no está, es que la cerró el propio botón de atrás y su entrada del
  // historial se consumió sola.
  if (i === -1) return
  pila.splice(i, 1)
  porIgnorar++
  history.back()
}

/**
 * Mientras `activo` sea cierto, el botón de atrás llama a `cerrar` en vez de
 * salir de la app.
 */
export function useAtras(activo: boolean, cerrar: () => void): void {
  // La función se guarda en una referencia para que cambiarla no vuelva a
  // apilar: lo que apila es abrir la capa, no redibujarla.
  const ultimo = useRef(cerrar)
  ultimo.current = cerrar

  useEffect(() => {
    if (!activo) return
    const capa = empujar(() => ultimo.current())
    return () => quitar(capa)
  }, [activo])
}

/** Solo para las pruebas: cuántas capas hay abiertas ahora mismo. */
export function capasAbiertas(): number {
  return pila.length
}
