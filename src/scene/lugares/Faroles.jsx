import { useMemo, useRef } from 'react'
import { Instance, Instances } from '@react-three/drei'
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

// Lámpara compartida por los cinco faroles (mismo brillo; antes cada uno latía con su fase)
const VIDRIO = new THREE.MeshStandardMaterial({ color: PALETA.fuego, emissive: PALETA.fuego, emissiveIntensity: 0.3 })

// Charco de luz y halo de un farol (dependen de su sitio en el terreno)
function Luz({ base, indice }) {
  const [x, y, z] = base
  const resplandor = useRef()
  const suelo = useRef()
  const charco = useMemo(() => crearCharco(x, z), [x, z])

  useFrame(({ clock }) => {
    const t = transicionHora.t // 0 mañana, 1 noche
    const latido = 1 + 0.05 * Math.sin(clock.elapsedTime * 3.3 + indice) // la llama respira
    resplandor.current.material.opacity = THREE.MathUtils.lerp(0.15, 1, t)
    suelo.current.material.opacity = THREE.MathUtils.lerp(0.05, 0.75, t) * latido
  })

  return (
    <group name="farol">
      <mesh ref={suelo} geometry={charco}>
        <meshBasicMaterial map={texturaCharco()} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
      <sprite ref={resplandor} position={[x, y + 1.78, z]} scale={1.4}>
        <spriteMaterial map={texturaHalo()} blending={THREE.AdditiveBlending} transparent depthWrite={false} toneMapped={false} />
      </sprite>
    </group>
  )
}

// Poste, lámpara y techo de los cinco faroles: tres mallas instanciadas en vez de quince (HU-11)
function Cuerpos({ bases }) {
  useFrame(({ clock }) => {
    const latido = 1 + 0.05 * Math.sin(clock.elapsedTime * 3.3)
    VIDRIO.emissiveIntensity = THREE.MathUtils.lerp(0.3, 2.4, transicionHora.t) * latido
  })
  const piezas = [
    { nombre: 'postes', alto: 0.85, geometria: <cylinderGeometry args={[0.05, 0.07, 1.7, 5]} />, material: <meshStandardMaterial color={PALETA.madera} flatShading />, sombra: true },
    { nombre: 'lamparas', alto: 1.78, geometria: <boxGeometry args={[0.2, 0.26, 0.2]} />, material: <primitive object={VIDRIO} attach="material" /> },
    { nombre: 'techos', alto: 1.97, geometria: <coneGeometry args={[0.17, 0.13, 4]} />, material: <meshStandardMaterial color={PALETA.sombra} flatShading /> },
  ]
  return piezas.map(({ nombre, alto, geometria, material, sombra }) => (
    <Instances key={nombre} name={nombre} limit={bases.length} castShadow={sombra}>
      {geometria}
      {material}
      {bases.map(({ id, base: [x, y, z] }) => <Instance key={id} position={[x, y + alto, z]} />)}
    </Instances>
  ))
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
      <Cuerpos bases={bases} />
      {bases.map(({ id, base }, i) => <Luz key={id} base={base} indice={i} />)}
      <ResplandorDeLaCueva />
    </group>
  )
}
