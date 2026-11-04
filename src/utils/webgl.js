// En desarrollo, ?sinwebgl simula un navegador sin WebGL
const simulaSinWebGL = () => import.meta.env.DEV && new URLSearchParams(window.location.search).has('sinwebgl')

export const hayWebGL = () => {
  if (simulaSinWebGL()) return false
  try {
    return Boolean(document.createElement('canvas').getContext('webgl2'))
  } catch {
    return false
  }
}
