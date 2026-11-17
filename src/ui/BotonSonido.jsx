import { AudioContext } from 'three'
import { TEXTOS } from '../data/textos'
import { useExperiencia } from '../store/useExperiencia'

// Activar o silenciar el ambiente sonoro (HU-18). Los navegadores solo dejan sonar audio tras un gesto
// del usuario: el contexto se reanuda aquí mismo, dentro del clic. La preferencia queda guardada
export function BotonSonido({ className = '' }) {
  const activo = useExperiencia((s) => s.ajustes.sonido)
  const cambiarAjuste = useExperiencia((s) => s.cambiarAjuste)
  const alPulsar = () => {
    const contexto = AudioContext.getContext()
    if (activo) contexto.suspend() // silencio inmediato, sin esperar a desmontar el grafo
    else contexto.resume()
    cambiarAjuste('sonido', !activo)
  }
  return (
    <button
      type="button"
      className={`boton boton-icono ${className}`}
      aria-label={TEXTOS.sonido.nombre}
      aria-pressed={activo}
      title={activo ? TEXTOS.sonido.silenciar : TEXTOS.sonido.activar}
      onClick={alPulsar}
    >
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 9v6h4l5 4V5L8 9H4z" />
        {activo
          ? <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" />
          : <path d="M17 9l5 6M22 9l-5 6" />}
      </svg>
    </button>
  )
}
