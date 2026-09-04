# Pruebas

No hay marco de pruebas ni configuración: son guiones sueltos. Casi todos abren
Chromium y usan la app como la usarías tú; unas cuantas —la fusión entre
aparatos, el corte de facturación, el catálogo, el kana, el orden de una serie—
corren solas en Node, porque lo que prueban es una decisión y no necesita
navegador.

```bash
npm run build
npx vite preview --port 4173 --host 127.0.0.1 &
node pruebas/lectura.mjs      # 43 comprobaciones · leer, las flechas y los dos modos de pasar página
node pruebas/biblioteca.mjs   # 48 comprobaciones · la estantería y crear portada
node pruebas/traductor.mjs    # 90 comprobaciones · el traductor, las notas, el japonés y el tutorial
node pruebas/cola.mjs         # 21 comprobaciones · mandar varias traducciones y seguir leyendo
node pruebas/comic.mjs        # 29 comprobaciones · tamaños mezclados, zoom, pellizco y teclado
node pruebas/nube.mjs         # 14 comprobaciones · hito 4, la nube sin cuenta
node pruebas/atras.mjs        # 18 comprobaciones · el botón de atrás del teléfono
node pruebas/compartir.mjs    # 15 comprobaciones · abrir un PDF desde fuera de la app
node pruebas/paquete.mjs      # 37 comprobaciones · cómics en CBZ y CBR, y zips con colecciones dentro
node pruebas/serie.mjs        # 38 comprobaciones · las series: la tapa, el orden y leer sin parar
node pruebas/capturas.mjs     # capturas de cada estado

# Sin navegador: se ejecutan solas
node pruebas/fusion.mjs       # 14 comprobaciones · la fusión entre aparatos
node pruebas/apagon.mjs       # 14 comprobaciones · el corte de facturación
node pruebas/portadas.mjs     #  9 comprobaciones · la búsqueda de portada
node pruebas/estante.mjs      # 19 comprobaciones · el catálogo de la casa
node pruebas/kana.mjs         # 19 comprobaciones · el teclado japonés
node pruebas/series.mjs       # 35 comprobaciones · el orden de una serie y dónde ibas
node pruebas/reloj.mjs        # 14 comprobaciones · que ninguna espera pueda ser eterna
node pruebas/zip.mjs          # 34 comprobaciones · leer y escribir zip, byte a byte

# Contra la app publicada
node pruebas/en-vivo.mjs      # 15 comprobaciones sobre la app en su dirección real
```

`SC` es la carpeta donde están el PDF de prueba y donde se guardan las
capturas. Por defecto, `/tmp`.

**Las pruebas de navegador no arrancan si `dist/` es más viejo que `src/`.** Una
compilación que falla no borra la anterior: el servidor sigue sirviendo el
paquete de antes y las pruebas pasan contra él, verdes sin haber probado nada.
Eso lo corta `pruebas/fresco.mjs`.

Los archivos de prueba se generan aquí mismo:

```bash
python3 pruebas/gen_pdf.py 6 /tmp/Cronica_de_una_prueba.pdf
python3 pruebas/hacer-paquetes.py /tmp     # los CBZ, los CBR y los zips
```

`gen_pdf.py` escribe el PDF byte a byte, `hacer-paquetes.py` los PNG, y
`rar5.py` **un RAR entero a mano**: no hay forma libre de crear uno, y sin él no
se podría comprobar de verdad que la app abre un `.cbr`. Cada PDF lleva su nombre escrito dentro: si no, dos
archivos con el mismo número de páginas salen byte a byte idénticos y Vellum los
toma por repetidos — cosa que, dicho sea de paso, demuestra que la detección de
repetidos funciona.

## Qué comprueba `lectura.mjs`

Cada comprobación apunta al requisito de la Guía que le da sentido, para que se
vea de dónde sale y no parezca una prueba puesta por costumbre.

