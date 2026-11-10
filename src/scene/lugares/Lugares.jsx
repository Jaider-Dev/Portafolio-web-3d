import { useMemo } from 'react'
import { Clone, Instance, Instances, useGLTF } from '@react-three/drei'
import { LUGARES } from '../../data/lugares.js'
import { MUNDO } from '../../data/mundo.js'
import { PALETA } from '../paleta'
import { alturaDelTerreno, ESTANQUE, SENDERO_DENSO } from '../isla/terreno.js'
import { FuegoVivo } from './Fogata'

const RUTAS = {
  tienda: '/models/tienda.glb',
  fogata: '/models/fogata.glb',
  puente: '/models/puente.glb',

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

// Una roca facetada con proporciones y giro propios a partir de una semilla (determinista)
const roca = (posicion, radio, aplastada = 1, semilla = posicion[0] * 7 + posicion[2]) => ({
  posicion,
  escala: [radio * (1 + 0.15 * Math.sin(semilla)), radio * aplastada, radio * (1 - 0.15 * Math.cos(semilla))],
  rotacion: [Math.sin(semilla * 1.3) * 0.5, semilla, Math.cos(semilla * 0.7) * 0.4],
})

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

// Menhires (02 §7): piedras hincadas irregulares y algo inclinadas, con piedras pequeñas en la base.
// Antes eran obeliscos tallados (cilindro + punta) y parecían torres
function Menhir({ posicion, semilla }) {
  const azar = useMemo(() => generador(semilla), [semilla])
  const [x, , z] = posicion
  const y = alturaDelTerreno(x, z)
  const base = useMemo(() => Array.from({ length: 3 }, (_, i) => {
    const a = (i / 3) * Math.PI * 2 + azar() * 1.5
    return roca([x + Math.cos(a) * 0.6, y + 0.05, z + Math.sin(a) * 0.6], 0.22 + azar() * 0.12, 0.6, semilla + i)
  }), [azar, x, y, z, semilla])
  return (
    <group name="menhir">
      <mesh position={[x, y + 1.05, z]} scale={[0.42, 1.2, 0.3]} rotation={[0.07 * Math.sin(semilla), semilla, 0.08 * Math.cos(semilla)]} castShadow receiveShadow>
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color={PALETA.piedra} flatShading roughness={1} />
      </mesh>
      <Rocas piedras={base} color={PALETA.piedra} />
    </group>
  )
}

export function Menhires() {
  return (
    <group name="menhires">
      {LUGARES.map((lugar, i) => <Menhir key={lugar.id} posicion={lugar.menhir} semilla={3 + i * 11} />)}
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
      <FuegoVivo position={MUNDO.fogata} />
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

// Pseudoaleatorio con semilla: las piedras quedan igual en cada visita
function generador(semilla) {
  let s = semilla
  return () => ((s = (s * 16807) % 2147483647) / 2147483647)
}

// Piedras del sendero (02 Z6): el camino de tierra está pintado en el terreno (isla/Isla.jsx); aquí solo
// van losas planas e irregulares, medio hundidas, donde la cuesta lo pide (≥ 0,35 m de subida por metro)
function piedrasDelSendero() {
  const azar = generador(29)
  const piedras = []
  let recorrido = 0
  for (let i = 1; i < SENDERO_DENSO.length; i++) {
    const [x0, z0] = SENDERO_DENSO[i - 1]
    const [x, z] = SENDERO_DENSO[i]
    const paso = Math.hypot(x - x0, z - z0)
    recorrido += paso
    const pendiente = Math.abs(alturaDelTerreno(x, z) - alturaDelTerreno(x0, z0)) / paso
    if (recorrido < 1.15 || pendiente < 0.35) continue
    recorrido = 0
    const giro = Math.atan2(x - x0, z - z0)
    const lado = (azar() - 0.5) * 0.5 // no todas en el centro del camino
    const px = x + Math.cos(giro) * lado
    const pz = z - Math.sin(giro) * lado
    piedras.push({
      posicion: [px, alturaDelTerreno(px, pz) + 0.02, pz],
      rotacion: [(azar() - 0.5) * 0.15, giro + (azar() - 0.5) * 0.6, (azar() - 0.5) * 0.15],
      escala: [0.55 + azar() * 0.25, 0.14 + azar() * 0.06, 0.4 + azar() * 0.15],
    })
  }
  return piedras
}

export function Sendero() {
  const piedras = useMemo(() => piedrasDelSendero(), [])
  return (
    <group name="sendero">
      <Instances limit={piedras.length} castShadow receiveShadow>
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color={PALETA.piedra} flatShading roughness={1} />
        {piedras.map(({ posicion, rotacion, escala }) => <Instance key={posicion.join()} position={posicion} rotation={rotacion} scale={escala} />)}
      </Instances>
    </group>
  )
}

// Afloramiento de rocas: varias piedras facetadas apoyadas en el terreno alrededor de un punto
function Rocas({ piedras, nombre, color = PALETA.roca }) {
  return (
    <Instances limit={piedras.length} castShadow receiveShadow name={nombre}>
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color={color} flatShading roughness={1} />
      {piedras.map(({ posicion, escala, rotacion }) => <Instance key={posicion.join()} position={posicion} scale={escala} rotation={rotacion} />)}
    </Instances>
  )
}


// Cima: el mirador es un afloramiento de losas (antes, un cilindro) y el manantial, una roca
export function Cima() {
  const [mx, my, mz] = MUNDO.mirador
  const losas = [
    roca([mx, my + 0.05, mz], 1.6, 0.22), roca([mx + 1.1, my + 0.15, mz - 0.6], 0.9, 0.3),
    roca([mx - 1.2, my + 0.1, mz + 0.5], 0.8, 0.28), roca([mx + 0.3, my + 0.12, mz + 1.2], 0.7, 0.25),
  ]
  // El manantial: rocas detrás del estanque (del lado contrario al arroyo); el agua brota a sus pies
  const [ex, , ez] = ESTANQUE.centro
  const detras = (distancia, lado, radio, aplastada) => {
    const x = ex + 0.55 * distancia + 0.83 * lado
    const z = ez - 0.83 * distancia + 0.55 * lado
    return roca([x, alturaDelTerreno(x, z) + radio * 0.35, z], radio, aplastada)
  }
  return (
    <group name="cima">
      <Rocas nombre="mirador" piedras={losas} color={PALETA.piedra} />
      <Rocas nombre="manantial" piedras={[detras(1.9, 0, 0.9, 0.8), detras(1.6, 1.1, 0.55, 0.7), detras(1.6, -1.1, 0.5, 0.7)]} />
    </group>
  )
}

useGLTF.preload(RUTAS.tienda)
useGLTF.preload(RUTAS.fogata)
useGLTF.preload(RUTAS.puente)

