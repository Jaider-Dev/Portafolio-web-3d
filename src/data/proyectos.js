// Un objeto por mural. El id también es el segmento de la URL: /proyecto/<id>
// Marcadores hasta que el autor dé sus proyectos (PL-02, P-5: de 4 a 6 más el destacado).
//
// mural.angulo: dónde está el mural en la pared de la galería, en fracciones de π sobre su elipse
// (0 = pared derecha, -0.5 = fondo, frente a la entrada; 1 = pared izquierda). Orden de visita
// antihorario (02 Z5): de la izquierda de la entrada hacia el fondo y vuelta por la derecha
const marcador = (n) => ({
  titulo: `{PROYECTO_${n}.titulo}`,
  resumen: `{PROYECTO_${n}.resumen}`,
  problema: `{PROYECTO_${n}.problema}`,
  rol: `{PROYECTO_${n}.rol}`,
  tecnologias: [`{PROYECTO_${n}.tecnologias}`],
  resultado: `{PROYECTO_${n}.resultado}`,
  enlaces: { codigo: `{PROYECTO_${n}.URL_CODIGO}`, demo: `{PROYECTO_${n}.URL_DEMO}` },
  video: null,
})

export const PROYECTOS = [
  // El destacado va al fondo, frente a la entrada: es lo primero que se ve al cruzar la antesala
  { id: 'proyecto-1', ...marcador(1), destacado: true, mural: { imagen: null, angulo: -0.5 } },
  { id: 'proyecto-2', ...marcador(2), mural: { imagen: null, angulo: 0.86 } },
  { id: 'proyecto-3', ...marcador(3), mural: { imagen: null, angulo: -0.92 } },
  { id: 'proyecto-4', ...marcador(4), mural: { imagen: null, angulo: -0.71 } },
  { id: 'proyecto-5', ...marcador(5), mural: { imagen: null, angulo: -0.29 } },
  { id: 'proyecto-6', ...marcador(6), mural: { imagen: null, angulo: -0.08 } },
]

// Mural sin terminar: "Próxima expedición" (03 E11), junto a la salida por la derecha
export const MURAL_PROXIMA = { angulo: 0.12 }
