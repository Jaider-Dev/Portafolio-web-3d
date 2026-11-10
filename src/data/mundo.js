// Elementos fijos de la isla que no son puntos de viaje. Coordenadas de 02 · Mapa §5
export const MUNDO = {
  puente: [0, 0.5, 2],
  fogata: [-13, 0, 5],
  troncos: { radio: 1.8, cantidad: 3 },
  tienda: [-17, 0, 1],
  mochila: [-15.5, 0, 3],
  poste: [-9, 0, 9],
  letrero: [-11, 0, 10],
  vado: { desde: -2, hasta: 2, y: -0.1, z: 8, piedras: 5 },
  poza: { centro: [3, -0.3, -13], radio: 3.4 }, // a la altura del río: el agua de la poza sigue en él
  cascadaAlta: { borde: [4, 12, -17], ancho: 3 },
  repisa: { desde: 0, hasta: 4, y: 0, z: -17 },
  entradaCueva: [4, 0.2, -18.5],
  galeria: { centro: [4, 1, -25], ancho: 14, fondo: 10, alto: 5 },
  inicioSendero: [6, 0, 0],
  claroCima: [10, 16, -21],
  manantial: [6, 15.5, -20],
  mirador: [13, 16, -14],
  cascadaBaja: [-4, -0.3, 22],
}

// Eje del río (02 · Mapa §5): del pie de la cascada alta a la caída
export const CAUCE = [
  [3, -0.3, -10],
  [1, -0.3, -4],
  [0, -0.3, 2],
  [-1.5, -0.3, 8],
  [-3, -0.3, 15],
  [-4, -0.3, 22],
]

export const ARROYO = [
  [6, 15.5, -20],
  [4, 12, -17],
]

export const SENDERO = [
  [6, 0],
  [8, -3],
  [10, -6],
  [12, -10],
  [13, -14],
  [11, -17],
  [9, -19],
]
