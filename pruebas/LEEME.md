# Pruebas

No hay marco de pruebas ni configuración: son dos guiones que abren Chromium,
usan la app como la usarías tú y dicen si algo se rompió.

```bash
npm run build
npx vite preview --port 4173 --host 127.0.0.1 &
node pruebas/lectura.mjs      # 21 comprobaciones · hito 1, leer
node pruebas/biblioteca.mjs   # 33 comprobaciones · hito 2, la estantería
node pruebas/traductor.mjs    # 27 comprobaciones · hito 3, el traductor
node pruebas/capturas.mjs     # capturas de cada estado
```

`SC` es la carpeta donde están el PDF de prueba y donde se guardan las
capturas. Por defecto, `/tmp`.

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
| Un toque muestra la interfaz | R37 · P62 |
| Saltar escribiendo el número | R13 · P52 |
| Cambiar de tema | R14 |
| Guarda por dónde ibas | R16 · P15 |
| La biblioteca sobrevive a recargar | D-03 |
| Ofrece volver al principio | P63 |

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
| Componer el título encima de la imagen | D-15 · P73 |
| Lo empezado sube arriba del todo | R25 · P39 |
| Al buscar no se destaca nada | — |
| Preguntar antes de borrar, y borrar de verdad | — |
| Que todo sobreviva a recargar | D-03 |

## Qué comprueba `traductor.mjs`

No gasta cuota de Gemini: sustituye `fetch` dentro de la página y construye la
respuesta a mano, en trozos y con retardos reales. Así se ejerce el cliente
entero —lector del cuerpo, troceado SSE, parseo a medias— y se puede comprobar
lo único que justifica todo ese trabajo: que la traducción sale antes que el
resto.

| Comprueba | Requisito |
|---|---|
| La barra del traductor está siempre visible | R30 · P55 |
| Sin clave lo explica y ofrece ir a los ajustes | P31 · D-09 |
| La clave se guarda, sobrevive a recargar y llega oculta | D-09 · P26 |
| **La traducción aparece antes que las pestañas** | R19 · R20 · P28 |
| Con un modismo, la pestaña de aviso va primero y se abre sola | R20 · P28 |
| Con una palabra suelta, su ficha va primero, con pronunciación y ejemplo | R20 · P28 |
| Las pestañas de literal y contexto | R30 · P54 |
| Guardar en vocabulario, con libro y página | R17 · P57 |
| Cuota agotada: lo dice y a qué hora vuelve | P31 |
| Clave inválida, servidor saturado y sin red, cada uno con su mensaje | R8 |
| El modo selección avisa de cómo funciona | D-18 · P56 |
| Seleccionar sobre la página rellena la burbuja | R31 · P56 |

## Lo que estas pruebas no cubren

Se dice aquí para que nadie las lea como una garantía que no son:

- **El sonido y la vibración.** Chromium sin altavoces no puede confirmar que se
  oiga. Hay que probarlo en el teléfono.
- **El gesto con el dedo.** Se simula con el ratón, que se comporta igual en el
  código pero no prueba el multitáctil ni el desplazamiento accidental.
- **PDF de verdad.** El de prueba pesa dos kilobytes. Un cómic escaneado de
  200 MB es otro asunto, y hay que medirlo con uno real.
- **Sin internet.** El service worker está configurado, pero comprobar que la
  app abre sin red pide un escenario aparte.
- **Gemini de verdad.** La API está simulada. Lo que no se puede probar así es
  si el modelo devuelve buenas traducciones: eso hay que verlo con una clave
  real y libros reales.
- **Seleccionar con el dedo.** La selección se provoca por código. El gesto real
  sobre una capa de texto en un móvil hay que probarlo a mano.
