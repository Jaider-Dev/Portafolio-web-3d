import { useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { TEXTOS } from '../data/textos'
import { rutaClasicaDe } from '../utils/rutas'
import { hayWebGL } from '../utils/webgl'

const SEGUNDOS_PARA_REDIRIGIR = 4

// Equivale a un guard canActivate: decide antes de descargar el chunk 3D
export function RedirigirSinWebGL({ children }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const disponible = hayWebGL()
  const destino = rutaClasicaDe(pathname)

  useEffect(() => {
    if (disponible) return undefined
    const temporizador = setTimeout(() => navigate(destino, { replace: true }), SEGUNDOS_PARA_REDIRIGIR * 1000)
    return () => clearTimeout(temporizador)
  }, [disponible, destino, navigate])

  if (disponible) return children
  return (
    <main className="pantalla" role="alert">
      <p>{TEXTOS.sinWebgl.mensaje}</p>
      <Link className="boton" to={destino} replace>{TEXTOS.sinWebgl.enlace}</Link>
    </main>
  )
}
