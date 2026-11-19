import { useEffect, useRef } from 'react'
import { TEXTOS } from '../data/textos'
import { ENTRADA } from '../scene/personaje/movimiento'

const RADIO = 48 // px que recorre la palanca desde el centro

// Joystick táctil del modo explorador (19-nov): solo se ve con puntero grueso (ui.css). Escribe la
// dirección en ENTRADA, que lee Caminante.jsx cada fotograma; arriba es "adelante" según la cámara
export function Joystick() {
  const palanca = useRef(null)
  const centro = useRef(null)

  const soltar = () => {
    centro.current = null
    ENTRADA.adelante = 0
    ENTRADA.lado = 0
    if (palanca.current) palanca.current.style.transform = ''
  }
  useEffect(() => soltar, [])

  const mover = (e) => {
    if (!centro.current) return
    let dx = e.clientX - centro.current[0]
    let dy = e.clientY - centro.current[1]
    const largo = Math.hypot(dx, dy)
    if (largo > RADIO) {
      dx = (dx / largo) * RADIO
      dy = (dy / largo) * RADIO
    }
    ENTRADA.lado = dx / RADIO
    ENTRADA.adelante = -dy / RADIO
    palanca.current.style.transform = `translate(${dx}px, ${dy}px)`
  }

  return (
    <div
      className="joystick"
      role="img"
      aria-label={TEXTOS.explorador.joystick}
      onPointerDown={(e) => {
        e.stopPropagation()
        e.currentTarget.setPointerCapture(e.pointerId)
        const caja = e.currentTarget.getBoundingClientRect()
        centro.current = [caja.left + caja.width / 2, caja.top + caja.height / 2]
        mover(e)
      }}
      onPointerMove={mover}
      onPointerUp={soltar}
      onPointerCancel={soltar}
    >
      <div ref={palanca} className="joystick-palanca" />
    </div>
  )
}
