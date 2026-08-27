import type { Libro } from './tipos'

/**
 * El prompt de las portadas (D-13, D-15, D-16).
 *
 * Generar imágenes por API cuesta dinero de verdad, así que Vellum no las
 * genera: compone el encargo, lo deja en el portapapeles y abre el generador.
 * Tú eliges cuál te gusta y vuelves con ella.
 *
 * **Lo que importa no es el botón, es que el encargo sea siempre el mismo salvo
 * el sujeto.** Es la única forma de que cincuenta portadas hechas en cincuenta
 * momentos distintos parezcan una colección y no un cajón. Por eso el estilo
 * está escrito palabra por palabra aquí y no se toca por libro: lo único que
 * cambia entre dos portadas son las tres primeras líneas.
 *
 * La plantilla y el porqué de cada línea están en `guia/prompts/portadas.md`.
 */

/** A dónde se manda. Es la web de Gemini; en Android abre la app si la tienes. */
export const GENERADOR = 'https://gemini.google.com/app'

/**
 * El estilo. Idéntico para toda la colección, sin una sola variable dentro.
 *
 * Si algún día hay que cambiarlo, se cambia aquí y las portadas nuevas dejan de
 * parecerse a las viejas. Es un precio real y conviene saberlo antes de tocarlo.
 */
const ESTILO = `Si conoces esta obra, recoge sus motivos propios —su iconografía, sus
símbolos, los objetos que la identifican— y tradúcelos a nuestro formato.
El formato manda siempre; de la obra tomas el contenido, nunca el estilo.

Estilo obligatorio, idéntico para toda la colección:
ilustración plana y editorial impresa a dos tintas sobre pergamino cálido.
Paleta estricta: fondo #EDE6D6, pergamino #F6F1E5, tinta parda #6B4423,
un único acento de ocre #8A5A2B. Ningún otro color.
Textura de papel muy sutil, como un grabado antiguo.
Sin degradados brillantes, sin efectos 3D, sin sombras dramáticas,
sin marcos, sin bordes.

Composición: vertical 2:3, centrada, con amplio margen alrededor.
Una sola imagen simbólica y sencilla que evoque los temas del libro.
Nada de escenas recargadas. Nada de personajes con rostro.
Si hay figura humana, que sea silueta o esté de espaldas.`

/**
 * El cierre: el generador no escribe. Lo escribe Vellum encima (D-15).
 *
 * No hay variante con el título dentro, y no por descuido: el título es
 * editable, así que uno escrito dentro del dibujo se queda antiguo en cuanto lo
 * cambias, y habría que regenerar la ilustración entera (D-19).
 */
const CIERRE = `Deja el tercio inferior despejado y sin detalle: ahí va el título.

No escribas ningún texto en la imagen. Ni el título, ni el autor, ni nada.`

/** Compone el encargo para un libro. */
export function promptPortada(libro: Libro): string {
  const que = libro.tipo === 'comic' ? 'cómic' : 'libro'
  const titulo = libro.titulo.trim()

  const cabeza = [
    `Ilustración de portada para ${que} de una biblioteca personal.`,
    '',
    `Obra: «${titulo}»`,
  ]
  // Las líneas que no tienen nada que decir no se ponen vacías: un «Temas:»
  // sin temas detrás es ruido, y el generador lo lee igual que el resto.
  if (libro.etiquetas.length > 0) cabeza.push(`Temas: ${libro.etiquetas.join(', ')}`)
  if (libro.nombreOriginal) cabeza.push(`Nombre del archivo original: ${libro.nombreOriginal}`)

  return `${cabeza.join('\n')}\n\n${ESTILO}\n\n${CIERRE}\n`
}

/**
 * Copiar, con el rodeo de siempre para cuando el navegador no deja.
 *
 * Devuelve si lo consiguió, porque de eso depende lo que hay que decirle a
 * quien está mirando: no sirve de nada abrir el generador si el encargo no
 * llegó al portapapeles y nadie se entera.
 */
export async function copiar(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto)
    return true
  } catch {
    try {
      const a = document.createElement('textarea')
      a.value = texto
      a.style.position = 'fixed'
      a.style.opacity = '0'
      document.body.appendChild(a)
      a.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(a)
      return ok
    } catch {
      return false
    }
  }
}
