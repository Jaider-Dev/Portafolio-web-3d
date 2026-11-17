import { create } from 'zustand'
import { aplicarIdioma, IDIOMAS } from '../i18n/aplicar.js'

// Idioma de la isla y de la versión clásica (P-7: español e inglés). Store propio, sin three, como la
// hora: lo usan las dos versiones. La primera visita toma el idioma del navegador; después, el elegido
const CLAVE = 'isla-idioma'

const leerGuardado = () => {
  try {
    const idioma = localStorage.getItem(CLAVE)
    return IDIOMAS.includes(idioma) ? idioma : null
  } catch {
    return null
  }
}

const delNavegador = () => {
  try {
    return navigator.language.toLowerCase().startsWith('es') ? 'es' : 'en'
  } catch {
    return 'es'
  }
}

const inicial = leerGuardado() ?? delNavegador()
aplicarIdioma(inicial) // antes del primer render: los textos ya salen en su idioma

export const useIdioma = create((set, get) => ({
  idioma: inicial,
  alternar: () => get().elegir(get().idioma === 'es' ? 'en' : 'es'),
  elegir: (idioma) => {
    if (!IDIOMAS.includes(idioma) || idioma === get().idioma) return
    aplicarIdioma(idioma)
    set({ idioma })
    try {
      localStorage.setItem(CLAVE, idioma)
    } catch {
      // sin almacenamiento la elección dura solo esta visita
    }
  },
}))
