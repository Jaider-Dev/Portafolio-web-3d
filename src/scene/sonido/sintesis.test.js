import assert from 'node:assert/strict'
import { test } from 'node:test'
import { generador, llenarFogata, llenarGrillos, llenarRuido } from './sintesis.js'

const enRango = (datos) => datos.every((v) => Number.isFinite(v) && v >= -1.0001 && v <= 1.0001)

test('el generador es determinista y queda entre −1 y 1', () => {
  const a = generador(42)
  const b = generador(42)
  for (let i = 0; i < 1000; i++) {
    const v = a()
    assert.equal(v, b())
    assert.ok(v >= -1 && v <= 1)
  }
})

test('los tres tipos de ruido quedan en rango y el bucle empieza y acaba en silencio', () => {
  for (const tipo of ['blanco', 'rosa', 'marron']) {
    const datos = llenarRuido(new Float32Array(48000), tipo, 3)
    assert.ok(enRango(datos), tipo)
    assert.ok(datos[0] === 0)
    assert.ok(datos[datos.length - 1] === 0)
    assert.ok(datos.some((v) => Math.abs(v) > 0.05), `${tipo} no es silencio`)
  }
})

test('la fogata tiene chasquidos más fuertes que su siseo de fondo', () => {
  const datos = llenarFogata(new Float32Array(44100 * 3), 44100)
  assert.ok(enRango(datos))
  const pico = datos.reduce((m, v) => Math.max(m, Math.abs(v)), 0)
  assert.ok(pico > 0.3)
})

test('los grillos chirrían en grupos y callan entre ellos', () => {
  const sr = 44100
  const datos = llenarGrillos(new Float32Array(sr * 2), sr)
  assert.ok(enRango(datos))
  assert.ok(datos.slice(0, Math.floor(0.02 * sr)).some((v) => v !== 0))
  assert.ok(datos.slice(Math.floor(0.3 * sr), Math.floor(0.8 * sr)).every((v) => v === 0))
})
