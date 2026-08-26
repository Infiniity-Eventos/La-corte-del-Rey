# Guía

Documento vivo del proyecto. Todo lo que se decide queda aquí, y de aquí salen
los parámetros para construir la app. Si algo no está en esta Guía, no está
decidido.

- **Estado:** definiendo la idea (ronda 1 de cuestionarios)
- **Última actualización:** 2026-08-26
- **Repositorio:** reutilizado. Contenía la app vieja "La corte del Rey"; su
  destino se decide en P21.

---

## 1. Qué es

Una app personal para leer libros, PDF y cómics de forma cómoda, con un
traductor integrado que sea realmente bueno.

## 2. Lo que ya está dicho (del planteamiento inicial)

Esto viene directo del autor y se trata como requisito, no como sugerencia.
Se refina con los cuestionarios, no se descarta.

| # | Requisito | Estado |
|---|---|---|
| R1 | Leer libros y PDF de forma cómoda | fijo |
| R2 | Muy estética y bonita | fijo, falta definir estética concreta (P18) |
| R3 | Sensación ligera, orgánica y rápida | fijo |
| R4 | Nada de pantallas de carga, salvo la primera | fijo — es un requisito de arquitectura, no de estilo |
| R5 | Almacenar y organizar libros y cómics | fijo, falta definir organización |
| R6 | Carpeta local, sin pelear con nubes | fijo, pendiente confirmar sincronización (P7) |
| R7 | Principalmente celular; posiblemente también PC | pendiente (P1) |
| R8 | Interfaz limpia, solo funciones útiles | fijo |
| R9 | Traductor eficiente. Vale que sea una burbuja donde se pega el texto | fijo, prioridad alta |
| R10 | Es un producto profesional, no una demo | fijo |

### Cómo se leen R3 y R4

"Ligera" y "sin pantallas de carga" no son adjetivos: son restricciones
técnicas que descartan opciones desde el primer día. Implican, como mínimo:

- El índice de la biblioteca vive en local y se lee al instante; nunca se
  espera a la red para pintar la pantalla.
- Las portadas se generan una vez y se guardan en caché; no se rehacen.
- Abrir un libro muestra la página inmediatamente y carga el resto detrás.
- Cualquier cosa que tarde (traducir, importar, OCR) ocurre sin bloquear la
  lectura y sin un spinner a pantalla completa.

## 3. Decisiones tomadas

Vacío. Se llena con las respuestas del cuestionario 1.

<!-- Formato de cada decisión:
### D-01 · Título
- **Decisión:** …
- **Por qué:** …
- **Consecuencia:** qué obliga o qué descarta
- **Origen:** P__ del cuestionario __
-->

## 4. Preguntas abiertas

Todas las del cuestionario 1 (`guia/cuestionarios/01-decisiones-grandes.html`).

Dudas planteadas antes de la ronda 1, pendientes de respuesta:

1. **Un traductor bueno necesita internet y una clave de API.** Lo que corre
   offline dentro de un celular traduce claramente peor. Hay que elegir, y la
   elección condiciona el resto (P3, P10, P11).
2. **"Carpeta local" en Android no es una carpeta normal.** El sistema obliga a
   conceder permiso sobre una carpeta concreta. Es viable y evita nubes, pero
   condiciona cuánto tiene que ser app nativa (P1, P5).
3. **Los cómics escaneados no tienen texto, son imágenes.** Traducirlos exige
   OCR, que es un problema distinto y mucho más frágil que traducir un EPUB
   (P8).

## 5. Cuestionarios

| Ronda | Tema | Archivo | Estado |
|---|---|---|---|
| 01 | Decisiones grandes: plataforma, biblioteca, traductor, lectura, alcance | `guia/cuestionarios/01-decisiones-grandes.html` | enviado |

## 6. Bitácora

- **2026-08-26** — Se reutiliza el repositorio de "La corte del Rey" para el
  nuevo proyecto. Se crea la Guía y se envía el cuestionario 1.
