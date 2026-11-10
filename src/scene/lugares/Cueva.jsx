import { useMemo, useRef } from 'react'
import { Instance, Instances } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { MUNDO } from '../../data/mundo.js'
import { useExperiencia } from '../../store/useExperiencia'
import { alturaDelTerreno } from '../isla/terreno.js'
import { PALETA } from '../paleta'
import { useCalidad } from '../useCalidad'
import { GALERIA, PUERTA, puntoEnLaPared } from './galeria'
import { Murales } from './Murales'

// Cueva de los murales (02 Z5, 06 §11): fachada de roca con una puerta en arco detrás de la cascada,
// una antesala corta y una galería en cúpula con antorchas, cristales y estalactitas. Preparada para
// entrar caminando (sprint 4): el suelo es llano y la única abertura es la puerta tras la cortina.
// Desde dentro, por la puerta, se ve caer la cascada (su malla es de doble cara)

const FACHADA = { x: [0.8, 7.2], z: -17.85 }
const ANTESALA = { z: [-17.7, -19.7] }

// Ruido suave y determinista para que la roca no sea lisa
const ruido = (a, b) => 0.5 * Math.sin(a * 2.1 + b * 0.7) + 0.5 * Math.sin(b * 1.3 - a * 0.9 + 1.7)

// ¿El punto (x, y) cae dentro del hueco de la puerta? Rectángulo con remate de medio óvalo
function dentroDeLaPuerta(x, y) {
  const mitad = PUERTA.ancho / 2
  const dx = Math.abs(x - PUERTA.x)
  if (dx >= mitad) return false
  const arranque = PUERTA.alto - mitad * 0.75
  return y < arranque + 0.75 * Math.sqrt(mitad * mitad - dx * dx)
}

// Malla facetada a partir de quads (cada quad, dos triángulos con sus propios vértices)
function deQuads(quads) {
  const posiciones = []
  for (const [a, b, c, d] of quads) posiciones.push(...a, ...b, ...c, ...b, ...d, ...c)
  const geometria = new THREE.BufferGeometry()
  geometria.setAttribute('position', new THREE.Float32BufferAttribute(posiciones, 3))
  geometria.computeVertexNormals()
  return geometria
}

// Fachada: pared de roca que tapa la ranura del terreno, del suelo a la cima de la pared, con la
// puerta abierta abajo. Es algo más ancha que la ranura para cubrir sus bordes irregulares
function crearFachada() {
  const columnas = 16
  const filas = 26
  const punto = (i, j) => {
    const x = FACHADA.x[0] + ((FACHADA.x[1] - FACHADA.x[0]) * i) / columnas
    const cima = alturaDelTerreno(x, -18.45) + 0.3
    const y = (cima * j) / filas
    // en los costados se mete hacia la pared del terreno para fundirse con ella
    const borde = Math.min(i, columnas - i) / 3
    const z = FACHADA.z + ruido(x, y) * 0.22 - (borde < 1 ? (1 - borde) * 0.35 : 0)
    return [x, y, z]
  }
  const quads = []
  for (let i = 0; i < columnas; i++) {
    for (let j = 0; j < filas; j++) {
      const a = punto(i, j)
      const d = punto(i + 1, j + 1)
      if (dentroDeLaPuerta((a[0] + d[0]) / 2, (a[1] + d[1]) / 2)) continue
      quads.push([a, punto(i + 1, j), punto(i, j + 1), d])
    }
  }
  return deQuads(quads)
}

// Antesala: túnel en arco de la fachada a la galería
function crearAntesala() {
  const lados = 12
  const anillos = [ANTESALA.z[0], (ANTESALA.z[0] + ANTESALA.z[1]) / 2, ANTESALA.z[1]]
  const punto = (k, z) => {
    const a = (Math.PI * k) / lados
    const r = 1 + 0.06 * ruido(k, z)
    return [PUERTA.x + Math.cos(a) * (PUERTA.ancho / 2 + 0.1) * r, 0.02 + Math.sin(a) * (PUERTA.alto + 0.05) * r, z]
  }
  const quads = []
  for (let n = 0; n < anillos.length - 1; n++) {
    for (let k = 0; k < lados; k++) quads.push([punto(k, anillos[n]), punto(k + 1, anillos[n]), punto(k, anillos[n + 1]), punto(k + 1, anillos[n + 1])])
  }
  return deQuads(quads)
}

