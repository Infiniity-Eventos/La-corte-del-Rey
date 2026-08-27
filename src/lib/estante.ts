import type { Libro } from './tipos'

/**
 * El catálogo de la casa: todo lo que sube cualquiera, para todos.
 *
 * Todo PDF que entra va al catálogo común y se busca entero. Lo que decide qué
 * hay en **tu** estantería es la estrella, y esa es tuya y solo tuya: marcar un
 * libro no se lo marca a nadie más, ni desmarcarlo se lo quita.
 *
 * Quitar un libro del catálogo solo puede hacerlo quien lo subió, y entonces
 * desaparece para todos: por eso lo que llega de otra persona se guarda aquí
 * con su nombre y se va solo cuando esa persona lo retira.
 *
 * Esta parte no sabe nada de Firebase a propósito: es la que puede equivocarse
 * en silencio —borrar el libro de otro, resucitar uno retirado, subir el mismo
 * PDF cien veces— y así se prueba sin red y sin cuenta.
 */

export interface Reparto {
  /** Míos que hay que poner o actualizar en el catálogo. */
  aSubir: Libro[]
  /** Ids míos que he borrado y hay que sacar del catálogo. */
  aQuitar: string[]
  /** De otros, que hay que guardar aquí para que salgan al buscar. */
  aTraer: Libro[]
  /** De otros que ya no están en el catálogo: se van de aquí. */
  aOlvidar: string[]
}

const marca = (l: { actualizadoEn?: number }) => l.actualizadoEn ?? 0

/**
 * @param aqui   todos los libros de este aparato, incluidas las lápidas
 * @param estante lo que hay ahora mismo en el estante de la casa
 * @param miUid  quién soy: lo que lleva mi uid es mío y lo demás es de otros
 */
export function repartir(aqui: Libro[], estante: Libro[], miUid: string): Reparto {
  const enEstante = new Map(estante.map(l => [l.id, l]))

  // Lo mío: lo que no vino del estante de nadie.
  const mios = aqui.filter(l => !l.de)
  // Lo de otros que ya tengo guardado aquí.
  const ajenos = aqui.filter(l => l.de && l.de !== miUid)

  const aSubir: Libro[] = []
  const aQuitar: string[] = []

  for (const l of mios) {
    const puesto = enEstante.get(l.id)
    // Todo lo que traes va al catálogo. No hay que marcarlo: subirlo es
    // ponerlo a disposición de la casa, y eso es lo que se pidió.
    const quiero = !l.borrado

    if (quiero) {
      // Se sube solo si cambió algo: sin esto, cada sincronización reescribiría
      // el estante entero y volvería a subir los PDF.
      if (!puesto || marca(l) > marca(puesto)) {
        aSubir.push({ ...l, de: miUid })
      }
    } else if (puesto && puesto.de === miUid) {
      aQuitar.push(l.id)
    }
  }

  // Un libro mío que ya no existe aquí pero sigue puesto: también se retira.
  const mios_ = new Set(mios.map(l => l.id))
  for (const l of estante) {
    if (l.de === miUid && !mios_.has(l.id) && !aQuitar.includes(l.id)) aQuitar.push(l.id)
  }

  const aTraer: Libro[] = []
  const tengo = new Map(ajenos.map(l => [l.id, l]))
  for (const l of estante) {
    if (l.de === miUid || !l.de) continue
    const mio = tengo.get(l.id)
    if (!mio || marca(l) > marca(mio)) aTraer.push(l)
  }

  const enEstanteIds = new Set(estante.map(l => l.id))
  const aOlvidar = ajenos.filter(l => !enEstanteIds.has(l.id)).map(l => l.id)

  return { aSubir, aQuitar, aTraer, aOlvidar }
}

/** Si un libro es de otra persona, aquí no se puede ni editar ni borrar. */
export function esAjeno(l: Libro, miUid: string | null): boolean {
  return !!l.de && l.de !== miUid
}
