// Un objeto por mural. El id también es el segmento de la URL: /proyecto/<id>
export const PROYECTOS = [
  {
    id: 'proyecto-1',
    titulo: '{PROYECTO.titulo}',
    resumen: '{PROYECTO.resumen}',
    problema: '{PROYECTO.problema}',
    rol: '{PROYECTO.rol}',
    tecnologias: ['{PROYECTO.tecnologias}'],
    resultado: '{PROYECTO.resultado}',
    enlaces: { codigo: '{URL_CODIGO}', demo: '{URL_DEMO}' },
    mural: { imagen: null, posicion: [-2, 1.6, -22], rotacionY: 1.2 },
    video: null,
    destacado: true,
  },
]