// Galería: media elipsoide irregular, sin las caras que tapan la antesala
function crearGaleria() {
  const [cx, , cz] = GALERIA.centro
  const [rx, ry, rz] = GALERIA.radios
  const esfera = new THREE.SphereGeometry(1, 30, 10, 0, Math.PI * 2, 0, Math.PI / 2).toNonIndexed()
  const pos = esfera.attributes.position
  const quedan = []
  for (let i = 0; i < pos.count; i += 3) {
    const tri = [0, 1, 2].map((v) => {
      const x = pos.getX(i + v)
      const y = pos.getY(i + v)
      const z = pos.getZ(i + v)
      const r = 1 + 0.07 * ruido(x * 4, z * 4 + y * 3) * (y > 0.02 ? 1 : 0) // el borde del suelo, recto
      return [cx + x * rx * r, y * ry * r, cz + z * rz * r]
    })
    const centro = [0, 1, 2].map((eje) => (tri[0][eje] + tri[1][eje] + tri[2][eje]) / 3)
    if (centro[2] > ANTESALA.z[1] - 0.6 && Math.abs(centro[0] - PUERTA.x) < PUERTA.ancho / 2 + 0.3 && centro[1] < PUERTA.alto + 0.3) continue
    for (const p of tri) quedan.push(...p)
  }
  const galeria = new THREE.BufferGeometry()
  galeria.setAttribute('position', new THREE.Float32BufferAttribute(quedan, 3))
  galeria.computeVertexNormals()
  return galeria
}

// Rocas que enmarcan la puerta y tapan los bordes escalonados del hueco
const ROCAS_PORTAL = [
  [2.35, 0.5, 0.75], [2.25, 1.5, 0.7], [2.45, 2.4, 0.65], [3.1, 3.05, 0.6], [4, 3.3, 0.7],
  [4.9, 3.05, 0.6], [5.55, 2.4, 0.65], [5.75, 1.5, 0.7], [5.65, 0.5, 0.75],
]

// Antorchas en la pared de la galería (ángulo en la elipse: 0 = +x, -π/2 = fondo). El fondo queda libre
// para el mural destacado; las tres marcadas con luz son las que reciben una luz puntual real
// Una antorcha entre cada par de murales (data/proyectos.js); las dos del fondo flanquean el destacado
const ANTORCHAS = [0.97, -0.815, -0.6, -0.4, -0.185, 0.02].map((angulo, indice) => ({
  ...puntoEnLaPared(angulo, 0.86, 1.55),
  luz: puntoEnLaPared(angulo, 0.74, 1.9).posicion, // la luz, algo hacia dentro: ilumina los murales vecinos
  indice,
}))
// Luces puntuales reales para las antorchas: ≤ 5 en total con la fogata y el farol (06 §19.1)
const LUCES_ANTORCHA = { alta: 3, media: 1, baja: 0 }

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

// Antorcha: palo y llama emisiva, siempre visibles (la luz real la pone LucesDeAntorchas)
function Antorcha({ posicion, giro, indice }) {
  const llama = useRef()
  useFrame(({ clock }) => {
    const s = clock.elapsedTime + indice * 1.7 // desfase por antorcha
    const quieto = useExperiencia.getState().ajustes.reducirMovimiento
    llama.current.scale.y = quieto ? 1 : 1 + 0.15 * Math.sin(s * 6.2) + 0.08 * Math.sin(s * 11.3)
  })
  return (
    <group position={posicion} rotation-y={giro} name="antorcha">
      <mesh rotation-x={0.35} position={[0, -0.35, -0.12]} castShadow>
        <cylinderGeometry args={[0.05, 0.035, 0.8, 5]} />
        <meshStandardMaterial color={PALETA.madera} flatShading />
      </mesh>
      <mesh ref={llama} position={[0, 0.12, 0]}>
        <coneGeometry args={[0.1, 0.32, 5]} />
        <meshBasicMaterial color={PALETA.fuego} toneMapped={false} />
      </mesh>
    </group>
  )
}

// Las N luces reales se reparten cada 0,25 s entre las antorchas más cercanas a la cámara (06 §11.2):
// al girar o avanzar por la galería, las antorchas "revelan" los murales que tienes cerca. Una luz que
// cambia de antorcha vuelve a encenderse desde 0, sin saltos. Todas se apagan lejos de la cueva
const CENTRO = new THREE.Vector3(...GALERIA.centro)
function LucesDeAntorchas({ cantidad }) {
  const luces = useRef([])
  const asignadas = useRef([])
  const espera = useRef(0)
  const punto = useMemo(() => new THREE.Vector3(), [])

  useFrame(({ clock, camera }, delta) => {
    espera.current -= delta
    if (espera.current <= 0) {
      espera.current = 0.25
      const cercanas = ANTORCHAS
        .map(({ luz, indice }) => [indice, camera.position.distanceToSquared(punto.set(...luz))])
        .sort((a, b) => a[1] - b[1])
        .slice(0, cantidad)
        .map(([indice]) => indice)
      // las que ya estaban encendidas conservan su luz; las nuevas toman las luces libres
      const libres = luces.current.map((_, k) => k).filter((k) => !cercanas.includes(asignadas.current[k]))
      cercanas.filter((indice) => !asignadas.current.includes(indice)).forEach((indice, n) => {
        const k = libres[n]
        if (k === undefined) return
        asignadas.current[k] = indice
        luces.current[k].position.set(...ANTORCHAS[indice].luz)
        luces.current[k].intensity = 0
      })
    }
    // Se encienden al acercarse a la cueva: nada a 14 m del centro, plena luz a 6 m
    const cerca = THREE.MathUtils.smoothstep(14 - camera.position.distanceTo(CENTRO), 0, 8)
    const quieto = useExperiencia.getState().ajustes.reducirMovimiento
    luces.current.forEach((luz, k) => {
      const s = clock.elapsedTime + (asignadas.current[k] ?? k) * 1.7
      const objetivo = 9 * cerca * (quieto ? 1 : 1 + 0.1 * Math.sin(s * 7))
      luz.intensity = THREE.MathUtils.damp(luz.intensity, objetivo, 4, delta)
    })
  })

  return Array.from({ length: cantidad }, (_, k) => (
    <pointLight key={k} ref={(luz) => { luces.current[k] = luz }} color={PALETA.fuego} intensity={0} distance={7} decay={2} />
  ))
}

