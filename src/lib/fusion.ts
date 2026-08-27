/**
 * Cómo se decide qué gana al sincronizar.
 *
 * Está aparte de Firebase a propósito: es la parte que puede equivocarse de
 * forma silenciosa —perder una nota, resucitar un libro borrado— y la única
 * que se puede probar sin red, sin cuenta y sin navegador.
 *
 * La regla es «gana lo más reciente», documento a documento. No intenta ser
 * lista: con una sola persona en varios aparatos, lo último que tocaste es
 * lo que querías.
 */

export interface ConMarca {
  id: string
  actualizadoEn?: number
  borrado?: boolean
}

export interface Fusion<T> {
  /** Lo que hay que escribir en este aparato. */
  paraAqui: T[]
  /** Lo que hay que mandar a la nube. */
  paraAlla: T[]
  /** Lo que hay que quitar de este aparato. */
  quitarAqui: string[]
}

function marca(x: ConMarca): number {
  return x.actualizadoEn ?? 0
}

export function fusionar<T extends ConMarca>(aqui: T[], alla: T[]): Fusion<T> {
  const porId = new Map<string, { a?: T; b?: T }>()
  for (const x of aqui) porId.set(x.id, { ...(porId.get(x.id) ?? {}), a: x })
  for (const x of alla) porId.set(x.id, { ...(porId.get(x.id) ?? {}), b: x })

  const paraAqui: T[] = []
  const paraAlla: T[] = []
  const quitarAqui: string[] = []

  for (const { a, b } of porId.values()) {
    // Solo está en un lado: se copia al otro, salvo que sea un borrado que
    // este aparato ya aplicó.
    if (a && !b) {
      paraAlla.push(a)
      continue
    }
    if (b && !a) {
      if (!b.borrado) paraAqui.push(b)
      continue
    }
    if (!a || !b) continue

    if (marca(a) === marca(b)) continue
    const gana = marca(a) > marca(b) ? a : b
    if (gana === a) paraAlla.push(a)
    else if (b.borrado) quitarAqui.push(b.id)
    else paraAqui.push(b)
  }

  return { paraAqui, paraAlla, quitarAqui }
}

/**
 * Al borrar no se olvida sin más: se deja una lápida con la fecha.
 *
 * Sin ella, el otro aparato ve un libro que él sí tiene y que aquí «falta», lo
 * da por nuevo y lo vuelve a mandar. Borrar sería imposible.
 */
export function lapida(id: string): ConMarca {
  return { id, actualizadoEn: Date.now(), borrado: true }
}
