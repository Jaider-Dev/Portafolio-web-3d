import { useMemo } from 'react'
import * as THREE from 'three'
import { PALETA } from '../paleta'
import { alturaDelTerreno, CONTORNO, distanciaAlSendero, puntoDelContorno, SENDERO_DENSO } from './terreno.js'

const SECTORES = 200
const ANILLOS = 48

// De arriba abajo: fracción del contorno y altura de cada anillo de la masa rocosa (cono invertido)
const PERFIL_MASA = [[1, -6], [0.92, -9], [0.8, -12.5], [0.62, -16.5], [0.42, -20.5], [0.2, -24], [0.03, -26]]

const unirCaras = (posiciones, indices) => {
  const indexada = new THREE.BufferGeometry()
  indexada.setAttribute('position', new THREE.Float32BufferAttribute(posiciones, 3))
  indexada.setIndex(indices)
  const plana = indexada.toNonIndexed() // sin vértices compartidos: facetas de low poly
  plana.computeVertexNormals()
  return plana
}

function crearSuperficie() {
  const posiciones = [0, alturaDelTerreno(0, CONTORNO.centroZ), CONTORNO.centroZ]
  const indices = []
  for (let anillo = 1; anillo <= ANILLOS; anillo++) {
    for (let sector = 0; sector < SECTORES; sector++) {
      const [x, z] = puntoDelContorno((sector / SECTORES) * Math.PI * 2, anillo / ANILLOS)
      posiciones.push(x, alturaDelTerreno(x, z), z)
    }
  }
  const vertice = (anillo, sector) => 1 + (anillo - 1) * SECTORES + (sector % SECTORES)
  for (let sector = 0; sector < SECTORES; sector++) {
    indices.push(0, vertice(1, sector + 1), vertice(1, sector))
    for (let anillo = 1; anillo < ANILLOS; anillo++) {
      const a = vertice(anillo, sector)
      const b = vertice(anillo, sector + 1)
      const c = vertice(anillo + 1, sector)
      const d = vertice(anillo + 1, sector + 1)
      indices.push(a, b, c, b, d, c)
    }
  }
  return pintarPorPendiente(abrirRanuraDeLaCueva(unirCaras(posiciones, indices)))
}

