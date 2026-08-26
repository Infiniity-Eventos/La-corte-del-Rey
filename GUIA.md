# Guía

Documento vivo del proyecto. Todo lo que se decide queda aquí, y de aquí salen
los parámetros para construir la app. Si algo no está en esta Guía, no está
decidido.

- **Estado:** ronda 3 de cuestionarios (arquitectura cerrada; falta la cara)
- **Última actualización:** 2026-08-26
- **Nombre:** **Infiniity Vellum** (P43)

---

## 1. Qué es

**Infiniity Vellum.** Una app para leer PDF de forma cómoda en el celular y en
el PC, con un traductor inglés → español integrado. Cuatro personas la usan,
cada una con su progreso. Costo de operación: cero.

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
| R18 | La usarán 4 personas, cada una con su progreso | P17 · P34 |
| R19 | **Lo primero que se salva si hay que sacrificar: que se sienta ligera e instantánea** | P23 |
| R20 | El traductor devuelve traducción natural + literal, explicación en contexto, detalle de palabra suelta y aviso de modismos | P28 |
| R21 | El texto se escribe a mano en la burbuja | P29 |
| R22 | Sincronización automática de progreso entre aparatos, con Firebase gratuito | P22 · P35 |
| R23 | Un libro se identifica por un título que yo escribo, más etiquetas. Sin autor. | P42 |
| R24 | Al importar un PDF repetido, avisa y no lo duplica | P37 |
| R25 | Pantalla de inicio: lo que estoy leyendo arriba y grande; la biblioteca debajo | P39 |
| R26 | Portada = primera página del PDF, sustituible por una imagen mía | P40 |
| R27 | Buscador por título | P41 |

**No entra:** lectura en voz alta (P16), OCR de cómics (P8), traducción de
página completa (P8), subrayados ni notas manuales (P15), sincronización
automática de los **archivos** (P7 · imposible en Firebase gratuito),
EPUB / CBZ / MOBI en la versión 1 (P4), colecciones y carpetas (P38),
campo de autor (P42), agrupación por estado de lectura (P38).

**R19 es la regla de desempate.** Cuando dos requisitos choquen, gana el que
mantenga la app ligera e instantánea. Esto tiene un efecto inmediato sobre R22:
la sincronización nunca puede hacer esperar a la app.

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

### D-04 · Sin cuentas, sin servidor, sin nube — ~~REVOCADA~~
- **Revocada en la ronda 2** por P22, P33 y P35: se usará Firebase en su plan
  gratuito. Se deja constancia en vez de borrarla, para que quede claro qué
  cambió y por qué. La sustituye D-06.

### D-06 · Firebase en plan Spark (gratuito) para sincronizar datos
- **Decisión:** se usa Firebase, exclusivamente en el plan Spark. Nunca Blaze,
  ni siquiera "vigilando el gasto": Blaze exige tarjeta y no corta solo al
  llegar al límite, lo que rompe R11.
  - **Firestore** guarda progreso de lectura, vocabulario, etiquetas, títulos y
    ajustes. Cuota gratis: 1 GiB, 50.000 lecturas, 20.000 escrituras y 20.000
    borrados al día. Para cuatro personas y menos de cincuenta libros, sobra.
  - **Authentication** identifica a cada persona. Gratis con Google o con
    correo y contraseña. Se evita la verificación por SMS, que sí cuesta.
  - **Hosting** publica la app: 10 GB de almacenamiento, 360 MB de transferencia
    al día, dominio propio y certificado incluidos, sin tarjeta.
  - **Cloud Storage NO se usa.** Desde el 3 de febrero de 2026 exige plan Blaze
    con tarjeta vinculada. Es la razón de D-07.
- **Origen:** P22, P33, P35.

### D-07 · Los PDF nunca salen del aparato
- **Decisión:** los archivos viven solo en el almacén local (D-03). Firebase
  guarda los datos *sobre* los libros, no los libros.
