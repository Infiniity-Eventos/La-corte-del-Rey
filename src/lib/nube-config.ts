/**
 * La configuración del proyecto de Firebase.
 *
 * **Esto no es un secreto.** En cualquier aplicación web, esta configuración
 * viaja dentro del código que se descarga el navegador: cualquiera que abra
 * Vellum puede verla. Es así por diseño, y esconderla no protegería nada.
 *
 * Lo que sí protege los datos son dos cosas, y ninguna vive aquí:
 *
 * 1. Las **reglas de seguridad** de Firestore y Storage, que solo dejan a cada
 *    persona leer y escribir lo suyo. Están en `firestore.rules` y
 *    `storage.rules`.
 * 2. La **restricción de la clave por dominio**, que se pone en la consola de
 *    Google Cloud para que solo funcione desde las direcciones de Vellum.
 *
 * La clave de Gemini es otra cosa distinta: esa sí es un secreto de verdad, y
 * por eso no está aquí ni en ningún archivo. Vive en el aparato de cada
 * persona (D-09).
 */
export const CONFIG_FIREBASE = {
  apiKey: 'AIzaSyAZJTCepXONFpO4gEl6BzRGhfOr-2vLQ0g',
  authDomain: 'infiniity-vellum.firebaseapp.com',
  projectId: 'infiniity-vellum',
  storageBucket: 'infiniity-vellum.firebasestorage.app',
  messagingSenderId: '883803366245',
  appId: '1:883803366245:web:cb04e267fe41870fbcf78c',
} as const
