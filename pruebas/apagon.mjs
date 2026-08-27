/**
 * El apagón, sin tocar Google.
 *
 * Lo que se puede probar aquí es la decisión: con qué mensajes corta y con
 * cuáles no. Lo que NO se prueba —y hay que decirlo— es que Google acepte
 * quitarle la cuenta de facturación al proyecto: eso solo se sabe el día que
 * pase, y por eso el tope va en 1 dólar y no en 50.
 */
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { leerAviso, hayQueCortar } = require('../apagon/index.js')

const paso = (n, ok, extra = '') => {
  console.log(`${ok ? '  OK  ' : ' FALLA'} ${n}${extra ? ' — ' + extra : ''}`)
  if (!ok) process.exitCode = 1
}

const evento = obj => ({
  data: { message: { data: Buffer.from(JSON.stringify(obj)).toString('base64') } },
})

paso('lee cuánto se lleva gastado',
  leerAviso(evento({ costAmount: 0.42, currencyCode: 'USD' }))?.gastado === 0.42)
paso('y en qué moneda',
  leerAviso(evento({ costAmount: 0.42, currencyCode: 'USD' }))?.moneda === 'USD')

paso('un mensaje vacío no dice nada', leerAviso({}) === null)
paso('un mensaje sin datos tampoco', leerAviso(undefined) === null)
paso('un mensaje con basura tampoco',
  leerAviso({ data: { message: { data: Buffer.from('no soy json').toString('base64') } } }) === null)

const TOPE = 1
paso('con el gasto en cero no corta', !hayQueCortar(leerAviso(evento({ costAmount: 0 })), TOPE))
paso('por debajo del tope no corta', !hayQueCortar(leerAviso(evento({ costAmount: 0.99 })), TOPE))
paso('justo en el tope tampoco corta', !hayQueCortar(leerAviso(evento({ costAmount: 1 })), TOPE))
paso('un céntimo por encima sí corta', hayQueCortar(leerAviso(evento({ costAmount: 1.01 })), TOPE))
paso('y muy por encima, también', hayQueCortar(leerAviso(evento({ costAmount: 240 })), TOPE))

paso('un aviso ilegible nunca corta', !hayQueCortar(null, TOPE))
paso('un aviso sin importe nunca corta',
  !hayQueCortar(leerAviso(evento({ currencyCode: 'USD' })), TOPE))
paso('un importe que no es número nunca corta',
  !hayQueCortar(leerAviso(evento({ costAmount: 'muchísimo' })), TOPE))

// Los presupuestos de Google mandan también el primer aviso del mes, con el
// gasto reiniciado. No debe encender ni apagar nada raro.
paso('el aviso de mes nuevo no corta',
  !hayQueCortar(leerAviso(evento({ costAmount: 0, budgetAmount: 1, currencyCode: 'USD' })), TOPE))

console.log('\nLo que esta prueba no cubre: que Google acepte de verdad el corte.')
