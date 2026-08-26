# Guía

Documento vivo del proyecto. Todo lo que se decide queda aquí, y de aquí salen
los parámetros para construir la app. Si algo no está en esta Guía, no está
decidido.

- **Estado:** ronda 2 de cuestionarios (arquitectura mayormente cerrada)
- **Última actualización:** 2026-08-26
- **Nombre:** pendiente (P42)

---

## 1. Qué es

Una app personal para leer PDF de forma cómoda en el celular y en el PC, con un
traductor inglés → español integrado, sin costo de operación y sin nubes.

## 2. Requisitos fijos

Vienen del planteamiento inicial y del cuestionario 1. Se refinan, no se
descartan.

| # | Requisito | Origen |
|---|---|---|
| R1 | Leer PDF de forma cómoda | inicial · P4 |
| R2 | Muy estética. "Simple pero profesional, cada detalle bien cuidado" | inicial · P18 |
| R3 | Sensación ligera, orgánica y rápida | inicial |
| R4 | Nada de pantallas de carga, salvo la primera | inicial |
| R5 | Almacenar y organizar libros | inicial · P5 |
| R6 | Sin pelear con nubes | inicial |
| R7 | Android (principal) + PC con Linux Fedora 44, mismo código | P1 |
| R8 | Interfaz limpia, solo funciones útiles | inicial |
| R9 | Traductor inglés → español en una burbuja donde se pega texto | inicial · P8 · P9 |
| R10 | Producto profesional, no demo | inicial |
| R11 | **Costo de operación: cero, sin excepción** | P11 |
| R12 | Lectura página a página, con animación al pasar | P13 |
| R13 | El cambio de página se hace deslizando (dedo o mouse) o saltando a un número | P13 |
| R14 | Temas oscuro, sepia y papel | P14 |
| R15 | Modo sin distracciones | P14 |
| R16 | Recuerda automáticamente dónde quedé | P15 |
| R17 | Lista de vocabulario con lo traducido | P12 |
| R18 | La usarán 3 o 4 personas | P17 |

**No entra:** lectura en voz alta (P16), OCR de cómics (P8), traducción de
página completa (P8), subrayados ni notas manuales (P15), sincronización
automática de archivos (P7), EPUB / CBZ / MOBI en la versión 1 (P4).

### Cómo se leen R3 y R4

"Ligera" y "sin pantallas de carga" no son adjetivos: son restricciones
técnicas que descartan opciones desde el primer día. Implican, como mínimo:

- El índice de la biblioteca vive en local y se pinta al instante; nunca se
  espera a la red para mostrar la pantalla.
- Las portadas se generan una vez y se guardan en caché; no se rehacen.
- Abrir un libro muestra la página inmediatamente y carga el resto detrás.
- Las páginas vecinas se preparan por adelantado, para que pasar página no
  tenga espera y la animación no salte.
- Cualquier cosa que tarde (traducir, importar) ocurre sin bloquear la lectura
  y sin un spinner a pantalla completa.

## 3. Decisiones tomadas

### D-01 · Plataforma: PWA instalable
- **Decisión:** una aplicación web instalable (PWA), no app nativa, no APK, no
  tienda. Se abre en Chrome de Android y en Chrome de Fedora, se instala como
  app con su propio icono, y se actualiza sola.
- **Por qué:** es lo único que cumple P1 (Android + PC con el mismo código),
  P2 (lo más simple de mantener) y P11 (cero costo) a la vez. Nativo obliga a
  dos códigos; un APK obliga a reinstalar a mano en cada cambio; la tienda
  obliga a cuenta de desarrollador y revisiones.
- **Consecuencia:** los archivos viven en el almacén del navegador, no en una
  carpeta del sistema (ver D-03 y el riesgo asociado). El acceso a carpetas
  reales solo funciona bien en PC, no en Android.
- **Origen:** P1, P2, P11. Pendiente de confirmación en P22.

### D-02 · Formatos: solo PDF en la versión 1
- **Decisión:** solo PDF, con pdf.js. La arquitectura separa "el formato" del
  resto para poder añadir EPUB o CBZ después sin rehacer nada.
- **Origen:** P4.

### D-03 · Los archivos viven en el almacén propio de la app
- **Decisión:** al importar, el PDF se copia al almacén privado del navegador
  (OPFS para los archivos, IndexedDB para el índice y el progreso). Se pide
  `navigator.storage.persist()` para que el sistema no los desaloje.
- **Por qué:** P5. Además es lo único que funciona igual en Android y en PC.
- **Riesgo aceptado:** si se borran los datos del navegador o se cambia de
  teléfono, la biblioteca desaparece. Hay que resolverlo con respaldo (P32).
- **Origen:** P5, P6.

### D-04 · Sin cuentas, sin servidor, sin nube
- **Decisión:** la app no tiene backend. Todo ocurre en el aparato.
- **Por qué:** R6 y R11. Un servidor, aunque sea gratis, es algo que mantener
  y que se puede caer.
