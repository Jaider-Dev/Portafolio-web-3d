import assert from 'node:assert/strict'
import { beforeEach, test } from 'node:test'

// Almacenamiento simulado antes de cargar el store, que lee lo guardado al importarse
const memoria = new Map([['isla', JSON.stringify({ descubiertos: ['rio'], ajustes: { sonido: true } })]])
globalThis.localStorage = {
  getItem: (clave) => memoria.get(clave) ?? null,
  setItem: (clave, valor) => memoria.set(clave, valor),
}

const { useExperiencia, TRANSICIONES } = await import('./useExperiencia.js')
const inicial = useExperiencia.getState()
const estado = () => useExperiencia.getState()
const en = (fase, extra = {}) => useExperiencia.setState({ fase, destino: null, panel: null, menuViaje: false, ...extra })

beforeEach(() => useExperiencia.setState(inicial, true))

test('recupera ajustes y lugares descubiertos de lo guardado', () => {
  assert.deepEqual(inicial.descubiertos, ['rio'])
  assert.equal(inicial.ajustes.sonido, true)
})

test('carga esencial completa: cargando → intro', () => {
  estado().setFase('intro')
  assert.equal(estado().fase, 'intro')
})

test('error de carga: cargando → fallback, y de ahí no se sale', () => {
  estado().setFase('fallback')
  assert.equal(estado().fase, 'fallback')
  estado().setFase('intro')
  assert.equal(estado().fase, 'fallback')
})

test('rechaza una transición que no está en la tabla', () => {
  estado().setFase('explorando')
  assert.equal(estado().fase, 'cargando')
  assert.ok(!TRANSICIONES.cargando.includes('explorando'))
})

test('"Comenzar": intro → vuelo → explorando en el campamento', () => {
  en('intro')
  estado().comenzar()
  assert.equal(estado().fase, 'vuelo')
  assert.equal(estado().destino, 'campamento')
  estado().llegar()
  assert.equal(estado().fase, 'explorando')
  assert.equal(estado().zona, 'campamento')
  assert.equal(estado().destino, null)
})

test('"Contacto" en la intro abre el panel sin vuelo y al cerrar vuelve a la intro', () => {
  en('intro')
  estado().abrirPanel({ tipo: 'contacto' })
  assert.equal(estado().fase, 'panel')
  assert.equal(estado().destino, null)
  estado().cerrarPanel()
  assert.equal(estado().fase, 'intro')
  assert.equal(estado().panel, null)
})

test('panel durante la exploración: al cerrar vuelve a explorando', () => {
  en('explorando')
  estado().abrirPanel({ tipo: 'sobre-mi' })
  assert.equal(estado().fase, 'panel')
  estado().cerrarPanel()
  assert.equal(estado().fase, 'explorando')
})

test('viajar: explorando → viajando → explorando, marca descubierto y notifica', () => {
  en('explorando', { descubiertos: [] })
  estado().viajar('sendero')
  assert.equal(estado().fase, 'viajando')
  estado().llegar()
  assert.equal(estado().fase, 'explorando')
  assert.equal(estado().zona, 'sendero')
  assert.deepEqual(estado().descubiertos, ['sendero'])
  assert.equal(estado().notificacion.nombre, 'Sendero de los mojones')
})

test('los 5 destinos están disponibles desde el principio', () => {
  for (const id of ['campamento', 'rio', 'cueva', 'sendero', 'cima']) {
    en('explorando')
    estado().viajar(id)
    assert.equal(estado().destino, id)
  }
})

test('viajar con un panel y el menú abiertos los cierra antes de empezar', () => {
  en('panel', { panel: { tipo: 'sobre-mi' }, menuViaje: true })
  estado().viajar('cueva')
  assert.equal(estado().fase, 'viajando')
  assert.equal(estado().panel, null)
  assert.equal(estado().menuViaje, false)
})

test('un destino inexistente no cambia nada', () => {
  en('explorando')
  estado().viajar('atlantida')
  assert.equal(estado().fase, 'explorando')
  assert.equal(estado().destino, null)
})

test('un panel abierto durante un viaje sigue abierto al llegar', () => {
  en('viajando', { destino: 'cima' })
  estado().abrirPanel({ tipo: 'contacto' })
  assert.equal(estado().fase, 'viajando')
  estado().llegar()
  assert.equal(estado().fase, 'panel')
  estado().cerrarPanel()
  assert.equal(estado().fase, 'explorando')
})

test('el menú no se abre en la intro ni durante la carga', () => {
  en('intro')
  estado().alternarMenu()
  assert.equal(estado().menuViaje, false)
  en('explorando')
  estado().alternarMenu()
  assert.equal(estado().menuViaje, true)
})

test('guarda ajustes y descubiertos en el almacenamiento', () => {
  en('explorando', { descubiertos: [] })
  estado().descubrir('cima')
  estado().cambiarAjuste('reducirMovimiento', true)
  const guardado = JSON.parse(memoria.get('isla'))
  assert.deepEqual(guardado.descubiertos, ['cima'])
  assert.equal(guardado.ajustes.reducirMovimiento, true)
})

test('sin almacenamiento la experiencia sigue funcionando', () => {
  const { setItem } = globalThis.localStorage
  globalThis.localStorage.setItem = () => { throw new Error('bloqueado') }
  en('explorando', { descubiertos: [] })
  assert.doesNotThrow(() => estado().descubrir('rio'))
  assert.deepEqual(estado().descubiertos, ['rio'])
  globalThis.localStorage.setItem = setItem
})

test('reiniciar vuelve a la carga y conserva lo descubierto', () => {
  en('explorando', { descubiertos: ['cima'], panel: { tipo: 'contacto' } })
  estado().reiniciar()
  assert.equal(estado().fase, 'cargando')
  assert.equal(estado().panel, null)
  assert.deepEqual(estado().descubiertos, ['cima'])
})

test('calidad automática: el monitor baja un escalón cada vez y avisa (HU-17)', () => {
  useExperiencia.setState({ calidadAuto: 'alta', ajustes: { ...inicial.ajustes, calidad: 'auto' } })
  estado().bajarCalidadAuto()
  assert.equal(estado().calidadAuto, 'media')
  assert.deepEqual(estado().notificacion, { tipo: 'calidad', nivel: 'media' })
  estado().bajarCalidadAuto()
  estado().bajarCalidadAuto()
  assert.equal(estado().calidadAuto, 'baja')
})

test('calidad elegida a mano: el monitor no la cambia y la elección se guarda', () => {
  estado().cambiarAjuste('calidad', 'media')
  useExperiencia.setState({ calidadAuto: 'alta' })
  estado().bajarCalidadAuto()
  assert.equal(estado().calidadAuto, 'alta')
  assert.equal(JSON.parse(memoria.get('isla')).ajustes.calidad, 'media')
})
