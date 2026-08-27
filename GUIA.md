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
| R50 | Doble toque para acercar la página al punto tocado; otro doble toque la devuelve | petición del 27 de agosto |
| R51 | Lo que sobra alrededor de la página toma el color del fondo, no blanco | petición del 27 de agosto |

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

### D-21 · Entre aparatos gana el cambio más reciente
- **Decisión:** cada libro, cada palabra del vocabulario y los ajustes llevan
  una marca de cuándo se tocaron por última vez. Al sincronizar, gana la marca
  más alta. Borrar no borra: deja una **lápida**, un registro marcado como
  borrado que también viaja, para que quitar un libro en el celular lo quite
  también en la PC en vez de que la PC lo resucite.
- **Por qué así y no algo más listo:** son dos aparatos de la misma persona, que
  casi nunca están usándose a la vez. Lo único que puede perderse es un cambio
  hecho sin conexión que se pise con otro más nuevo, y eso es exactamente lo que
  la persona esperaría. Cualquier cosa más elaborada añade fallos posibles sin
  añadir nada que se note.
- **Vive en `src/lib/fusion.ts`, sin Firebase dentro.** Es la pieza que puede
  equivocarse en silencio y perder datos, así que está aparte y se prueba sin
  navegador: 14 comprobaciones de las que ninguna necesita internet.
- **Las lápidas se limpian solas** cuando ya han viajado a todas partes.

### D-22 · El corte de facturación es código, no una alerta
- **Decisión:** un vigía en Google Cloud desengancha la cuenta de facturación
  del proyecto cuando el gasto del mes pasa de **1 dólar**. Vive en `apagon/`.
- **Por qué hace falta:** el presupuesto que ofrece Google **avisa pero no
  corta**. Manda un correo y la factura sigue subiendo. Esto es lo único que
  detiene el gasto de verdad, y por eso D-12 no está cerrada sin ello.
- **Qué se pierde cuando salta:** los PDF dejan de subir y bajar, porque Cloud
  Storage necesita Blaze. Firestore sigue dentro del nivel gratuito, y Vellum
  abre, lee y traduce igual, porque todo está también en el aparato. **Se pierde
  el transporte, no los libros** — que es justo lo que compra D-08.
- **Lo que no se puede prometer:** los datos de gasto de Google llegan con horas
  de retraso, así que no es un interruptor instantáneo. El tope va en 1 dólar
  para que el retraso quepa dentro del margen. Y que Google acepte el corte el
  día que toque solo se sabe cuando pase: las 14 comprobaciones de
  `pruebas/apagon.mjs` cubren **la decisión**, no el corte.
- **Montarlo es cosa de una vez y hay que hacerlo a mano** en la consola de
  Google: `apagon/LEEME.md` y `guia/paginas/apagon.html`.
- **Origen:** P69, y T13.

### D-29 · Un catálogo para la casa, una estrella para cada quien
- **Decisión:** todo PDF que sube cualquiera va a un **catálogo común**, que se
  busca entero desde los dos aparatos. Lo que decide qué hay en **tu**
  estantería es la **estrella**: marcas lo que quieres a mano, y lo demás sigue
  ahí, buscable, sin llenarte la pantalla.
- **Lo que traes nace marcado.** Si lo subiste, lo querías. Lo que sube la otra
  persona entra al catálogo sin estrella.
- **Quitar del catálogo es de quien lo subió**, y entonces desaparece para los
  dos. Quitar la estrella solo te afecta a ti. Son dos gestos distintos y por eso
  están en sitios distintos: la estrella en la rejilla, borrar en la ficha.
- **Lo que es de cada quien no viaja a la ficha común:** la estrella, por dónde
  vas y si lo tienes bajado se quedan en tu espacio. El catálogo guarda el libro,
  no tu relación con él.
- **Lo que hay que decir en voz alta:** **no hay libros privados con la sesión
  abierta.** El catálogo es común por diseño. Es lo que se pidió, y conviene que
  esté escrito.
- **Quién es de la casa se pone a mano** en `casa/miembros`, desde la consola de
  Firebase; las reglas lo dejan leer y no escribir. Si la app pudiera añadir
  miembros, cualquiera con una cuenta de Google se metería solo.
- **Sin casa montada no pasa nada.** `sincronizarEstante` no hace nada y los
  libros propios se sincronizan igual. Y sin otra persona, la app no enseña ni
  pestañas ni estrellas: elegir entre dos vistas idénticas sería ruido.
- **Origen:** pedido en el uso, 2026-08-27.