| Comprueba | Requisito |
|---|---|
| La biblioteca vacía aparece | R4 |
| Importa un PDF y lo guarda | R5 · P5 |
| Limpia el nombre del archivo para proponer título | P42 |
| Cuenta bien las páginas | — |
| No duplica un PDF repetido, y avisa | R24 · P37 |
| Dibuja la página | R1 |
| El tema por defecto es papel | R33 · P59 |
| La interfaz arranca oculta | R37 · P62 |
| El número de página se ve mientras lees | R53 · P53 |
| Arrastrar pasa de página | R28 · R13 · P51 |
| Un arrastre corto no pasa de página | P51 |
| Arrastrar al revés vuelve atrás | P51 |
| La hoja que gira no se sale de la pantalla, ni avanzando ni volviendo | P51 |
| Volver atrás se anima durante todo el gesto, y la hoja se ve mientras vuelve | P51 |
| Un toque muestra la interfaz | R37 · P62 |
| Saltar escribiendo el número | R13 · P52 |
| Cambiar de tema | R14 |
| Guarda por dónde ibas | R16 · P15 |
| La biblioteca sobrevive a recargar | D-03 |
| Ofrece volver al principio, y el aviso no se pisa con los controles | P62 · P63 |
| El aviso se va solo a los pocos segundos | P63 |
| Salir enseguida de saltar de página no pierde por dónde ibas | R16 · P15 |
| **Las flechas voltean la hoja, no saltan de página** | D-26 |
| Por defecto, tocar el borde abre la interfaz y no pasa página | D-32 |
| En modo «tocar»: el borde derecho avanza, el izquierdo vuelve | D-32 |
| Y el centro sigue abriendo la interfaz | D-32 |
| Deslizar sigue funcionando en los dos modos | D-32 |
| Escribiendo en el traductor, las flechas mueven el cursor | D-26 |

## Qué comprueba `biblioteca.mjs`

| Comprueba | Requisito |
|---|---|
| Traer varios PDF de una vez | R5 |
| Traer uno solo abre su ficha para ponerle título | P42 |
| Con varios no interroga | — |
| Escribir el título, y que se vea en la portada | R23 · P42 |
| Marcar si es libro o cómic | D-17 · P61 |
| Poner y quitar etiquetas, normalizadas a minúsculas | R38 · P38 |
| No repetir una etiqueta ya puesta | — |
| Salir con Escape no guarda | — |
| Sugerir etiquetas que ya usaste | P38 |
| Filtrar por etiqueta, y quitar el filtro | R38 · P38 |
| Buscar por título, sin tildes y sin distinguir mayúsculas | R27 · P41 |
| Buscar por etiqueta | P41 |
| Decir con palabras que no hay resultados | R8 |
| Poner una portada propia | R26 · P40 |
| Con imagen, el título NO se escribe encima | D-31 |
| En la portada hay exactamente dos botones | D-31 |
| Buscar lleva a Google Imágenes con «portada» y el título | D-31 |
| Lo empezado sube arriba del todo | R25 · P39 |
| Al buscar no se destaca nada | — |
| Preguntar antes de borrar, y borrar de verdad | — |
| Que todo sobreviva a recargar | D-03 |
| La versión se ve al pie del inicio, y tocarla busca actualizaciones | — |
| «Crear portada» copia el encargo y abre el generador | D-13 |
| El encargo se lleva lo que estás editando, sin haber guardado | D-13 |
| Lo que se ve en pantalla es exactamente lo que se copió | D-13 |

## Qué comprueba `traductor.mjs`

No gasta cuota de Gemini: sustituye `fetch` dentro de la página y construye la
respuesta a mano, en trozos y con retardos reales. Así se ejerce el cliente
entero —lector del cuerpo, troceado SSE, parseo a medias— y se puede comprobar
lo único que justifica todo ese trabajo: que la traducción sale antes que el
resto.

