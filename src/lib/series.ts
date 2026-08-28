import type { Libro } from './tipos'

/**
 * Las series: varios números que se leen como una sola cosa.
 *
 * Un cómic no llega en un archivo, llega en doce. Con un libro por número, la
 * estantería se convierte en doce tapas iguales en fila y terminar uno obliga a
 * salir, buscar el siguiente y abrirlo — justo en el momento en que menos
 * ganas hay de parar.
 *
 * Aquí no hay una entidad nueva. Una serie es **lo que comparten unos libros**:
 * el campo `serie`. No hay un documento de serie que pueda quedarse huérfano,
 * ni un identificador que sincronizar aparte; borrar el último número borra la
 * serie sin dejar nada detrás, y la nube no se entera porque los libros ya
 * viajan enteros.
 *
 * Todo lo de este archivo es puro a propósito: se prueba sin navegador, sin
 * base de datos y sin red, que es donde de verdad se ven los fallos de orden.
 */

export interface Serie {
  /** Con lo que se agrupa: sin tildes, sin mayúsculas y sin espacios de más. */
  clave: string
  /** Cómo se escribió, que es lo que se enseña. */
  nombre: string
  /** Los números, ya en orden. */
  numeros: Libro[]
}

/**
 * Dos personas escriben «Batman Absolute» y «BATMAN ABSOLUTE» y quieren decir
 * lo mismo. Se agrupa por esto y se enseña lo que escribieron.
 */
export function clavear(nombre: string): string {
  return nombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * El orden dentro de una serie.
 *
 * Manda `orden` cuando está puesto, que es lo que tú decides con las flechas.
 * Cuando no —y no lo está hasta que mueves algo por primera vez— vale el
 * título comparado como los humanos: `numeric` hace que el 2 vaya antes que
 * el 10, que es exactamente donde falla ordenar por texto.
 */
export function ordenar(numeros: Libro[]): Libro[] {
  return [...numeros].sort((a, b) => {
    const oa = a.orden ?? Number.MAX_SAFE_INTEGER
    const ob = b.orden ?? Number.MAX_SAFE_INTEGER
    if (oa !== ob) return oa - ob
    return a.titulo.localeCompare(b.titulo, 'es', { numeric: true, sensitivity: 'base' })
  })
}

/**
 * Reparte una lista de libros en series y sueltos.
 *
 * Las series salen en el orden en que aparece su primer número, para que la
 * estantería no se recoloque sola al añadir uno.
 *
 * Una serie de un solo número sigue siendo una serie. Es a propósito: si
 * apareciera solo al llegar el segundo, el primero cambiaría de sitio él solo
 * y parecería que se ha perdido.
 */
export function agrupar(libros: Libro[]): { series: Serie[]; sueltos: Libro[] } {
  const series: Serie[] = []
  const porClave = new Map<string, Serie>()
  const sueltos: Libro[] = []

  for (const l of libros) {
    const nombre = (l.serie ?? '').trim()
    if (!nombre) {
      sueltos.push(l)
      continue
    }
    const clave = clavear(nombre)
    let s = porClave.get(clave)
    if (!s) {
      s = { clave, nombre, numeros: [] }
      porClave.set(clave, s)
      series.push(s)
    }
    s.numeros.push(l)
  }

  for (const s of series) {
    s.numeros = ordenar(s.numeros)
    // El nombre que se enseña es el que escribió el **primer número**, no el
    // del primero que se encontró: la estantería está ordenada por lo último
    // que abriste, así que sin esto la serie cambiaba de mayúsculas sola según
    // qué tomo tocaras último.
    s.nombre = (s.numeros[0]?.serie ?? s.nombre).trim()
  }
  return { series, sueltos }
}

/**
 * Los nombres de serie que ya existen, para sugerirlos al escribir.
 *
 * Sale de `agrupar` y no de recorrer los libros por su cuenta: así la lista
 * ofrece exactamente el nombre que se ve en la estantería. Si ofreciera otra
 * forma de escribirlo, elegirla parecería crear una serie distinta.
 */
export function nombresDeSerie(libros: Libro[]): string[] {
  return agrupar(libros)
    .series.map(s => s.nombre)
    .sort((a, b) => a.localeCompare(b, 'es'))
}

/** El de al lado, en el orden de la serie. `null` si no hay. */
export function vecino(
  numeros: Libro[],
  libro: Libro,
  hacia: 'siguiente' | 'anterior',
): Libro | null {
  const lista = ordenar(numeros)
  const i = lista.findIndex(l => l.id === libro.id)
  if (i < 0) return null
  return lista[hacia === 'siguiente' ? i + 1 : i - 1] ?? null
}

/**
 * Dónde retomar la serie.
 *
 * No es «el último que abrí» a secas: si ese está terminado, seguir leyendo es
 * empezar el siguiente, no volver a la última página del anterior. Y si no has
 * empezado ninguno, es el primero — que es lo que hace que el botón sirva
 * también la primera vez.
 */
export function dondeIba(serie: Serie): { libro: Libro; pagina: number } | null {
  const lista = serie.numeros
  if (lista.length === 0) return null

  const empezados = lista.filter(l => l.pagina > 1)
  if (empezados.length === 0) return { libro: lista[0], pagina: 1 }

  const ultimo = empezados.reduce((a, b) => (b.abiertoEn > a.abiertoEn ? b : a))
  if (ultimo.pagina >= ultimo.paginas) {
    const sig = vecino(lista, ultimo, 'siguiente')
    if (sig) return { libro: sig, pagina: sig.pagina }
  }
  return { libro: ultimo, pagina: ultimo.pagina }
}

/**
 * Sube o baja un número dentro de la serie.
 *
 * Devuelve **todos** los números con su `orden` puesto, no solo los dos que se
 * cruzan. Escribirlo entero cuesta lo mismo con doce libros y evita el estado a
 * medias en el que unos tienen orden y otros no: ahí, mover el tercero podía
 * mandarlo al final sin que nada lo explicara.
 */
export function mover(numeros: Libro[], id: string, hacia: 'arriba' | 'abajo'): Libro[] {
  const lista = ordenar(numeros)
  const i = lista.findIndex(l => l.id === id)
  const j = hacia === 'arriba' ? i - 1 : i + 1
  if (i < 0 || j < 0 || j >= lista.length) return lista.map((l, k) => ({ ...l, orden: k }))
  const cruce = [...lista]
  ;[cruce[i], cruce[j]] = [cruce[j], cruce[i]]
  return cruce.map((l, k) => ({ ...l, orden: k }))
}

/**
 * Meter un libro en una serie, al final.
 *
 * Al final y no donde caiga por título: si lo estás añadiendo a mano es porque
 * su nombre no dice el número, y adivinarlo lo colocaría mal justo cuando más
 * confianza necesitas en el orden.
 */
export function anadirA(serie: Serie, libro: Libro): Libro {
  const ultimo = serie.numeros.reduce((m, l) => Math.max(m, l.orden ?? -1), -1)
  return { ...libro, serie: serie.nombre, orden: ultimo + 1 }
}