### D-30 · La clave de Gemini es una por perfil
- **Decisión:** cada cuenta tiene su clave en este aparato. Al entrar y al salir
  se cambia de cajón.
- **Por qué:** las mil traducciones diarias **van con la clave, no con la app**.
  Con una compartida, la primera persona se come la tarde de la otra sin
  enterarse.
- **La primera vez se hereda** la que hubiera puesta sin sesión: nadie tiene que
  volver a buscarla en AI Studio por haber entrado.
- **Sigue sin viajar** (D-09). Si usas Vellum también en la PC, hay que pegarla
  allí una vez. Es a propósito: una clave que viaja es una clave que algún día se
  filtra por un descuido.
- **Origen:** pedido en el uso, 2026-08-27.

### D-28 · El campo del traductor se vacía al mandar
- **Decisión:** al pulsar Traducir, el campo queda vacío. Lo normal es traducir
  varias frases seguidas, y borrar la anterior a mano cada vez estorba.
- **Lo que mandaste no se pierde:** sigue arriba del panel, encima de la
  traducción.
- **Si falla, vuelve al campo.** Reintentar no puede obligarte a teclearlo otra
  vez, y una cuota agotada o un corte de red son exactamente los momentos en que
  vas a reintentar.
- **Origen:** pedido en el uso, 2026-08-27.

### D-27 · Atrás cierra capas, no la app
- **Decisión:** el botón de atrás del teléfono deshace lo que tengas encima, de
  dentro hacia fuera: el traductor, las notas de la página, el modo selección,
  el acercamiento, la ficha, el libro, las pantallas de ajustes y vocabulario. Y
  solo cuando no queda nada abierto, sale.
- **Por qué:** instalada como app, atrás es el gesto más usado del teléfono y
  por defecto hacía lo peor posible — te echaba fuera a mitad de lectura.
- **Cómo:** cada cosa que se abre apila una entrada de historial
  (`src/lib/atras.ts`); atrás las va sacando. Sin cambiar de dirección: la
  entrada solo existe para tener a dónde volver.
- **El detalle que lo hace funcionar es el otro camino.** Cerrar algo con su
  propio botón **también tiene que quitar su entrada**. Si no, atrás se queda
  deshaciendo cosas que ya no están y hay que pulsarlo tres veces para que pase
  algo. No rompe nada visible, y por eso hay una comprobación dedicada.
- **El teclado no es una capa.** Con el teclado abierto, atrás lo cierra el
  propio sistema y a la app no le llega nada. Así el primero baja el teclado, el
  segundo cierra la traducción y el tercero sale del libro, en el orden en que
  las cosas están puestas encima.
- **Origen:** pedido en el uso, 2026-08-27.

### D-26 · En la PC las flechas voltean; en el teléfono se pellizca
- **Decisión:** las flechas ←/→ (y AvPág/RePág y la barra espaciadora) pasan
  página **con el mismo volteo** que el dedo, no saltando. Y en pantalla táctil,
  dos dedos acercan y alejan.
- **Por qué el volteo y no un salto:** el volteo es de las pocas cosas de la app
  que se eligieron por cómo se sienten (P51). Que en la PC el libro cambiara de
  página de golpe la convertía en otra app según dónde la abrieras.
- **Cómo se hace:** no basta con cambiar de página. Se pone la hoja en su sitio,
  **se espera a que la página vecina esté dibujada** y entonces se suelta. Sin
  esa espera lo que gira es una hoja en blanco.
- **Escribir no pasa página.** Las flechas dentro del campo del traductor mueven
  el cursor. Estaba mal desde antes —solo se excluía `INPUT`, y la burbuja es un
  `TEXTAREA`— y se arregla aquí.
- **El pellizco ancla lo que hay entre los dedos.** El punto de la página que
  estaba en medio de los dedos sigue en medio al acabar. Es lo que separa
  pellizcar de que la página pegue un salto y se acerque sola.
- **Tope en ×5.** Más allá se ven los píxeles del PDF y no se lee mejor. Al
  volver a tamaño natural el acercamiento se quita del todo, en vez de quedarse
  en un ×1,01 que no se ve pero sigue atrapando el arrastre.
- **Dos dedos y un volteo empezado no se mezclan:** si el giro ya arrancó, el
  segundo dedo se ignora. Interrumpirlo a medias dejaría la hoja colgando.
- **Origen:** pedido en el uso, 2026-08-27.

### D-25 · El teclado no cambia el tamaño de la página
- **Decisión:** mientras la burbuja del traductor está en uso, la medida del
  área de lectura **se congela**. La página no se mueve ni se redibuja, y el
  teclado tapa lo que tenga que tapar.