| Comprueba | Requisito |
|---|---|
| La barra del traductor está siempre visible | R30 · P55 |
| El botón «Probar la clave» la prueba de verdad, y dice el motivo si no vale | P26 · P31 |
| Elige el mejor modelo de los que ofrece la clave, descartando los inservibles | — |
| Si el modelo se retira, vuelve a preguntar y reintenta sola | — |
| Al escribir, los controles del lector se apartan, y vuelven al salir del campo | R19 |
| El campo crece con el texto en vez de cortarlo | — |
| Sin clave lo explica y ofrece ir a los ajustes | P31 · D-09 |
| La clave se guarda, sobrevive a recargar y llega oculta | D-09 · P26 |
| **La traducción aparece antes que las pestañas** | R19 · R20 · P28 |
| Con un modismo, la pestaña de aviso va primero y se abre sola | R20 · P28 |
| Con una palabra suelta, su ficha va primero, con pronunciación y ejemplo | R20 · P28 |
| Las pestañas de literal y contexto | R30 · P54 |
| **El tutorial de la clave está dentro de la app**, con enlace a AI Studio | D-34 |
| Y avisa de lo único que puede costar dinero | D-34 |
| Al mandar, el campo se vacía y lo mandado queda a la vista | D-28 |
| Si falla, lo escrito vuelve al campo | D-28 |
| **La traducción se guarda sola, sin botón** | D-24 |
| Traducir lo mismo dos veces no duplica ni crea dos marcas | D-24 |
| «Quitar» la borra y la marca desaparece | D-24 |
| Y volver a traducirla la devuelve, sin lápida huérfana | D-24 |
| Quitar deja lápida, no borra: la nube no la devuelve | D-21 · D-24 |
| El vocabulario guarda lo consultado, con libro y página | R17 · P57 |
| Cuota agotada: lo dice y a qué hora vuelve | P31 |
| Clave inválida, servidor saturado y sin red, cada uno con su mensaje | R8 |
| El modo selección avisa de cómo funciona | D-18 · P56 |
| Seleccionar sobre la página rellena la burbuja | R31 · P56 |
| Al guardar, la página se marca en el momento | D-23 |
| La marca dice cuántas hay, y abre la frase y su traducción | D-23 |
| **Al volver a esa página, la marca sigue ahí** | D-23 |
| Y sobrevive a cerrar el libro y volver a abrirlo | D-23 |
| En una página sin nada traducido no hay marca | D-23 |
| La marca y el panel no se pisan con la burbuja | D-23 |
| Tocar fuera cierra el panel | D-23 |

## Qué comprueba `comic.mjs`

Un cómic de verdad mezcla páginas verticales con dobles páginas horizontales, y
durante el volteo hay dos en pantalla a la vez. Este es el caso que rompió la
app en el uso real y que ningún PDF de prueba uniforme habría destapado.

| Comprueba |
|---|
| Una página vertical se dibuja sin deformar |
| Durante el volteo conviven dos hojas, cada una con su forma |
| Ninguna de las dos se estira dentro del marco de la otra |
| Una doble página se dibuja sin deformar y aprovecha el ancho |
| Las dos hojas de papel miden lo mismo, para que ninguna deje ver la de detrás |
| El papel sobrante toma el color del fondo, opaco |
| El doble toque acerca la página y centra lo que tocaste |
| Acercado, arrastrar mueve la vista y no pasa de página |
| **Pellizcar acerca, con el tope en ×5** | 
| Y lo que estaba entre los dedos sigue entre los dedos |
| Juntarlos la devuelve a su tamaño y quita el modo acercado |
| Pellizcar no pasa de página |
| **Con el teclado abierto, la página no se mueve ni se redibuja** |
| Al cerrarse, vuelve a ocupar lo suyo |
| Y si el tamaño cambió de verdad, se entera al soltar el campo |
| Otro doble toque la devuelve a su sitio |

El PDF de prueba se genera con `gen_mixto.py`: páginas impares verticales,
pares horizontales.

## Qué comprueba `nube.mjs`

Iniciar sesión de verdad abre una ventana de Google que no se puede automatizar.
Lo que sí se puede comprobar —y es lo que más importa— es la promesa de D-08:
**sin cuenta, Vellum no descarga Firebase ni depende de él**. Esa es justo la
que se rompería sin que nadie lo notara, porque la app seguiría funcionando
igual, solo que arrancando más lenta.

Para poder mirarlo, los trozos del paquete llevan nombre propio
(`firebase-sesion`, `-datos`, `-archivos`, `-comun`). Sin eso el empaquetador
los llama a todos `index.esm` y la comprobación no es difícil: es imposible.

| Comprueba | Requisito |
|---|---|
| Sin sesión no se descarga ni una línea de Firebase | D-08 |
| Se puede importar, leer y organizar sin cuenta | D-08 · R4 |
| Usar la app tampoco la descarga | D-08 |
| Abrir los ajustes tampoco | D-08 |
| Sin sesión no hay indicador de nube | — |
| Los ajustes explican para qué sirve entrar, y que sin cuenta funciona todo | R8 |
| Dicen dónde vive todo, y que la clave de Gemini nunca viaja | D-09 |
| **Al pulsar entrar llega solo la sesión, no los datos ni los archivos** | D-08 |

