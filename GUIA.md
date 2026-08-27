# Guía

Documento vivo del proyecto. Todo lo que se decide queda aquí, y de aquí salen
los parámetros para construir la app. Si algo no está en esta Guía, no está
decidido.

- **Estado:** Guía cerrada. **Hitos 1, 2 y 3 terminados. La app está publicada.**
- **Dirección:** https://infiniity-eventos.github.io/La-corte-del-Rey/
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
| R28 | Al pasar página, la hoja **voltea sobre el lomo**, con peso (450 ms) y siguiendo el dedo | P49 · P50 · P51 |
| R29 | **Sonido de papel** al cambiar de página | P49 obs |
| R30 | La burbuja es una **barra fija abajo**; muestra la traducción natural grande y el resto en pestañas | P54 · P55 |
| R31 | Donde el PDF tenga texto, se puede seleccionar y traducir; donde no, se escribe | P56 |
| R32 | Sesión con Google, **una sola vez**; después nunca vuelve a pedirla ni a hacer esperar | P45 · P46 |
| R33 | Identidad visual **Vitela**: pergamino, tinta parda, ocre. Tema de lectura por defecto: papel | P58 · P59 |
| R34 | Transiciones suaves pero muy cortas en toda la app | P60 |
| R35 | Botón **Crear portada**: arma un prompt, lo copia y abre el generador de imágenes | P61 obs |
| R36 | Todas las portadas comparten estilo, para que la biblioteca parezca una colección | P61 obs |
| R37 | Al leer: todo oculto por defecto; la interfaz aparece al tocar el centro | P62 |
| R38 | La orientación se puede bloquear desde la app | P64 |
| R39 | ~~Botón de respaldo a un archivo~~ | P44, **revocado en P70**: la nube basta |
| R40 | Los PDF y las portadas suben a la nube automáticamente al importarlos | P67 |
| R41 | Descargar un libro de la nube: automático con wifi, con permiso si son datos | P68 |
| R42 | Corte automático de facturación en 1 dólar | P69 |
| R43 | El botón Crear portada abre Gemini y, al volver, ofrece poner la imagen | P72 |
| R44 | Todas las portadas llevan el título escrito | P73 |
| R45 | El prompt invita a Gemini a recoger el estilo propio de la obra y traducirlo al formato de Vellum | P73 obs |
| R46 | Sin portada generada, la portada es **tipográfica**. Nunca la primera página del PDF | P74 |
| R47 | Sonido de **clic seco** al pasar página, con interruptor rápido | P75 · P76 |
| R48 | Vibración corta al completarse la página | P77 |
| R49 | Orden de construcción: **leer primero** | P80 |

**No entra:** lectura en voz alta (P16), OCR de cómics (P8), traducción de
página completa (P8), subrayados ni notas manuales (P15), EPUB / CBZ / MOBI en
la versión 1 (P4), colecciones y carpetas (P38), campo de autor (P42),
agrupación por estado de lectura (P38), barra de progreso arrastrable con
miniaturas (P52: solo salto por número).

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

### D-06 · Firebase — ~~Spark~~ → **Blaze**, revisada en la ronda 3
- **Cambio:** en P61 pediste pasar a Blaze para poder subir también los PDF.
  Lo respeto y lo anoto; ver D-12 con los números y el riesgo real. Lo que sigue
  describe los servicios, que no cambian.
- **Decisión original (ronda 2):** se usaba Firebase solo en plan Spark.
  - **Firestore** guarda progreso de lectura, vocabulario, etiquetas, títulos y
    ajustes. Cuota gratis: 1 GiB, 50.000 lecturas, 20.000 escrituras y 20.000
    borrados al día. Para cuatro personas y menos de cincuenta libros, sobra.
  - **Authentication** identifica a cada persona. Gratis con Google o con
    correo y contraseña. Se evita la verificación por SMS, que sí cuesta.
  - **Hosting** publica la app: 10 GB de almacenamiento, 360 MB de transferencia
    al día, dominio propio y certificado incluidos, sin tarjeta.
  - **Cloud Storage** pasa a estar disponible al entrar en Blaze (D-12).
- **Origen:** P22, P33, P35, y revisión en P61.