- **Por qué:** al abrir el teclado la ventana se encoge, y el lector le hacía
  caso: volvía a repartir la página y a dibujarla. Con el zoom puesto eso movía
  de sitio justo lo que estabas mirando, que es lo peor que puede pasar en el
  momento en que vas a copiar una frase. **Un teclado no es un cambio de tamaño:
  es algo que se pone delante.**
- **Se prefirió tapar antes que mover.** Fue lo pedido literalmente, y es lo
  correcto: nada de lo que la app puede hacer con menos alto compensa perder el
  sitio donde estabas.
- **Al soltar el campo se vuelve a mirar una vez**, con espera, por si el tamaño
  cambió de verdad mientras tanto —girar el aparato con el teclado abierto—.
  Medir en el momento pillaría la pantalla aún encogida, que es el salto que
  esto evita.
- **Origen:** pedido en el uso, 2026-08-27.

### D-24 · La traducción se guarda sola
- **Decisión:** ya no hay botón de guardar. En cuanto la traducción está
  entera, se guarda y la página queda marcada. La burbuja lo dice —«Guardada en
  la página 4»— y ofrece **Quitar** al lado.
- **Por qué se dice y se puede deshacer:** guardar en silencio y sin salida
  sería peor que no guardar. Lo que se quita es un botón, no el control.
- **Se guarda entera o no se guarda.** Lo que va llegando a medias no vale: una
  traducción cortada en el vocabulario habría que corregirla después a mano.
- **Traducir lo mismo dos veces no duplica.** Se busca por libro + página +
  texto, y si ya estaba se actualiza en su sitio conservando su fecha. Releer
  un párrafo es de lo más normal, y sin esto la lista se llenaría de copias.
- **Y revive lo que quitaste.** Si vuelves a traducir algo que habías quitado,
  se reutiliza su misma entrada en vez de dejar una lápida huérfana al lado de
  una copia nueva.
- **Lo que esto destapó:** quitar una palabra **borraba de verdad, sin dejar
  lápida**, así que la nube la devolvía en la siguiente sincronización; y lo que
  se quitaba en el otro aparato no llegaba a borrarse aquí nunca. Con el botón,
  quitar era raro y no se notaba. Guardando solo, quitar pasa a ser frecuente.
  Las dos cosas arregladas.
- **Origen:** pedido en el uso, 2026-08-27.

### D-23 · Lo traducido queda marcado en su página
- **Decisión:** al guardar una traducción, la página donde la hiciste queda con
  un **marcapáginas en el borde derecho** con cuántas hay. Se toca y se abre lo
  que tradujiste ahí: la frase original y su traducción. Se toca fuera y se
  cierra.
- **Por qué en el borde derecho y a media altura:** es el único sitio del lector
  que no se pelea con nada. Arriba está el título, abajo el folio y la burbuja,
  y en medio la página. Además se ve con la interfaz oculta, que es la mitad del
  tiempo.
- **Es por página, no por el punto exacto.** Se pidió un pin «en el pedazo donde
  estaba», y no se puede prometer: lo que escribes o pegas en la burbuja no tiene
  posición ninguna, y lo que seleccionas la tiene solo hasta que cambia el zoom o
  se redibuja la página. Una marca que a veces aparece donde tocaba y a veces no
  es peor que una que siempre está donde la buscas. La página es la unidad que
  siempre es verdad.
- **No hay dos almacenes.** Es el mismo vocabulario de P57 mirado por página. Por
  eso el botón de la burbuja pasó a decir **«Guardar en la página»**: el efecto
  que se ve primero es la marca, y el nombre tiene que decir lo que va a pasar,
  no dónde acaba. El panel recuerda que también están todas juntas.
- **Origen:** pedido en el uso, 2026-08-27.

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
| T13 | Blaze no tiene tope de gasto. Un error puede generar cargos reales aunque el uso normal sea gratis. | **resuelta** en D-22: el corte está escrito en `apagon/`. Queda montarlo a mano una vez. |
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
| Los datos, con sesión | Firestore, bajo `gente/{uid}` — progreso, etiquetas, vocabulario, ajustes |
| Los PDF, con sesión | Cloud Storage, bajo `gente/{uid}` — copia; el original sigue en el aparato |
| La clave de Gemini | solo en este aparato. **No viaja nunca**, ni con la sesión abierta (D-09) |
| El corte de facturación | `apagon/`, en Google Cloud. Montarlo es a mano, una vez (D-22) |

**Falta hacer dos cosas a mano** para que entrar funcione, y las dos son de la
cuenta, no del código:

1. Autorizar `infiniity-eventos.github.io` en Firebase → **Authentication →
   Settings → Dominios autorizados**. Sin eso, la ventana de Google se abre y se
   cierra con un error de dominio.
2. Publicar las reglas: `npx firebase deploy --only firestore:rules,storage`.
   Sin eso, Firestore rechaza todo por defecto — que es lo correcto, pero
   también impide sincronizar.

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
| **4 · Nube** | Sesión con Google, Firestore, subida de PDF con la regla de datos móviles, corte de facturación | **hecho** · 28 comprobaciones en `pruebas/` |
| **5 · Portadas** | Botón Crear portada, plantilla de prompt, composición del título | **hecho** · 32 comprobaciones en `pruebas/` |

Las respuestas están en `guia/respuestas/`. Los prompts para generar el icono y
las portadas, en `guia/prompts/`.

### Páginas de trabajo

| Página | Para qué | Archivo |
|---|---|---|
| Prompts | El icono y las portadas, listos para copiar | `guia/paginas/prompts.html` |
| Instalación | Paso a paso de los dos proyectos de Google, con casillas | `guia/paginas/instalacion.html` |
| La clave de Gemini | Tutorial para sacar la clave, con enlaces. El que se le pasa a quien va a usar la app | `guia/paginas/clave.html` |
| Apagón | Paso a paso del corte de facturación en 1 dólar, con las órdenes listas para copiar | `guia/paginas/apagon.html` |
| Encender la nube | Autorizar el dominio y publicar las reglas de Firestore y Storage | `guia/paginas/reglas.html` |

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
- **El nombre del modelo tampoco se escribe en el código.** Fijar
  `gemini-2.5-flash-lite` devolvió un 404 en el primer uso real: los modelos se
  retiran, cambian de nombre y no son los mismos para todas las claves. Ahora la
  app **le pregunta a Google qué modelos tiene tu clave** y elige el mejor —
  prefiriendo Flash-Lite, que es el que más cuota gratuita da y para traducir una
  frase sobra. Si el modelo elegido desaparece, vuelve a preguntar y reintenta
  sola. Es el mismo error que el del prefijo de la clave, cometido dos veces:
  **cualquier identificador de un servicio ajeno escrito en el código caduca.**
- **Las claves de Gemini cambiaron de formato.** Las nuevas empiezan por `AQ.Ab`
  en vez de `AIza`, y las viejas dejan de funcionar en septiembre de 2026. Por eso
  la app no valida el formato: cualquier comprobación que mire las primeras letras
  se queda vieja sola. En su lugar hay un botón que **prueba la clave de verdad**,
  con una traducción mínima.
- **Google sí permite llamar a Gemini desde el navegador.** Comprobado contra la
  API: responde al preflight autorizando el dominio de la app y la cabecera
  `x-goog-api-key`. Sin eso, todo el hito 3 habría necesitado un servidor de por
  medio, y con él se habría ido el «cero costo».
- **Guardar el progreso «cada rato» abre una ventana para perderlo.** Escribir en
  disco en cada página es un desperdicio, así que se acumulaba y se guardaba cada
  segundo y medio. Pero salir del libro dentro de esa ventana perdía la última
  página, y perder por dónde ibas es de las peores cosas que puede hacer un
  lector. Ahora se guarda **antes** de salir, y también al irte de la app.
- **Todo lo que vive abajo tiene que ir apilado, no flotando.** El aviso de «vas
  por la página X» estaba posicionado por su cuenta y aterrizaba justo encima de
  los controles del lector. Va dentro de la misma zona que la burbuja, y lo demás
  se apoya encima midiéndola.
- **Un service worker que espera permiso bloquea las actualizaciones para
  siempre.** Se configuró para que pidiera paso a la página antes de tomar el
  mando, con la idea de no recargar a mitad de lectura. Pero la página que tenía
  que darle paso era la vieja, que no sabe hacerlo, así que la versión nueva se
  quedó esperando indefinidamente; y con varias pestañas abiertas tampoco podía
  activarse por su cuenta. **El service worker toma el mando siempre; quien
  decide cuándo recargar es la app**, que para eso avisa. Son dos decisiones
  distintas y mezclarlas costó una versión atascada.
- **La versión tiene que verse en pantalla.** Sin ella, la única forma de saber
  si lo que tienes delante es lo último era cerrar la app y volver a abrirla a
  ciegas. Es el commit del que salió la compilación, así que cambia solo con cada
  cambio: nadie tiene que acordarse de subirlo. Y se toca para preguntar si hay
  algo más nuevo, porque la duda real no es «qué versión tengo» sino «¿estoy
  viendo lo último?».
