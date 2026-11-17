// Dónde se puede poner vegetación o rocas sin estorbar (sin three, para poder probarlo):
// dentro de la isla y lejos del borde, fuera del sendero, del agua y de los puntos de interés, y en
// suelo poco empinado (no en la pared de la cascada ni en el acantilado de la colina)
import { LUGARES } from '../../data/lugares.js'
import { MUNDO } from '../../data/mundo.js'
import {
  alturaDelTerreno, CONTORNO, dentroDeLaIsla, distanciaAlCauce, distanciaAlSendero, ESTANQUE, medioAnchoDelRio,
} from '../isla/terreno.js'

// Lo que el visitante tiene que ver y alcanzar (pilar P1): menhires, llegadas y objetos del campamento
export const PUNTOS_DE_INTERES = [
  ...LUGARES.flatMap((l) => [l.menhir, l.llegada]),
  MUNDO.fogata, MUNDO.tienda, MUNDO.mochila, MUNDO.poste, MUNDO.letrero, MUNDO.puente,
  MUNDO.entradaCueva, MUNDO.mirador, MUNDO.manantial, [MUNDO.explorador[0], 0, MUNDO.explorador[1]],
].map(([x, , z]) => [x, z])

// Subida por metro en la dirección más empinada (diferencias finitas de ±d)
export function pendiente(x, z, d = 0.6) {
  const gx = (alturaDelTerreno(x + d, z) - alturaDelTerreno(x - d, z)) / (2 * d)
  const gz = (alturaDelTerreno(x, z + d) - alturaDelTerreno(x, z - d)) / (2 * d)
  return Math.hypot(gx, gz)
}

export function lugarLibre(x, z, { camino = 1.5, puntos = 3, agua = 1, inclinacion = 0.9, borde = 0.92 } = {}) {
  // `borde`: la isla encogida a esa fracción (la orilla de la isla queda despejada)
  if (!dentroDeLaIsla(x / borde, CONTORNO.centroZ + (z - CONTORNO.centroZ) / borde)) return false
  if (distanciaAlSendero(x, z) < camino) return false
  if (distanciaAlCauce(x, z) < medioAnchoDelRio(z) + agua) return false
  const { centro, radio } = MUNDO.poza
  if (Math.hypot(x - centro[0], z - centro[2]) < radio + agua) return false
  if (Math.hypot(x - ESTANQUE.centro[0], z - ESTANQUE.centro[2]) < ESTANQUE.radio + agua) return false
  if (PUNTOS_DE_INTERES.some(([px, pz]) => Math.hypot(x - px, z - pz) < puntos)) return false
  return pendiente(x, z) <= inclinacion
}
