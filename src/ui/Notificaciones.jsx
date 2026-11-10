import { useEffect } from 'react'
import { TEXTOS } from '../data/textos'
import { useExperiencia } from '../store/useExperiencia'

const SEGUNDOS_VISIBLE = 4

const textoDe = (notificacion) => {
  if (notificacion.tipo === 'descubierto') return TEXTOS.notificacion.descubriste(notificacion.nombre, notificacion.seccion)
  if (notificacion.tipo === 'calidad') return TEXTOS.notificacion.calidad(TEXTOS.ajustes.opciones[notificacion.nivel].titulo.toLowerCase())
  return TEXTOS.notificacion.enlacePendiente(notificacion.destino)
}

export function Notificaciones() {
  const notificacion = useExperiencia((s) => s.notificacion)
  const notificar = useExperiencia((s) => s.notificar)

  useEffect(() => {
    if (!notificacion) return undefined
    const temporizador = setTimeout(() => notificar(null), SEGUNDOS_VISIBLE * 1000)
    return () => clearTimeout(temporizador)
  }, [notificacion, notificar])

  return (
    <div className="notificaciones" aria-live="polite">
      {notificacion && <p className="notificacion">{textoDe(notificacion)}</p>}
    </div>
  )
}