## Qué comprueba `fusion.mjs`

La fusión entre aparatos es la pieza que puede perder datos en silencio, así que
vive aparte, sin Firebase dentro, y se prueba sin navegador. Gana el cambio más
reciente; borrar deja una lápida que también viaja (D-21).

## Qué comprueba `apagon.mjs`

La decisión del corte de facturación: con qué avisos corta y con cuáles no. Un
mensaje vacío no corta, un importe que no es número no corta, justo en el tope
no corta, un céntimo por encima sí. **No comprueba que Google acepte el corte**
— eso solo se sabe el día que pase, y por eso el tope está en un dólar.

## Qué comprueba `portadas.mjs`

La dirección de «Buscar portada». Solo hay una cosa que pueda salir mal sin dar
ningún error: que se arme mal y te lleve a buscar cualquier cosa menos la
portada. Un título con acentos, con ñ, con espacios o con un signo raro es lo
normal en una biblioteca en español.

Que los dos botones son dos y hacen lo suyo se comprueba en `biblioteca.mjs`.

## Qué comprueba `kana.mjs`

Las tablas del teclado japonés y las transformaciones, sin navegador. Lo que
puede salir mal aquí sin dar ningún error: que la conversión a katakana se coma
una letra, que el dakuten se aplique a lo que no toca, o que algo funcione en
hiragana y no en katakana.

| Comprueba | Requisito |
|---|---|
| Están las diez filas del 五十音 y sus 48 kana, sin repetidos | D-33 |
| Dakuten, handakuten y pequeñas, sobre la última letra | D-33 |
| **Y funciona igual en katakana**, devolviendo el silabario en que estaba | D-33 |
| Lo que no tiene transformación se queda como está | D-33 |

Lo que **no** cubre: los kanji, porque el teclado no los escribe (D-33).

## Qué comprueba `estante.mjs`

El catálogo de la casa, sin red y sin cuenta. Es la parte que puede hacer daño
en silencio: borrar el libro de otra persona, resucitar uno que retiró, o volver
a subir el mismo PDF en cada sincronización — nada de eso da un error en
pantalla.

| Comprueba | Requisito |
|---|---|
| Todo lo que traes va al catálogo, sin marcarlo | D-29 |
| **Lo que no cambió no se vuelve a subir** | D-29 |
| Borrarlo lo saca del catálogo, para todos | D-29 |
| **Nunca se retira ni se pisa lo de otra persona** | D-29 |
| Lo que retira, se va de aquí y no se le devuelve | D-29 |
| Quitarse la estrella no toca el catálogo de nadie | D-29 |

Lo que **no** cubre: que dos cuentas de verdad se vean entre ellas. Eso necesita
dos cuentas de Google y una ventana que no se puede automatizar.

Las **pestañas y la estrella** tampoco: solo aparecen con sesión. Lo que sí se
comprueba, en `biblioteca.mjs` y sin cuenta, es la regla que hay debajo —**tu
estantería son los marcados**— tocando la marca directamente en la base de
datos: quitarla saca el libro de la vista sin borrarlo de ningún sitio, y
devolverla lo trae de vuelta. La parte visual se revisó a mano, con capturas.

## Qué comprueban `zip.mjs` y `paquete.mjs`

`zip.mjs` corre sin navegador y prueba el lector de zip contra archivos que
**hace otro programa** —el `zipfile` de Python—, no nosotros: si los
escribiéramos con el mismo entendimiento del formato que tenemos al leerlos, un
malentendido pasaría desapercibido. Equivocarse aquí no da un error bonito; da
un PDF vacío o medio tomo.

| Comprueba | Requisito |
|---|---|
| Se listan los ficheros con su ruta y su tamaño de verdad | D-39 |
| **Los nombres con tilde se leen bien** | D-39 |
| **La carpeta `__MACOSX` y los ocultos se descartan** | D-39 |
| Se sacan enteros, comprimidos y sin comprimir | D-39 |
| Un comentario largo al final no despista | D-39 |
| **Con más de 65.535 ficheros se leen todos** | D-39 |
| **Y un zip marcado como de más de 4 GB también** | D-39 |
| Un zip con contraseña se detecta y se dice | D-39 |
| Lo que no es un zip se dice, no se revienta | D-39 |
| **Abrir un zip no lo lee entero** — se mide con un Blob que cuenta bytes | D-39 |
| **Y sacar un fichero guardado tal cual no lee su contenido** | D-39 |
| Se puede **escribir** un zip, y **otro programa lo abre** | D-40 |
| El CRC32 es el mismo que calcula zlib | D-40 |

