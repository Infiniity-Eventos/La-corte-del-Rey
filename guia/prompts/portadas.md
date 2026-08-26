# Prompt para las portadas generadas

Este es el texto que el botón **Crear portada** pondrá en el portapapeles. La
app rellena sola las partes entre llaves con los datos del libro y abre Gemini;
tú pegas, generas y vuelves con la imagen.

El detalle importante no es el prompt en sí, sino que **sea siempre el mismo
salvo el sujeto**. Esa es la única forma de que cincuenta portadas hechas en
cincuenta momentos distintos parezcan una colección y no un cajón desordenado.

---

## Plantilla

```
Ilustración de portada para {libro | cómic} de una biblioteca personal.

Obra: «{título}»
Temas: {etiquetas}
Nombre del archivo original: {nombre-del-archivo}

Si conoces esta obra, recoge sus motivos propios —su iconografía, sus
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
Si hay figura humana, que sea silueta o esté de espaldas.

Deja el tercio inferior despejado y sin detalle: ahí va el título.

No escribas ningún texto en la imagen. Ni el título, ni el autor, ni nada.
```

## Por qué está escrito así

- **«Ningún otro color»** es la línea que hace el trabajo. Sin ella, cada
  portada se va por su lado y se pierde la sensación de colección.
- **El título va escrito en la portada, pero no lo escribe la IA.** En P73
  pediste que apareciera, y aparece: el generador deja el tercio inferior
  despejado y **Vellum compone el título encima**, con la tipografía de la casa.
  Pedírselo al generador tiene dos defectos conocidos: escribe mal a menudo, y
  cada portada saldría con una letra distinta, que es justo lo contrario de que
  la biblioteca parezca una colección. Así el título está siempre bien escrito,
  siempre en el mismo sitio y siempre con la misma letra.
- **Recoge el estilo de la obra, no su estética.** Si Gemini conoce el cómic,
  usa sus símbolos; pero los dibuja con nuestras dos tintas. Eso es lo que hace
  que se vean «iguales y únicos a la vez».
- **Sin rostros.** Las caras generadas son lo primero que delata que una imagen
  es artificial, y se ven mal a tamaño de miniatura.
- **2:3 vertical** es la proporción de una portada de libro; encaja en la
  rejilla de la biblioteca sin recortes.
- **El nombre del archivo va incluido** porque a veces lleva información que el
  título no tiene: el idioma, el número de tomo, el año.

## Si no quieres generar portada

La app nunca se queda sin portada. Si no generas ninguna, usa la primera página
del PDF. Y si esa primera página está en blanco o es fea, cae a una portada
tipográfica: el título compuesto sobre pergamino liso, con la misma paleta.
