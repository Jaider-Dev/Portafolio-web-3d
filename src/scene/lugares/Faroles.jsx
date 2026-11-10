import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { LUGARES } from '../../data/lugares.js'
import { transicionHora } from '../ambiente/transicion'
import { texturaCharco, texturaHalo } from '../efectos'
import { alturaDelTerreno } from '../isla/terreno.js'
import { PALETA } from '../paleta'

// Iluminación de los puntos importantes: un farol junto al menhir de cada lugar y un resplandor tras la
// cortina de la cascada (la pista de la cueva, 02 Z4). Sin luces puntuales reales (ya hay 6 en calidad
// alta, 06 §19.1): la lámpara brilla con luz propia, un halo aditivo la rodea y un "charco de luz"
// aditivo, amoldado al terreno, ilumina el suelo. De día casi no se notan; de noche se encienden

// Hacia dónde se aparta el farol de su menhir (sin caer en el agua ni en el camino)
const DESPLAZAMIENTO = { campamento: [1.1, 0.5], rio: [1.1, -0.5], cueva: [-1.2, 0.4], sendero: [1, 0.6], cima: [1, 0.6] }
const RADIO_CHARCO = 2.8

// Charco de luz: un disco en rejilla cuyos vértices siguen la altura del terreno (4 cm por encima)
function crearCharco(x, z) {
  const geometria = new THREE.PlaneGeometry(RADIO_CHARCO * 2, RADIO_CHARCO * 2, 12, 12)
  geometria.rotateX(-Math.PI / 2)
  const pos = geometria.attributes.position
  for (let i = 0; i < pos.count; i++) pos.setY(i, alturaDelTerreno(x + pos.getX(i), z + pos.getZ(i)) + 0.04)
  geometria.translate(x, 0, z)
  return geometria
}

function Farol({ base, indice }) {
  const [x, y, z] = base
  const vidrio = useRef()
  const resplandor = useRef()
  const suelo = useRef()
  const charco = useMemo(() => crearCharco(x, z), [x, z])

  useFrame(({ clock }) => {
    const t = transicionHora.t // 0 mañana, 1 noche
    const latido = 1 + 0.05 * Math.sin(clock.elapsedTime * 3.3 + indice) // la llama respira
    vidrio.current.emissiveIntensity = THREE.MathUtils.lerp(0.3, 2.4, t) * latido
    resplandor.current.material.opacity = THREE.MathUtils.lerp(0.15, 1, t)
    suelo.current.material.opacity = THREE.MathUtils.lerp(0.05, 0.75, t) * latido
  })

  return (
    <group name="farol">
      <mesh ref={suelo} geometry={charco}>
        <meshBasicMaterial map={texturaCharco()} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
      <group position={[x, y, z]}>
        <mesh position={[0, 0.85, 0]} castShadow>
          <cylinderGeometry args={[0.05, 0.07, 1.7, 5]} />
          <meshStandardMaterial color={PALETA.madera} flatShading />
        </mesh>
        <mesh position={[0, 1.78, 0]}>
          <boxGeometry args={[0.2, 0.26, 0.2]} />
          <meshStandardMaterial ref={vidrio} color={PALETA.fuego} emissive={PALETA.fuego} emissiveIntensity={0.3} />
        </mesh>
        <mesh position={[0, 1.97, 0]}>
          <coneGeometry args={[0.17, 0.13, 4]} />
          <meshStandardMaterial color={PALETA.sombra} flatShading />
        </mesh>
        <sprite ref={resplandor} position={[0, 1.78, 0]} scale={1.4}>
          <spriteMaterial map={texturaHalo()} blending={THREE.AdditiveBlending} transparent depthWrite={false} toneMapped={false} />
        </sprite>
      </group>
    </group>
  )
}

// Resplandor tras la cortina de la cascada: late despacio, de día apenas, de noche llama la atención
function ResplandorDeLaCueva() {
  const halo = useRef()
  useFrame(({ clock }) => {
    const t = transicionHora.t
    const pulso = 0.75 + 0.25 * Math.sin(clock.elapsedTime * 1.4)
    halo.current.material.opacity = THREE.MathUtils.lerp(0.25, 0.9, t) * pulso
  })
  return (
    <sprite ref={halo} position={[4, 1.4, -18.2]} scale={[3.4, 3.4, 1]} name="resplandor-cueva">
      <spriteMaterial map={texturaHalo()} blending={THREE.AdditiveBlending} transparent depthWrite={false} toneMapped={false} />
    </sprite>
  )
}

export function Faroles() {
  const bases = useMemo(() => LUGARES.map(({ id, menhir }) => {
    const [dx, dz] = DESPLAZAMIENTO[id] ?? [1, 0]
    const x = menhir[0] + dx
    const z = menhir[2] + dz
    return { id, base: [x, alturaDelTerreno(x, z), z] }
  }), [])
  return (
    <group name="faroles">
      {bases.map(({ id, base }, i) => <Farol key={id} base={base} indice={i} />)}
      <ResplandorDeLaCueva />
    </group>
  )
}
