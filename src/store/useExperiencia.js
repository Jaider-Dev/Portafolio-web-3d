import { create } from 'zustand'
import { HABILIDADES } from '../data/habilidades.js'
import { LUGARES_POR_ID } from '../data/lugares.js'
import { nivelInferior, nivelInicial } from '../utils/calidad.js'

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
const TOTAL_RUNAS = HABILIDADES.length

// Al viajar a estos lugares se abre su sección (17-nov): el vado muestra las habilidades, el sendero la
// trayectoria y la cima la visión. El campamento tiene "Sobre mí" en el HUD y la cueva, sus murales
export const PANEL_DE_LUGAR = { rio: 'habilidades', sendero: 'trayectoria', cima: 'vision' }

export const useExperiencia = create((set, get) => ({
  fase: 'cargando', // 'cargando' | 'intro' | 'vuelo' | 'explorando' | 'panel' | 'viajando' | 'fallback'
  faseTrasPanel: 'explorando',
  modo: guardado.modo ?? 'panoramico', // el modo explorador llega en el sprint 4
  zona: 'campamento',
  destino: null,
  panel: null, // { tipo: 'sobre-mi' | 'contacto' | 'ajustes' | 'proyecto' | 'habilidades' | 'trayectoria' | 'vision' }
  menuViaje: false,
  notificacion: null,
  descubiertos: guardado.descubiertos ?? [],
  // Objetos interactivos ya abiertos (HT-11): muestran una marca sutil de visitado. Las runas del vado
  // se guardan como 'runa-<id>' y al activar las cinco se avisa "Habilidades completas" (HU-20)
  visitados: guardado.visitados ?? [],
  vistaMirador: false, // la cámara está en la vista panorámica del mirador de la cima (HU-25)
  ajustes: { sonido: false, calidad: 'auto', reducirMovimiento: prefiereReducirMovimiento(), ...guardado.ajustes },
  // Nivel que decide el monitor de rendimiento cuando la calidad es "auto" (HU-17). No se guarda:
  // cada visita vuelve a empezar según el dispositivo
  calidadAuto: nivelInicial(),

  setFase: (fase) => {
    if (puedePasar(get().fase, fase)) set({ fase })
  },
  // Al volver de la versión clásica la escena se monta de nuevo: se conserva solo lo guardado
  reiniciar: () => set({ fase: 'cargando', destino: null, panel: null, menuViaje: false, notificacion: null, vistaMirador: false }),
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
  // `panel` permite llegar con otro panel abierto: "Ver proyectos" y /proyecto/<id> llegan a la cueva con
  // la ficha de un proyecto (HU-22, HU-26)
  viajar: (destino, panel) => {
    if (!LUGARES_POR_ID[destino]) return
    if (!puedePasar(get().fase, 'viajando')) return
    const seccion = PANEL_DE_LUGAR[destino]
    // El panel de la sección viaja abierto: al llegar ya está a la vista (como uno abierto durante el viaje)
    set({ destino, panel: panel ?? (seccion ? { tipo: seccion } : null), menuViaje: false, fase: 'viajando', vistaMirador: false })
  },
  // Abre un panel en su lugar: si la cámara ya está allí, solo lo abre; si no, viaja con él abierto
  // (la fogata, la mochila y los menhires encuadran su lugar antes de mostrar el contenido, HU-19)
  abrirEn: (lugar, panel) => {
    const { zona, fase } = get()
    if (zona === lugar && !enMovimiento(fase)) get().abrirPanel(panel)
    else get().viajar(lugar, panel)
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
  marcarVisitado: (id) => {
    const { visitados } = get()
    if (visitados.includes(id)) return
    const nuevos = [...visitados, id]
    set({ visitados: nuevos })
    const esRuna = (v) => v.startsWith('runa-')
    if (esRuna(id) && nuevos.filter(esRuna).length === TOTAL_RUNAS) set({ notificacion: { tipo: 'habilidades' } })
    get().guardar()
  },
  setVistaMirador: (vistaMirador) => set({ vistaMirador }),
  alternarMenu: (abierto = !get().menuViaje) => {
    const { fase } = get()
    if (fase === 'explorando' || fase === 'panel' || fase === 'viajando') set({ menuViaje: abierto })
  },
  notificar: (notificacion) => set({ notificacion }),
  // El monitor detectó FPS bajos de forma sostenida: un escalón menos, solo en automática
  bajarCalidadAuto: () => {
    const { ajustes, calidadAuto } = get()
    const siguiente = nivelInferior(calidadAuto)
    if (ajustes.calidad !== 'auto' || siguiente === calidadAuto) return
    set({ calidadAuto: siguiente, notificacion: { tipo: 'calidad', nivel: siguiente } })
  },
  cambiarAjuste: (clave, valor) => {
    set((s) => ({ ajustes: { ...s.ajustes, [clave]: valor } }))
    get().guardar()
  },
  guardar: () => {
    const { modo, descubiertos, visitados, ajustes } = get()
    try {
      localStorage.setItem(CLAVE, JSON.stringify({ modo, descubiertos, visitados, ajustes }))
    } catch {
      // sin almacenamiento la experiencia funciona igual y empieza desde cero
    }
  },
}))
