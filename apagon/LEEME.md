# El apagón

Blaze no tiene tope de gasto. El presupuesto que ofrece Google **avisa pero no
corta**: manda un correo y la factura sigue subiendo. Esto es lo que corta de
verdad.

Cuando el gasto del mes pasa de **1 dólar**, esta función le quita la cuenta de
facturación al proyecto de Firebase. Sin cuenta de facturación, Google no puede
cobrar nada.

## Qué se pierde cuando salta

- **Los PDF dejan de subir y bajar** de la nube (Cloud Storage necesita Blaze).
- **Firestore sigue**, dentro del nivel gratuito: el progreso, las etiquetas y
  el vocabulario son kilobytes, no se acercan al límite.
- **Vellum sigue abriendo, leyendo y traduciendo igual**, porque todo está
  también en el aparato. Se pierde la sincronización de archivos, no los libros.

Volver a encender es manual, en la consola de Google. A propósito: si saltó,
antes de reactivarlo conviene saber por qué.

## Lo que hay que saber para no confiarse

Los datos de gasto de Google llegan **con horas de retraso**. Esto no es un
interruptor instantáneo, es una red por debajo. El tope va en 1 dólar
justamente para que el retraso quepa dentro del margen: cuando la señal llegue,
lo acumulado seguirá siendo calderilla.

Y hay una parte que ninguna prueba de aquí puede cubrir: que Google acepte de
verdad el corte el día que toque. `pruebas/apagon.mjs` comprueba **con qué
mensajes corta y con cuáles no** (14 comprobaciones), no el corte en sí.

## Montarlo, paso a paso

Todo esto va en el proyecto de Firebase (`infiniity-vellum`), **no** en el de
la clave de Gemini.

1. **Abrir Cloud Shell.** En https://console.cloud.google.com, con el proyecto
   `infiniity-vellum` seleccionado, pulsa el icono de terminal (`>_`) arriba a
   la derecha. Es una consola dentro del navegador, no hace falta instalar nada.

2. **Encender las piezas que hacen falta:**

   ```bash
   gcloud services enable \
     cloudfunctions.googleapis.com run.googleapis.com cloudbuild.googleapis.com \
     eventarc.googleapis.com artifactregistry.googleapis.com \
     pubsub.googleapis.com cloudbilling.googleapis.com billingbudgets.googleapis.com
   ```

3. **Crear el canal por donde llega el aviso:**

   ```bash
   gcloud pubsub topics create presupuesto-vellum
   ```

4. **Subir esta carpeta.** En Cloud Shell, pulsa los tres puntos → *Subir* y
   sube `index.js` y `package.json` de `apagon/` a una carpeta llamada `apagon`.

5. **Publicar la función:**

   ```bash
   gcloud functions deploy apagon-vellum \
     --gen2 --runtime=nodejs24 --region=us-central1 \
     --trigger-topic=presupuesto-vellum \
     --entry-point=apagon \
     --set-env-vars TOPE=1,PROYECTO_VIGILADO=infiniity-vellum \
     --source=./apagon
   ```

   Si `nodejs24` da error, es que Google lo retiró: `gcloud functions runtimes
   list` dice cuáles hay, y sirve el Node más nuevo de la lista.

6. **Darle permiso para cortar.** Sin esto la función se despierta y no puede
   hacer nada. Primero, ver con qué identidad corre:

   ```bash
   gcloud functions describe apagon-vellum --gen2 --region=us-central1 \
     --format='value(serviceConfig.serviceAccountEmail)'
   ```

   Ese correo hay que añadirlo en **Facturación → Gestión de la cuenta →
   Permisos** (https://console.cloud.google.com/billing) con el rol
   **Administrador de la cuenta de facturación**. Es un rol fuerte, y por eso
   la función no hace nada más que esto.

7. **Crear el presupuesto que la despierta.** En
   https://console.cloud.google.com/billing → **Presupuestos y alertas** →
   *Crear presupuesto*:
   - Ámbito: solo el proyecto `infiniity-vellum`.
   - Importe: **1 USD**, mensual.
   - Umbrales: 50 %, 90 % y 100 % del gasto **real** (no del previsto).
   - En *Gestionar notificaciones*, marca **Conectar un tema de Pub/Sub a este
     presupuesto** y elige `presupuesto-vellum`.

8. **Comprobar que está viva.** Manda un aviso falso a mano:

   ```bash
   gcloud pubsub topics publish presupuesto-vellum \
     --message='{"costAmount":0.10,"budgetAmount":1,"currencyCode":"USD"}'
   gcloud functions logs read apagon-vellum --region=us-central1 --limit=5
   ```

   Debe decir *«Va por 0.1 USD, el tope es 1. Nada que hacer.»* Si eso sale, la
   cadena entera funciona. **No pruebes con un importe por encima de 1**: la
   función haría su trabajo y te dejaría el proyecto sin facturación.

La función en sí cabe dentro del nivel gratuito: se despierta unas pocas veces
al mes y no hace nada el 99 % de las veces.