- **Por qué:** es una consecuencia forzada de D-06, no una preferencia. El plan
  gratuito de Firebase no puede almacenar archivos.
- **Consecuencia:** si pierdes el teléfono o borras los datos del navegador,
  hay que volver a importar los PDF a mano, pero **el progreso, el vocabulario
  y las etiquetas vuelven solos** al iniciar sesión. Coincide con lo que ya
  querías: tú les pasas los archivos a las otras personas y ellos los importan
  (P34).
- **Pendiente de confirmar:** P44.

### D-08 · Local-first: la nube nunca hace esperar
- **Decisión:** la app funciona entera sin sesión y sin internet. Firebase es
  una capa que sincroniza en segundo plano. Ninguna pantalla espera a la red,
  ningún botón se bloquea mientras sube algo, y no hay pantalla de inicio de
  sesión obligatoria al abrir.
- **Por qué:** R19 es la prioridad número uno y R4 prohíbe las esperas. Una app
  que arranca pidiendo sesión y esperando a un servidor es exactamente lo que
  no quieres.
- **Consecuencia técnica:** todo se escribe primero en local y se sincroniza
  después; los conflictos se resuelven por fecha de modificación más reciente.
- **Pendiente de confirmar:** P46.

### D-09 · La clave de Gemini vive en el aparato, nunca en el código
- **Decisión:** la clave se pega en los ajustes y se guarda en el aparato (o en
  Firestore, según P48). **Jamás** se escribe en el código ni se sube al
  repositorio: este repositorio es público y una clave subida a GitHub se
  detecta y se explota en minutos.
- **Regla asociada:** en el proyecto de Google Cloud de esa clave **no se activa
  la facturación nunca**. Sin facturación activada no puede haber cobro: si se
  agota la cuota diaria, la API simplemente deja de responder hasta el día
  siguiente. Esto es lo que hace que R11 sea cierto y no una esperanza.
- **Origen:** P25, P26, P27.

### D-10 · Nombre: Infiniity Vellum
- **Origen:** P43. *Vellum* es la vitela: la piel fina y tratada sobre la que se
  escribían los manuscritos antes del papel.

### D-11 · Modelo de datos de un libro
- **Decisión:** un libro es un **título** escrito a mano, un conjunto de
  **etiquetas**, una **portada** (primera página del PDF o imagen propia) y un
  **progreso**. No hay campo de autor.
- **Origen:** P38, P40, P42.

### D-05 · El repositorio se limpia
- **Decisión:** se borra la app vieja "La corte del Rey" y se empieza limpio.
  El historial de git y la rama `main` la conservan; no se pierde nada.
- **Origen:** P21.

## 4. Tensiones detectadas y su estado

| # | Tensión | Estado |
|---|---|---|
| T1 | P19 priorizaba organizar una biblioteca grande mientras P6 declaraba menos de 50 libros. | **resuelta** en P23: la prioridad real es que se sienta ligera e instantánea (R19). |
| T2 | Traductor bueno contra costo cero, con el traductor de Chrome descartado por no existir en Android. | **resuelta** en P25: Gemini con clave gratuita propia (D-09). |
| T3 | Sincronizar el progreso sin nube ni servidor. | **resuelta** en P22/P35: Firebase gratuito (D-06). El "sin nubes" original se cambia por "sin nubes de pago". |
| T4 | Qué significaba "yo y 2 o 3 personas más". | **resuelta** en P34: comparten los archivos a mano, cada quien con su progreso. |
| T5 | La biblioteca se puede perder al borrar los datos del navegador. | **parcial**: Firebase salva los datos, no los PDF (D-07). Confirmación en P44. |
| T6 | ¿Los PDF tienen texto o son escaneos? | **resuelta** en P30: mezcla de los dos. Ver T9. |
| T7 | Sincronizar exige identificar a cada persona, pero R19 y R4 prohíben una pantalla de sesión que haga esperar. | **preguntada** en P45 y P46. |
| T8 | P29 elige escribir a mano, pero P30 dice que parte de los PDF sí tienen texto seleccionable. En esos, seleccionar con el dedo sale prácticamente gratis y ahorra teclear. | **preguntada** en P56. |
| T9 | P32 solo marca "la frase completa donde apareció". Una lista de vocabulario sin la traducción no sirve para nada. | **preguntada** en P57. |
| T10 | P27 comparte una sola clave de Gemini entre cuatro personas: hay que decidir cómo se reparte sin exponerla, y las 1.000 consultas diarias pasan a ser comunes. | **preguntada** en P48. |
| T11 | P28 pide una respuesta muy completa de la burbuja, pero R19 exige que nada se sienta lento. Una respuesta larga tarda unos segundos en generarse. | **preguntada** en P54: se resuelve mostrando lo natural primero y el resto detrás. |

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

