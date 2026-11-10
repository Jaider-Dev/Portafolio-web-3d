import { Clone, Instance, Instances, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { LUGARES } from '../../data/lugares.js'
import { MUNDO, SENDERO } from '../../data/mundo.js'
import { PALETA } from '../paleta'
import { alturaDelTerreno } from '../isla/terreno.js'

const RUTAS = {
  tienda: '/models/tienda.glb',
  fogata: '/models/fogata.glb',
  puente: '/models/puente.glb',
  menhir: '/models/menhir.glb',
}

// Los GLB provisionales salen en gris; al cargarlos, cada material toma su color de la paleta por su
// nombre (05 §14: los modelos usan los materiales del proyecto). Es idempotente: useGLTF los cachea
const COLOR_POR_MATERIAL = {
  lona: PALETA.lona,
  madera: PALETA.madera,
  piedra: PALETA.piedra,
  brasa: PALETA.fuego,
  sombra: PALETA.sombra,
}

const pintados = new WeakSet()

function usePintado(ruta) {
  const { scene } = useGLTF(ruta)
  if (!pintados.has(scene)) {
    pintados.add(scene)
    scene.traverse(({ material }) => {
      const hex = COLOR_POR_MATERIAL[material?.name]
      if (!hex) return
      material.color.set(hex)
      if (material.name === 'brasa') {
        material.emissive.set(PALETA.fuego) // las brasas brillan con luz propia, también de noche
        material.emissiveIntensity = 0.9
      }
    })
  }
  return scene
}

function Modelo({ ruta, ...props }) {
  const scene = usePintado(ruta)
  return <Clone object={scene} castShadow {...props} />
}

export function Menhires() {
  const scene = usePintado(RUTAS.menhir)
  return (
    <group name="menhires">
      {LUGARES.map((lugar) => <Clone key={lugar.id} object={scene} castShadow name={`menhir-${lugar.id}`} position={lugar.menhir} />)}
    </group>
  )
}

export function Campamento() {
  const [xFogata, , zFogata] = MUNDO.fogata
  const { radio, cantidad } = MUNDO.troncos
  // La tienda mira hacia la fogata: su entrada es +Z
  const haciaFogata = Math.atan2(xFogata - MUNDO.tienda[0], zFogata - MUNDO.tienda[2])
  return (
    <group name="campamento">
      <Modelo ruta={RUTAS.tienda} position={MUNDO.tienda} rotation-y={haciaFogata} />
      <Modelo ruta={RUTAS.fogata} position={MUNDO.fogata} />
      {Array.from({ length: cantidad }, (_, i) => {
        const angulo = Math.PI / 4 + (i / cantidad) * Math.PI * 2
        return (
          <group key={i} position={[xFogata + Math.cos(angulo) * radio, 0.22, zFogata + Math.sin(angulo) * radio]} rotation-y={-angulo + Math.PI / 2}>
            <mesh castShadow rotation-z={Math.PI / 2}>
              <cylinderGeometry args={[0.22, 0.24, 1.3, 7]} />
              <meshStandardMaterial color={PALETA.madera} flatShading />
            </mesh>
          </group>
        )
      })}
      <group position={MUNDO.mochila} name="mochila">
        <mesh castShadow position={[0, 0.4, 0]}>
          <boxGeometry args={[0.6, 0.8, 0.4]} />
          <meshStandardMaterial color={PALETA.madera} flatShading />
        </mesh>
        <mesh castShadow position={[0, 0.84, 0]} rotation-x={-0.25}>
          <boxGeometry args={[0.42, 0.06, 0.3]} />
          <meshStandardMaterial color={PALETA.agua} flatShading />
        </mesh>
      </group>
    </group>
  )
}

export function Puente() {
  return <Modelo ruta={RUTAS.puente} position={MUNDO.puente} name="puente" />
}

export function Vado() {
  const { desde, hasta, y, z, piedras } = MUNDO.vado
  return (
    <group name="vado">
      {Array.from({ length: piedras }, (_, i) => (
        <mesh castShadow key={i} position={[desde + (i * (hasta - desde)) / (piedras - 1), y, z]}>
          <cylinderGeometry args={[0.42, 0.5, 0.5, 7]} />
          <meshStandardMaterial color={PALETA.piedra} flatShading />
        </mesh>
      ))}
    </group>
  )
}

// La cueva tapada del sprint 1: una pieza cierra la entrada y por dentro hay una sala vacía
export function Cueva() {
  const { centro, ancho, fondo, alto } = MUNDO.galeria
  const profundidad = fondo + 1.4 // incluye la antesala, desde la entrada hasta el fondo
  return (
    <group name="cueva">
      <mesh position={[centro[0], alto / 2, centro[2] + 0.7]}>
        <boxGeometry args={[ancho, alto, profundidad]} />
        <meshStandardMaterial color={PALETA.cueva} side={THREE.BackSide} roughness={1} />
      </mesh>
      <mesh castShadow position={[MUNDO.entradaCueva[0], 1.5, -17.65]}>
        <boxGeometry args={[3.4, 3, 0.3]} />
        <meshStandardMaterial color={PALETA.cueva} flatShading />
      </mesh>
      {/* Repisa de piedras que se pierde tras la cortina */}
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh castShadow key={i} position={[MUNDO.repisa.desde + i, MUNDO.repisa.y + 0.08, MUNDO.repisa.z]}>
          <boxGeometry args={[0.8, 0.16, 0.7]} />
          <meshStandardMaterial color={PALETA.piedra} flatShading />
        </mesh>
      ))}
    </group>
  )
}

// Reparte peldaños a lo largo de la polilínea del sendero, siguiendo el terreno
function puntosDelSendero(separacion = 1.1) {
  const curva = new THREE.CatmullRomCurve3(SENDERO.map(([x, z]) => new THREE.Vector3(x, 0, z)))
  const cantidad = Math.round(curva.getLength() / separacion)
  return Array.from({ length: cantidad + 1 }, (_, i) => {
    const punto = curva.getPointAt(i / cantidad)
    const tangente = curva.getTangentAt(i / cantidad)
    return {
      posicion: [punto.x, alturaDelTerreno(punto.x, punto.z) + 0.1, punto.z],
      giro: Math.atan2(tangente.x, tangente.z),
    }
  })
}

export function Sendero() {
  const peldanos = puntosDelSendero()
  return (
    <group name="sendero">
      <Instances limit={peldanos.length} castShadow receiveShadow>
        <boxGeometry args={[1.5, 0.3, 0.95]} />
        <meshStandardMaterial color={PALETA.sendero} flatShading />
        {peldanos.map(({ posicion, giro }) => <Instance key={posicion.join()} position={posicion} rotation-y={giro} />)}
      </Instances>
    </group>
  )
}

export function Cima() {
  return (
    <group name="cima">
      <mesh castShadow position={[MUNDO.mirador[0], MUNDO.mirador[1] + 0.2, MUNDO.mirador[2]]}>
        <cylinderGeometry args={[1.8, 2.1, 0.5, 8]} />
        <meshStandardMaterial color={PALETA.piedra} flatShading />
      </mesh>
      <mesh castShadow position={[MUNDO.manantial[0], MUNDO.manantial[1] + 0.2, MUNDO.manantial[2]]}>
        <dodecahedronGeometry args={[0.9]} />
        <meshStandardMaterial color={PALETA.piedra} flatShading />
      </mesh>
    </group>
  )
}

useGLTF.preload(RUTAS.tienda)
useGLTF.preload(RUTAS.fogata)
useGLTF.preload(RUTAS.puente)
useGLTF.preload(RUTAS.menhir)