- **Lo que se dibuja en el renderizado, el renderizado lo deshace.** El giro de
  la hoja se aplicaba en el estilo del componente, así que cualquier repintado a
  mitad del gesto —y dibujar la página vecina provoca uno— la devolvía a su
  posición de partida. Al avanzar se notaba poco, porque partir de cero se parece
  a empezar. Al volver, la posición de partida es «de canto e invisible», así que
  la página desaparecía y saltaba de golpe. Lo que el dedo controla lo aplica el
  dedo, y se vuelve a aplicar después de cada renderizado.
- **Media vuelta no cabe en una pantalla.** El volteo giraba 180°, y al volver
  atrás la página pasaba **la primera mitad del gesto fuera de la pantalla**, a la
  izquierda del lomo: arrastrabas y no se movía nada. Con un cuarto de vuelta la
  hoja gira hasta quedar de canto —donde deja de verse igualmente— y las dos
  direcciones ocurren enteras dentro de la pantalla, con el mismo recorrido. Un
  libro de verdad tiene el lomo en el centro; aquí está en el borde, y esa
  diferencia no se puede ignorar.
- **La hoja es una tarjeta de papel, no la página.** Cada página va centrada
  sobre una hoja del tamaño del área de lectura, y lo que sobra queda en blanco.
  Antes cada hoja medía lo que su página, así que en un cómic con dobles páginas
  la de detrás asomaba alrededor de la de delante durante el volteo.
- **Cada hoja necesita su propia medida.** Un cómic mezcla páginas verticales con
  dobles páginas horizontales, y durante el volteo hay dos en pantalla a la vez.
  Con una sola medida compartida, la que no encajaba se estiraba dentro del marco
  de la otra. Era la causa de fondo de la «página achatada», y ningún PDF de
  prueba con todas las páginas iguales lo habría destapado.
- **Los redibujados llevan número.** Dibujar una página tarda, y si mientras
  tanto cambia el tamaño —el teclado abriéndose, por ejemplo— el resultado que
  llega tarde ya no vale. Aplicarlo era lo que dejaba la página achatada: un
  lienzo viejo estirado dentro de un marco nuevo.
- **Con el teclado abierto no cabe todo.** La barra del traductor, los controles
  del lector y el aviso de «vas por la página X» se amontonaban al escribir. Se
  resolvió por tres lados: la ventana se encoge con el teclado en vez de quedar
  tapada, los controles del lector se apartan mientras la burbuja está en uso, y
  el aviso se va solo a los siete segundos.
- **Un error de cuota no es un número.** Cuando se agotan las 1.000 traducciones
  del día, la app dice a qué hora vuelven, calculado desde la medianoche del
  Pacífico que es cuando Google las repone (P31).
- **«Se carga cuando hace falta» no se cumple solo: hay que vigilarlo.** D-08
  promete que sin cuenta Firebase no se descarga. Para poder comprobarlo hubo
  que **darle nombre a los trozos** —`firebase-sesion`, `-datos`, `-archivos`,
  `-comun`—, porque el empaquetador los llamaba a todos `index.esm` y en el
  navegador eran indistinguibles. Sin nombre, la comprobación no era difícil:
  era imposible.
- **Una prueba que no puede fallar no está probando nada.** La primera versión de
  esa comprobación pasó a la primera, y pasó *en falso*: buscaba «firebase» en
  los nombres de archivo y ningún archivo se llamaba así. Con los trozos ya
  nombrados, falló — y tenía razón. **Antes de creerse un OK conviene romperlo a
  propósito una vez** y ver que se pone rojo.
- **Cargar «Firebase» de golpe no es cargarlo cuando hace falta.** El código
  pedía las cuatro partes en la misma línea, así que entrar con Google se traía
  también la base de datos y el almacén de archivos. Ahora cada parte se pide por
  separado y la primera vez que se usa: entrar cuesta 50 kB en vez de 240.
- **La ruta de un paquete puede contener su propio nombre dos veces.** El auth de
  Firebase vive en `node_modules/firebase/node_modules/@firebase/auth`, y la
  regla que decidía a qué trozo iba cada archivo se quedaba con la **primera**
  coincidencia: metía 450 kB de sesión dentro del trozo común, que se descarga
  siempre. Vale la última, no la primera. **Con las cuentas de un empaquetador no
  basta con que sumen: hay que mirar qué hay dentro de cada trozo.**
