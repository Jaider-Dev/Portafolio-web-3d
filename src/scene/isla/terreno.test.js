import assert from 'node:assert/strict'
import { test } from 'node:test'
import { LUGARES_POR_ID } from '../../data/lugares.js'
import { MUNDO } from '../../data/mundo.js'
import { alturaDelTerreno, dentroDeLaIsla } from './terreno.js'

// Copia literal de la tabla de 02 · Mapa §5: si alguien mueve un dato, esta prueba falla
const TABLA_02 = {
  'centro del puente': [MUNDO.puente, [0, 0.5, 2]],
  fogata: [MUNDO.fogata, [-13, 0, 5]],
  tienda: [MUNDO.tienda, [-17, 0, 1]],
  mochila: [MUNDO.mochila, [-15.5, 0, 3]],
  'poste de caminos': [MUNDO.poste, [-9, 0, 9]],
  letrero: [MUNDO.letrero, [-11, 0, 10]],
  'menhir M1': [LUGARES_POR_ID.campamento.menhir, [-10, 0, 2]],
  'menhir M2': [LUGARES_POR_ID.rio.menhir, [4, 0, 4]],
  'centro de la poza': [MUNDO.poza.centro, [3, -0.5, -13]],
  'borde de la cascada alta': [MUNDO.cascadaAlta.borde, [4, 12, -17]],
  'entrada de la cueva': [MUNDO.entradaCueva, [4, 0.2, -18.5]],
  'centro de la galería': [MUNDO.galeria.centro, [4, 1, -25]],
  'menhir M3': [LUGARES_POR_ID.cueva.menhir, [0, 0, -11]],
  'inicio del sendero': [MUNDO.inicioSendero, [6, 0, 0]],
  'menhir M4': [LUGARES_POR_ID.sendero.menhir, [10, 7, -6]],
  'claro de la cima': [MUNDO.claroCima, [10, 16, -21]],
  manantial: [MUNDO.manantial, [6, 15.5, -20]],
  mirador: [MUNDO.mirador, [13, 16, -14]],
  'menhir M5': [LUGARES_POR_ID.cima.menhir, [9, 16, -19]],
  'borde de la cascada baja': [MUNDO.cascadaBaja, [-4, -0.3, 22]],
}

for (const [nombre, [dato, esperado]] of Object.entries(TABLA_02)) {
  test(`coordenada de 02 §5: ${nombre}`, () => assert.deepEqual(dato, esperado))
}

// Lo que se apoya en el suelo debe quedar a ras del terreno (tolerancia de blockout)
const APOYADOS = {
  fogata: MUNDO.fogata,
  tienda: MUNDO.tienda,
  mochila: MUNDO.mochila,
  poste: MUNDO.poste,
  letrero: MUNDO.letrero,
  M1: LUGARES_POR_ID.campamento.menhir,
  M2: LUGARES_POR_ID.rio.menhir,
  M3: LUGARES_POR_ID.cueva.menhir,
  M4: LUGARES_POR_ID.sendero.menhir,
  M5: LUGARES_POR_ID.cima.menhir,
  'inicio del sendero': MUNDO.inicioSendero,
  claro: MUNDO.claroCima,
  mirador: MUNDO.mirador,
  manantial: MUNDO.manantial,
}

for (const [nombre, [x, y, z]] of Object.entries(APOYADOS)) {
  test(`el terreno sostiene ${nombre} (y = ${y})`, () => {
    const altura = alturaDelTerreno(x, z)
    assert.ok(Math.abs(altura - y) < 0.5, `terreno ${altura.toFixed(2)} frente a ${y}`)
  })
  test(`${nombre} queda dentro de la isla`, () => assert.ok(dentroDeLaIsla(x, z)))
}

test('el río corre por debajo de la meseta, con 0,4 m de agua', () => {
  assert.ok(Math.abs(alturaDelTerreno(1, -4) + 0.7) < 0.05)
  assert.ok(Math.abs(alturaDelTerreno(-1.5, 8) + 0.7) < 0.05)
})

test('la poza está hundida y el menhir M3 queda en su orilla', () => {
  assert.ok(alturaDelTerreno(3, -13) < -0.5)
  assert.ok(alturaDelTerreno(0, -11) > -0.3)
})

test('la colina cubre toda la galería de la cueva', () => {
  for (const [x, z] of [[-3, -20], [4, -25], [11, -20], [-3, -30], [11, -30]]) {
    assert.ok(alturaDelTerreno(x, z) > 5, `(${x}, ${z}) a ${alturaDelTerreno(x, z).toFixed(1)} m`)
  }
})

test('la pared exterior de la isla no atraviesa la galería de la cueva', () => {
  const { centro, ancho, fondo } = MUNDO.galeria
  const atras = centro[2] - fondo / 2
  for (const x of [centro[0] - ancho / 2, centro[0], centro[0] + ancho / 2]) {
    assert.ok(dentroDeLaIsla(x, atras - 0.3), `(${x}, ${atras - 0.3}) queda fuera del contorno`)
  }
})

test('la caída de la cascada baja coincide con el borde de la isla', () => {
  assert.ok(dentroDeLaIsla(-4, 22))
  assert.ok(!dentroDeLaIsla(-4, 24.5))
})