// La entrada de la cueva (02 Z5): el terreno es un mapa de alturas y no admite túneles, y su pared
// detrás de la cascada está hecha de triángulos de hasta 16 m. Se quitan solo las caras de pared
// (casi verticales) en ese tramo; la fachada de roca con la puerta (lugares/Cueva.jsx) tapa la ranura
const RANURA_CUEVA = { x: [1.6, 6.4], z: [-18.7, -17.3] }
function abrirRanuraDeLaCueva(geometria) {
  const pos = geometria.attributes.position
  const nor = geometria.attributes.normal
  const quedan = []
  for (let i = 0; i < pos.count; i += 3) {
    const x = (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3
    const z = (pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3
    const vertical = Math.abs(nor.getY(i)) < 0.75
    const enRanura = x > RANURA_CUEVA.x[0] && x < RANURA_CUEVA.x[1] && z > RANURA_CUEVA.z[0] && z < RANURA_CUEVA.z[1]
    if (!(vertical && enRanura)) for (let v = 0; v < 3; v++) quedan.push(pos.getX(i + v), pos.getY(i + v), pos.getZ(i + v))
  }
  const abierta = new THREE.BufferGeometry()
  abierta.setAttribute('position', new THREE.Float32BufferAttribute(quedan, 3))
  abierta.computeVertexNormals()
  return abierta
}

// Color por cara según su pendiente: las caras empinadas (paredes de la colina, la pared de la cascada)
// son roca y las tendidas, hierba, como en la referencia. Con flatShading cada cara tiene su normal
// y sus tres vértices propios, así que el color también queda facetado
const HIERBA = new THREE.Color(PALETA.meseta)
const ROCA = new THREE.Color(PALETA.roca)
const TIERRA = new THREE.Color(PALETA.sendero)
// Caja del sendero (con margen): fuera de ella no hace falta medir la distancia al camino
const CAJA_SENDERO = SENDERO_DENSO.reduce(([x0, z0, x1, z1], [x, z]) => [Math.min(x0, x), Math.min(z0, z), Math.max(x1, x), Math.max(z1, z)], [Infinity, Infinity, -Infinity, -Infinity])
function pintarPorPendiente(geometria) {
  const normales = geometria.attributes.normal
  const pos = geometria.attributes.position
  const colores = new Float32Array(normales.count * 3)
  const color = new THREE.Color()
  for (let i = 0; i < normales.count; i += 3) {
    // normal.y = coseno de la inclinación: 1 en llano, 0 en vertical. Roca por debajo de ~57°
    const y = (normales.getY(i) + normales.getY(i + 1) + normales.getY(i + 2)) / 3
    color.lerpColors(ROCA, HIERBA, THREE.MathUtils.smoothstep(y, 0.5, 0.62))
    // Camino de tierra del sendero, pintado en el propio terreno: sigue la ladera sin tablas flotando
    const x = (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3
    const z = (pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3
    if (x > CAJA_SENDERO[0] - 2 && x < CAJA_SENDERO[2] + 2 && z > CAJA_SENDERO[1] - 2 && z < CAJA_SENDERO[3] + 2) {
      const camino = THREE.MathUtils.smoothstep(1.2 - distanciaAlSendero(x, z), 0, 0.45)
      color.lerp(TIERRA, camino * 0.9)
    }
    for (let v = 0; v < 3; v++) color.toArray(colores, (i + v) * 3)
  }
  geometria.setAttribute('color', new THREE.Float32BufferAttribute(colores, 3))
  return geometria
}

function crearMasa() {
  const posiciones = []
  const indices = []
  // Mismos sectores que la superficie: su borde superior coincide vértice a vértice con el del terreno.
  // Con 1 de cada 4 (antes) quedaban huecos de hasta 3,8 m detrás de la colina, donde el borde cambia
  // de altura bruscamente. Cuesta ~2.200 triángulos más
  const lados = SECTORES
  const bordeSuperior = (sector) => {
    const [x, z] = puntoDelContorno((sector / lados) * Math.PI * 2)
    return [x, alturaDelTerreno(x, z), z]
  }
  for (let sector = 0; sector < lados; sector++) posiciones.push(...bordeSuperior(sector))
  PERFIL_MASA.forEach(([fraccion, y]) => {
    for (let sector = 0; sector < lados; sector++) {
      const ondas = sector / 4 // misma irregularidad que con 50 lados: ondas suaves, no dientes
      const irregular = 1 + 0.06 * Math.sin(ondas * 1.7 + y)
      const [x, z] = puntoDelContorno((sector / lados) * Math.PI * 2, fraccion * irregular)
      posiciones.push(x, y + 0.5 * Math.sin(ondas * 2.3), z)
    }
  })
  for (let fila = 0; fila < PERFIL_MASA.length; fila++) {
    for (let sector = 0; sector < lados; sector++) {
      const siguiente = (sector + 1) % lados
      const a = fila * lados + sector
      const b = fila * lados + siguiente
      const c = (fila + 1) * lados + sector
      const d = (fila + 1) * lados + siguiente
      indices.push(a, b, c, b, d, c)
    }
  }
  const puntaInferior = posiciones.length / 3
  posiciones.push(0, -27, CONTORNO.centroZ)
  const ultimaFila = PERFIL_MASA.length * lados
  for (let sector = 0; sector < lados; sector++) {
    indices.push(ultimaFila + sector, ultimaFila + ((sector + 1) % lados), puntaInferior)
  }
  return unirCaras(posiciones, indices)
}

export function Isla() {
  const superficie = useMemo(() => crearSuperficie(), [])
  const masa = useMemo(() => crearMasa(), [])
  return (
    <group name="isla">
      <mesh geometry={superficie} castShadow receiveShadow>
        {/* El color viene de cada cara (vertexColors): hierba en lo llano y roca en lo empinado */}
        <meshStandardMaterial vertexColors flatShading roughness={1} />
      </mesh>
      <mesh geometry={masa}>
        <meshStandardMaterial color={PALETA.roca} flatShading roughness={1} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}
