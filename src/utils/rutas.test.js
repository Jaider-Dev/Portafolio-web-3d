import assert from 'node:assert/strict'
import { test } from 'node:test'
import { lugarDeRuta, proyectoDeRuta, rutaClasicaDe, rutaDeEstado } from './rutas.js'

test('lee el lugar y el proyecto de la ruta (HU-26)', () => {
  assert.equal(lugarDeRuta('/lugar/sendero'), 'sendero')
  assert.equal(proyectoDeRuta('/proyecto/sescol'), 'sescol')
  assert.equal(proyectoDeRuta('/proyecto/'), null)
  assert.equal(proyectoDeRuta('/lugar/cima'), null)
})

test('la URL refleja la ficha abierta o el lugar, y nada durante la intro', () => {
  assert.equal(rutaDeEstado({ fase: 'panel', zona: 'cueva', panel: { tipo: 'proyecto', id: 'buclick' } }), '/proyecto/buclick')
  assert.equal(rutaDeEstado({ fase: 'explorando', zona: 'cima', panel: null }), '/lugar/cima')
  assert.equal(rutaDeEstado({ fase: 'panel', zona: 'rio', panel: { tipo: 'runa', id: '3d' } }), '/lugar/rio')
  assert.equal(rutaDeEstado({ fase: 'panel', zona: 'campamento', panel: { tipo: 'contacto' }, faseTrasPanel: 'intro' }), null)
  assert.equal(rutaDeEstado({ fase: 'viajando', zona: 'campamento', panel: null }), null)
})

test('de la isla a la versión clásica conserva el proyecto', () => {
  assert.equal(rutaClasicaDe('/proyecto/sescol'), '/clasico/proyecto/sescol')
})
