import assert from 'node:assert/strict'
import { test } from 'node:test'
import { LUGARES } from '../../data/lugares.js'
import { MUNDO, SENDERO } from '../../data/mundo.js'
import { lugarLibre, pendiente, PUNTOS_DE_INTERES } from './ubicacion.js'

test('ningún menhir, llegada ni objeto del campamento queda tapado', () => {
  for (const [x, z] of PUNTOS_DE_INTERES) assert.equal(lugarLibre(x, z), false, `${x}, ${z}`)
  assert.ok(PUNTOS_DE_INTERES.length >= LUGARES.length * 2)
})

test('el sendero queda despejado en todo su recorrido', () => {
  for (const [x, z] of SENDERO) assert.equal(lugarLibre(x, z, { puntos: 0 }), false, `${x}, ${z}`)
})

test('nada en el agua: río, vado y poza', () => {
  assert.equal(lugarLibre(0, MUNDO.vado.z, { puntos: 0 }), false)
  const [px, , pz] = MUNDO.poza.centro
  assert.equal(lugarLibre(px, pz, { puntos: 0 }), false)
})

test('ni en la pared de la cascada ni fuera de la isla; sí en el prado del bosque', () => {
  assert.ok(pendiente(0, -17.6) > 0.9)
  assert.equal(lugarLibre(0, -17.6, { puntos: 0 }), false)
  assert.equal(lugarLibre(40, 0), false)
  assert.equal(lugarLibre(-23, -6), true)
})
