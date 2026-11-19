import assert from 'node:assert/strict'
import { test } from 'node:test'
import { SENDERO_DENSO, alturaDelTerreno } from '../isla/terreno.js'
import { enLaBocaDeLaCueva, llegadaDe, lugarCercano, siguientePaso } from './movimiento.js'

// Camina hacia un punto a pasos de 10 cm, como lo haría el explorador fotograma a fotograma
const caminarHacia = (desde, hacia, pasos = 4000) => {
  let [x, z] = desde
  for (let i = 0; i < pasos; i++) {
    const dx = hacia[0] - x
    const dz = hacia[1] - z
    const largo = Math.hypot(dx, dz)
    if (largo < 0.15) break
    ;[x, z] = siguientePaso(x, z, (dx / largo) * 0.1, (dz / largo) * 0.1)
  }
  return [x, z]
}

test('movimiento: por el sendero se sube del pie de la colina a la cima (modo explorador)', () => {
  let posicion = SENDERO_DENSO[0]
  for (const punto of SENDERO_DENSO.filter((_, i) => i % 8 === 0).concat([SENDERO_DENSO.at(-1)])) {
    posicion = caminarHacia(posicion, punto)
  }
  const final = SENDERO_DENSO.at(-1)
  assert.ok(Math.hypot(posicion[0] - final[0], posicion[1] - final[1]) < 0.5, `se quedó en ${posicion}`)
  assert.ok(alturaDelTerreno(...posicion) > 10, 'llegó arriba')
})

test('movimiento: no sale de la isla ni trepa la pared de la cueva', () => {
  const [x] = caminarHacia([-11, 4], [-60, 4])
  assert.ok(x > -28, `se acercó demasiado al borde: x = ${x}`)
  const [, zPared] = caminarHacia([8, -15], [8, -25])
  assert.ok(zPared > -18.5, `trepó la pared: z = ${zPared}`)
})

test('movimiento: llegadas, lugar cercano y boca de la cueva', () => {
  assert.ok(llegadaDe('cueva').y < 1, 'delante de la cueva, no sobre la roca')
  assert.equal(llegadaDe('nada'), null)
  assert.equal(lugarCercano(-11, 4), 'campamento')
  assert.equal(lugarCercano(4, -16), null)
  assert.ok(enLaBocaDeLaCueva(4, -17.2))
  assert.ok(enLaBocaDeLaCueva(2.35, -17.4), 'deslizándose junto a la pared')
  assert.ok(!enLaBocaDeLaCueva(4, -15.2))
})
