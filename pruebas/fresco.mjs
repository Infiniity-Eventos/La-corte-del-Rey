import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Que lo que se está probando sea lo que hay escrito.
 *
 * Una compilación que falla **no borra la anterior**: deja el paquete de antes
 * en su sitio, el servidor lo sigue sirviendo y las pruebas pasan contra él. Es
 * el peor resultado posible —verde sin haber probado nada— y pasó dos veces en
 * la misma tarde, las dos comprobando a propósito que una prueba fallaba: no
 * fallaba porque el arreglo roto ni siquiera había llegado al paquete.
 *
 * Esto lo corta: si algo de src/ es más nuevo que dist/, la prueba no arranca.
 */

function masNuevo(dir) {
  let cuando = 0
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const ruta = join(dir, e.name)
    cuando = Math.max(cuando, e.isDirectory() ? masNuevo(ruta) : statSync(ruta).mtimeMs)
  }
  return cuando
}

export function exigirCompilacionAlDia() {
  let paquete
  try {
    paquete = statSync('dist/index.html').mtimeMs
  } catch {
    console.error('\nNo hay nada compilado. Corre `npm run build` antes.\n')
    process.exit(1)
  }

  const fuente = Math.max(masNuevo('src'), statSync('vite.config.ts').mtimeMs, statSync('index.html').mtimeMs)
  if (fuente > paquete) {
    const minutos = Math.round((fuente - paquete) / 60000)
    console.error(
      `\nEl código es ${minutos} minuto(s) más nuevo que lo compilado.\n` +
      'La prueba estaría mirando el paquete anterior y pasaría en falso.\n' +
      'Corre `npm run build` —y mira si termina bien— antes de volver.\n',
    )
    process.exit(1)
  }
}
