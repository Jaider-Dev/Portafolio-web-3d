import assert from 'node:assert/strict'
import { beforeEach, test } from 'node:test'

// Sin nada guardado y con el sistema en modo oscuro
const memoria = new Map()
globalThis.localStorage = {
  getItem: (clave) => memoria.get(clave) ?? null,
  setItem: (clave, valor) => memoria.set(clave, valor),
}
globalThis.window = { matchMedia: (consulta) => ({ matches: consulta === '(prefers-color-scheme: dark)' }) }

const { useHora } = await import('./hora.js')
const inicial = useHora.getState()

beforeEach(() => {
  useHora.setState(inicial, true)
  memoria.clear()
})

test('la primera visita sigue la preferencia del sistema', () => {
  assert.equal(inicial.hora, 'noche')
})

test('alternar pasa de noche a mañana y de vuelta, y se recuerda', () => {
  useHora.getState().alternar()
  assert.equal(useHora.getState().hora, 'manana')
  assert.equal(memoria.get('isla-hora'), 'manana')
  useHora.getState().alternar()
  assert.equal(useHora.getState().hora, 'noche')
  assert.equal(memoria.get('isla-hora'), 'noche')
})

test('una hora desconocida se ignora', () => {
  useHora.getState().elegir('tarde')
  assert.equal(useHora.getState().hora, 'noche')
  assert.equal(memoria.has('isla-hora'), false)
})
