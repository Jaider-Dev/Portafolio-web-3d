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
