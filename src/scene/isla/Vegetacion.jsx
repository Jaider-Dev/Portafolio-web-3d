import { Instance, Instances } from '@react-three/drei'
import { PALETA } from '../paleta'
import { useCalidad } from '../useCalidad'
import { alturaDelTerreno } from './terreno.js'

// Bosque de 02 · Mapa §1: rodea la colina y el campamento, sin tapar caminos ni puntos de interés
const ARBOLES = [
  [-23, -6], [-21, -2], [-24, 2], [-22, 6], [-20, 12], [-24, 9], [-16, 15], [-13, 18], [-19, -8], [-25, -10],
  [-16, -12], [-11, -14], [-22, -14], [-14, -7], [-7, -8], [-6, -13],
  [12, 8], [16, 10], [20, 4], [22, -2], [18, 14], [10, 15], [14, 17], [24, 3],
  [-2, -26], [-8, -24], [3, -27], [15, -25], [20, -18], [22, -12],
]

// Los que están en la cima marcan su silueta (02 · Mapa §7)
const SILUETA_CIMA = [14, 16.1, -24]

// Densidad según la calidad (06 §19.1: 100 %, 75 %, 50 %): de cada 4 árboles se quitan los mismos
// siempre, repartidos por todo el bosque. El de la silueta de la cima no se quita nunca (hito)
const seQueda = (i, densidad) => i % 4 < Math.round(densidad * 4)

export function Vegetacion() {
  const { perfil } = useCalidad()
  return (
    <group name="vegetacion">
      <Instances limit={ARBOLES.length + 1} castShadow>
        <coneGeometry args={[1.3, 7, 7]} />
        <meshStandardMaterial color={PALETA.vegetacion} flatShading roughness={1} />
        {ARBOLES.map(([x, z], i) => {
          if (!seQueda(i, perfil.vegetacion)) return null
          const escala = 0.8 + ((i * 37) % 10) / 20
          return <Instance key={`${x},${z}`} position={[x, alturaDelTerreno(x, z) + 3.5 * escala, z]} scale={escala} />
        })}
        <Instance position={[SILUETA_CIMA[0], SILUETA_CIMA[1] + 5, SILUETA_CIMA[2]]} scale={[1.4, 1.5, 1.4]} />
      </Instances>
    </group>
  )
}
