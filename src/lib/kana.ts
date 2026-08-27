/**
 * Los kana: las tablas y las transformaciones.
 *
 * Va aparte de la pantalla porque es lo único que puede equivocarse en
 * silencio: que la conversión a katakana se coma una letra, que el dakuten se
 * aplique a lo que no toca, o que algo funcione en hiragana y no en katakana.
 * Aquí se prueba sin navegador, como la fusión o el catálogo.
 */

export const FILAS: (string | null)[][] = [
  ['あ', 'い', 'う', 'え', 'お'],
  ['か', 'き', 'く', 'け', 'こ'],
  ['さ', 'し', 'す', 'せ', 'そ'],
  ['た', 'ち', 'つ', 'て', 'と'],
  ['な', 'に', 'ぬ', 'ね', 'の'],
  ['は', 'ひ', 'ふ', 'へ', 'ほ'],
  ['ま', 'み', 'む', 'め', 'も'],
  ['や', null, 'ゆ', null, 'よ'],
  ['ら', 'り', 'る', 'れ', 'ろ'],
  ['わ', 'を', 'ん', 'ー', '〜'],
]

/** Los signos que salen en un manga y no están en un teclado español. */
export const SIGNOS = ['、', '。', '！', '？', '「', '」', '・']

/**
 * Las tres transformaciones de la última letra escrita.
 *
 * Van sobre lo ya escrito en vez de tener teclas propias porque así el teclado
 * cabe: con teclas para が ざ だ ば ぱ y las pequeñas harían falta sesenta más.
 */
export const SONORA: Record<string, string> = {
  か: 'が', き: 'ぎ', く: 'ぐ', け: 'げ', こ: 'ご',
  さ: 'ざ', し: 'じ', す: 'ず', せ: 'ぜ', そ: 'ぞ',
  た: 'だ', ち: 'ぢ', つ: 'づ', て: 'で', と: 'ど',
  は: 'ば', ひ: 'び', ふ: 'ぶ', へ: 'べ', ほ: 'ぼ',
  う: 'ゔ',
}
export const EXPLOSIVA: Record<string, string> = { は: 'ぱ', ひ: 'ぴ', ふ: 'ぷ', へ: 'ぺ', ほ: 'ぽ' }
export const PEQUENA: Record<string, string> = {
  あ: 'ぁ', い: 'ぃ', う: 'ぅ', え: 'ぇ', お: 'ぉ',
  や: 'ゃ', ゆ: 'ゅ', よ: 'ょ', つ: 'っ', わ: 'ゎ',
}

/**
 * Hiragana y katakana están separados en Unicode por exactamente 96 posiciones.
 * No hace falta una segunda tabla: es la misma, corrida.
 */
export function aKatakana(k: string): string {
  const c = k.codePointAt(0) ?? 0
  return c >= 0x3041 && c <= 0x3096 ? String.fromCodePoint(c + 0x60) : k
}
function aHiragana(k: string): string {
  const c = k.codePointAt(0) ?? 0
  return c >= 0x30a1 && c <= 0x30f6 ? String.fromCodePoint(c - 0x60) : k
}

/** Aplica una transformación a la última letra, venga en hiragana o en katakana. */
export function transformar(texto: string, tabla: Record<string, string>): string {
  const ultima = texto.slice(-1)
  if (!ultima) return texto
  const enHiragana = aHiragana(ultima)
  const cambiada = tabla[enHiragana]
  if (!cambiada) return texto
  // Se devuelve en el mismo silabario en el que estaba.
  const fue = ultima !== enHiragana
  return texto.slice(0, -1) + (fue ? aKatakana(cambiada) : cambiada)
}
