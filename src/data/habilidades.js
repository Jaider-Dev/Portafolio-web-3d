const VACIA = { diario: ['{HABILIDADES}'], trabajado: [], aprendiendo: [] }

// Una categoría por runa del vado; sin porcentajes (03 · Guion, E6)
export const HABILIDADES = [
  { id: 'frontend', categoria: 'Frontend', glifo: 'G8', ...VACIA },
  { id: '3d', categoria: '3D y gráficos web', glifo: 'G9', ...VACIA },
  { id: 'lenguajes', categoria: 'Lenguajes', glifo: 'G10', ...VACIA },
  { id: 'herramientas', categoria: 'Herramientas y metodologías', glifo: 'G11', ...VACIA },
  { id: 'libre', categoria: '{CATEGORÍA}', glifo: 'G12', ...VACIA },
]
