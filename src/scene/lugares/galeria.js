import * as THREE from 'three'

// Medidas de la cueva compartidas por Cueva.jsx (roca, antorchas) y Murales.jsx (proyectos)
export const PUERTA = { x: 4, ancho: 3, alto: 3 } // centro, ancho y altura máxima del arco
export const GALERIA = { centro: [4, 0, -24.3], radios: [7, 4.6, 5.6] }

// Punto sobre la pared de la galería: `angulo` en fracciones de π sobre la elipse de su planta
// (0 = +x, -0.5 = fondo), `fraccion` < 1 lo acerca al centro. Devuelve también el giro en Y que
// hace mirar hacia el centro
export function puntoEnLaPared(angulo, fraccion, y) {
  const a = angulo * Math.PI
  const [cx, , cz] = GALERIA.centro
  const [rx, , rz] = GALERIA.radios
  const x = cx + Math.cos(a) * rx * fraccion
  const z = cz + Math.sin(a) * rz * fraccion
  return { posicion: [x, y, z], giro: Math.atan2(cx - x, cz - z) }
}

export const ANTESALA = { z: [-17.7, -19.7] }

// Ruido suave y determinista para que la roca no sea lisa
export const ruido = (a, b) => 0.5 * Math.sin(a * 2.1 + b * 0.7) + 0.5 * Math.sin(b * 1.3 - a * 0.9 + 1.7)

// Galería: media elipsoide irregular, sin las caras que tapan la antesala
function construirGaleria() {
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

// Una sola geometría compartida: la usan la cueva (para dibujarla) y los murales (para pegarse a ella)
let galeria = null
export const crearGaleria = () => (galeria ??= construirGaleria())
