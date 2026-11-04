export const RUTA_CLASICA = '/clasico' // pendiente de confirmar (P-8)

const SECCION_DE_LUGAR = {
  campamento: 'sobre-mi', rio: 'habilidades', cueva: 'proyectos', sendero: 'trayectoria', cima: 'vision',
}

// isla → versión clásica (carga, error, intro, HUD, diario y poste)
export function rutaClasicaDe(pathname, panel = null) {
  if (panel?.tipo === 'contacto') return `${RUTA_CLASICA}#contacto`
  const [, tipo, id] = pathname.split('/')
  if (tipo === 'proyecto') return `${RUTA_CLASICA}/proyecto/${id}`
  if (tipo === 'lugar' && SECCION_DE_LUGAR[id]) return `${RUTA_CLASICA}#${SECCION_DE_LUGAR[id]}`
  return RUTA_CLASICA
}

// versión clásica → isla (selector "3D" y enlaces "Ver en la isla")
export function rutaIslaDe(seccion) {
  if (seccion === 'contacto') return '/lugar/campamento'
  const lugar = Object.keys(SECCION_DE_LUGAR).find((l) => SECCION_DE_LUGAR[l] === seccion)
  return lugar ? `/lugar/${lugar}` : '/'
}

export function lugarDeRuta(pathname) {
  const [, tipo, id] = pathname.split('/')
  return tipo === 'lugar' ? id : null
}
