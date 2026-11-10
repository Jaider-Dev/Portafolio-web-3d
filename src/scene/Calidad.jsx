import { PerformanceMonitor } from '@react-three/drei'
import { useExperiencia } from '../store/useExperiencia'

// Vigila el rendimiento para la calidad automática (HU-17, 06 §19.2). PerformanceMonitor mide los FPS
// en ventanas de 250 ms; si caen de forma sostenida por debajo de su límite inferior llama a onDecline
// y bajamos un escalón (alta → media → baja). Solo baja: subir y bajar sin parar (flip-flop) sería peor
// que quedarse en un nivel estable. Los perfiles se aplican donde se usan: el DPR en el <Canvas>
// (Experiencia), las sombras y estrellas en Ambiente, la bruma, las brasas y la densidad del bosque
export function Calidad() {
  const bajarCalidadAuto = useExperiencia((s) => s.bajarCalidadAuto)
  return <PerformanceMonitor onDecline={bajarCalidadAuto} onFallback={bajarCalidadAuto} flipflops={3} />
}
