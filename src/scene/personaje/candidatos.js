export const RUTA_PERSONAJE = '/models/personaje.glb'

// Candidatos del 17-nov para elegir el explorador (blender/preparar_candidatos.py): piel morena suave,
// cabello oscuro y largo, ropa con la paleta
export const CANDIDATOS = {
  1: { ruta: RUTA_PERSONAJE, sinColor: true, nombre: 'Explorador 1 · el preparado el 16-nov (sin color)' },
  3: { ruta: '/models/personaje-3.glb', sinColor: false, nombre: 'Explorador 3 · low poly' },
}

// El que sale en la isla (19-nov): el 3, el más simple y liviano (654 triángulos y 124 KB frente a
// 13.764 y 1 MB). El 1 se conserva listo: basta con poner aquí 1 para volver a mostrarlo. Solo se
// descarga el activo (Explorador.jsx precarga solo este)
export const CANDIDATO_ACTIVO = 3
