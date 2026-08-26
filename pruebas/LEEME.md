# Pruebas

No hay marco de pruebas ni configuración: son dos guiones que abren Chromium,
usan la app como la usarías tú y dicen si algo se rompió.

```bash
npm run build
npx vite preview --port 4173 --host 127.0.0.1 &
node pruebas/lectura.mjs    # 20 comprobaciones sobre el hito 1
node pruebas/capturas.mjs   # capturas de cada estado
```

`SC` es la carpeta donde están el PDF de prueba y donde se guardan las
capturas. Por defecto, `/tmp`.

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
