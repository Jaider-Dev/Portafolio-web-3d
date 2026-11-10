import { useExperiencia } from '../store/useExperiencia'
import { nivelEfectivo, PERFILES } from '../utils/calidad.js'

// Nivel y perfil de calidad que debe aplicar la escena (HU-17): el elegido a mano o, en
// "automática", el que va decidiendo el monitor de rendimiento
export function useCalidad() {
  const eleccion = useExperiencia((s) => s.ajustes.calidad)
  const automatico = useExperiencia((s) => s.calidadAuto)
  const nivel = nivelEfectivo(eleccion, automatico)
  return { nivel, perfil: PERFILES[nivel] ?? PERFILES.alta }
}