`paquete.mjs` prueba lo de después: no que el zip se abra, sino que un cómic se
lea y que una colección entre entera.

| Comprueba | Requisito |
|---|---|
| Un CBZ entra, cuenta sus páginas y nace marcado como cómic | D-39 |
| **Se abre y se dibuja como un PDF** | D-39 |
| **Y sus páginas salen en el orden en que las leería una persona** | D-39 · D-36 |
| En un escaneado se dice que no hay texto que seleccionar | D-18 |
| **Un zip trae todos los libros que lleva dentro** | D-39 |
| La carpeta de dentro les da nombre de serie, y el orden se conserva | D-39 |
| El mismo zip dos veces no duplica nada | R24 |
| Un zip sin nada que sirva lo dice con palabras | R8 |
| Y con un CBR dentro explica por qué no puede | D-39 |
| **Un `.cbr` que por dentro es un zip entra igual** | D-39 |
| **Y uno en RAR de verdad se convierte al traerlo** | D-40 |
| Convertirlo dos veces no crea otro libro | D-40 |
| Un CBR sin nada dentro se dice, sin tumbar nada | R8 |
| **El selector no filtra por tipo**, que en Android escondía los zip | D-39 |
| Una foto elegida por error no se cuela, y se dice en una frase | R8 |

Lo que **no** cubren: un cómic real de 300 MB. Los de prueba son imágenes de
cuarenta píxeles, así que lo que no se mide aquí es cuánto tarda en descomprimir
y dibujar una página escaneada de verdad.

## Qué comprueban `reloj.mjs` y `cola.mjs`

Los dos salen de la misma avería, vista usando la app: una traducción tardó
cinco minutos sin decir si iba o si se había roto.

`reloj.mjs` corre sin navegador, con un `fetch` que **nunca contesta**. Es la
única forma de probar esto: con buena red no pasa nunca, y `fetch` no falla
cuando la red se queda a medias — simplemente no vuelve.

| Comprueba | Requisito |
|---|---|
| **Una respuesta que no llega se corta sola** | D-37 |
| Y pronto, no cuando se acabe la paciencia de quien lee | D-37 |
| **Una que empieza y se calla también se corta** | D-37 |
| Y se distingue una avería de la otra | D-37 |
| Que gotee no es que esté rota: lenta pero viva no se corta | D-37 |
| Cortar a mano no se cuenta como «tardó» | D-37 |
| Preguntar qué modelos hay tampoco se queda colgado | D-37 |
| El mensaje dice el mismo número que espera el reloj | D-37 |

`cola.mjs` frena a Google a mano: no contesta hasta que la prueba lo dice. Sin
eso, «la segunda espera a la primera» sería cuestión de suerte.

| Comprueba | Requisito |
|---|---|
| Se puede mandar otra sin esperar a la primera | D-38 |
| **Pero solo una habla con Google a la vez** | D-38 |
| Cerrar el panel no cancela lo que va por detrás | D-38 |
| **Y se sigue leyendo mientras traduce** | D-38 |
| Lo que termina avisa sin abrirse encima de la página | D-38 |
| Al terminar una, arranca la siguiente sola | D-38 |
| **Cada una se guarda en la página desde la que se pidió** | D-38 |
| Lo que falló no se pierde ni pisa el campo | D-38 |

Lo que **no** cubren: una red de verdad a medio caer. Lo que se prueba es cómo
reacciona la app a un silencio, no que el silencio se parezca al de un 4G en un
ascensor.

## Qué comprueban `series.mjs` y `serie.mjs`

Dos capas de lo mismo. `series.mjs` es la decisión, sin navegador: **el orden se
equivoca en silencio**, sin dar ningún error, y lo único que se ve es que el 10
sale antes que el 2 o que «seguir leyendo» te manda al capítulo que no era.
`serie.mjs` es lo que se ve: la tapa de la serie, el orden que se toca y la
lectura que no para.

