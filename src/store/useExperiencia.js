import { create } from 'zustand'
import { LUGARES_POR_ID } from '../data/lugares.js'

const CLAVE = 'isla'

const leerGuardado = () => {
  try {
    return JSON.parse(localStorage.getItem(CLAVE) ?? '{}')
  } catch {
    return {}
  }
}

const prefiereReducirMovimiento = () => {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

// Máquina de estados de 04 · Flujo §3
export const TRANSICIONES = {
  cargando: ['intro', 'fallback'],
  intro: ['vuelo', 'viajando', 'panel'],
  vuelo: ['explorando', 'viajando'],
  explorando: ['viajando', 'panel'],
  panel: ['explorando', 'intro', 'viajando'],
  viajando: ['explorando', 'panel', 'viajando'],
  fallback: [],
}

const puedePasar = (desde, hacia) => TRANSICIONES[desde]?.includes(hacia) ?? false
const enMovimiento = (fase) => fase === 'vuelo' || fase === 'viajando'

const guardado = leerGuardado()

export const useExperiencia = create((set, get) => ({
  fase: 'cargando', // 'cargando' | 'intro' | 'vuelo' | 'explorando' | 'panel' | 'viajando' | 'fallback'
  faseTrasPanel: 'explorando',
  modo: guardado.modo ?? 'panoramico', // el modo explorador llega en el sprint 4
  zona: 'campamento',
  destino: null,
  panel: null, // { tipo: 'sobre-mi' | 'contacto' }
  menuViaje: false,
  notificacion: null,
  descubiertos: guardado.descubiertos ?? [],
  ajustes: { sonido: false, calidad: 'auto', reducirMovimiento: prefiereReducirMovimiento(), ...guardado.ajustes },

  setFase: (fase) => {
    if (puedePasar(get().fase, fase)) set({ fase })
  },
  // Al volver de la versión clásica la escena se monta de nuevo: se conserva solo lo guardado
  reiniciar: () => set({ fase: 'cargando', destino: null, panel: null, menuViaje: false, notificacion: null }),
  comenzar: () => {
    if (get().fase === 'intro') set({ fase: 'vuelo', destino: 'campamento' })
  },
  abrirPanel: (panel) => {
    const { fase } = get()
    if (enMovimiento(fase)) return set({ panel, menuViaje: false }) // el viaje sigue y al llegar queda abierto
    if (fase === 'intro' || fase === 'explorando') return set({ panel, menuViaje: false, fase: 'panel', faseTrasPanel: fase })
    if (fase === 'panel') return set({ panel, menuViaje: false })
    return undefined
  },
  cerrarPanel: () => {
    const { fase, faseTrasPanel } = get()
    if (fase === 'panel') set({ panel: null, fase: faseTrasPanel })
    else set({ panel: null })
  },
  viajar: (destino) => {
    if (!LUGARES_POR_ID[destino]) return
    if (puedePasar(get().fase, 'viajando')) set({ destino, panel: null, menuViaje: false, fase: 'viajando' })
  },
  llegar: () => {
    const { destino, panel, fase } = get()
    if (!destino || !enMovimiento(fase)) return
    set({ zona: destino, destino: null, fase: panel ? 'panel' : 'explorando', faseTrasPanel: 'explorando' })
    get().descubrir(destino)
  },
  descubrir: (id) => {
    const { descubiertos } = get()
    if (descubiertos.includes(id)) return
    const { nombre, seccion } = LUGARES_POR_ID[id]
    set({ descubiertos: [...descubiertos, id], notificacion: { tipo: 'descubierto', nombre, seccion } })
    get().guardar()
  },
  entrarZona: (zona) => set({ zona }),
  alternarMenu: (abierto = !get().menuViaje) => {
    const { fase } = get()
    if (fase === 'explorando' || fase === 'panel' || fase === 'viajando') set({ menuViaje: abierto })
  },
  notificar: (notificacion) => set({ notificacion }),
  cambiarAjuste: (clave, valor) => {
    set((s) => ({ ajustes: { ...s.ajustes, [clave]: valor } }))
    get().guardar()
  },
  guardar: () => {
    const { modo, descubiertos, ajustes } = get()
    try {
      localStorage.setItem(CLAVE, JSON.stringify({ modo, descubiertos, ajustes }))
    } catch {
      // sin almacenamiento la experiencia funciona igual y empieza desde cero
    }
  },
}))