- **Pendiente:** qué significa exactamente "yo y 2 o 3 personas más" (P34).

### D-05 · El repositorio se limpia
- **Decisión:** se borra la app vieja "La corte del Rey" y se empieza limpio.
  El historial de git y la rama `main` la conservan; no se pierde nada.
- **Origen:** P21.

## 4. Tensiones detectadas y su estado

| # | Tensión | Estado |
|---|---|---|
| T1 | P19 dice que la prioridad #1 es organizar una biblioteca **grande**, pero P6 dice **menos de 50 libros**. Con 50 libros organizar es trivial. La respuesta de desempate está mal calibrada. | **preguntada en P23** |
| T2 | P10 pide un traductor bueno y P11 prohíbe todo costo. El traductor integrado de Chrome resolvería ambas cosas, pero **no existe en Chrome de Android**, que es el aparato principal. | **preguntada en P25–P27** |
| T3 | P7 pide sincronizar el progreso entre celular y PC, pero R6 y D-04 excluyen nubes y servidores. | **preguntada en P35** |
| T4 | P17 dice "yo y 2 o 3 personas más". Si comparten biblioteca hace falta servidor y cuentas, lo que rompe D-04. Si cada quien tiene la suya, no hace falta nada. | **preguntada en P34** |
| T5 | D-03 implica que la biblioteca se puede perder al borrar los datos del navegador. | **preguntada en P32** |
| T6 | P8 dice "yo pego el texto". Si los PDF tienen texto seleccionable, seleccionar es mucho mejor que copiar a mano. Si son escaneos, ni siquiera se puede copiar. | **preguntada en P29–P30** |

## 5. Investigación: motores de traducción sin costo

Verificado en agosto de 2026. Es la decisión más delicada del proyecto porque
R11 (cero costo) es estricto.

| Motor | Cuota gratis | ¿Clave? | ¿Tarjeta? | Calidad | Riesgo |
|---|---|---|---|---|---|
| **Gemini API** (2.5 Flash-Lite) | 1.000 peticiones/día **por persona** | sí, gratuita | **no** | muy alta; además explica en contexto | Google recortó cuotas sin avisar en diciembre de 2025 |
| **MyMemory** | 5.000 caracteres/día sin registro; 50.000 con email | no | no | media e irregular | tope de 500 bytes por petición: hay que trocear el texto |
| **Traductor de Chrome** (en el aparato) | ilimitado, sin internet | no | no | alta | **solo PC. No existe en Chrome de Android.** Además exige 22 GB libres y 16 GB de RAM |
| **Google Cloud Translation** | 500.000 car./mes vía crédito de $10 | sí | **sí** | alta | exige tarjeta: incompatible con R11 |
| **DeepL Developer** | 1.000.000 de caracteres **una sola vez**, no mensual | sí | depende | muy alta | se agota y no se renueva |
| **LibreTranslate** | gratis solo si lo alojas tú | no | no | media | exige un servidor: rompe D-04 |

**Lectura de la tabla.** Con cero costo y Android como aparato principal,
quedan dos caminos reales: la API de Gemini con una clave gratuita que cada
persona pega una vez (mejor calidad, cuota por persona, sin servidor), o
MyMemory sin registro (cero fricción, calidad menor, cuota diaria pequeña).
Se pueden combinar. La decisión se toma en P25.

Fuentes: [Chrome for Developers · Translator API](https://developer.chrome.com/docs/ai/translator-api),
[MyMemory · Usage limits](https://mymemory.translated.net/doc/usagelimits.php),
[Comparativa de APIs gratuitas 2026](https://langbly.com/blog/best-free-translation-api-2026/),
[Límites del nivel gratuito de Gemini](https://tokenmix.ai/blog/gemini-api-free-tier-limits).

## 6. Cuestionarios

| Ronda | Tema | Archivo | Estado |
|---|---|---|---|
| 01 | Decisiones grandes: plataforma, biblioteca, traductor, lectura, alcance | `guia/cuestionarios/01-decisiones-grandes.html` | respondido |
| 02 | Cómo funciona: traductor, archivos, respaldo, organización, nombre | `guia/cuestionarios/02-como-funciona.html` | enviado |
| 03 | Cómo se ve y se siente: animación de página, gestos, temas, tipografía | — | pendiente |

Las respuestas de la ronda 1 están en `guia/respuestas/01-respuestas.md`.

## 7. Bitácora

- **2026-08-26** — Se reutiliza el repositorio de "La corte del Rey". Se crea la
  Guía y se envía el cuestionario 1.
- **2026-08-26** — Respondido el cuestionario 1. Se fijan D-01 a D-05, se
  detectan 6 tensiones, se investigan los motores de traducción sin costo y se
  borra la app vieja. Se envía el cuestionario 2.
