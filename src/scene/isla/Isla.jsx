import { useMemo } from 'react'
import * as THREE from 'three'
import { PALETA } from '../paleta'
import { alturaDelTerreno, CONTORNO, puntoDelContorno } from './terreno.js'

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
  return unirCaras(posiciones, indices)
}

function crearMasa() {
  const posiciones = []
  const indices = []
  const paso = 4 // la masa no necesita tanto detalle como la superficie
  const lados = SECTORES / paso
  const bordeSuperior = (sector) => {
    const [x, z] = puntoDelContorno((sector / lados) * Math.PI * 2)
    return [x, alturaDelTerreno(x, z), z]
  }
  for (let sector = 0; sector < lados; sector++) posiciones.push(...bordeSuperior(sector))
  PERFIL_MASA.forEach(([fraccion, y]) => {
    for (let sector = 0; sector < lados; sector++) {
      const irregular = 1 + 0.06 * Math.sin(sector * 1.7 + y)
      const [x, z] = puntoDelContorno((sector / lados) * Math.PI * 2, fraccion * irregular)
      posiciones.push(x, y + 0.5 * Math.sin(sector * 2.3), z)
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
        <meshStandardMaterial color={PALETA.meseta} flatShading roughness={1} />
      </mesh>
      <mesh geometry={masa}>
        <meshStandardMaterial color={PALETA.roca} flatShading roughness={1} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}
