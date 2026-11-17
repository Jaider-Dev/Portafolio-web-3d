import { useMemo, useRef } from 'react'
import { Instance, Instances } from '@react-three/drei'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useExperiencia } from '../../store/useExperiencia'
import { PALETA } from '../paleta'

// Entorno de la zona Z0 (02 §8, HU-16): una capa de nubes bajo la isla, otra a media altura e islas
// lejanas. Todo es geometría facetada propia (sin texturas descargadas), en el estilo low poly de 05 §3

// Pseudoaleatorio con semilla: el cielo es el mismo en cada visita
function generador(semilla) {
  let s = semilla
  return () => ((s = (s * 16807) % 2147483647) / 2147483647)
}

// Una nube = un racimo de 4 a 7 "bolas" facetadas; devuelve la posición y escala de cada bola
function racimos(cantidad, { radio: [rMin, rMax], altura: [yMin, yMax], tamano: [tMin, tMax] }, semilla, fijas = []) {
  const azar = generador(semilla)
  const centros = [...fijas]
  for (let i = 0; i < cantidad; i++) {
    const angulo = azar() * Math.PI * 2
    const r = rMin + azar() * (rMax - rMin)
    centros.push([Math.cos(angulo) * r, yMin + azar() * (yMax - yMin), Math.sin(angulo) * r - 5.5, tMin + azar() * (tMax - tMin)])
  }
  return centros.flatMap(([x, y, z, tamano]) => {
    const bolas = 4 + Math.floor(azar() * 4)
    return Array.from({ length: bolas }, (_, i) => {
      const lado = (i / (bolas - 1) - 0.5) * tamano * 2.2
      const s = tamano * (0.55 + azar() * 0.5) * (1 - Math.abs(lado) / (tamano * 3))
      return { posicion: [x + lado, y + azar() * tamano * 0.35, z + (azar() - 0.5) * tamano * 0.9], escala: [s * 1.3, s * 0.8, s] }
    })
  })
}

// Bajo la isla (y de -18 a -30): oculta el final de la cascada baja y da sensación de altura.
// Una nube fija justo donde se pierde la cascada baja (x -5, z 27)
const CAPA_BAJA = racimos(26, { radio: [14, 70], altura: [-30, -19], tamano: [4, 8] }, 3, [[-5, -25, 27.5, 7], [4, -23, 22, 6]])
// A media altura y lejos de la isla, para no tapar los lugares
const CAPA_MEDIA = racimos(12, { radio: [85, 150], altura: [0, 22], tamano: [6, 11] }, 9)

function CapaDeNubes({ bolas, velocidad, nombre }) {
  const capa = useRef()
  // Deriva lenta alrededor de la isla; quieta con "reducir movimiento"
  useFrame((_, delta) => {
    if (!useExperiencia.getState().ajustes.reducirMovimiento) capa.current.rotation.y += velocidad * Math.min(delta, 0.1)
  })
  return (
    <group ref={capa} name={nombre}>
      <Instances limit={bolas.length}>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color={PALETA.nube} flatShading roughness={1} />
        {bolas.map(({ posicion, escala }) => <Instance key={posicion.join()} position={posicion} scale={escala} />)}
      </Instances>
    </group>
  )
}

// 6 islas entre 95 y 190 m, a distintas alturas (02 §8: de 5 a 8)
const ISLAS = [
  { posicion: [-110, 8, -70], escala: 6 },
  { posicion: [95, 18, -95], escala: 4 },
  { posicion: [150, -4, 30], escala: 8 },
  { posicion: [-160, 22, 40], escala: 5 },
  { posicion: [40, 30, -180], escala: 7 },
  { posicion: [-60, -14, 140], escala: 4.5 },
]

// Cada isla lejana es una sola malla: roca, prado y árboles unidos con su color en cada vértice
// (antes, de 3 a 5 mallas por isla: una llamada de dibujo cada una, HU-11)
const MATERIAL_ISLA = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 })

function pieza(geometria, color, transformar) {
  const g = geometria.toNonIndexed()
  transformar(g)
  const c = new THREE.Color(color)
  g.setAttribute('color', new THREE.Float32BufferAttribute(Array.from({ length: g.attributes.position.count }, () => [c.r, c.g, c.b]).flat(), 3))
  g.deleteAttribute('uv')
  g.deleteAttribute('normal')
  return g
}

function crearIslaLejana(fase) {
  const arboles = [[-0.5, 0.3], [0.6, -0.2], [0.1, 0.7]].slice(0, 1 + (fase % 3))
  return mergeGeometries([
    pieza(new THREE.ConeGeometry(1.6, 3, 7), PALETA.roca, (g) => g.rotateX(Math.PI).translate(0, -1.4, 0)),
    pieza(new THREE.CylinderGeometry(1.65, 1.6, 0.25, 7), PALETA.meseta, (g) => g.translate(0, 0.05, 0)),
    ...arboles.map(([x, z]) => pieza(new THREE.ConeGeometry(0.3, 1.3, 6), PALETA.vegetacion, (g) => g.translate(x, 0.75, z))),
  ])
}

function IslaLejana({ posicion, escala, fase }) {
  const isla = useRef()
  const geometria = useMemo(() => crearIslaLejana(fase), [fase])
  // Suben y bajan con suavidad, cada una a su ritmo (no sincronizadas)
  useFrame(({ clock }) => {
    if (useExperiencia.getState().ajustes.reducirMovimiento) return
    isla.current.position.y = posicion[1] + Math.sin(clock.elapsedTime * (0.25 + fase * 0.07) + fase * 2.1) * escala * 0.12
  })
  return (
    <group ref={isla} position={posicion} scale={escala} name="isla-lejana">
      <mesh geometry={geometria} material={MATERIAL_ISLA} />
    </group>
  )
}

export function Nubes() {
  const islas = useMemo(() => ISLAS.map((isla, i) => ({ ...isla, fase: i })), [])
  return (
    <group name="entorno">
      <CapaDeNubes bolas={CAPA_BAJA} velocidad={0.006} nombre="nubes-bajas" />
      <CapaDeNubes bolas={CAPA_MEDIA} velocidad={-0.003} nombre="nubes-medias" />
      {islas.map((isla) => <IslaLejana key={isla.fase} {...isla} />)}
    </group>
  )
}
