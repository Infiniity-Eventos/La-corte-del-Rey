/**
 * El teclado japonés de kana.
 *
 * Es el 五十音 entero —las diez columnas por cinco vocales— en hiragana y en
 * katakana, con dakuten, handakuten, las formas pequeñas, la barra larga y los
 * signos japoneses. Con esto se escribe **cualquier kana**: が, ぱ, っ, ャ, ー,
 * 「」, todo.
 *
 * **Lo que este teclado no hace es kanji, y conviene decirlo aquí.** Escribir
 * kanji necesita un IME: un diccionario que convierta かたな en 刀 ofreciendo
 * los candidatos. Eso es otro programa, no un teclado, y el del propio teléfono
 * lo hace infinitamente mejor que nada que quepa aquí. Por eso la app dice
 * dónde activarlo en vez de fingir que lo tiene.
 *
 * Aun así este teclado sirve para lo que se lee: los furigana, los katakana de
 * los préstamos y las palabras que van en kana valen para preguntar, y Gemini
 * entiende かたな igual que 刀.
 */

import { EXPLOSIVA, FILAS, PEQUENA, SIGNOS, SONORA, aKatakana } from '../lib/kana'

interface Props {
  katakana: boolean
  onKatakana: (v: boolean) => void
  onEscribir: (letra: string) => void
  onTransformar: (tabla: Record<string, string>) => void
  onBorrar: () => void
  onCerrar: () => void
}

export function Kana({ katakana, onKatakana, onEscribir, onTransformar, onBorrar, onCerrar }: Props) {
  const letra = (k: string) => (katakana ? aKatakana(k) : k)

  return (
    <div className="kana" role="group" aria-label="Teclado japonés">
      <div className="kana-top">
        <div className="segmento peq">
          <button className="segmento-op" aria-pressed={!katakana} onClick={() => onKatakana(false)}>
            ひらがな
          </button>
          <button className="segmento-op" aria-pressed={katakana} onClick={() => onKatakana(true)}>
            カタカナ
          </button>
        </div>
        <button className="icono" onClick={onCerrar} aria-label="Cerrar el teclado">✕</button>
      </div>

      <div className="kana-rejilla">
        {FILAS.flat().map((k, i) =>
          k === null ? (
            <span key={i} className="kana-hueco" aria-hidden="true" />
          ) : (
            <button key={i} className="kana-tecla" onClick={() => onEscribir(letra(k))}>
              {letra(k)}
            </button>
          ),
        )}
      </div>

      {/* Lo que se usa en cada palabra —dakuten, pequeña, borrar— va en teclas
          grandes; los signos, que se usan de vez en cuando, en una fila fina. */}
      <div className="kana-fila grandes">
        <button className="kana-tecla mod" onClick={() => onTransformar(SONORA)} title="Sonora (dakuten)">
          ゛
        </button>
        <button className="kana-tecla mod" onClick={() => onTransformar(EXPLOSIVA)} title="Explosiva (handakuten)">
          ゜
        </button>
        <button className="kana-tecla mod" onClick={() => onTransformar(PEQUENA)} title="Pequeña">
          小
        </button>
        <button className="kana-tecla mod" onClick={onBorrar} aria-label="Borrar">⌫</button>
      </div>

      <div className="kana-fila finos">
        {SIGNOS.map(s => (
          <button key={s} className="kana-tecla signo" onClick={() => onEscribir(s)}>
            {s}
          </button>
        ))}
      </div>

      <p className="kana-pie">Kanji necesita el teclado japonés del teléfono.</p>
    </div>
  )
}