export function Cueva() {
  const geometrias = useMemo(() => ({ fachada: crearFachada(), antesala: crearAntesala(), galeria: crearGaleria(), matcap: crearMatcap() }), [])
  const { nivel } = useCalidad()
  const luces = LUCES_ANTORCHA[nivel] ?? LUCES_ANTORCHA.alta
  const [cx, , cz] = GALERIA.centro

  return (
    <group name="cueva">
      <mesh geometry={geometrias.fachada} castShadow receiveShadow name="cueva-fachada">
        <meshStandardMaterial color={PALETA.roca} flatShading roughness={1} side={THREE.DoubleSide} />
      </mesh>
      {ROCAS_PORTAL.map(([x, y, r]) => (
        <mesh key={`${x},${y}`} position={[x, y, FACHADA.z + 0.25]} rotation={[x, y, x * y]} castShadow receiveShadow>
          <dodecahedronGeometry args={[r, 0]} />
          <meshStandardMaterial color={PALETA.roca} flatShading roughness={1} />
        </mesh>
      ))}
      <mesh geometry={geometrias.antesala} receiveShadow name="cueva-antesala">
        <meshStandardMaterial color={PALETA.cueva} flatShading roughness={1} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={geometrias.galeria} receiveShadow name="cueva-galeria">
        <meshStandardMaterial color={PALETA.cueva} flatShading roughness={1} side={THREE.BackSide} />
      </mesh>
      {/* Suelo de roca llano (para caminar en el sprint 4): la galería y la antesala */}
      <mesh position={[cx, 0.02, cz]} rotation-x={-Math.PI / 2} scale={[GALERIA.radios[0], GALERIA.radios[2], 1]} receiveShadow name="cueva-suelo">
        <circleGeometry args={[1, 32]} />
        <meshStandardMaterial color={PALETA.cueva} roughness={1} />
      </mesh>
      <mesh position={[PUERTA.x, 0.02, (ANTESALA.z[0] + ANTESALA.z[1]) / 2 + 0.3]} rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[PUERTA.ancho + 0.2, ANTESALA.z[0] - ANTESALA.z[1] + 1.2]} />
        <meshStandardMaterial color={PALETA.cueva} roughness={1} />
      </mesh>
      <Instances limit={ESTALACTITAS.length} name="estalactitas">
        <coneGeometry args={[1, 1, 5]} />
        <meshStandardMaterial color={PALETA.cueva} flatShading roughness={1} />
        {ESTALACTITAS.map(({ posicion, escala }) => <Instance key={posicion.join()} position={posicion} scale={escala} rotation-x={Math.PI} />)}
      </Instances>
      {CRISTALES.map(({ posicion, giro }) => (
        <group key={posicion.join()} position={posicion} rotation-y={giro} name="cristales">
          {[[0, 0.55, 0, 0.18, 1.1, 0.1], [0.25, 0.35, 0.1, 0.12, 0.7, -0.4], [-0.2, 0.3, -0.1, 0.1, 0.6, 0.45]].map(([x, y, z, ancho, alto, inclinacion]) => (
            <mesh key={`${x},${z}`} position={[x, y, z]} rotation-z={inclinacion} scale={[ancho, alto, ancho]}>
              <octahedronGeometry args={[1, 0]} />
              <meshMatcapMaterial matcap={geometrias.matcap} flatShading />
            </mesh>
          ))}
        </group>
      ))}
      {ANTORCHAS.map(({ posicion, giro, indice }) => <Antorcha key={indice} posicion={posicion} giro={giro} indice={indice} />)}
      {/* key por cantidad: si cambia la calidad se rehacen las luces (y se recompilan los shaders) */}
      <LucesDeAntorchas key={luces} cantidad={luces} />
      <Murales />
      {/* Repisa de piedras que se pierde tras la cortina (02 Z4) */}
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh castShadow key={i} position={[MUNDO.repisa.desde + i, MUNDO.repisa.y + 0.08, MUNDO.repisa.z]}>
          <boxGeometry args={[0.8, 0.16, 0.7]} />
          <meshStandardMaterial color={PALETA.piedra} flatShading />
        </mesh>
      ))}
    </group>
  )
}
