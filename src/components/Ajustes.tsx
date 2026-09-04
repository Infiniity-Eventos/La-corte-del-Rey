import { useEffect, useState } from 'react'
import { explicar, probarClave } from '../lib/traductor'
import { enGigas, espacio } from '../lib/almacen'
import type { Quien } from '../lib/nube'
import { IDIOMAS } from '../lib/tipos'
import type { Ajustes as LosAjustes, Paso } from '../lib/tipos'

/**
 * Los ajustes: por ahora, solo la clave de Gemini.
 *
 * Aquí importa más el texto que el formulario. Pegar una clave de API es lo
 * único de toda la app que exige salir a otro sitio y entender qué se está
 * haciendo, así que las instrucciones van en pantalla, en orden, y con la
 * advertencia que puede costar dinero (D-09).
 */

interface Props {
  ajustes: LosAjustes
  onCambiarAjustes: (a: LosAjustes) => void
  clave: string
  onGuardar: (clave: string) => void
  onTutorial: () => void
  onCerrar: () => void
  quien: Quien | null
  estadoNube: string
  ocupada: boolean
  onEntrar: () => void
  onSalir: () => void
  onSincronizar: () => void
}

const PASOS: { id: Paso; nombre: string; como: string }[] = [
  { id: 'deslizar', nombre: 'Deslizar', como: 'Arrastras y la hoja gira contigo, como pasar una página de verdad.' },
  { id: 'tocar', nombre: 'Tocar', como: 'Un toque en el borde derecho avanza y en el izquierdo vuelve. El centro sigue abriendo la interfaz. Va mejor con una mano.' },
]

export function Ajustes({
  ajustes, onCambiarAjustes, clave, onGuardar, onTutorial, onCerrar, quien, estadoNube,
  ocupada, onEntrar, onSalir, onSincronizar,
}: Props) {
  /** Cuánto sitio hay. Se lee al abrir los ajustes y no antes: es una pregunta
      que solo se hace aquí. */
  const [sitio, setSitio] = useState<{ usado: number; tope: number } | null>(null)
  useEffect(() => {
    let vivo = true
    void espacio().then(e => { if (vivo) setSitio(e) })
    return () => { vivo = false }
  }, [])
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
        <h2 className="display tarjeta-tit">Cómo pasar página</h2>
        <div className="segmento">
          {PASOS.map(p => (
            <button
              key={p.id}
              className="segmento-op"
              aria-pressed={ajustes.paso === p.id}
              onClick={() => onCambiarAjustes({ ...ajustes, paso: p.id })}
            >
              {p.nombre}
            </button>
          ))}
        </div>
        <p className="tarjeta-txt paso-como">
          {PASOS.find(p => p.id === ajustes.paso)?.como}
        </p>
        {ajustes.paso === 'tocar' && (
          <p className="tarjeta-nota">
            Deslizar sigue funcionando igual. Para acercar, doble toque en el centro
            o pellizcar en cualquier parte: en los bordes no hay doble toque, porque
            pasar página no puede esperar a ver si viene un segundo dedo.
          </p>
        )}
      </section>

      <section className="tarjeta">
        <h2 className="display tarjeta-tit">El traductor</h2>
        <p className="tarjeta-txt">
          Vellum traduce con Gemini. La clave es gratuita, no pide tarjeta y da
          1.000 traducciones al día. Se pega una vez y se queda en este aparato.
        </p>

        <label className="campo">
          <span className="campo-eti">De qué idioma traduce</span>
          <select
            className="selector"
            value={ajustes.idioma}
            onChange={e => onCambiarAjustes({ ...ajustes, idioma: e.target.value as LosAjustes['idioma'] })}
          >
            {IDIOMAS.map(i => (
              <option key={i.id} value={i.id}>{i.nombre}</option>
            ))}
          </select>
        </label>
        <p className="tarjeta-nota">
          Siempre traduce al español; lo que eliges es el idioma de lo que estás
          leyendo.
        </p>
        {ajustes.idioma === 'japones' && (
          <div className="alerta suave">
            <p className="alerta-tit">El teclado japonés</p>
            <p>
              En la burbuja aparece un botón <strong>あ</strong> que abre un teclado
              de kana completo: los cincuenta sonidos en hiragana y katakana, con
              dakuten, handakuten, las formas pequeñas y los signos japoneses.
            </p>
            <p>
              <strong>Kanji no escribe</strong>, y no es un descuido: para eso hace
              falta un diccionario que convierta かたな en 刀, que es otro programa.
              El teclado japonés del teléfono lo hace mucho mejor — en Android se
              añade en Ajustes → Idiomas → Teclado. Con los kana se pregunta
              igual: Gemini entiende かたな lo mismo que 刀.
            </p>
          </div>
        )}

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

        {/* El paso a paso entero está en su propia pantalla. Metido aquí en un
            desplegable, quien más lo necesita —el que acaba de instalar la app y
            no sabe qué es una clave— ni lo abría. */}
        <button className="btn fantasma comoseSaca" onClick={onTutorial}>
          Cómo sacar la clave, paso a paso
        </button>

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
        {/* Cuánto sitio queda. Con novelas no importa; con cómics sí — un tomo
            son trescientos megas, y el navegador no da todo el disco. */}
        {sitio && (
          <>
            <p className="tarjeta-txt mono espacio-cifra">
              {enGigas(sitio.usado)} usados de {enGigas(sitio.tope)}
            </p>
            <span className="barra"><i style={{ width: `${Math.min(100, (sitio.usado / sitio.tope) * 100)}%` }} /></span>
            <p className="tarjeta-nota">
              Lo que el navegador le presta a la app. Cuando se llena, los libros
              nuevos dejan de entrar y te lo dice al traerlos.
            </p>
          </>
        )}
      </section>
    </div>
  )
}
