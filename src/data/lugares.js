// Puntos de viaje. Coordenadas de 02 · Mapa §5 y cámaras de 06 §4
export const LUGARES = [
  {
    id: 'campamento', nombre: 'Campamento base', seccion: 'Sobre mí', glifo: 'G1',
    menhir: [-10, 0, 2], llegada: [-11, 0, 4],
    camara: { posicion: [-4, 6, 20], objetivo: [-8, 2, 0] }, // ajustada: con la de 06 §4 la cascada quedaba fuera (HU-04)
  },
  {
    id: 'rio', nombre: 'Vado de las runas', seccion: 'Habilidades', glifo: 'G2',
    menhir: [4, 0, 4], llegada: [3, 0, 5],
    camara: { posicion: [8, 4, 13], objetivo: [0, 0, 7] },
  },
  {
    id: 'cueva', nombre: 'Cueva de los murales', seccion: 'Proyectos', glifo: 'G3',
    menhir: [0, 0, -11], llegada: [4, 0.2, -20],
    // Dentro de la galería, cerca de la entrada y mirando al fondo (los murales); al girar se ve la cascada
    camara: { posicion: [4, 2.1, -20.6], objetivo: [4, 1.7, -24.3] },
  },
  {
    id: 'sendero', nombre: 'Sendero de los mojones', seccion: 'Trayectoria', glifo: 'G4',
    menhir: [10, 7, -6], llegada: [9, 7, -5],
    camara: { posicion: [16, 11, 2], objetivo: [9, 7, -7] },
  },
  {
    id: 'cima', nombre: 'Cima del manantial', seccion: 'Visión', glifo: 'G5',
    menhir: [9, 16, -19], llegada: [10, 16, -18],
    camara: { posicion: [16, 20, -8], objetivo: [6, 15, -20] },
  },
]

export const LUGARES_POR_ID = Object.fromEntries(LUGARES.map((l) => [l.id, l]))
