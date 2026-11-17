import { Sparkles } from '@react-three/drei'
import { useHora } from '../../store/hora'
import { useExperiencia } from '../../store/useExperiencia'
import { cuantos } from '../../utils/calidad.js'
import { alturaDelTerreno } from '../isla/terreno.js'
import { GALERIA } from '../lugares/galeria.js'
import { PALETA } from '../paleta'
import { useCalidad } from '../useCalidad'

// Partículas de ambiente (17-nov, 05 §8): luciérnagas de noche, polen de día y polvo en la luz de la
// cueva. Sparkles de Drei (sesión 6): un solo Points por grupo, animado en el shader, sin useFrame.
// La cantidad sigue al perfil de calidad (06 §19.1: 100 %, 60 %, 30 %) y "reducir movimiento" las detiene

// Zonas de la isla: centro en x, z, tamaño de la caja y altura sobre el terreno
const LUCIERNAGAS = [
  { x: -8, z: 3, escala: [9, 1.6, 7], alto: 0.9, cantidad: 40 }, // campamento
  { x: 2, z: 7, escala: [7, 1.2, 5], alto: 0.7, cantidad: 30 }, // orillas del río y el vado
  { x: -2, z: -6, escala: [10, 2, 8], alto: 1.2, cantidad: 30 }, // bosque, hacia la cueva
]
const POLEN = [
  { x: -6, z: 2, escala: [14, 3, 12], alto: 1.5, cantidad: 35 },
  { x: 6, z: -4, escala: [10, 3, 10], alto: 2, cantidad: 25 },
]

function Grupo({ zonas, color, tamano, velocidad, opacidad, ruido }) {
  const { perfil } = useCalidad()
  const reducir = useExperiencia((s) => s.ajustes.reducirMovimiento)
  return zonas.map(({ x, z, escala, alto, cantidad }) => (
    <Sparkles
      key={`${x},${z}`}
      position={[x, alturaDelTerreno(x, z) + alto, z]}
      scale={escala}
      count={cuantos(cantidad, perfil.particulas)}
      size={tamano}
      speed={reducir ? 0 : velocidad}
      opacity={opacidad}
      color={color}
      noise={ruido}
    />
  ))
}

export function Particulas() {
  const noche = useHora((s) => s.hora === 'noche')
  const [cx, , cz] = GALERIA.centro
  return (
    <group name="particulas">
      {noche
        ? <Grupo zonas={LUCIERNAGAS} color={PALETA.realce} tamano={5} velocidad={0.35} opacidad={1} ruido={1.5} />
        : <Grupo zonas={POLEN} color={PALETA.nube} tamano={2.5} velocidad={0.2} opacidad={0.6} ruido={1} />}
      {/* Polvo suspendido en la galería: brilla con la luz de las antorchas */}
      <Grupo zonas={[{ x: cx, z: cz, escala: [10, 3, 8], alto: -alturaDelTerreno(cx, cz) + 1.8, cantidad: 45 }]}
        color={PALETA.humo} tamano={2} velocidad={0.12} opacidad={0.5} ruido={0.6} />
    </group>
  )
}
