// Forma del blockout, sin three para poder probarla y usarla al colocar objetos.
// Cada altura se comprueba contra 02 · Mapa §5 en terreno.test.js
import { ARROYO, CAUCE, MUNDO } from '../../data/mundo.js'

export const CONTORNO = { centroZ: -5.5, rx: 28, rz: 29 }

const limitar = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x))
const suave = (a, b, x) => {
  const t = limitar((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}
const mezclar = (a, b, t) => a + (b - a) * t

// Planta de la colina: la pared de la cascada alta es el tramo recto en z = -17.6
const PLANTA_COLINA = [
  [4.5, 2], [16, 3], [29, -6], [29, -32], [8, -33], [-15, -33], [-20, -24], [-8, -17.6], [8.5, -17.6], [7, -8],
]

const distanciaASegmento = (x, z, a, b) => {
  const dx = b[0] - a[0]
  const dz = b[1] - a[1]
  const t = limitar(((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz))
  return Math.hypot(x - a[0] - t * dx, z - a[1] - t * dz)
}

// Distancia con signo al polígono: positiva dentro
const distanciaAPlanta = (x, z) => {
  let distancia = Infinity
  let dentro = false
  for (let i = 0, j = PLANTA_COLINA.length - 1; i < PLANTA_COLINA.length; j = i++) {
    const a = PLANTA_COLINA[i]
    const b = PLANTA_COLINA[j]
    distancia = Math.min(distancia, distanciaASegmento(x, z, a, b))
    if ((a[1] > z) !== (b[1] > z) && x < ((b[0] - a[0]) * (z - a[1])) / (b[1] - a[1]) + a[0]) dentro = !dentro
  }
  return dentro ? distancia : -distancia
}

const alturaColina = (x, z) => {
  const dentro = distanciaAPlanta(x, z)
  if (dentro <= 0) return 0
  // sube con el sendero: z 0 → 0 m · z -6 → 7 m · z -14 → 16 m
  const tramo = z > -6 ? mezclar(0, 7, limitar(-z / 6)) : mezclar(7, 16, limitar((-z - 6) / 8))
  const haciaIzquierda = mezclar(0.3, 1, suave(-20, 2, x))
  const haciaDerecha = 1 - 0.55 * suave(16, 27, x)
  const haciaFondo = 1 - 0.35 * suave(-24, -31, z)
  const borde = mezclar(0.7, 3.5, suave(-17, -10, z)) // pared abrupta al fondo, ladera en el sendero
  return tramo * haciaIzquierda * haciaDerecha * haciaFondo * suave(0, borde, dentro)
}

const CAUCE_PLANO = [...CAUCE.map(([x, , z]) => [x, z]), [-4.8, 25]]
const POZA = MUNDO.poza

const distanciaAlCauce = (x, z) => {
  let distancia = Infinity
  for (let i = 0; i < CAUCE_PLANO.length - 1; i++) {
    distancia = Math.min(distancia, distanciaASegmento(x, z, CAUCE_PLANO[i], CAUCE_PLANO[i + 1]))
  }
  return distancia
}

const anchoDelRio = (z) => (z > 15 ? 2.25 : z > 4 ? 1.75 : 2)

export function alturaDelTerreno(x, z) {
  let altura = alturaColina(x, z)

  // arroyo de la cima: baja del manantial al borde de la cascada alta
  const [manantial, labio] = ARROYO
  const distanciaArroyo = distanciaASegmento(x, z, [manantial[0], manantial[2]], [labio[0], labio[2]])
  if (distanciaArroyo < 2.5 && z < -17.6) {
    const avance = limitar((z - manantial[2]) / (labio[2] - manantial[2]))
    altura = mezclar(mezclar(manantial[1], labio[1], avance), altura, suave(1, 2.5, distanciaArroyo))
  }

  // lecho del río: 0,4 m bajo la superficie, que está a -0,3 m
  const mitad = anchoDelRio(z)
  const cauce = suave(mitad + 0.6, mitad - 0.4, distanciaAlCauce(x, z))
  altura = mezclar(altura, -0.7, cauce * (altura < 1 ? 1 : 0))

  // poza: poco profunda, justo bajo su superficie
  const aPoza = Math.hypot(x - POZA.centro[0], z - POZA.centro[2])
  const poza = suave(POZA.radio + 0.3, POZA.radio - 0.5, aPoza)
  altura = mezclar(altura, POZA.centro[1] - 0.4, poza * (altura < 1 ? 1 : 0))

  return altura
}

// Radio del contorno según el ángulo: elipse de 56 × 58 m con borde orgánico (cubre el fondo de la cueva)
export function radioDelContorno(angulo) {
  return 1 + 0.03 * Math.sin(3 * angulo + 1) + 0.02 * Math.sin(7 * angulo + 2)
}

export function puntoDelContorno(angulo, fraccion = 1) {
  const radio = radioDelContorno(angulo) * fraccion
  return [Math.cos(angulo) * CONTORNO.rx * radio, Math.sin(angulo) * CONTORNO.rz * radio + CONTORNO.centroZ]
}

export function dentroDeLaIsla(x, z) {
  const u = x / CONTORNO.rx
  const v = (z - CONTORNO.centroZ) / CONTORNO.rz
  return Math.hypot(u, v) < radioDelContorno(Math.atan2(v, u))
}
