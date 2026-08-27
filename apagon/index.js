const { CloudBillingClient } = require('@google-cloud/billing')
const functions = require('@google-cloud/functions-framework')

/**
 * El apagón: corta la facturación del proyecto antes de que llegue un cobro.
 *
 * Blaze no tiene tope de gasto. Google deja poner un *presupuesto*, pero un
 * presupuesto **solo avisa**: manda un correo y sigue cobrando. Esto es lo que
 * de verdad corta. Cuando el gasto pasa del tope, esta función le quita la
 * cuenta de facturación al proyecto, y sin cuenta de facturación Google no
 * puede cobrar nada.
 *
 * Lo que se pierde al saltar:
 *   - Cloud Storage deja de responder: los PDF ya no suben ni bajan de la nube.
 *   - Firestore sigue, dentro del nivel gratuito (progreso, etiquetas,
 *     vocabulario: son kilobytes, no se acercan al límite).
 *   - Vellum sigue abriendo y leyendo igual, porque todo está también en el
 *     aparato. Se pierde la sincronización, no los libros.
 *
 * Lo que hay que saber para no confiarse:
 *   - Los datos de gasto de Google llegan con horas de retraso. Esto no es un
 *     interruptor instantáneo: es una red por debajo. El tope va en 1 dólar
 *     justamente por eso, para que el retraso quepa dentro del margen.
 *   - Volver a encender es manual, en la consola de Google. A propósito.
 *
 * Se despierta con los mensajes que el presupuesto publica en Pub/Sub.
 * Las instrucciones de montaje están en apagon/LEEME.md.
 */

const TOPE = Number(process.env.TOPE ?? '1')
const PROYECTO = process.env.PROYECTO_VIGILADO ?? process.env.GOOGLE_CLOUD_PROJECT

/**
 * El aviso llega dentro del mensaje de Pub/Sub, en base64.
 * Devuelve null si el mensaje no trae nada legible: ante un mensaje raro,
 * mejor no hacer nada que cortar sin motivo.
 */
function leerAviso(evento) {
  const crudo = evento?.data?.message?.data
  if (!crudo) return null
  try {
    const aviso = JSON.parse(Buffer.from(crudo, 'base64').toString())
    return {
      gastado: Number(aviso.costAmount ?? 0),
      moneda: aviso.currencyCode ?? '',
    }
  } catch {
    return null
  }
}

/**
 * Corta solo por encima del tope, y solo con un número de verdad.
 * Un mensaje sin costAmount, o con basura dentro, no corta nada.
 */
function hayQueCortar(aviso, tope) {
  return aviso !== null && Number.isFinite(aviso.gastado) && aviso.gastado > tope
}

const cliente = new CloudBillingClient()

functions.cloudEvent('apagon', async evento => {
  const aviso = leerAviso(evento)
  if (!hayQueCortar(aviso, TOPE)) {
    console.log(`Va por ${aviso?.gastado ?? '?'} ${aviso?.moneda ?? ''}, el tope es ${TOPE}. Nada que hacer.`)
    return
  }
  const { gastado, moneda } = aviso

  const nombre = `projects/${PROYECTO}`
  const [info] = await cliente.getProjectBillingInfo({ name: nombre })
  if (!info.billingEnabled) {
    console.log('La facturación ya estaba cortada.')
    return
  }

  // Dejar la cuenta en blanco es lo que la desengancha.
  await cliente.updateProjectBillingInfo({
    name: nombre,
    projectBillingInfo: { billingAccountName: '' },
  })
  console.error(
    `APAGÓN: ${gastado} ${moneda} pasó del tope de ${TOPE}. ` +
    `Facturación cortada en ${PROYECTO}. Los PDF dejan de sincronizarse; ` +
    `leer y traducir siguen igual.`,
  )
})

module.exports = { leerAviso, hayQueCortar }
