import assert from 'node:assert/strict'
import { test } from 'node:test'
import { LUGARES, LUGARES_POR_ID } from '../data/lugares.js'
import { PERFIL } from '../data/perfil.js'
import { PROYECTOS } from '../data/proyectos.js'
import { TEXTOS } from '../data/textos.js'
import { aplicarIdioma } from './aplicar.js'
import { EN } from './en.js'

test('cambia al inglés y vuelve al español sin perder nada', () => {
  aplicarIdioma('en')
  assert.equal(TEXTOS.intro.comenzar, 'Start exploring')
  assert.equal(PERFIL.rol, 'Full stack developer')
  assert.equal(LUGARES[0].nombre, 'Base camp')
  assert.equal(TEXTOS.notificacion.descubriste('A', 'B'), 'You discovered: A · B')
  aplicarIdioma('es')
  assert.equal(TEXTOS.intro.comenzar, 'Comenzar la exploración')
  assert.equal(PERFIL.rol, 'Desarrollador fullstack')
  assert.equal(LUGARES[0].nombre, 'Campamento base')
  assert.equal(PROYECTOS[1].titulo, 'BUCLICK') // lo que no se traduce queda igual
})

test('las referencias guardadas siguen al idioma (no se reemplazan los objetos)', () => {
  const clasico = TEXTOS.clasico
  const datos = PERFIL.datos
  aplicarIdioma('en')
  assert.equal(clasico.caso.reto, 'The challenge')
  assert.equal(datos[0], 'Santiago de Cali, Colombia')
  assert.equal(LUGARES_POR_ID.cueva.nombre, 'Cave of murals')
  aplicarIdioma('es')
  assert.equal(clasico.caso.reto, 'El reto')
})

// Cada texto del español tiene su traducción (misma forma): no queda nada a medias en inglés
test('el inglés cubre todas las claves de TEXTOS', () => {
  const faltan = []
  const recorrer = (es, en, ruta) => {
    for (const [clave, valor] of Object.entries(es)) {
      const otro = en?.[clave]
      if (otro === undefined) faltan.push(`${ruta}.${clave}`)
      else if (valor && typeof valor === 'object' && !Array.isArray(valor)) recorrer(valor, otro, `${ruta}.${clave}`)
    }
  }
  aplicarIdioma('es')
  recorrer(TEXTOS, EN.TEXTOS, 'TEXTOS')
  assert.deepEqual(faltan, [])
})
