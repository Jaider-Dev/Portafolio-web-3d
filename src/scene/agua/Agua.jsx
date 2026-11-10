import { useMemo } from 'react'
import * as THREE from 'three'
import { ARROYO, CAUCE, MUNDO } from '../../data/mundo.js'
import { PALETA } from '../paleta'

const material = <meshStandardMaterial color={PALETA.agua} roughness={0.25} transparent opacity={0.85} side={THREE.DoubleSide} depthWrite={false} />

// Cinta que sigue una curva; la coordenada V avanza con el agua (06 §9), lista para animarla en el sprint 2
function crearCinta(puntos, ancho, segmentos = 80) {
  const curva = new THREE.CatmullRomCurve3(puntos.map((p) => new THREE.Vector3(...p)))
  const posiciones = []
  const uvs = []
  const indices = []
  const arriba = new THREE.Vector3(0, 1, 0)
  const lateral = new THREE.Vector3()
  for (let i = 0; i <= segmentos; i++) {
    const t = i / segmentos
    const punto = curva.getPoint(t)
    lateral.crossVectors(curva.getTangent(t), arriba).normalize().multiplyScalar(ancho(punto) / 2)
    posiciones.push(punto.x - lateral.x, punto.y, punto.z - lateral.z, punto.x + lateral.x, punto.y, punto.z + lateral.z)
    uvs.push(0, t, 1, t)
    if (i < segmentos) {
      const a = i * 2
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
    }
  }
  const geometria = new THREE.BufferGeometry()
  geometria.setAttribute('position', new THREE.Float32BufferAttribute(posiciones, 3))
  geometria.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometria.setIndex(indices)
  geometria.computeVertexNormals()
  return geometria
}

// Ancho de 02 · Mapa §5: 4 m aguas arriba, 3,5 m en el vado, 4,5 m cerca del borde
const anchoDelRio = ({ z }) => (z > 15 ? 4.5 : z > 4 ? 3.5 : 4)

const SALIDA_DEL_BORDE = [-4.8, -0.3, 24]

export function Agua() {
  const rio = useMemo(() => crearCinta([...CAUCE, SALIDA_DEL_BORDE], anchoDelRio), [])
  const arroyo = useMemo(() => crearCinta(ARROYO, () => 1.5, 12), [])
  const { centro, radio } = MUNDO.poza
  const [xAlta, yAlta, zAlta] = MUNDO.cascadaAlta.borde

  return (
    <group name="agua">
      <mesh geometry={rio} receiveShadow>{material}</mesh>
      <mesh geometry={arroyo} receiveShadow>{material}</mesh>
      <mesh position={centro} rotation-x={-Math.PI / 2} receiveShadow>
        <circleGeometry args={[radio, 24]} />
        {material}
      </mesh>
      {/* Cascada alta: hito reconocible hasta su malla definitiva del sprint 2 */}
      <mesh position={[xAlta, yAlta / 2, zAlta - 0.2]}>
        <planeGeometry args={[MUNDO.cascadaAlta.ancho, yAlta]} />
        {material}
      </mesh>
      {/* Cascada baja: cae por el borde hacia el vacío */}
      <mesh position={[SALIDA_DEL_BORDE[0], -13, SALIDA_DEL_BORDE[2]]}>
        <planeGeometry args={[4.5, 25.4]} />
        {material}
      </mesh>
    </group>
  )
}
