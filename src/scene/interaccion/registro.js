import * as THREE from 'three'

// Registro de los objetos interactivos (HT-11). Cada <Interactivo> se apunta al montarse con su grupo y
// su acción. Sirve para elegir "el que tienes delante": el más centrado en pantalla entre los cercanos.
// En el modo explorador, la tecla E activa el más cercano al explorador (masCercano, adelanto de HU-28).
const INTERACTIVOS = new Map()

export function registrar(id, objeto, activar, etiqueta = id) {
  INTERACTIVOS.set(id, { objeto, activar, etiqueta })
  return () => {
    if (INTERACTIVOS.get(id)?.objeto === objeto) INTERACTIVOS.delete(id)
  }
}

export const interactivos = () => [...INTERACTIVOS.keys()]

const punto = new THREE.Vector3()
const desde = new THREE.Vector3()

// El interactivo más centrado en la pantalla, a menos de `alcance` metros y delante de la cámara.
// Puntúa la distancia al centro de la pantalla (en coordenadas normalizadas, de −1 a 1) más una parte
// pequeña de la distancia en metros: entre dos igual de centrados gana el más cercano
export function masCentrado(camara, alcance = 8, posicionDe = (o) => o.getWorldPosition(punto)) {
  let mejor = null
  let mejorPuntaje = Infinity
  for (const [id, { objeto }] of INTERACTIVOS) {
    const p = posicionDe(objeto)
    const distancia = p.distanceTo(camara.position)
    if (distancia > alcance) continue
    p.project(camara)
    if (p.z > 1 || Math.abs(p.x) > 1 || Math.abs(p.y) > 1) continue // detrás o fuera de la pantalla
    const puntaje = Math.hypot(p.x, p.y) + distancia / (alcance * 4)
    if (puntaje < mejorPuntaje) {
      mejorPuntaje = puntaje
      mejor = id
    }
  }
  return mejor
}

// El interactivo más cercano a un punto (los pies del explorador), a menos de `alcance` metros
export function masCercano(x, y, z, alcance = 2.8, posicionDe = (o) => o.getWorldPosition(punto)) {
  let mejor = null
  let mejorDistancia = alcance
  desde.set(x, y, z)
  for (const [id, { objeto }] of INTERACTIVOS) {
    const distancia = posicionDe(objeto).distanceTo(desde)
    if (distancia < mejorDistancia) {
      mejorDistancia = distancia
      mejor = id
    }
  }
  return mejor
}

export const etiquetaDe = (id) => INTERACTIVOS.get(id)?.etiqueta

export const activarInteractivo = (id) => INTERACTIVOS.get(id)?.activar()