- **Apuntar a un botón por su posición se rompe al añadir otro botón.** Una
  prueba pulsaba «el primer botón de la primera tarjeta» de los ajustes. Al
  llegar la tarjeta de la cuenta, ese botón pasó a ser «Entrar con Google» y la
  clave del traductor dejó de guardarse. La prueba tenía razón en fallar, pero
  señalaba el sitio equivocado: **en una prueba, se apunta por lo que algo dice,
  no por dónde está.**
- **Poner la fecha dentro del paquete rompió la forma de verificarlo.** Cada
  compilación cambiaba el contenido del paquete principal —y su hash, y el de
  todo lo que lo importa— aunque el código fuera idéntico, así que ya no se podía
  comparar byte a byte lo publicado con lo compilado aquí. La fecha se puede
  fijar desde fuera y `verificar.sh` lee la de lo publicado y recompila con ella:
  22 de 22 archivos idénticos. **Una comprobación que se relaja para seguir
  pasando deja de comprobar; la que se arregla, sigue sirviendo.**
- **`window.open` con `noopener` siempre devuelve `null`.** El botón de crear
  portada abría el generador y decía «el navegador no dejó abrirlo», porque no
  hay forma de distinguir «se abrió» de «lo bloquearon» cuando la respuesta es
  siempre la misma. Se abre sin esa opción y se corta el enlace de vuelta a mano
  (`ventana.opener = null`), que consigue lo mismo sin quedarse ciego. Lo
  encontró la prueba, no el uso.
- **La vista previa de la ficha tenía que llevar también el tipo y las
  etiquetas.** Servía para pintar la portada, que no los necesita, así que no
  los llevaba. Cuando pasó a componer también el encargo, marcar «Cómic» y
  añadir etiquetas antes de guardar no llegaba al prompt. Una estructura que
  sirve para dos cosas tiene que estar completa para las dos.
- **Compartir y «tener a mano» no son lo mismo, y mezclarlos se nota.** La
  primera versión del estante hacía de compartir un acto: marcabas un libro y la
  otra persona lo veía. Al usarlo aparece el modelo de verdad: **el catálogo es
  común y lo que se elige es qué tienes tú a mano**. Es la misma pieza por
  dentro —lo que cambió fue de quién es el gesto— pero la diferencia entre las
  dos versiones es que en la segunda nadie tiene que acordarse de compartir nada.
- **Abrir algo y cerrarlo son dos caminos, y el segundo se olvida.** La pila de
  atrás funcionaba a la primera abriendo capas; lo que no funcionaba era cerrar
  una con su propio botón, que dejaba su entrada de historial huérfana. El
  síntoma no se ve —nada se rompe— hasta que un día atrás no hace nada y hay que
  pulsarlo tres veces. **Cuando algo apila estado, la comprobación que importa
  no es la del camino de ida.**
- **Una compilación que falla no borra la anterior.** El servidor sigue
  sirviendo el paquete de antes y las pruebas pasan **contra él**: verde sin
  haber probado nada. Pasó dos veces en la misma tarde, y las dos justo mientras
  comprobaba a propósito que una prueba fallaba — no fallaba porque el arreglo
  roto ni siquiera había llegado al paquete. Ahora las pruebas de navegador se
  niegan a arrancar si algo de `src/` es más nuevo que `dist/`
  (`pruebas/fresco.mjs`). **El falso verde más peligroso no es una comprobación
  mal escrita: es una comprobación correcta mirando al sitio equivocado.**
- **Un teclado no es un cambio de tamaño.** El navegador lo cuenta como si la
  ventana se hubiera encogido, y todo lo que reacciona al tamaño reacciona: se
  reparte la página otra vez, se redibuja, se recorta el zoom. Pero lo que ha
  pasado no es que haya menos sitio, es que hay algo delante. Se congela la
  medida mientras dura y se acabó el problema.
- **Automatizar algo convierte sus fallos raros en fallos de todos los días.**
  Quitar una palabra borraba sin dejar lápida, y la sincronización nunca
  aplicaba lo quitado en el otro aparato. Con un botón de guardar, quitar era
  algo que pasaba una vez al mes y el fallo no se veía. En cuanto se guarda
  solo, quitar pasa a ser lo normal — y el fallo, diario. **Antes de automatizar
  algo conviene mirar qué se vuelve frecuente por su culpa.**
- **Un panel que se abre tocando tiene que cerrarse tocando fuera.** El de las
  notas salía solo con su ✕, que es pequeña y está lejos del pulgar. Lleva un
  telón transparente por debajo que lo cierra al tocar la página — pero que **no
  tapa la burbuja**, porque esa sigue siendo suya mientras el panel está abierto.
