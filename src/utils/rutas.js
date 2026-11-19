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

// /proyecto/<id> (HU-26): el id del proyecto, o null si la ruta es de otra cosa
export function proyectoDeRuta(pathname) {
  const [, tipo, id] = pathname.split('/')
  return tipo === 'proyecto' && id ? decodeURIComponent(id) : null
}

// La ruta que refleja lo que se ve: la ficha abierta de un proyecto o el lugar donde está la cámara
// Un panel abierto sobre la intro (el diario) no cambia la URL: la intro aún no terminó
export function rutaDeEstado({ fase, zona, panel, faseTrasPanel }) {
  if (fase === 'panel' && faseTrasPanel === 'intro') return null
  if (fase === 'panel' && panel?.tipo === 'proyecto') return `/proyecto/${panel.id}`
  if (fase === 'explorando' || fase === 'panel') return `/lugar/${zona}`
  return null
}
