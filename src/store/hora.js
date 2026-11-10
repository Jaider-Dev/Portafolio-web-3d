import { create } from 'zustand'

// Hora del día de la isla y tema de la interfaz (D12, HU-37). Store propio y sin three: la versión
// clásica también lo usa y su chunk no debe crecer.
const CLAVE = 'isla-hora'
export const HORAS = ['manana', 'noche']

const leerGuardada = () => {
  try {
    const hora = localStorage.getItem(CLAVE)
    return HORAS.includes(hora) ? hora : null
  } catch {
    return null
  }
}

// Primera visita: la preferencia de claro u oscuro del sistema
const preferida = () => {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'noche' : 'manana'
  } catch {
    return 'manana'
  }
}

// Las variables CSS de base.css cambian con este atributo
const aplicarAlDocumento = (hora) => {
  if (typeof document !== 'undefined') document.documentElement.dataset.hora = hora
}

export const useHora = create((set, get) => ({
  hora: leerGuardada() ?? preferida(),
  alternar: () => get().elegir(get().hora === 'noche' ? 'manana' : 'noche'),
  elegir: (hora) => {
    if (!HORAS.includes(hora)) return
    set({ hora })
    try {
      localStorage.setItem(CLAVE, hora)
    } catch {
      // sin almacenamiento la elección dura solo esta visita
    }
  },
}))

aplicarAlDocumento(useHora.getState().hora)
useHora.subscribe(({ hora }) => aplicarAlDocumento(hora))