### D-07 · Los PDF nunca salen del aparato — ~~REVOCADA~~
- **Revocada en la ronda 3** por P61: con Blaze, los PDF sí pueden subirse.
  La sustituye D-12. Se conserva la entrada para que quede el rastro del cambio.
- **Lo que sí sobrevive de ella:** el almacén local sigue siendo la fuente
  principal (D-03). La nube es respaldo y transporte, no el sitio desde donde se
  lee. Un lector que descarga 80 MB antes de mostrar la primera página es lo
  contrario de R19.

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
- **⚠️ Consecuencia crítica de pasar a Blaze (D-12).** El nivel gratuito de
  Gemini **solo existe mientras el proyecto de Google no tenga facturación
  activada**. Blaze *es* activar facturación. Por lo tanto:

  > **El proyecto de Firebase y el proyecto de la clave de Gemini tienen que ser
  > dos proyectos de Google distintos.**

  Si se usa el mismo, las 1.000 consultas diarias gratuitas desaparecen y cada
  traducción pasa a facturarse. Es un error silencioso: nada falla, solo llega
  la factura. Es la regla más importante de todo este documento.
- **Origen:** P25, P26, P27, P48.

### D-10 · Nombre: Infiniity Vellum
- **Origen:** P43. *Vellum* es la vitela: la piel fina y tratada sobre la que se
  escribían los manuscritos antes del papel.

### D-12 · Blaze, con los archivos en la nube y un tope de gasto
- **Decisión:** se pasa al plan Blaze para poder subir los PDF (P61). El almacén
  local sigue siendo la fuente principal; la nube es respaldo y transporte.
- **Los números, verificados en la página oficial de Firebase.** En Blaze, Cloud
  Storage no cobra hasta: **5 GB guardados**, **100 GB de descarga al mes**,
  **5.000 subidas al mes** y **50.000 descargas al mes**. Con menos de cincuenta
  PDF y dos personas, el único margen que se puede rozar es el de 5 GB, y solo
  si son cómics muy pesados. Pasado eso son unos tres centavos de dólar por
  gigabyte al mes.
- **El riesgo real no son esos números, es que Blaze no tiene tope.** Cobra lo
  que salga. Un error que suba en bucle, o un bucket mal configurado que alguien
  descubra, genera cargos de verdad. Por eso el tope automático de facturación
  no es opcional: se pregunta en P69 pero se recomienda con fuerza.
- **Regla heredada:** ver el aviso crítico de D-09. Dos proyectos de Google
  separados, o Gemini deja de ser gratis.
- **Origen:** P61 obs.

### D-13 · Las portadas se generan fuera y se traen a mano
- **Decisión:** un botón **Crear portada** compone un prompt con el título, las
  etiquetas, el tipo de obra y el nombre del archivo, lo copia al portapapeles y
  abre el generador de imágenes. Tú generas allí y vuelves con el archivo.
- **Por qué así y no generando dentro de la app:** generar imágenes por API
  cuesta dinero de verdad y no tiene nivel gratuito comparable al de texto. Este
  rodeo mantiene R11 intacto y además te deja elegir la que más te guste en vez
  de aceptar la primera.
- **La parte importante es la plantilla, no el botón.** El prompt es idéntico
  para todos los libros salvo el sujeto, para que cincuenta portadas hechas en
  cincuenta momentos distintos parezcan una colección. Está en
  `guia/prompts/portadas.md`.
- **Siempre hay portada:** si no generas ninguna, se usa la primera página del
  PDF; si esa no sirve, una portada tipográfica con el título.
- **Origen:** P61 obs.

### D-15 · El título lo escribe Vellum sobre la portada, no la IA
- **Decisión:** el generador crea **solo la ilustración**, dejando una banda
  limpia; **Vellum compone el título encima** con la tipografía de la casa.
- **Por qué:** en P73 pediste que el título aparezca escrito en la portada, y
  así aparece. Pero pedírselo al generador tiene dos problemas conocidos:
  escribe mal con frecuencia, y cada portada saldría con una tipografía distinta,
  que es justo lo contrario de que la biblioteca parezca una colección. Al
  componerlo la app, el título siempre está bien escrito, siempre en el mismo
  sitio y siempre con la misma letra.
