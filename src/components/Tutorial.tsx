/**
 * Cómo sacar la clave de Gemini, dentro de la app.
 *
 * Vivía en una página aparte, y una página aparte es un enlace que alguien
 * tiene que mandar, guardar y volver a encontrar. Quien instala Vellum y se
 * topa con «Falta la clave» está **aquí dentro**: es donde tiene que estar la
 * explicación, sin cuenta de nadie de por medio y sin salir a ningún sitio.
 *
 * El paso 3 es el único que puede costar dinero si se hace mal, y por eso es el
 * que va marcado en rojo. Todo lo demás es trámite.
 */

const AI_STUDIO = 'https://aistudio.google.com/apikey'

const DUDAS: { q: string; a: string }[] = [
  {
    q: '«La clave no vale»',
    a: 'Casi siempre es que se copió a medias. Vuelve a AI Studio, cópiala entera y pégala otra vez. Si insiste, comprueba que la creaste en AI Studio y no en otro sitio de Google.',
  },
  {
    q: '«Se acabaron las traducciones de hoy»',
    a: 'Llegaste a las mil. La app te dice a qué hora vuelven: Google las repone a medianoche del Pacífico. No hay nada que arreglar.',
  },
  {
    q: '«El servidor está saturado»',
    a: 'Es de Google, no tuyo. Espera un momento y vuelve a darle a Traducir.',
  },
  {
    q: '«Sin conexión»',
    a: 'Traducir necesita internet; leer no. Los libros se abren igual sin red.',
  },
  {
    q: '¿Y si quiero cambiar de clave?',
    a: 'En los ajustes: Borrar la clave y pegar la nueva. La vieja no se queda en ningún sitio.',
  },
  {
    q: '¿Puede costarme dinero alguna vez?',
    a: 'Mientras el proyecto donde la creaste no tenga la facturación activada, no. Google simplemente deja de responder cuando se acaba la cuota del día. Por eso el paso 3 importa tanto.',
  },
]

export function Tutorial({ onCerrar }: { onCerrar: () => void }) {
  return (
    <div className="biblio">
      <div className="biblio-top">
        <button className="icono volver" onClick={onCerrar}>← Ajustes</button>
      </div>

      <h1 className="display titulo-pantalla">Tu clave de Gemini</h1>

      <section className="tarjeta">
        <p className="tarjeta-txt">
          Vellum traduce con Gemini, la IA de Google. Para usarlo necesitas una
          clave tuya. Es gratis, no pide tarjeta y se pega una sola vez.
        </p>
        <div className="cifras">
          <div className="cifra"><b>1.000</b><span>traducciones al día</span></div>
          <div className="cifra"><b>0 €</b><span>sin tarjeta</span></div>
          <div className="cifra"><b>5 min</b><span>una sola vez</span></div>
        </div>
      </section>

      <section className="tarjeta">
        <h2 className="display tarjeta-tit">¿Por qué tengo que hacerlo yo?</h2>
        <p className="tarjeta-txt">
          Porque esas mil traducciones diarias <strong>van con la clave, no con la
          app</strong>. Si dos personas comparten una, la primera se come el día de
          la otra sin enterarse.
        </p>
        <p className="tarjeta-txt">
          Y porque Vellum no tiene servidor: la clave se queda <strong>en tu
          teléfono</strong> y habla directamente con Google. Nadie más la ve, ni
          siquiera quien te pasó la app.
        </p>
      </section>

      <section className="tarjeta">
        <h2 className="display tarjeta-tit">Los pasos</h2>
        <ol className="lista-pasos numerada">
          <li>
            <strong>Abre Google AI Studio</strong> e inicia sesión con tu cuenta de
            Google, la de siempre. Si te pide aceptar las condiciones, acéptalas.
            <a className="btn peq enlace-paso" href={AI_STUDIO} target="_blank" rel="noopener">
              Abrir AI Studio ↗
            </a>
          </li>
          <li>
            Pulsa <strong>Create API key</strong>. En español puede aparecer como
            <strong> Crear clave de API</strong>.
          </li>
          <li>
            Te pregunta dónde crearla. Elige
            <strong> «Create API key in a new project»</strong>, en un proyecto nuevo.
            <span className="paso-ojo">
              Aquí se decide si esto te sale gratis. El nivel gratuito de Gemini
              solo existe mientras ese proyecto no tenga la facturación activada, y
              un proyecto nuevo nunca la tiene. Si la creas en uno que ya usabas y
              ése tiene tarjeta, cada traducción pasa a facturarse y nada te avisa.
            </span>
          </li>
          <li>
            Copia el código largo que sale. Las claves nuevas empiezan por{' '}
            <strong className="mono">AQ.Ab</strong>; las de antes, por{' '}
            <strong className="mono">AIza</strong>. Las dos sirven. Si copias solo un
            trozo, la app dirá que no vale.
            {/* En monoespaciada a propósito: con la letra de la casa, la I
                mayúscula y la ele minúscula son el mismo trazo, y «AIza» se lee
                «Alza». Es el único sitio de la app donde alguien podría
                transcribir en vez de pegar. */}
          </li>
          <li>
            Vuelve a <strong>Ajustes</strong> y pégala en <strong>Clave de
            Gemini</strong>. Pulsa <strong>Guardar</strong>.
          </li>
          <li>
            Pulsa <strong>Probar la clave</strong>. Si dice «Funciona», ya está:
            cierra esto y a leer.
          </li>
        </ol>
      </section>

      <section className="tarjeta">
        <h2 className="display tarjeta-tit">Si algo falla</h2>
        <dl className="dudas">
          {DUDAS.map(d => (
            <div key={d.q}>
              <dt>{d.q}</dt>
              <dd>{d.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="tarjeta">
        <h2 className="display tarjeta-tit">Dónde vive tu clave</h2>
        <p className="tarjeta-txt">
          En el aparato donde la pegas, en el almacén privado de la app.
          <strong> No viaja a la nube ni con la sesión abierta</strong>, y no se
          sincroniza entre tus aparatos: si usas Vellum también en el ordenador,
          tendrás que pegarla allí una vez más.
        </p>
        <p className="tarjeta-nota">
          Es a propósito. Una clave que viaja es una clave que algún día se filtra
          por un descuido, y esto cuesta cinco minutos de repetir.
        </p>
      </section>
    </div>
  )
}
