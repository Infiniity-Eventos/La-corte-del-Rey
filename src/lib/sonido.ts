/**
 * El clic seco de pasar página (R47 / P75) y la vibración (R48 / P77).
 *
 * Se sintetiza en el momento en vez de cargar un archivo: son unos pocos
 * milisegundos de ruido filtrado, pesa cero y no hay nada que descargar.
 *
 * Sobre P76, "que respete el modo silencio del teléfono": una app web **no
 * puede leer el interruptor de silencio**. No existe esa API. Lo más cerca que
 * se puede llegar es lo que se hace aquí — el sonido sale por el volumen
 * multimedia, el mismo de la música y no el del timbre, y arranca bajo — más el
 * interruptor rápido que hay en la propia pantalla de lectura. Se documenta en
 * vez de prometer algo que no se puede cumplir (T17).
 */

let ac: AudioContext | null = null

function contexto(): AudioContext | null {
  try {
    if (!ac) {
      const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!C) return null
      ac = new C()
    }
    if (ac.state === 'suspended') void ac.resume()
    return ac
  } catch {
    return null
  }
}

/** El navegador exige un gesto antes de dejar sonar nada. */
export function despertarSonido(): void {
  contexto()
}

export function clicDePagina(volumen = 0.14): void {
  const c = contexto()
  if (!c) return
  const t = c.currentTime

  // Ruido muy corto por un pasabanda estrecho: el roce del papel al asentarse.
  const muestras = Math.floor(c.sampleRate * 0.06)
  const buf = c.createBuffer(1, muestras, c.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < muestras; i++) d[i] = Math.random() * 2 - 1

  const fuente = c.createBufferSource()
  fuente.buffer = buf

  const filtro = c.createBiquadFilter()
  filtro.type = 'bandpass'
  filtro.Q.value = 2.4
  filtro.frequency.setValueAtTime(2600, t)
  filtro.frequency.exponentialRampToValueAtTime(4200, t + 0.055)

  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(volumen, t + 0.008)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.055)

  fuente.connect(filtro)
  filtro.connect(g)
  g.connect(c.destination)
  fuente.start(t)
  fuente.stop(t + 0.07)

  // Un golpecito grave debajo, para que no suene a estática.
  const osc = c.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(320, t)
  const g2 = c.createGain()
  g2.gain.setValueAtTime(volumen * 0.4, t)
  g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.045)
  osc.connect(g2)
  g2.connect(c.destination)
  osc.start(t)
  osc.stop(t + 0.06)
}

export function toqueCorto(): void {
  try {
    navigator.vibrate?.(8)
  } catch {
    /* iOS no vibra desde la web; no es motivo para romper nada */
  }
}
