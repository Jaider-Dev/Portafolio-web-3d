import { useMemo } from 'react'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'

// Biblioteca de materiales compartidos (HT-10) con texturas PBR (HU-12 · sesión 3). Las texturas se
// generan en Blender (blender/texturas_pbr.py) y son grises claros: se multiplican por el color de la
// paleta, que sigue mandando. Cada mapa tiene su papel:
//   map (detalle, sRGB) · normalMap (relieve, lineal) · roughnessMap (brillo irregular, lineal)
const RUTAS = {
  roca: { map: '/textures/roca_detalle.webp', normalMap: '/textures/roca_normal.webp', roughnessMap: '/textures/roca_rugosidad.webp' },
  suelo: { map: '/textures/suelo_detalle.webp', normalMap: '/textures/suelo_normal.webp' },
}

function preparar(texturas) {
  for (const [clave, textura] of Object.entries(texturas)) {
    textura.wrapS = textura.wrapT = THREE.RepeatWrapping
    textura.colorSpace = clave === 'map' ? THREE.SRGBColorSpace : THREE.NoColorSpace
    textura.anisotropy = 4
  }
  return texturas
}

// Props listas para un meshStandardMaterial: <meshStandardMaterial {...roca} color={PALETA.roca} />
export function useMaterialPBR(tipo, relieve = 1) {
  const texturas = useTexture(RUTAS[tipo], preparar)
  return useMemo(() => ({ ...texturas, normalScale: new THREE.Vector2(relieve, relieve) }), [texturas, relieve])
}

for (const rutas of Object.values(RUTAS)) useTexture.preload(Object.values(rutas))

// UV por proyección de caja: cada triángulo se proyecta sobre el plano de su eje dominante (XY, YZ o
// XZ) en metros / tamaño. Para geometrías generadas por código que no traen UV (terreno, cueva). Con
// flatShading cada triángulo tiene sus vértices propios, así que no hay costuras que repartir
export function uvPorCaja(geometria, tamano = 3) {
  const g = geometria.index ? geometria.toNonIndexed() : geometria
  const pos = g.attributes.position
  const uv = new Float32Array(pos.count * 2)
  const a = new THREE.Vector3()
  const b = new THREE.Vector3()
  const c = new THREE.Vector3()
  const n = new THREE.Vector3()
  for (let i = 0; i < pos.count; i += 3) {
    a.fromBufferAttribute(pos, i)
    b.fromBufferAttribute(pos, i + 1)
    c.fromBufferAttribute(pos, i + 2)
    n.subVectors(c, b).cross(b.clone().sub(a)).set(Math.abs(n.x), Math.abs(n.y), Math.abs(n.z))
    for (let v = 0; v < 3; v++) {
      const p = [a, b, c][v]
      const [u, w] = n.y >= n.x && n.y >= n.z ? [p.x, p.z] : n.x >= n.z ? [p.z, p.y] : [p.x, p.y]
      uv[(i + v) * 2] = u / tamano
      uv[(i + v) * 2 + 1] = w / tamano
    }
  }
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  return g
}
