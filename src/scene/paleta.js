// Paleta elegida por el autor el 10-nov-2026 (P-1, PL-05): "fiel a la referencia", con colores
// medidos en Documentos/Proyecto final/referencia-concepto.webp (mediana de zonas de 15×15 px).
// Los materiales tienen una sola paleta; lo que cambia entre la mañana y la noche es la luz (D12, HU-37).
export const PALETA = {
  meseta: '#839d30', // hierba de la meseta
  vegetacion: '#3f5c2e', // pinos
  roca: '#847e6c', // acantilados y masa de la isla
  piedra: '#a89f81', // piedras sueltas, vado, mirador
  sendero: '#e3ba75', // tierra del camino
  madera: '#926440', // puente, troncos, letrero, poste
  agua: '#6eb7ca', // río y cascadas
  lona: '#e38531', // tienda
  fuego: '#f4af36', // brasas y luz de la fogata
  cueva: '#3b382f', // roca en penumbra (la roca oscurecida)
  sombra: '#2a2620', // huecos (entrada de la tienda)
  letrero: '#3a2818', // texto de las flechas del poste
  realce: '#f4af36', // lo que se puede tocar: el ámbar del fuego
}

// Luz de cada hora del día. "Mañana dorada" y "noche azul violácea", elegidas por el autor.
// Los dos ambientes tienen exactamente las mismas luces: al cambiar solo se interpolan sus valores,
// así three.js no recompila shaders (cambiar el número de luces sí obliga a recompilarlos).
export const AMBIENTES = {
  manana: {
    cenit: '#90c3ec', // cielo alto de la referencia
    horizonte: '#f3e6c8',
    bajo: '#5788ae', // el "mar" de nubes bajo la isla, de la referencia
    astro: '#ffd9a0', // disco del sol
    luz: { color: '#ffd9a0', intensidad: 2.6, posicion: [-45, 30, 30] }, // sol bajo y lateral (05 §7)
    cielo: { color: '#bcd9f2', suelo: '#5d6b3a', intensidad: 1.15 }, // relleno: cielo arriba, rebote de la hierba abajo
    fogata: 0.8, // de día casi no se nota
    estrellas: 0,
  },
  noche: {
    cenit: '#191438',
    horizonte: '#2e2659',
    bajo: '#0d0b20',
    astro: '#e9e4ff', // disco de la luna
    luz: { color: '#b6a9e8', intensidad: 1.2, posicion: [35, 45, -25] }, // luna, desde el lado contrario
    cielo: { color: '#4a3f8a', suelo: '#16122b', intensidad: 1.0 }, // suficiente para leer la isla (pilar P1)
    fogata: 28,
    estrellas: 1,
  },
}

export const DURACION_CAMBIO = 1.5 // segundos; con "reducir movimiento" el cambio es inmediato