| Comprueba | Requisito |
|---|---|
| Los números de la misma serie se juntan, aunque el nombre esté escrito distinto | D-36 |
| **El 2 va antes que el 10** | D-36 |
| Un orden puesto a mano manda sobre el título, y se escribe entero | D-36 |
| **Y aguanta cerrar la app** | D-36 |
| Sin empezar nada, seguir leyendo abre el primero | D-36 |
| **Terminado uno, seguir leyendo es empezar el siguiente** | D-36 |
| Con dos a medias, manda el último que abriste | D-36 |
| Los tres números ocupan un solo sitio en la estantería | D-36 |
| Buscar por el nombre de la serie los encuentra | D-36 |
| **Pasarse del final abre el siguiente número** | D-36 |
| Y volver desde la primera página devuelve al final del anterior | D-36 |
| En el último no hay a dónde seguir, y no te echa a la biblioteca | D-36 |
| Un libro suelto se mete en la serie, y sale de ella vaciando el campo | D-36 |

Lo que **no** cubre: arrastrar para ordenar, que no existe — se ordena con
flechas, a propósito (D-36).

## Qué comprueba `en-vivo.mjs`

Es la única que puede fallar por motivos que no están en el código: una ruta
mal formada bajo la subcarpeta, una fuente que no llega, el service worker mal
registrado. Todo eso solo aparece cuando la app vive en una dirección de verdad.

Por defecto apunta a `https://infiniity-eventos.github.io/La-corte-del-Rey/`.
Con `URL=…` se apunta a otra, por ejemplo a un `vite preview` con la misma
ruta base.

| Comprueba |
|---|
| La dirección responde y la app arranca |
| Las tipografías cargan desde la propia app y Fraunces se aplica |
| El manifiesto se sirve, con el ámbito correcto y sus iconos existentes |
| El service worker queda registrado |
| **El service worker no se queda esperando permiso, y toma el mando de las pestañas abiertas** |
| Importar un PDF, dibujarlo y pasar página, ya publicada |
| Ningún archivo devuelve 404 |

**Desde este contenedor el navegador de pruebas no sale a internet**, así que la
verificación se hace en dos partes: se comprueba con `curl` que cada archivo
publicado es idéntico al que se compila aquí, y luego se corre esta prueba
contra esos mismos archivos servidos en local con la misma ruta base.

## Lo que estas pruebas no cubren

Se dice aquí para que nadie las lea como una garantía que no son:

- **El sonido y la vibración.** Chromium sin altavoces no puede confirmar que se
  oiga. Hay que probarlo en el teléfono.
- **El gesto con el dedo.** Se simula con el ratón, que se comporta igual en el
  código pero no prueba el multitáctil ni el desplazamiento accidental.
- **PDF de verdad.** Los de prueba pesan un par de kilobytes. Un cómic escaneado
  de 200 MB es otro asunto, y hay que medirlo con uno real.
- **Leer una doble página en un teléfono.** La app la dibuja bien, pero que se
  pueda leer sin girar el aparato es otra cosa, y eso no lo mide una prueba.
- **Sin internet.** El service worker está configurado, pero comprobar que la
  app abre sin red pide un escenario aparte.
- **Una serie de verdad, de doce números escaneados.** Se prueba con tres tomos
  de dos páginas. Lo que eso no dice es cuánto tarda en abrirse el siguiente
  número cuando pesa 80 MB: el salto es instantáneo aquí y en un cómic real hay
  un momento de «Abriendo» que solo se mide con uno.
- **Gemini de verdad.** La API está simulada. Lo que no se puede probar así es
  si el modelo devuelve buenas traducciones: eso hay que verlo con una clave
  real y libros reales.
- **Seleccionar con el dedo.** La selección se provoca por código. El gesto real
  sobre una capa de texto en un móvil hay que probarlo a mano.
- **La sincronización con una cuenta de verdad.** Entrar con Google abre una
  ventana que no se puede automatizar, así que lo que se prueba es que sin
  cuenta todo funciona y que Firebase no se descarga. Que dos aparatos acaben
  con lo mismo hay que verlo con dos aparatos.
- **Que el apagón corte de verdad.** Se prueba la decisión, no el corte. Google
  tendría que aceptar desenganchar la facturación el día que toque, y eso solo
  se comprueba cuando pasa.
