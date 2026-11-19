import { useMemo, useRef } from 'react'
import { Instance, Instances } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useExperiencia } from '../../store/useExperiencia'
import { useIdioma } from '../../store/idioma'
import { PALETA } from '../paleta'
import { texturaHalo } from '../efectos'
import { useMaterialPBR, uvPorCaja } from '../materiales'
import { Brasas } from './Fogata'
import { ANTESALA, ANTORCHAS, crearGaleria, GALERIA, PUERTA } from './galeria'
import { Murales } from './Murales'
import { VideoDelMural } from './VideoDelMural'

// Interior de la cueva (02 Z5, 06 §11): galería en cúpula, suelo, estalactitas, cristales con MatCap,
// antorchas y murales. Es un chunk aparte que se carga al acercarse (HT-12, Cueva.jsx). Las luces de
// las antorchas no están aquí: siguen en el núcleo (Cueva.jsx) para que montar este chunk no cambie el
// número de luces de la escena ni obligue a recompilar los shaders

// Estalactitas repartidas por el techo, con una semilla fija
const ESTALACTITAS = (() => {
  let s = 13
  const azar = () => ((s = (s * 16807) % 2147483647) / 2147483647)
  const [cx, , cz] = GALERIA.centro
  const [rx, ry, rz] = GALERIA.radios
  return Array.from({ length: 22 }, () => {
    const a = azar() * Math.PI * 2
    const d = 0.25 + azar() * 0.6
    const u = Math.cos(a) * d
    const v = Math.sin(a) * d
    const techo = ry * Math.sqrt(Math.max(0, 1 - u * u - v * v)) * 0.97
    const largo = 0.5 + azar() * 1
    return { posicion: [cx + u * rx, techo - largo / 2, cz + v * rz], escala: [0.18 + azar() * 0.12, largo, 0.18 + azar() * 0.12] }
  }).filter(({ posicion }) => !(posicion[2] > -21 && Math.abs(posicion[0] - PUERTA.x) < 2)) // despejado sobre la entrada
})()

// MatCap generado en un canvas (requisito de MatCaps, 05 §6): una esfera pintada con brillo arriba a
// la izquierda. El material lee de ella el color según la normal: brilla sin necesitar luces
function crearMatcap() {
  const lado = 128
  const lienzo = document.createElement('canvas')
  lienzo.width = lienzo.height = lado
  const ctx = lienzo.getContext('2d')
  const g = ctx.createRadialGradient(lado * 0.35, lado * 0.3, lado * 0.02, lado / 2, lado / 2, lado / 2)
  g.addColorStop(0, '#ffffff')
  g.addColorStop(0.25, PALETA.espuma)
  g.addColorStop(0.7, PALETA.agua)
  g.addColorStop(1, '#1d3a44')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, lado, lado)
  const textura = new THREE.CanvasTexture(lienzo)
  textura.colorSpace = THREE.SRGBColorSpace
  return textura
}

const CRISTALES = [
  { posicion: [-1.6, 0, -23.5], giro: 0.3 }, { posicion: [9.8, 0, -25.5], giro: 1.4 },
  { posicion: [1.2, 0, -28.6], giro: 2.2 }, { posicion: [7.4, 0, -28.4], giro: 0.9 },
]

// Antorcha: palo, dos llamas que respiran, halo y brasas que suben como en la fogata.
// La luz real (que ilumina la roca y los murales) la ponen LucesDeAntorchas en las más cercanas
function Antorcha({ posicion, giro, indice }) {
  const llama = useRef()
  const nucleo = useRef()
  const resplandor = useRef()
  useFrame(({ clock }) => {
    const s = clock.elapsedTime + indice * 1.7 // desfase por antorcha
    const quieto = useExperiencia.getState().ajustes.reducirMovimiento
    const latido = quieto ? 1 : 1 + 0.15 * Math.sin(s * 6.2) + 0.08 * Math.sin(s * 11.3)
    llama.current.scale.y = latido
    nucleo.current.scale.y = quieto ? 1 : 1 + 0.2 * Math.sin(s * 8.1 + 1)
    llama.current.rotation.z = quieto ? 0 : 0.1 * Math.sin(s * 2.3)
    resplandor.current.scale.setScalar(0.95 * latido)
  })
  return (
    <group position={posicion} rotation-y={giro} name="antorcha">
      <mesh rotation-x={0.35} position={[0, -0.35, -0.12]} castShadow>
        <cylinderGeometry args={[0.05, 0.035, 0.8, 5]} />
        <meshStandardMaterial color={PALETA.madera} flatShading />
      </mesh>
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.08, 0.06, 0.12, 6]} />
        <meshStandardMaterial color={PALETA.sombra} emissive={PALETA.fuego} emissiveIntensity={0.4} flatShading />
      </mesh>
      <mesh ref={llama} position={[0, 0.2, 0]}>
        <coneGeometry args={[0.11, 0.38, 5]} />
        <meshBasicMaterial color={PALETA.llama} toneMapped={false} />
      </mesh>
      <mesh ref={nucleo} position={[0, 0.16, 0.02]}>
        <coneGeometry args={[0.06, 0.24, 5]} />
        <meshBasicMaterial color={PALETA.fuego} toneMapped={false} />
      </mesh>
      <sprite ref={resplandor} position={[0, 0.22, 0]}>
        <spriteMaterial map={texturaHalo()} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </sprite>
      <Brasas cantidad={10} altura={1.3} abertura={0.08} base={0.25} tamano={0.045} semilla={7 + indice * 13} />
    </group>
  )
}