- **Origen:** P73, resuelto de forma que cumple lo pedido sin heredar el defecto.

### D-16 · El prompt recoge el estilo propio de cada obra
- **Decisión:** la plantilla invita a Gemini a reconocer la obra, si la conoce, y
  a traducir sus motivos e iconografía **al formato de dos tintas sobre
  pergamino** de Vellum. El formato manda siempre; el estilo original entra solo
  como referencia de contenido.
- **Por qué:** es lo que pediste en la observación de P73, y es el equilibrio
  exacto entre "que se vean iguales" y "que se vean únicos".
- **Origen:** P73 obs.

### D-18 · La selección de texto es un modo, no un gesto más
- **Decisión:** seleccionar texto sobre la página se activa con un botón. Con el
  modo puesto, arrastrar selecciona y ya no pasa página; se cambia de página por
  el número.
- **Por qué:** arrastrar para pasar página y arrastrar para seleccionar son
  exactamente el mismo gesto. Si compiten, gana el que no querías, y las dos
  cosas se sienten rotas. Un modo explícito es predecible; adivinar la intención
  no lo es.
- **Además:** en un PDF escaneado no hay texto que seleccionar. El modo lo dice
  con palabras en vez de dejarte intentándolo (R31 / P30).
- **Origen:** P51, P56.

### D-19 · El título en la portada, con una excepción
- **Decisión:** se mantiene D-15 —la ilustración la hace la IA, el título lo
  compone Vellum— pero la ficha de cada libro tiene una casilla, **«el título ya
  está en la imagen»**, que desactiva la composición para ese libro.
- **Por qué:** en la ronda 4 confirmaste que Gemini ya escribe bien el texto
  dentro de las imágenes, así que el primer motivo de D-15 deja de valer. El
  segundo sigue en pie y es el fuerte: si cada portada trae su propia letra, la
  biblioteca deja de parecer una colección. Y hay un tercero que apareció al
  construir: **el título es editable**. Si lo cambias, uno escrito dentro de la
  imagen se queda antiguo y hay que regenerar el dibujo entero.
- **Origen:** P73, y tu observación de la ronda 4.

### D-20 · Modelo de datos de un libro
- **Decisión:** un libro es un **título** escrito a mano, un conjunto de
  **etiquetas**, un **tipo** (libro o cómic, que necesita el prompt de portada),
  una **portada** (generada, primera página del PDF, o tipográfica) y un
  **progreso**. No hay campo de autor.
- **Origen:** P38, P40, P42, P61.

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
| T11 | P28 pide una respuesta muy completa de la burbuja, pero R19 exige que nada se sienta lento. | **resuelta** en P54: traducción natural grande, el resto en pestañas. |
| T12 | **El nivel gratuito de Gemini muere si el proyecto de Google tiene facturación activada, y Blaze la activa.** | **resuelta por diseño**: dos proyectos de Google separados. Ver el aviso de D-09. No se pregunta; no hay alternativa razonable. |
| T13 | Blaze no tiene tope de gasto. Un error puede generar cargos reales aunque el uso normal sea gratis. | **preguntada** en P69: corte automático de facturación. |
| T14 | P46 pide sesión obligatoria la primera vez, pero R19 y D-08 exigen que nada haga esperar. | **resuelta**: la sesión se pide una sola vez y queda guardada; los arranques siguientes no tocan la red. Se confirma en P79. |
| T15 | P47 no marcó las portadas entre lo que debe sincronizarse, pero P61 pide un sistema de portadas generadas que sería una lástima perder al cambiar de aparato. | **preguntada** en P67. |
| T16 | Si los PDF viven en la nube, abrir un libro que no está en este aparato exige descargarlo. | **resuelta** en P68: automático con wifi, con permiso si son datos móviles. La misma regla se aplica a las subidas. |
| T17 | P76 pide que el sonido respete el modo silencio del teléfono, pero **una app web no puede leer el interruptor de silencio**. No existe forma de detectarlo. | **resuelta por diseño**: el sonido sale por el volumen multimedia (el mismo de la música, no el del timbre), arranca a volumen bajo y hay un interruptor rápido en la propia pantalla de lectura. Es lo más cerca que se puede llegar; se documenta en vez de prometer lo que no se puede cumplir. |
| T18 | P73 pide que el título vaya escrito en la portada, pero los generadores escriben mal y cada uno usaría una letra distinta. | **resuelta** en D-15: la IA hace la ilustración, Vellum compone el título. |

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
| **Cloud Storage** (archivos) | **no disponible en Spark.** Desde el 3 de febrero de 2026 exige plan Blaze con tarjeta vinculada. |

