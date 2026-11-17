import { useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { useMaterialPBR } from '../materiales'

// Kits de naturaleza (17-nov-2026). Cada pieza sale de Blender (blender/kit_naturaleza.py) a partir de
// paquetes CC-BY (CREDITS.md), separada, pintada con la paleta y en quads. Aquí solo se usa la
// geometría de cada nodo: la posición, el giro y la escala los pone la escena.
//   · árboles y detalles: origen en la base, alto real en metros, color por vértice
//   · rocas: origen en el centro, caja de ±1 m en cada eje (escala = medio ancho) y UV para la textura
export const KITS = {
  arboles: '/models/naturaleza/arboles.glb',
  detalles: '/models/naturaleza/detalles.glb',
  rocas: '/models/naturaleza/rocas.glb',
}

const rango = (prefijo, n) => Array.from({ length: n }, (_, i) => `${prefijo}-${i + 1}`)

// Especies por porte: las anchas solo donde no tapan caminos ni lugares. Todas de 6 m o más: los
// árboles pequeños y los arbustos se quitaron el 17-nov (el autor solo quiere árboles grandes)
export const ARBOLES = {
  conifera: ['pino-1', 'pino-2', 'pino-3', 'abeto-1', 'abeto-2'],
  esbelto: ['alamo-1', 'alamo-2', 'abeto-1', 'abeto-2'],
  ancho: ['frondoso-1', 'frondoso-2', 'frondoso-3', 'roble-1', 'roble-2', 'retorcido-1', 'retorcido-2'],
  hito: 'arbol-paraguas',
}

export const DETALLES = {
  pasto: ['pasto-1', 'pasto-2', 'pasto-3', 'pastizal'],
  hongos: rango('hongos', 4),
}

export const ROCAS = [...rango('roca', 17), ...rango('pena', 7)]
export const LOSAS = rango('losa', 6)

// Material de la vegetación: el color viene en cada vértice (ya con la paleta). Sin normales en el
// archivo: con flatShading la GPU calcula la normal de cada cara
export const MATERIAL_VEGETACION = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 })

// Material de roca del kit: textura PBR de roca (materiales.js) por el color de la paleta
export function usePiedra(color) {
  const textura = useMaterialPBR('roca')
  return useMemo(() => new THREE.MeshStandardMaterial({ ...textura, color, flatShading: true, roughness: 1 }), [textura, color])
}

// { nombre: geometría } de un kit. useGLTF lo cachea: varios componentes comparten las mismas geometrías
export function useKit(kit) {
  const { nodes } = useGLTF(KITS[kit])
  return Object.fromEntries(Object.entries(nodes).filter(([, n]) => n.isMesh).map(([nombre, n]) => [nombre, n.geometry]))
}

// Pseudoaleatorio con semilla: todo queda igual en cada visita
export function generador(semilla) {
  let s = semilla
  return () => ((s = (s * 16807) % 2147483647) / 2147483647)
}

export const elegir = (lista, azar) => lista[Math.floor(azar() * lista.length) % lista.length]

// Agrupa por pieza ({ pieza, … }) para dibujar cada una con un solo InstancedMesh
export function porPieza(items) {
  const grupos = {}
  for (const item of items) (grupos[item.pieza] ??= []).push(item)
  return Object.entries(grupos)
}

for (const ruta of Object.values(KITS)) useGLTF.preload(ruta)
