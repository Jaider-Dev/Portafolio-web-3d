import { CONTORNO, alturaDelTerreno, dentroDeLaIsla } from '../isla/terreno.js'
import { PUERTA } from '../lugares/galeria.js'
import { LUGARES } from '../../data/lugares.js'
import { MUNDO } from '../../data/mundo.js'

// Modo explorador básico (adelanto del sprint 4, 19-nov): el explorador camina sobre el terreno sin
// motor de física. La altura sale de alturaDelTerreno (la misma función que da forma a la isla) y solo
// se comprueban tres cosas: no salir de la isla, no trepar pendientes muy fuertes y no hundirse en el
// agua (vadea el río con el agua a la rodilla). Los árboles, rocas y la tienda todavía no chocan:
// eso llega con Rapier (HT-14).

export const VELOCIDAD = { caminar: 3.2, correr: 6.5 } // m/s
export const PENDIENTE_MAXIMA = 1.6 // metros de subida por metro de avance (~58°): el sendero llega a 1,36; las paredes de roca (más de 5) frenan
const NIVEL_DEL_AGUA = -0.35 // el río está a -0,3 m: el explorador queda apenas hundido, vadeando
const MARGEN = 0.94 // fracción del contorno: no se acerca al borde del acantilado
export const ALTURA_DE_LOS_OJOS = 1.1 // a qué altura sobre los pies mira la cámara

// Estado compartido del explorador: lo mueve Caminante.jsx y lo lee la cámara (sin pasar por React)
export const EXPLORADOR = { x: MUNDO.explorador[0], z: MUNDO.explorador[1], y: 0, giro: 0 }
EXPLORADOR.y = alturaAlCaminar(EXPLORADOR.x, EXPLORADOR.z)
EXPLORADOR.giro = Math.atan2(MUNDO.fogata[0] - EXPLORADOR.x, MUNDO.fogata[2] - EXPLORADOR.z)

// Joystick táctil (ui/Joystick.jsx): adelante y lado entre -1 y 1
export const ENTRADA = { adelante: 0, lado: 0 }

export function alturaAlCaminar(x, z) {
  return Math.max(alturaDelTerreno(x, z), NIVEL_DEL_AGUA)
}

const dentro = (x, z) => dentroDeLaIsla(x / MARGEN, CONTORNO.centroZ + (z - CONTORNO.centroZ) / MARGEN)

const sePuede = (x0, z0, x1, z1) => {
  if (!dentro(x1, z1)) return false
  const subida = alturaAlCaminar(x1, z1) - alturaAlCaminar(x0, z0)
  return subida <= PENDIENTE_MAXIMA * Math.hypot(x1 - x0, z1 - z0)
}

// Siguiente posición al intentar desplazarse (dx, dz). Si el paso completo no se puede, prueba cada eje
// por separado: así el explorador se desliza junto a una pared en vez de quedarse pegado a ella
export function siguientePaso(x, z, dx, dz) {
  if (sePuede(x, z, x + dx, z + dz)) return [x + dx, z + dz]
  if (dx && sePuede(x, z, x + dx, z)) return [x + dx, z]
  if (dz && sePuede(x, z, x, z + dz)) return [x, z + dz]
  return [x, z]
}

// Delante de la cueva, pasada la cascada (que cae justo frente a la boca, en z ≈ -17,7): ahí aparece el
// explorador al viajar a la cueva o al salir de ella. Al caminar contra la pared junto a la boca se
// entra; la zona es algo más ancha que el arco (3 m) porque al chocar con la pared el explorador se desliza
export const FRENTE_DE_LA_CUEVA = [PUERTA.x, -15.2]
export const enLaBocaDeLaCueva = (x, z) => Math.abs(x - PUERTA.x) < PUERTA.ancho / 2 + 0.8 && z < -16.9

// Dónde aparece el explorador al viajar a un lugar: su punto de llegada (la cueva, delante de la boca)
export function llegadaDe(id) {
  const lugar = LUGARES.find((l) => l.id === id)
  if (!lugar) return null
  const [x, z] = id === 'cueva' ? FRENTE_DE_LA_CUEVA : [lugar.llegada[0], lugar.llegada[2]]
  return { x, z, y: alturaAlCaminar(x, z) }
}

// El lugar en el que está el explorador al caminar: el de llegada más cercano a menos de `radio` metros.
// La cueva no cuenta: dentro de ella se está solo al entrar por su boca
export function lugarCercano(x, z, radio = 9) {
  let mejor = null
  let mejorDistancia = radio
  for (const { id, llegada } of LUGARES) {
    if (id === 'cueva') continue
    // También cuenta la altura: al pie de la colina la cima queda cerca en planta, pero 16 m más arriba
    const distancia = Math.hypot(llegada[0] - x, alturaAlCaminar(llegada[0], llegada[2]) - alturaAlCaminar(x, z), llegada[2] - z)
    if (distancia < mejorDistancia) {
      mejorDistancia = distancia
      mejor = id
    }
  }
  return mejor
}