### Y qué añade Blaze (adoptado en la ronda 3)

Blaze mantiene intactas todas las cuotas gratuitas de arriba y añade Cloud
Storage, que trae la suya propia:

| Cloud Storage en Blaze | Sin costo hasta | Uso previsto de Vellum |
|---|---|---|
| Guardado | **5 GB** | 50 PDF de 20 MB son 1 GB. Solo se roza el límite con cómics muy pesados. |
| Descarga | **100 GB al mes** | Inalcanzable entre dos personas. |
| Operaciones de subida | **5.000 al mes** | Unas 50. |
| Operaciones de descarga | **50.000 al mes** | Unas pocas decenas. |

Pasado el límite, unos tres centavos de dólar por gigabyte al mes. Con este uso,
la factura real es cero.

**Lo que sí hay que vigilar** no está en esta tabla: Blaze no corta. Cobra lo que
salga. El uso normal de Vellum no llega ni cerca de los límites, pero un fallo
que suba archivos en bucle sí. De ahí el tope automático de facturación (D-12).

Fuente: [precios oficiales de Firebase](https://firebase.google.com/pricing).

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
| 03 | Cómo se ve y se siente: sesión, animación de página, burbuja, identidad | `guia/cuestionarios/03-como-se-siente.html` | respondido |
| 04 | Blaze, portadas generadas, sonido y cierre | `guia/cuestionarios/04-cierre.html` | respondido |

**Las cuatro rondas están cerradas. 81 preguntas.** A partir de aquí, esta Guía
deja de ser un cuestionario y pasa a ser la especificación contra la que se
construye.

## 8. Dónde vive

| | |
|---|---|
| **La app** | https://infiniity-eventos.github.io/La-corte-del-Rey/ |
| Se publica | sola, en cada cambio a `main`, con `.github/workflows/publicar.yml` |
| Rama del proyecto | `main`. La app anterior queda en el historial de git. |
| Preparado además | `firebase.json` y `.firebaserc`, para servirla desde el propio dominio con `npx firebase deploy` |

**Por qué GitHub Pages y no Firebase Hosting, de momento.** Publicar en Firebase
exige una credencial que solo puede crear el dueño de la cuenta. Pages funciona
sin nada de eso y se actualiza sola. Cuando quieras un dominio propio, el
proyecto ya está listo para mudarse: es un solo comando.

## 9. Plan de construcción

El orden lo fijó P80: **leer antes que nada**.

| Hito | Qué incluye | Estado |
|---|---|---|
| **1 · Leer** | Importar un PDF, guardarlo en el aparato, pasar páginas con el volteo de libro, sonido y vibración, número de página y progreso, saltar a una página, los tres temas, modo sin distracciones | **hecho** · 21 comprobaciones en `pruebas/` |
| **2 · Biblioteca** | Títulos, tipo, etiquetas con filtro, buscador, portada propia, "seguir leyendo", quitar libros | **hecho** · 33 comprobaciones en `pruebas/` |
| **3 · Traductor** | La barra de abajo, Gemini con clave propia, pestañas, vocabulario, selección de texto donde el PDF lo permita | **hecho** · 27 comprobaciones en `pruebas/` |
| 4 · Nube | Sesión con Google, Firestore, subida de PDF con la regla de wifi, tope de facturación | pendiente |
| 5 · Portadas | Botón Crear portada, plantilla de prompt, composición del título | pendiente |

Las respuestas están en `guia/respuestas/`. Los prompts para generar el icono y
las portadas, en `guia/prompts/`.

### Páginas de trabajo

| Página | Para qué | Archivo |
|---|---|---|
| Prompts | El icono y las portadas, listos para copiar | `guia/paginas/prompts.html` |
| Instalación | Paso a paso de los dos proyectos de Google, con casillas | `guia/paginas/instalacion.html` |

## 10. Hallazgos al construir

Cosas que solo aparecen escribiendo el código, y que cambian cómo hay que
construir lo que viene:

- **pdf.js pesa medio megabyte y no puede ir en el paquete principal.** Con él
  dentro, la biblioteca tardaba en pintarse aunque no fueras a abrir ningún
  libro, que es justo lo que prohíbe R4. Va aparte y se descarga en cuanto la
  biblioteca está en pantalla, así que al tocar un libro ya está. El paquete
  inicial queda en 153 kB. **La misma regla vale para Firebase y para el
  traductor:** ninguno de los dos puede entrar en el arranque.
- **Las fuentes hay que servirlas desde la propia app.** Cargarlas de Google
  dejaba a Vellum sin tipografía en cuanto no había red — y con la tipografía
  se va media identidad. Están en `public/fuentes`, solo el subconjunto latino,
  92 kB entre las dos.
- **La hoja que gira tiene que desvanecerse cerca de los 90°.** De canto no se
  ve en el mundo real, y es justo el ángulo donde la perspectiva la deforma y la
  saca del marco. Desvanecerla resuelve las dos cosas a la vez.
- **El worker de pdf.js es un `.mjs` de 1,4 MB.** Sin incluir esa extensión en el
  service worker se quedaba fuera de la caché *en silencio*, y la app habría
  dejado de abrir libros justo cuando no hubiera red.
- **Las páginas vecinas se dibujan por adelantado.** Es lo que hace que el volteo
  no tenga espera. Sin eso, R4 no se cumple por mucho que la animación sea bonita.
- **Media parte de D-15 ya está construida.** La app compone el título sobre la
  portada, con la tipografía de la casa. Cuando llegue el hito 5, ese botón solo
  tiene que armar el prompt y abrir Gemini: traer la imagen de vuelta y ponerle
  el título ya funciona.
- **En pantalla táctil no existe el «hover».** El botón de la ficha de cada libro
  se revela al pasar el ratón en el escritorio, pero en el teléfono tiene que
  estar siempre visible o no existiría donde más se usa.
- **Buscar sin tildes no es un adorno.** Nadie escribe «crónica» con tilde en un
  buscador, y sin normalizar el texto la búsqueda no encuentra la mitad de una
  biblioteca en español.
- **La traducción se lee mientras llega.** La respuesta de Gemini es un JSON, y
  un JSON no se puede leer hasta que está entero: son dos segundos de pantalla
  quieta. Vellum va sacando el campo `natural` del trozo que ya llegó, así que
  la traducción aparece mientras el contexto y el literal siguen en camino. Es
  la única forma de cumplir P28 y R19 a la vez.
- **La burbuja y los controles del lector querían los dos el borde de abajo.**
  Se mide lo que ocupa la burbuja y todo lo demás se apoya encima. Se mide en
  lugar de calcularse porque la burbuja cambia de alto al escribir y al abrirse.
- **Publicar en una subcarpeta rompe todo lo que apunte a la raíz.** Las fuentes
  vivían en `public/`, donde Vite no procesa el CSS, así que sus rutas quedaban
  fijas al dominio. En GitHub Pages la app vive bajo `/La-corte-del-Rey/`, y ahí
  se habría quedado sin tipografía. Ahora van empaquetadas y con hash.
- **Un token de GitHub Actions no puede encender Pages.** Responde «Resource not
  accessible by integration»: crear el sitio es cosa del dueño del repositorio,
  una vez.
- **La capa de texto no puede vivir dentro de la hoja.** Al redibujar la página
  se reemplazan los hijos de la hoja, y ahí dentro la capa desaparecía en
  silencio. Va como hermana, encima.
- **Las claves de Gemini cambiaron de formato.** Las nuevas empiezan por `AQ.Ab`
  en vez de `AIza`, y las viejas dejan de funcionar en septiembre de 2026. Por eso
  la app no valida el formato: cualquier comprobación que mire las primeras letras
  se queda vieja sola. En su lugar hay un botón que **prueba la clave de verdad**,
  con una traducción mínima.
- **Google sí permite llamar a Gemini desde el navegador.** Comprobado contra la
  API: responde al preflight autorizando el dominio de la app y la cabecera
  `x-goog-api-key`. Sin eso, todo el hito 3 habría necesitado un servidor de por
  medio, y con él se habría ido el «cero costo».
- **Un error de cuota no es un número.** Cuando se agotan las 1.000 traducciones
  del día, la app dice a qué hora vuelven, calculado desde la medianoche del
  Pacífico que es cuando Google las repone (P31).

## 11. Bitácora

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
- **2026-08-26** — Respondido el cuestionario 3. Tres cambios de rumbo: se pasa
  a **Blaze** para poder subir los PDF (D-12), aparece un **sistema de portadas
  generadas fuera de la app** (D-13) y se pide **sonido de papel** al pasar
  página. Se detecta que el nivel gratuito de Gemini muere si el proyecto de
  Google tiene facturación activada, lo que obliga a separar el proyecto de
  Firebase del proyecto de la clave (aviso crítico en D-09). Se escriben los
  prompts del icono y de las portadas. Se envía el cuestionario 4, el último.
- **2026-08-26** — Respondido el cuestionario 4. **La Guía queda cerrada.** Se
  confirma Blaze con corte de facturación en 1 dólar, los PDF suben solos, y la
  descarga respeta el wifi. Se revoca el botón de respaldo (P70). Las portadas
  son siempre tipográficas cuando no hay generada (P74), el título lo compone
  Vellum y no la IA (D-15), y el prompt recoge el estilo propio de cada obra
  (D-16). Sonido de clic seco con vibración. Se documenta que el modo silencio
  del teléfono no es detectable desde una app web (T17). Empieza el hito 1.
- **2026-08-26** — **Hito 1 terminado.** Se puede importar un PDF, leerlo
  volteando páginas con el dedo, con sonido, vibración, los tres temas, salto
  por número y el progreso guardándose solo. Verificado con 20 comprobaciones
  en Chromium sobre la versión compilada. Cinco hallazgos técnicos quedan
  anotados arriba; dos de ellos condicionan los hitos 3 y 4.
- **2026-08-26** — **Hito 2 terminado.** La estantería: títulos que escribes tú,
  tipo libro o cómic, etiquetas con filtro, buscador por título y etiqueta,
  portada propia con el título compuesto encima, y quitar libros. Al traer un
  solo PDF se abre su ficha para que le pongas nombre; con varios, no. 33
  comprobaciones más. Se publica una página con los prompts del icono y de las
  portadas, con botones de copiar, en `guia/paginas/prompts.html`.
- **2026-08-26** — **Hito 3 terminado.** El traductor: barra fija abajo, Gemini
  con clave propia guardada aparte de los ajustes, la traducción natural
  apareciendo mientras el resto sigue llegando, pestañas de contexto, literal,
  aviso de modismo y ficha de palabra suelta, y vocabulario con libro y página.
  Los errores se explican con palabras, incluida la hora a la que vuelve la
  cuota. Se añade D-18 (la selección de texto es un modo) y D-19 (la casilla
  para portadas que ya traen el título). Llega el icono definitivo: se le quita
  la marca del generador, se recorta y se reduce de 422 kB a 84 sin que se note.
  27 comprobaciones más, con la API de Gemini simulada para no gastar cuota.
- **2026-08-26** — Se escribe la guía de instalación (`guia/paginas/instalacion.html`):
  los dos proyectos de Google separados, Blaze, la alerta de presupuesto y qué
  se manda por el chat y qué no. Queda por escrito una cosa que conviene no
  olvidar: **un presupuesto de Google avisa pero no corta**. El corte de verdad
  es un proceso aparte que se monta en el hito 4.
- **2026-08-27** — **Vellum está publicada** en
  https://infiniity-eventos.github.io/La-corte-del-Rey/ y se actualiza sola en
  cada cambio. El proyecto pasa a `main`. Entra la configuración de Firebase y
  las reglas de Firestore y Storage. Se comprueba que los 17 archivos que sirve
  GitHub son idénticos a los que se compilan aquí, y se pasa contra ellos una
  prueba nueva de 13 comprobaciones.
