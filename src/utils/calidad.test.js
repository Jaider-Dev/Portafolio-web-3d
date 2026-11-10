import assert from 'node:assert/strict'
import { test } from 'node:test'
import { cuantos, nivelEfectivo, nivelInferior, nivelInicial, PERFILES } from './calidad.js'

const entorno = ({ tactil, ancho, alto }) => ({
  matchMedia: (consulta) => ({ matches: consulta === '(pointer: coarse)' && tactil }),
  screen: { width: ancho, height: alto },
})

test('un móvil empieza en calidad baja y un escritorio en alta', () => {
  assert.equal(nivelInicial(entorno({ tactil: true, ancho: 390, alto: 844 })), 'baja')
  assert.equal(nivelInicial(entorno({ tactil: false, ancho: 1920, alto: 1080 })), 'alta')
  // portátil con pantalla táctil grande: no se trata como móvil
  assert.equal(nivelInicial(entorno({ tactil: true, ancho: 1920, alto: 1200 })), 'alta')
})

test('sin matchMedia (entorno raro) se empieza en alta', () => {
  assert.equal(nivelInicial({}), 'alta')
})

test('la calidad automática baja de alta a media y de media a baja, y ahí se queda', () => {
  assert.equal(nivelInferior('alta'), 'media')
  assert.equal(nivelInferior('media'), 'baja')
  assert.equal(nivelInferior('baja'), 'baja')
})

test('la elección manual manda sobre el monitor', () => {
  assert.equal(nivelEfectivo('auto', 'media'), 'media')
  assert.equal(nivelEfectivo('baja', 'alta'), 'baja')
})

test('calidad baja: sin sombra dinámica, DPR 1 y partículas al 30 % (criterio de HU-17)', () => {
  assert.equal(PERFILES.baja.sombras, 0)
  assert.equal(PERFILES.baja.dpr, 1)
  assert.equal(PERFILES.baja.particulas, 0.3)
  assert.equal(cuantos(1400, PERFILES.baja.particulas), 420)
  assert.equal(cuantos(3, 0.1), 1)
})
