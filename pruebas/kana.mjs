/**
 * El teclado de kana, sin navegador.
 *
 * Lo que puede salir mal aquí y no dar ningún error: que la conversión a
 * katakana se coma una letra, que el dakuten se aplique a lo que no toca, o que
 * una transformación funcione en hiragana y no en katakana. Todo eso se ve
 * escribiendo, y ninguna prueba de pantalla lo miraría letra por letra.
 */
import { execSync } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const dir = mkdtempSync(join(tmpdir(), 'vellum-'))
const salida = join(dir, 'kana.mjs')
execSync(`npx esbuild src/lib/kana.ts --format=esm --outfile=${salida}`, { stdio: 'pipe' })
const { transformar, FILAS, SONORA, EXPLOSIVA, PEQUENA, aKatakana } = await import(salida)

let rojos = 0
const paso = (n, ok, extra = '') => {
  console.log(`${ok ? '  OK  ' : ' FALLA'} ${n}${extra ? ' — ' + extra : ''}`)
  if (!ok) rojos++
}

/* --- El silabario está entero --- */
const todas = FILAS.flat().filter(Boolean)
paso('están las diez filas del 五十音', FILAS.length === 10)
paso('y los 48 kana que se escriben', todas.length === 48, `${todas.length} teclas`)
paso('sin repetidos', new Set(todas).size === todas.length)
paso('cada uno tiene su katakana',
  todas.filter(k => /[ぁ-ゖ]/.test(k)).every(k => aKatakana(k) !== k),
  'salvo ー y 〜, que son iguales en los dos')

/* --- Dakuten sobre la última letra --- */
paso('か se vuelve が', transformar('か', SONORA) === 'が')
paso('y solo cambia la última', transformar('あか', SONORA) === 'あが', transformar('あか', SONORA))
paso('は se vuelve ば con dakuten', transformar('は', SONORA) === 'ば')
paso('y ぱ con handakuten', transformar('は', EXPLOSIVA) === 'ぱ')

/* --- Las pequeñas --- */
paso('や se vuelve ゃ', transformar('きや', PEQUENA) === 'きゃ', transformar('きや', PEQUENA))
paso('つ pequeña para las dobles', transformar('がつ', PEQUENA) === 'がっ', transformar('がつ', PEQUENA))

/* --- Lo que no tiene transformación se queda igual --- */
paso('una letra sin sonora no cambia', transformar('あ', SONORA) === 'あ')
paso('ni se pierde nada por el camino', transformar('ねこ', EXPLOSIVA) === 'ねこ')
paso('con el texto vacío no revienta', transformar('', SONORA) === '')

/* --- **Y funciona igual en katakana**, que es donde se rompería sin mirar --- */
paso('カ se vuelve ガ', transformar('カ', SONORA) === 'ガ', transformar('カ', SONORA))
paso('ハ se vuelve パ', transformar('ハ', EXPLOSIVA) === 'パ', transformar('ハ', EXPLOSIVA))
paso('ツ se vuelve ッ', transformar('ツ', PEQUENA) === 'ッ', transformar('ツ', PEQUENA))
paso('y devuelve el silabario en el que estaba',
  transformar('あカ', SONORA) === 'あガ' && transformar('アか', SONORA) === 'アが',
  `${transformar('あカ', SONORA)} · ${transformar('アか', SONORA)}`)

/* --- Un signo o una letra latina al final no se tocan --- */
paso('un signo japonés al final no cambia', transformar('ねこ。', SONORA) === 'ねこ。')
paso('una letra latina tampoco', transformar('neko', SONORA) === 'neko')

console.log(rojos ? `\n${rojos} fallo(s)` : '\nTodo en orden.')
process.exitCode = rojos ? 1 : 0
