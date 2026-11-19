import assert from 'node:assert/strict'
import { test } from 'node:test'
import * as THREE from 'three'
import { activarInteractivo, interactivos, masCentrado, registrar } from './registro.js'

const objeto = (x, y, z) => {
  const o = new THREE.Object3D()
  o.position.set(x, y, z)
  o.updateMatrixWorld()
  return o
}

test('registro: elige el interactivo más centrado y cercano, ignora los lejanos o de espaldas (HT-11)', () => {
  const camara = new THREE.PerspectiveCamera(50, 1, 0.1, 100)
  camara.position.set(0, 0, 0)
  camara.lookAt(0, 0, -1)
  camara.updateMatrixWorld()
  const quitar = [
    registrar('centrado', objeto(0.2, 0, -5), () => 'a'),
    registrar('de-lado', objeto(2, 0, -4), () => 'b'),
    registrar('lejos', objeto(0, 0, -30), () => 'c'),
    registrar('detras', objeto(0, 0, 3), () => 'd'),
  ]
  assert.equal(masCentrado(camara), 'centrado')
  assert.equal(activarInteractivo('de-lado'), 'b')
  quitar.forEach((q) => q())
  assert.deepEqual(interactivos(), [])
})
