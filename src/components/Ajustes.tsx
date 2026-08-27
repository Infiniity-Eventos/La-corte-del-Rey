import { useState } from 'react'
import { explicar, probarClave } from '../lib/traductor'

/**
 * Los ajustes: por ahora, solo la clave de Gemini.
 *
 * Aquí importa más el texto que el formulario. Pegar una clave de API es lo
 * único de toda la app que exige salir a otro sitio y entender qué se está
 * haciendo, así que las instrucciones van en pantalla, en orden, y con la
 * advertencia que puede costar dinero (D-09).
 */

interface Props {
  clave: string
  onGuardar: (clave: string) => void
  onCerrar: () => void
}

export function Ajustes({ clave, onGuardar, onCerrar }: Props) {
  const [valor, setValor] = useState(clave)
  const [visible, setVisible] = useState(false)
  const [probando, setProbando] = useState(false)
  const [prueba, setPrueba] = useState<{ ok: boolean; texto: string } | null>(null)

  const probar = async () => {
    setProbando(true)
    setPrueba(null)
    const r = await probarClave(valor.trim())
    setPrueba(
      r.ok
        ? { ok: true, texto: `«good morning» → «${r.muestra}»` }
        : { ok: false, texto: `${explicar(r.fallo).titulo}. ${explicar(r.fallo).detalle}` },
    )
    setProbando(false)
  }

  const recortada = clave ? `${clave.slice(0, 6)}…${clave.slice(-4)}` : ''

  return (
    <div className="biblio">
      <div className="biblio-top">
        <button className="icono volver" onClick={onCerrar}>← Biblioteca</button>
      </div>

      <h1 className="display titulo-pantalla">Ajustes</h1>

      <section className="tarjeta">
        <h2 className="display tarjeta-tit">El traductor</h2>
        <p className="tarjeta-txt">
          Vellum traduce con Gemini. La clave es gratuita, no pide tarjeta y da
          1.000 traducciones al día. Se pega una vez y se queda en este aparato.
        </p>

        <label className="campo">
          <span className="campo-eti">Clave de Gemini</span>
          <div className="campo-fila">
            <input
              type={visible ? 'text' : 'password'}
              value={valor}
              onChange={e => setValor(e.target.value)}
              placeholder={recortada || 'AQ.Ab… o AIza…'}
              autoComplete="off"
              spellCheck={false}
              aria-label="Clave de Gemini"
            />
            <button className="icono" onClick={() => setVisible(v => !v)}>
              {visible ? 'Ocultar' : 'Ver'}
            </button>
          </div>
        </label>

        <div className="fila-botones">
          <button className="btn" onClick={() => onGuardar(valor)} disabled={valor.trim() === clave}>
            Guardar
          </button>
          <button className="btn fantasma peq" onClick={() => void probar()} disabled={!valor.trim() || probando}>
            {probando ? 'Probando…' : 'Probar la clave'}
          </button>
          {clave && (
            <button className="btn fantasma peq" onClick={() => { setValor(''); onGuardar('') }}>
              Borrar la clave
            </button>
          )}
          {clave && !valor.trim() && <span className="tarjeta-nota">Sin clave no se puede traducir.</span>}
        </div>

        {prueba && (
          <p className={prueba.ok ? 'prueba bien' : 'prueba mal'}>
            {prueba.ok ? '✓ Funciona. ' : ''}{prueba.texto}
          </p>
        )}

        <details className="comoseSaca">
          <summary>Cómo se saca, paso a paso</summary>
          <ol className="lista-pasos">
            <li>Entra en <strong>aistudio.google.com</strong> con tu cuenta de Google.</li>
            <li>Busca <strong>Get API key</strong> y pulsa <strong>Create API key</strong>.</li>
            <li>
              Copia el código largo y pégalo aquí. Las claves nuevas empiezan por
              <strong> AQ.Ab</strong>; las de antes empezaban por <strong>AIza</strong>. Las dos sirven.
            </li>
          </ol>
        </details>

        <div className="alerta">
          <p className="alerta-tit">Una cosa que no se puede olvidar</p>
          <p>
            El proyecto de Google donde saques esta clave <strong>no puede tener la
            facturación activada</strong>. El nivel gratuito de Gemini solo existe
            mientras no la tenga.
          </p>
          <p>
            Si vas a usar Firebase con plan Blaze, <strong>que sea un proyecto
            distinto</strong>. Si es el mismo, cada traducción pasa a facturarse y
            nada te avisa: solo llega el cobro.
          </p>
        </div>
      </section>

      <section className="tarjeta">
        <h2 className="display tarjeta-tit">Dónde vive todo</h2>
        <p className="tarjeta-txt">
          Los PDF, el progreso, las etiquetas y esta clave están guardados en este
          aparato y en ningún otro sitio. La sincronización con la nube llega en el
          siguiente paso.
        </p>
      </section>
    </div>
  )
}
