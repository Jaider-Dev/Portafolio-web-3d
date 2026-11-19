// Un objeto por mural. El id también es el segmento de la URL: /proyecto/<id>
// Del CV del autor (17-nov-2026) y de este mismo portafolio. Un enlace null no se muestra (no hay
// repositorio o demo públicos: SESCOL es un producto de la empresa)
//
// mural.angulo: dónde está el mural en la pared de la galería, en fracciones de π sobre su elipse
// (0 = pared derecha, -0.5 = fondo, frente a la entrada; 1 = pared izquierda). Orden de visita
// antihorario (02 Z5): de la izquierda de la entrada hacia el fondo y vuelta por la derecha
export const PROYECTOS = [
  // El destacado va al fondo, frente a la entrada: es lo primero que se ve al cruzar la antesala
  {
    id: 'sescol',
    titulo: 'SESCOL · SIS/ERP académico',
    resumen: 'Sistema de información académica multi-tenant en producción, en GTC Corporation (2026).',
    problema: 'Gestionar el ciclo de vida del estudiante (matrícula, calificaciones e historia académica) para varias instituciones a la vez, según los lineamientos SUECO IES.',
    rol: 'Analista en desarrollo full stack: funcionalidades de backend y frontend, consumo de APIs vía API Gateway, integración de microservicios y análisis de requerimientos traducidos a historias técnicas, en un equipo Scrum.',
    tecnologias: ['Java 21', 'Spring Boot 3.4', 'Microservicios', 'Feign Client', 'Angular', 'TypeScript', 'Module Federation'],
    resultado: 'Interfaces dinámicas que reutilizan la librería de componentes del proyecto y los servicios transversales de auditoría, seguridad y parámetros.',
    enlaces: { codigo: null, demo: null },
    video: null,
    destacado: true,
    mural: { imagen: null, angulo: -0.5 },
  },
  {
    id: 'buclick',
    titulo: 'BUCLICK',
    resumen: 'Gestión de bienestar universitario: becas alimentarias, reservas de comidas y citas.',
    problema: 'Los procesos de bienestar (becas, comidas y citas) necesitaban un sistema único en lugar de trámites separados.',
    rol: 'Desarrollé APIs REST con Java y Spring Boot y participé en el modelado de datos en MySQL.',
    tecnologias: ['Java', 'Spring Boot', 'MySQL', 'Postman'],
    resultado: 'Endpoints para becas, reservas y citas, validados en Postman.',
    enlaces: { codigo: null, demo: null },
    video: null,
    mural: { imagen: null, angulo: 0.86 },
  },
  {
    id: 'evaluacion-pares',
    titulo: 'Evaluación entre pares',
    resumen: 'Sistema para gestionar usuarios y evaluaciones docentes entre pares.',
    problema: 'Organizar las evaluaciones entre docentes con usuarios, roles y resultados consultables.',
    rol: 'Implementé el backend con Python y Django y diseñé el modelo de datos relacional.',
    tecnologias: ['Python', 'Django', 'PostgreSQL', 'APIs REST'],
    resultado: 'Backend con gestión de usuarios y evaluaciones, y APIs REST para integrarlo.',
    enlaces: { codigo: null, demo: null },
    video: null,
    mural: { imagen: null, angulo: -0.85 },
  },
  {
    id: 'bitacora',
    titulo: 'Bitácora · portafolio 3D',
    resumen: 'Este portafolio: una isla flotante que se recorre para conocer mi trabajo.',
    problema: 'Mostrar mi perfil de una forma memorable sin que nadie tarde más de 60 segundos en llegar a mis proyectos o a mi contacto.',
    rol: 'Diseño, modelado y desarrollo completos: concepto, mapa, backlog en Jira, modelos en Blender y la escena en React Three Fiber.',
    tecnologias: ['React', 'React Three Fiber', 'Drei', 'Three.js', 'Blender', 'Web Audio', 'Zustand'],
    resultado: 'Una isla con mañana y noche, sonido sintetizado, cueva con murales, calidad gráfica adaptable y una versión clásica 2D accesible.',
    enlaces: { codigo: 'https://github.com/Jaider-Dev/Portafolio-web-3d', demo: 'https://portafolio-web-3d.vercel.app' },
    video: null,
    mural: { imagen: null, angulo: -0.15 },
  },
]

// El que se abre con "Ver proyectos" (HU-22): el destacado, o el primero si ninguno lo es
export const PROYECTO_DESTACADO = PROYECTOS.find((p) => p.destacado) ?? PROYECTOS[0]

// Mural sin terminar: "Próxima expedición" (03 E11), junto a la salida por la derecha
export const MURAL_PROXIMA = { angulo: 0.12 }
