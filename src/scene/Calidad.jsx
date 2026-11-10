import { useEffect, useRef } from 'react'
import { PerformanceMonitor } from '@react-three/drei'
import { useExperiencia } from '../store/useExperiencia'

const GRACIA_MS = 3000 // tras volver a la pestaña, los primeros fotogramas no cuentan

// Vigila el rendimiento para la calidad automática (HU-17, 06 §19.2). PerformanceMonitor mide los FPS
// en ventanas de 250 ms; si caen de forma sostenida por debajo de su límite inferior llama a onDecline
// y bajamos un escalón (alta → media → baja). Solo baja: subir y bajar sin parar (flip-flop) sería peor
// que quedarse en un nivel estable. Los perfiles se aplican donde se usan: el DPR en el <Canvas>
// (Experiencia), las sombras y estrellas en Ambiente, la bruma, las brasas y la densidad del bosque.
//
// Con la pestaña oculta el navegador congela requestAnimationFrame: al volver, el hueco parece una
// caída de FPS aunque el equipo vaya bien. Esas caídas se ignoran
export function Calidad() {
  const bajarCalidadAuto = useExperiencia((s) => s.bajarCalidadAuto)
  const ultimoCambio = useRef(0)

  useEffect(() => {
    const alCambiar = () => { ultimoCambio.current = performance.now() }
    document.addEventListener('visibilitychange', alCambiar)
    return () => document.removeEventListener('visibilitychange', alCambiar)
  }, [])

  const alCaer = () => {
    const visible = document.visibilityState === 'visible'
    if (visible && performance.now() - ultimoCambio.current > GRACIA_MS) bajarCalidadAuto()
  }

  return <PerformanceMonitor onDecline={alCaer} onFallback={alCaer} flipflops={3} />
}