## 6. Investigación: qué permite Firebase gratis

Verificado en agosto de 2026.

| Servicio | En el plan Spark (gratis, sin tarjeta) |
|---|---|
| **Firestore** (datos) | 1 GiB guardado · 50.000 lecturas, 20.000 escrituras y 20.000 borrados al día · 10 GiB/mes de salida |
| **Authentication** | incluido con Google y con correo y contraseña. La verificación por SMS sí cuesta: se evita. |
| **Hosting** | 10 GB de almacenamiento · 360 MB/día de transferencia · dominio propio y certificado incluidos |
| **Cloud Storage** (archivos) | **no disponible.** Desde el 3 de febrero de 2026 exige plan Blaze con tarjeta vinculada. |

**Por qué no se usa Blaze aunque su cuota gratuita sea la misma.** Blaze incluye
las mismas cuotas sin costo, pero exige una tarjeta y **no corta el servicio al
llegar al límite**: sigue funcionando y cobra la diferencia. R11 dice cero costo
sin excepción, y la única forma de garantizarlo es no tener forma de cobrar.

Fuentes: [precios de Firebase](https://firebase.google.com/pricing),
[Firebase Hosting en el plan gratuito](https://freetier.co/directory/products/firebase-hosting),
[qué cambió en el nivel gratuito en 2026](https://unanswered.io/guide/is-firebase-free-pricing-free-tier).

## 7. Cuestionarios

| Ronda | Tema | Archivo | Estado |
|---|---|---|---|
| 01 | Decisiones grandes: plataforma, biblioteca, traductor, lectura, alcance | `guia/cuestionarios/01-decisiones-grandes.html` | respondido |
| 02 | Cómo funciona: traductor, archivos, respaldo, organización, nombre | `guia/cuestionarios/02-como-funciona.html` | respondido |
| 03 | Cómo se ve y se siente: sesión, animación de página, burbuja, identidad | `guia/cuestionarios/03-como-se-siente.html` | enviado |

Las respuestas están en `guia/respuestas/`.

## 8. Bitácora

- **2026-08-26** — Se reutiliza el repositorio de "La corte del Rey". Se crea la
  Guía y se envía el cuestionario 1.
- **2026-08-26** — Respondido el cuestionario 1. Se fijan D-01 a D-05, se
  detectan 6 tensiones, se investigan los motores de traducción sin costo y se
  borra la app vieja. Se envía el cuestionario 2.
- **2026-08-26** — Respondido el cuestionario 2. La app se llama **Infiniity
  Vellum**. Entra Firebase gratuito, lo que revoca D-04 y añade D-06 a D-11. Se
  confirma que el plan gratuito de Firebase ya no puede guardar archivos, así
  que los PDF se quedan en el aparato. La prioridad número uno pasa a ser que
  la app se sienta ligera e instantánea, y eso obliga a que la sincronización
  nunca haga esperar. Se envía el cuestionario 3.
