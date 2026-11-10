import { TEXTOS } from '../data/textos'
import { useHora } from '../store/hora'

// Alterna la isla de mañana y la de noche (HU-37). Interruptor accesible: el nombre no cambia y
// aria-pressed anuncia el estado. Sin three: también lo usa la versión clásica
export function BotonHora({ className = '' }) {
  const hora = useHora((s) => s.hora)
  const alternar = useHora((s) => s.alternar)
  const noche = hora === 'noche'
  return (
    <button
      type="button"
      className={`boton boton-hora ${className}`}
      aria-label={TEXTOS.hora.nombre}
      aria-pressed={noche}
      title={TEXTOS.hora.pista[hora]}
      onClick={alternar}
    >
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {noche
          ? <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
          : (
            <>
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
            </>
          )}
      </svg>
    </button>
  )
}