- **Una clase de CSS reutilizada mezcla dos significados.** El error de sesión
  se pintaba con la clase del resultado de «probar la clave» porque se parecían.
  Se ven igual y son cosas distintas, y en cuanto una prueba mira «el aviso rojo»
  ya no se sabe cuál de los dos encontró. Cada uno con su nombre.

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
- **2026-08-27** — Primer uso real, y dos fallos que solo aparecen ahí: el
  traductor devolvía 404 porque el modelo estaba fijado en el código, y con el
  teclado abierto se amontonaban tres cosas en el mismo sitio. El modelo pasa a
  descubrirse preguntándole a Google, con reintento si se retira; y la interfaz
  del lector se aparta mientras escribes. 94 comprobaciones en total.
- **2026-08-27** — Segunda ronda de uso real. Se corrige que el aviso de retomar
  se pisara con los controles, y que la página apareciera achatada al cambiarla
  con el teclado abierto. Al escribir la prueba del aviso apareció un fallo peor
  que no se había visto: **salir de un libro en menos de segundo y medio perdía
  por dónde ibas**. La app pasa a buscar sus propias actualizaciones y a
  ofrecerlas sin interrumpir la lectura. 99 comprobaciones.
- **2026-08-27** — La «página achatada» tenía una segunda causa, más de fondo:
  las dobles páginas horizontales de un cómic compartían medida con las
  verticales y se estiraban unas dentro del marco de otras. Cada hoja pasa a
  medirse por su cuenta. Se añade `pruebas/comic.mjs` con un PDF de tamaños
  mezclados, que es el caso que ningún PDF uniforme habría destapado. 107
  comprobaciones.
- **2026-08-27** — La versión se muestra al pie de la biblioteca y en los
  ajustes, y tocarla busca actualizaciones al momento. 109 comprobaciones.
- **2026-08-27** — La versión no llegaba al teléfono: el service worker esperaba
  un permiso que la versión vieja no sabía darle y se quedó bloqueado. Se separa
  quién toma el mando (el service worker, siempre) de quién decide recargar (la
  app, avisando). Se añaden dos comprobaciones en `en-vivo.mjs` para que no
  vuelva a colarse. 111 comprobaciones.
- **2026-08-27** — Dos mejoras del volteo pedidas tras leer un cómic de verdad:
  lo que sobra alrededor de la página se rellena de blanco, para que no se vea la
  hoja de detrás; y el giro pasa de media vuelta a un cuarto, porque al volver
  atrás la página pasaba media pantalla fuera del encuadre y arrastrar se sentía
  muerto. 113 comprobaciones.
- **2026-08-27** — Tercera ronda sobre el mismo cómic. El relleno de la hoja pasa
  de blanco al color del fondo. Se arregla que volver atrás saltara de golpe: el
  giro se perdía en cada repintado. Y entra el **zoom con doble toque**, que
  centra lo tocado y se deshace con otro doble toque; acercado, arrastrar pasea
  la vista en vez de pasar página. 121 comprobaciones.
- **2026-08-27** — **Hito 4: la nube.** Entrar con Google hace que el progreso,
  las etiquetas, el vocabulario y los PDF viajen entre el celular y la PC; sin
  cuenta, Vellum sigue entera. La fusión entre aparatos (D-21) es gana-el-más-
  reciente con lápidas, en un archivo aparte y sin Firebase dentro, para poder
  probarla sin navegador. Los archivos suben de uno en uno y con freno de datos
  móviles. La clave de Gemini se queda fuera de la sincronización a propósito.
  Una prueba nueva vigila la promesa de D-08 —sin sesión no se descarga ni una
  línea de Firebase— y para poder vigilarla hubo que dar nombre a los trozos del
  paquete; al hacerlo destapó dos fallos míos: que las cuatro partes se cargaban
  de golpe, y que la sesión entera estaba dentro del trozo común. Entrar cuesta
  ahora 50 kB en vez de 240. 149 comprobaciones.
- **2026-08-27** — **El apagón** (D-22): el corte de facturación deja de ser una
  intención y pasa a ser código, en `apagon/`. Un presupuesto de Google avisa
  pero no corta; esto desengancha la cuenta de facturación cuando el gasto pasa
  de un dólar. Con 14 comprobaciones de la decisión —qué avisos cortan y cuáles
  no— y una página con el paso a paso, `guia/paginas/apagon.html`. Lo que ninguna
  prueba cubre queda escrito: que Google acepte el corte el día que toque solo se
  sabe cuando pase, y por eso el tope está en un dólar. 163 comprobaciones.
