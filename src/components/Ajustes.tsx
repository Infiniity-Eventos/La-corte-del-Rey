import { useState } from 'react'
import { explicar, probarClave } from '../lib/traductor'
import type { Quien } from '../lib/nube'

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
  quien: Quien | null
  estadoNube: string
  ocupada: boolean
  onEntrar: () => void
  onSalir: () => void
  onSincronizar: () => void
}

export function Ajustes({
  clave, onGuardar, onCerrar, quien, estadoNube, ocupada, onEntrar, onSalir, onSincronizar,
}: Props) {
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
        // Se enseña el modelo elegido a propósito: si algún día algo va raro,
        // es el primer dato que hace falta y no hay dónde más mirarlo.
        ? { ok: true, texto: `«good morning» → «${r.muestra}». Traduciendo con ${r.modelo}.` }
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
        <h2 className="display tarjeta-tit">Tu cuenta</h2>
        {quien ? (
          <>
            <div className="quien">
              {quien.foto && <img src={quien.foto} alt="" className="quien-foto" />}
              <div>
                <p className="quien-nombre">{quien.nombre}</p>
                <p className="quien-correo mono">{quien.correo}</p>
              </div>
            </div>
            <p className="tarjeta-txt">{estadoNube}</p>
            <div className="fila-botones">
              <button className="btn fantasma peq" onClick={onSincronizar} disabled={ocupada}>
                {ocupada ? 'Sincronizando…' : 'Sincronizar ahora'}
              </button>
              <button className="btn fantasma peq" onClick={onSalir} disabled={ocupada}>
                Cerrar sesión
              </button>
            </div>
            <p className="tarjeta-nota">
              Cerrar sesión no borra nada de este aparato: los libros y el progreso
              siguen aquí.
            </p>
          </>
        ) : (
          <>
            <p className="tarjeta-txt">
              Sin cuenta, Vellum funciona entero: leer, traducir y organizar. Entrar
              sirve para que el progreso, las etiquetas, el vocabulario y los PDF
              viajen entre el celular y la PC.
            </p>
            <div className="fila-botones">
              <button className="btn" onClick={onEntrar} disabled={ocupada}>
                {ocupada ? 'Abriendo…' : 'Entrar con Google'}
              </button>
            </div>
            {estadoNube && <p className="aviso-sesion">{estadoNube}</p>}
          </>
        )}
      </section>

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
          <p className="tarjeta-nota">
            Son cinco minutos y una sola vez. Es gratis, no pide tarjeta y da 1.000
            traducciones al día. <strong>La clave es tuya:</strong> cada persona necesita la
            suya, porque esas mil traducciones van con la clave, no con la app.
          </p>
          <ol className="lista-pasos">
            <li>
              Abre <strong>Google AI Studio</strong> e inicia sesión con tu cuenta de Google.
              Si te pide aceptar las condiciones, acéptalas.
              <a className="btn fantasma peq enlace-paso" href="https://aistudio.google.com/apikey"
                 target="_blank" rel="noopener">Abrir AI Studio</a>
            </li>
            <li>
              Pulsa <strong>Create API key</strong> (en español, <strong>Crear clave de API</strong>).
            </li>
            <li>
              Te pregunta en qué proyecto crearla. Elige
              <strong> «Create API key in a new project»</strong> — en un proyecto nuevo.
              <span className="paso-ojo">
                Aquí se decide todo. No la crees en un proyecto que ya tengas, y menos
                en uno con facturación: el nivel gratuito de Gemini solo existe
                mientras ese proyecto no tenga la facturación activada.
              </span>
            </li>
            <li>
              Copia el código largo que sale y pégalo aquí arriba. Las claves nuevas
              empiezan por <strong>AQ.Ab</strong>; las de antes, por <strong>AIza</strong>.
              Las dos sirven.
            </li>
            <li>
              Pulsa <strong>Probar la clave</strong>. Si dice «Funciona», ya está: cierra
              esto y a leer.
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
        <h2 className="display tarjeta-tit">Esta versión</h2>
        <p className="tarjeta-txt">
          Vellum <strong>{__VERSION__}</strong>, compilada el{' '}
          {new Date(__COMPILADO__).toLocaleString('es-ES')}. Se actualiza sola: cuando
          haya una versión nueva, la biblioteca te lo dice.
        </p>
      </section>

      <section className="tarjeta">
        <h2 className="display tarjeta-tit">Dónde vive todo</h2>
        <p className="tarjeta-txt">
          Todo se guarda primero en este aparato, y por eso la app abre y funciona
          igual sin internet. {quien
            ? 'Con la sesión abierta, además viaja a tu cuenta en segundo plano.'
            : 'Sin sesión, no sale de aquí.'}
        </p>
        <p className="tarjeta-txt">
          La clave de Gemini es la excepción: esa no viaja nunca, ni siquiera con la
          sesión abierta.
        </p>
      </section>
    </div>
  )
}
