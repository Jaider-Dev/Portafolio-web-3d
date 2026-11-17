// Cambio de idioma (P-7, 17-nov-2026). Los textos y datos (src/data) son objetos de módulo que muchos
// componentes leen al dibujarse; algunos guardan referencias a partes de ellos (const T = TEXTOS.clasico).
// Por eso el idioma no reemplaza los objetos: los reescribe en su sitio, a partir de una copia del
// español, y encima superpone el inglés. Así cualquier referencia sigue apuntando al texto vigente.
import { LUGARES } from '../data/lugares.js'
import { PERFIL, VISION } from '../data/perfil.js'
import { HABILIDADES } from '../data/habilidades.js'
import { PROYECTOS } from '../data/proyectos.js'
import { TEXTOS } from '../data/textos.js'
import { TRAYECTORIA } from '../data/trayectoria.js'
import { EN } from './en.js'

export const IDIOMAS = ['es', 'en']

const esObjeto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)
const esListaDeObjetos = (v) => Array.isArray(v) && v.length > 0 && esObjeto(v[0])

// Copia profunda que conserva las funciones (los textos con parámetros)
const copiar = (v) => {
  if (Array.isArray(v)) return v.map(copiar)
  if (esObjeto(v)) return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, copiar(x)]))
  return v
}

// Escribe `fuente` dentro de `destino` sin cambiar la identidad de sus objetos ni de sus arreglos
function escribir(destino, fuente) {
  for (const [clave, valor] of Object.entries(fuente)) {
    const actual = destino[clave]
    if (esObjeto(actual) && esObjeto(valor)) escribir(actual, valor)
    else if (esListaDeObjetos(actual) && Array.isArray(valor)) valor.forEach((v, i) => escribir(actual[i], v))
    else if (Array.isArray(actual) && Array.isArray(valor)) actual.splice(0, actual.length, ...copiar(valor))
    else destino[clave] = copiar(valor)
  }
}

const DESTINOS = { TEXTOS, PERFIL, VISION, LUGARES, HABILIDADES, TRAYECTORIA, PROYECTOS }
const ESPANOL = copiar(DESTINOS)

// En en.js los arreglos se traducen por id: { sescol: {…} } → [{…}, {}, …] en el orden del arreglo
const segunElArreglo = (arreglo, porId) => arreglo.map((item) => porId[item.id] ?? {})

export function aplicarIdioma(idioma) {
  for (const [nombre, destino] of Object.entries(DESTINOS)) {
    escribir(destino, ESPANOL[nombre])
    if (idioma !== 'en' || !EN[nombre]) continue
    escribir(destino, Array.isArray(destino) ? segunElArreglo(destino, EN[nombre]) : EN[nombre])
  }
  if (typeof document !== 'undefined') document.documentElement.lang = idioma
}
