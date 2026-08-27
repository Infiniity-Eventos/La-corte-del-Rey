# Pruebas

No hay marco de pruebas ni configuración: son guiones sueltos. Casi todos abren
Chromium y usan la app como la usarías tú; tres —la fusión entre aparatos, el
corte de facturación y el encargo de las portadas— corren solas en Node, porque
lo que prueban es una decisión y no necesita navegador.

```bash
npm run build
npx vite preview --port 4173 --host 127.0.0.1 &
node pruebas/lectura.mjs      # 43 comprobaciones · leer, las flechas y los dos modos de pasar página
node pruebas/biblioteca.mjs   # 47 comprobaciones · la estantería y crear portada
node pruebas/traductor.mjs    # 63 comprobaciones · el traductor y las notas de página
node pruebas/comic.mjs        # 29 comprobaciones · tamaños mezclados, zoom, pellizco y teclado
node pruebas/nube.mjs         # 14 comprobaciones · hito 4, la nube sin cuenta
node pruebas/atras.mjs        # 18 comprobaciones · el botón de atrás del teléfono
node pruebas/capturas.mjs     # capturas de cada estado

# Sin navegador: se ejecutan solas
node pruebas/fusion.mjs       # 14 comprobaciones · la fusión entre aparatos
node pruebas/apagon.mjs       # 14 comprobaciones · el corte de facturación
node pruebas/portadas.mjs     #  9 comprobaciones · la búsqueda de portada
node pruebas/estante.mjs      # 19 comprobaciones · el catálogo de la casa

# Contra la app publicada
node pruebas/en-vivo.mjs      # 15 comprobaciones sobre la app en su dirección real
```

`SC` es la carpeta donde están el PDF de prueba y donde se guardan las
capturas. Por defecto, `/tmp`.

**Las pruebas de navegador no arrancan si `dist/` es más viejo que `src/`.** Una
compilación que falla no borra la anterior: el servidor sigue sirviendo el
paquete de antes y las pruebas pasan contra él, verdes sin haber probado nada.
Eso lo corta `pruebas/fresco.mjs`.

Los PDF de prueba se generan con `gen_pdf.py`. Cada uno lleva su nombre escrito
dentro: si no, dos archivos con el mismo número de páginas salen byte a byte
idénticos y Vellum los toma por repetidos — cosa que, dicho sea de paso,
demuestra que la detección de repetidos funciona.

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