// El interior (galería, murales, antorchas, cristales) solo se dibuja con la cámara cerca de la cueva:
// desde fuera lo tapa la colina, pero igual costaba unas 60 llamadas de dibujo por fotograma (HU-11).
// Las luces de las antorchas quedan fuera de este grupo: ocultar una luz cambia el número de luces y
// obliga a recompilar todos los shaders
const DISTANCIA_INTERIOR = 16

function Interior({ children }) {
  const grupo = useRef()
  const centro = useMemo(() => new THREE.Vector3(...GALERIA.centro), [])
  useFrame(({ camera }) => {
    grupo.current.visible = camera.position.distanceTo(centro) < DISTANCIA_INTERIOR
  })
  return <group ref={grupo} name="cueva-interior">{children}</group>
}

export default function CuevaInterior() {
  const idioma = useIdioma((s) => s.idioma)
  const geometrias = useMemo(() => ({ galeria: uvPorCaja(crearGaleria()), matcap: crearMatcap() }), [])
  const roca = useMaterialPBR('roca')
  const [cx, , cz] = GALERIA.centro
  return (
    <>
      <Interior>
      <mesh geometry={geometrias.galeria} receiveShadow name="cueva-galeria">
        {/* Roca normal, no oscura: la penumbra la da la falta de luz y las antorchas iluminan la pared */}
        <meshStandardMaterial {...roca} color={PALETA.roca} flatShading roughness={1} side={THREE.BackSide} />
      </mesh>
      {/* Suelo de roca llano (para caminar en el sprint 4): la galería y la antesala */}
      <mesh position={[cx, 0.02, cz]} rotation-x={-Math.PI / 2} scale={[GALERIA.radios[0], GALERIA.radios[2], 1]} receiveShadow name="cueva-suelo">
        <circleGeometry args={[1, 32]} />
        <meshStandardMaterial color={PALETA.piedra} roughness={1} />
      </mesh>
      <mesh position={[PUERTA.x, 0.02, (ANTESALA.z[0] + ANTESALA.z[1]) / 2 + 0.3]} rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[PUERTA.ancho + 0.2, ANTESALA.z[0] - ANTESALA.z[1] + 1.2]} />
        <meshStandardMaterial color={PALETA.piedra} roughness={1} />
      </mesh>
      <Instances limit={ESTALACTITAS.length} name="estalactitas">
        <coneGeometry args={[1, 1, 5]} />
        <meshStandardMaterial color={PALETA.roca} flatShading roughness={1} />
        {ESTALACTITAS.map(({ posicion, escala }) => <Instance key={posicion.join()} position={posicion} scale={escala} rotation-x={Math.PI} />)}
      </Instances>
      {/* Todos los cristales en una sola malla instanciada (antes, una por cristal) */}
      <Instances limit={CRISTALES.length * 3} name="cristales">
        <octahedronGeometry args={[1, 0]} />
        <meshMatcapMaterial matcap={geometrias.matcap} flatShading />
        {CRISTALES.map(({ posicion, giro }) => (
          <group key={posicion.join()} position={posicion} rotation-y={giro}>
            {[[0, 0.55, 0, 0.18, 1.1, 0.1], [0.25, 0.35, 0.1, 0.12, 0.7, -0.4], [-0.2, 0.3, -0.1, 0.1, 0.6, 0.45]].map(([x, y, z, ancho, alto, inclinacion]) => (
              <Instance key={`${x},${z}`} position={[x, y, z]} rotation-z={inclinacion} scale={[ancho, alto, ancho]} />
            ))}
          </group>
        ))}
      </Instances>
      {ANTORCHAS.map(({ posicion, giro, indice }) => <Antorcha key={indice} posicion={posicion} giro={giro} indice={indice} />)}
      <Murales key={idioma} /* sus rótulos dependen del idioma */ />
      <VideoDelMural />
      </Interior>
    </>
  )
}
