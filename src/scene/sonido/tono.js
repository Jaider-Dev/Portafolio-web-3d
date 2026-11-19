import * as THREE from 'three'
import { useExperiencia } from '../../store/useExperiencia'

// Tono breve de respuesta (HU-20: la runa "se activa con un tono breve"). Usa el mismo AudioContext que
// el ambiente (THREE.AudioContext lo comparte) y solo suena si el visitante activó el sonido.
// Una nota senoidal con su quinta, que entra en 10 ms y se apaga en ~0,9 s: suave, sin chasquido
export function tocarTono(frecuencia = 523.25) {
  if (!useExperiencia.getState().ajustes.sonido) return
  let contexto
  try {
    contexto = THREE.AudioContext.getContext()
  } catch {
    return
  }
  if (contexto.state !== 'running') return
  const ahora = contexto.currentTime
  const volumen = contexto.createGain()
  volumen.gain.setValueAtTime(0, ahora)
  volumen.gain.linearRampToValueAtTime(0.12, ahora + 0.01)
  volumen.gain.exponentialRampToValueAtTime(0.0001, ahora + 0.9)
  volumen.connect(contexto.destination)
  for (const [multiplo, nivel] of [[1, 1], [1.5, 0.35]]) {
    const oscilador = contexto.createOscillator()
    const mezcla = contexto.createGain()
    oscilador.type = 'sine'
    oscilador.frequency.value = frecuencia * multiplo
    mezcla.gain.value = nivel
    oscilador.connect(mezcla).connect(volumen)
    oscilador.start(ahora)
    oscilador.stop(ahora + 1)
  }
}
