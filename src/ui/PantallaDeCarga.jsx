import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { TEXTOS } from '../data/textos'
import { rutaClasicaDe } from '../utils/rutas'

const { frases } = TEXTOS.carga
const SEGUNDOS_POR_FRASE = 2

// Sin three: se pinta al instante, también mientras baja el chunk de la isla (06 §6)
export function PantallaDeCarga({ porcentaje = 0 }) {
  const { pathname } = useLocation()
  const [frase, setFrase] = useState(0)

  useEffect(() => {
    const intervalo = setInterval(() => setFrase((f) => (f + 1) % frases.length), SEGUNDOS_POR_FRASE * 1000)
    return () => clearInterval(intervalo)
  }, [])

  return (
    <div className="pantalla">
      <p className="pantalla-progreso" role="status">{TEXTOS.carga.progreso(porcentaje)}</p>
      <progress className="pantalla-barra" max={100} value={porcentaje} aria-hidden="true" />
      <p aria-hidden="true">{frases[frase]}</p>
      <p>
        {TEXTOS.carga.pregunta}{' '}
        <Link to={rutaClasicaDe(pathname)}>{TEXTOS.carga.enlace}</Link>
      </p>
    </div>
  )
}

export function PantallaDeError() {
  const { pathname } = useLocation()
  return (
    <div className="pantalla" role="alert">
      <p>{TEXTOS.error.mensaje}</p>
      <div className="acciones">
        <button type="button" className="boton boton-principal" onClick={() => window.location.reload()}>{TEXTOS.error.reintentar}</button>
        <Link className="boton" to={rutaClasicaDe(pathname)}>{TEXTOS.error.clasico}</Link>
      </div>
    </div>
  )
}
