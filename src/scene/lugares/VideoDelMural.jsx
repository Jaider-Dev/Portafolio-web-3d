import { lazy, Suspense } from 'react'
import { PROYECTO_DESTACADO } from '../../data/proyectos'
import { useExperiencia } from '../../store/useExperiencia'

// Video del proyecto destacado proyectado sobre su mural (HU-23, 06 §11.3). Solo existe con su ficha
// abierta dentro de la cueva: el video no se descarga en la carga inicial (está en el chunk del
// interior, HT-12, y además espera a que se abra la ficha). En silencio y en bucle; al cerrar la ficha
// o salir de la cueva se pausa y se libera. Su contenido en texto (transcripción) está en la ficha.
//
// Para activarlo, en data/proyectos.js el destacado lleva: video: { src: '/video/<archivo>.mp4',
// transcripcion: '…' }. Mientras video sea null, no se dibuja nada (pendiente del autor, PL-02)

const Proyeccion = lazy(() => import('./ProyeccionDeVideo'))

export function VideoDelMural() {
  const src = PROYECTO_DESTACADO.video?.src
  const visible = useExperiencia((s) => s.zona === 'cueva' && s.fase === 'panel' && s.panel?.tipo === 'proyecto' && s.panel.id === PROYECTO_DESTACADO.id)
  if (!src || !visible) return null
  return <Suspense fallback={null}><Proyeccion src={src} /></Suspense>
}