- **2026-08-27** — **Hito 5: las portadas.** El botón *Crear portada* compone el
  encargo con lo que estás editando —título, tipo, etiquetas, nombre del archivo
  original—, lo copia y abre Gemini. El encargo se enseña entero: si el
  portapapeles falla, que falla, tiene que estar a la vista. La comprobación que
  importa no es que el texto salga, sino que **salga idéntico entre dos obras
  distintas salvo el encabezado**: es lo único que notaría que alguien metió una
  variable dentro del estilo y que, a los seis meses, la biblioteca dejó de
  verse entera. Se comprobó rompiéndolo a propósito antes de creérselo. Los
  libros nuevos guardan el nombre del archivo original, que a veces lleva el
  tomo o el año que el título ya no dice. 195 comprobaciones.
- **2026-08-27** — **Lo traducido se queda en su página** (D-23). Al guardar una
  traducción, la página se marca con un marcapáginas en el borde derecho; se toca
  y sale lo que tradujiste ahí, con la frase y su traducción. Sobrevive a cambiar
  de página, a cerrar el libro y a recargar, porque no es un almacén nuevo: es el
  vocabulario de siempre mirado por página. El botón de la burbuja pasa a decir
  «Guardar en la página», que es lo que de verdad hace ahora. 13 comprobaciones
  más, entre ellas que la marca no se pisa con nada — que ya pasó una vez con el
  aviso de retomar. 208 comprobaciones.
- **2026-08-27** — **La traducción se guarda sola** (D-24). Se quita el botón:
  en cuanto está entera, se guarda y la página queda marcada. La burbuja lo dice
  y ofrece Quitar al lado, porque guardar en silencio y sin salida sería peor.
  Traducir lo mismo dos veces no duplica, y volver a traducir algo que quitaste
  revive su entrada. Al hacerlo aparecieron dos fallos de la sincronización que
  el botón tapaba: quitar una palabra borraba sin dejar lápida —la nube la
  devolvía— y lo quitado en el otro aparato no se aplicaba aquí nunca. 215
  comprobaciones.
- **2026-08-27** — **El teclado deja de mover la página** (D-25). Con el zoom
  puesto, abrir el teclado corría de sitio justo lo que estabas mirando: la
  ventana se encoge y el lector le hacía caso. Ahora la medida se congela
  mientras la burbuja está en uso; se prefiere tapar antes que mover. Seis
  comprobaciones nuevas, y se quitó el arreglo a propósito para ver cuáles se
  ponían rojas de verdad: las dos que importan. 221 comprobaciones.
- **2026-08-27** — **Flechas en la PC y pellizco en el teléfono** (D-26). Las
  flechas voltean la hoja con la misma animación que el dedo —esperando a que la
  página vecina esté dibujada, o lo que giraría sería una hoja en blanco— y dos
  dedos acercan anclando lo que hay entre ellos. De paso se arregla que escribir
  en el traductor pasara de página: solo se excluía `INPUT` y la burbuja es un
  `TEXTAREA`. Y algo más importante que las dos cosas: las pruebas de navegador
  ahora **se niegan a correr contra un paquete viejo**, después de descubrir que
  dos comprobaciones «rotas a propósito» habían pasado por eso. 242
  comprobaciones.
- **2026-08-27** — **Atrás deja de sacarte de la app** (D-27). Cierra capas de
  dentro hacia fuera: traductor, notas, selección, acercamiento, ficha, libro,
  pantallas. Una prueba nueva con 18 comprobaciones, y la que más costó no es
  ninguna de las visibles: que cerrar algo a mano no deje su entrada de
  historial colgando. Se comprobó quitando la limpieza a propósito, y falla como
  debe. 260 comprobaciones.
- **2026-08-27** — El campo del traductor se vacía al mandar (D-28), para poder
  encadenar frases sin borrar la anterior. Si la traducción falla, lo escrito
  vuelve al campo. 263 comprobaciones.
- **2026-08-27** — **El catálogo de la casa** (D-29) y **la clave por perfil**
  (D-30). Todo lo que sube cualquiera va a un catálogo común que se busca entero;
  la estrella decide qué hay en tu estantería. Reglas nuevas para Firestore y
  Storage, con la lista de miembros en `casa/miembros`, que solo se toca desde la
  consola. La clave de Gemini pasa a ser una por cuenta en este aparato, porque
  las mil traducciones del día van con la clave y no con la app. Y un tutorial
  entero para sacarla, con enlaces, para pasárselo a quien vaya a usar Vellum.
  19 comprobaciones nuevas del catálogo, sin red y sin cuenta. 275
  comprobaciones.
