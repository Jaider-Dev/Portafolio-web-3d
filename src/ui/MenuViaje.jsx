import { useRef } from 'react'
import { LUGARES } from '../data/lugares.js'
import { TEXTOS } from '../data/textos'
import { useExperiencia } from '../store/useExperiencia'
import { useDialogo } from './useDialogo'

function ContenidoMenu() {
  const alternarMenu = useExperiencia((s) => s.alternarMenu)
  const viajar = useExperiencia((s) => s.viajar)
  const zona = useExperiencia((s) => s.zona)
  const contenedor = useRef(null)
  const lista = useRef(null)
  const cerrar = () => alternarMenu(false)

  useDialogo(contenedor, { alCerrar: cerrar })

  const moverFoco = (e) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    e.preventDefault()
    const botones = [...lista.current.querySelectorAll('button')]
    const actual = botones.indexOf(document.activeElement)
    const paso = e.key === 'ArrowDown' ? 1 : -1
    botones[(actual + paso + botones.length) % botones.length].focus()
  }

  return (
    <div className="capa-dialogo capa-menu" onClick={(e) => e.target === e.currentTarget && cerrar()}>
      <div ref={contenedor} className="menu-viaje" role="dialog" aria-modal="true" aria-labelledby="menu-titulo">
        <h2 id="menu-titulo">{TEXTOS.menu.titulo}</h2>
        <ul ref={lista} className="menu-lista" onKeyDown={moverFoco}>
          {LUGARES.map((lugar) => (
            <li key={lugar.id}>
              <button
                type="button"
                className="boton menu-destino"
                aria-current={lugar.id === zona ? 'location' : undefined}
                onClick={() => viajar(lugar.id)}
              >
                <span className="glifo" aria-hidden="true">{lugar.glifo}</span>
                <span>{lugar.nombre} · {lugar.seccion}</span>
              </button>
            </li>
          ))}
        </ul>
        <button type="button" className="boton" onClick={cerrar}>{TEXTOS.menu.cerrar}</button>
      </div>
    </div>
  )
}

export function MenuViaje() {
  const abierto = useExperiencia((s) => s.menuViaje)
  return abierto ? <ContenidoMenu /> : null
}
