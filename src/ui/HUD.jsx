import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { PERFIL } from '../data/perfil'
import { TEXTOS } from '../data/textos'
import { useExperiencia } from '../store/useExperiencia'
import { rutaClasicaDe } from '../utils/rutas'
import { BotonHora } from './BotonHora'

const FASES_CON_HUD = ['vuelo', 'explorando', 'panel', 'viajando']

// Accesos siempre a la vista (HU-05): la interfaz ocupa solo los bordes de la pantalla
export function HUD() {
  const fase = useExperiencia((s) => s.fase)
  const faseTrasPanel = useExperiencia((s) => s.faseTrasPanel)
  const panel = useExperiencia((s) => s.panel)
  const abrirPanel = useExperiencia((s) => s.abrirPanel)
  const alternarMenu = useExperiencia((s) => s.alternarMenu)
  const { pathname } = useLocation()

  useEffect(() => {
    const alPulsar = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return
      if (e.key.toLowerCase() === 'm') alternarMenu()
    }
    window.addEventListener('keydown', alPulsar)
    return () => window.removeEventListener('keydown', alPulsar)
  }, [alternarMenu])

  // Con el diario abierto sobre la intro no hay HUD: la intro aún no terminó
  const visible = FASES_CON_HUD.includes(fase) && !(fase === 'panel' && faseTrasPanel === 'intro')
  if (!visible) return null

  return (
    <nav className="hud" aria-label={TEXTOS.hud.region}>
      <div className="hud-arriba">
        <button
          type="button"
          className="boton hud-autor"
          aria-label={TEXTOS.hud.abrirSobreMi(PERFIL.nombre, PERFIL.rol)}
          onClick={() => abrirPanel({ tipo: 'sobre-mi' })}
        >
          <strong>{PERFIL.nombre}</strong> · {PERFIL.rol}
        </button>
        <div className="hud-derecha">
          <button type="button" className="boton boton-icono hud-ajustes" aria-label={TEXTOS.ajustes.abrir} title={TEXTOS.ajustes.abrir} onClick={() => abrirPanel({ tipo: 'ajustes' })}>
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" />
              <circle cx="16" cy="6" r="2" />
              <circle cx="10" cy="12" r="2" />
              <circle cx="18" cy="18" r="2" />
            </svg>
          </button>
          <BotonHora className="hud-hora" />
          <Link className="boton hud-clasico" to={rutaClasicaDe(pathname, panel)} aria-label={TEXTOS.hud.clasicoAccesible}>
            <span className="solo-ancho">{TEXTOS.hud.clasico}</span>
            <span className="solo-estrecho">{TEXTOS.hud.clasicoCorto}</span>
          </Link>
        </div>
      </div>
      <div className="hud-abajo">
        <button type="button" className="boton" onClick={() => alternarMenu(true)}>
          <span className="solo-ancho">{TEXTOS.hud.viajar}</span>
          <span className="solo-estrecho">{TEXTOS.hud.viajarCorto}</span>
        </button>
        <button type="button" className="boton" onClick={() => abrirPanel({ tipo: 'contacto' })}>{TEXTOS.hud.contacto}</button>
      </div>
    </nav>
  )
}
