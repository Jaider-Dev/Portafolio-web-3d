// Niveles de calidad gráfica (HU-17) con el presupuesto de 06 · Diseño técnico §19.1.
// Sin three ni React: se prueba en calidad.test.js

export const NIVELES = ['alta', 'media', 'baja']
export const OPCIONES = ['auto', ...NIVELES] // lo que el visitante puede elegir

export const PERFILES = {
  alta: { dpr: [1, 2], sombras: 2048, particulas: 1, vegetacion: 1 },
  media: { dpr: [1, 1.5], sombras: 1024, particulas: 0.6, vegetacion: 0.75 },
  baja: { dpr: 1, sombras: 0, particulas: 0.3, vegetacion: 0.5 }, // sin sombra dinámica
}

// En "automática" se empieza en baja en móviles y tabletas (pantalla táctil y pequeña) y en alta en
// el resto; después PerformanceMonitor solo baja de nivel si los FPS caen de forma sostenida
export function nivelInicial(entorno = globalThis) {
  try {
    const tactil = entorno.matchMedia('(pointer: coarse)').matches
    const pequena = Math.min(entorno.screen.width, entorno.screen.height) < 900
    return tactil && pequena ? 'baja' : 'alta'
  } catch {
    return 'alta'
  }
}

// Un escalón hacia abajo; de "baja" no se pasa
export const nivelInferior = (nivel) => NIVELES[Math.min(NIVELES.indexOf(nivel) + 1, NIVELES.length - 1)]

// El nivel que se aplica: el elegido a mano o, en automática, el que va decidiendo el monitor
export const nivelEfectivo = (eleccion, automatico) => (eleccion === 'auto' ? automatico : eleccion)

// Cuántos elementos de un conjunto se dibujan con una proporción (al menos 1)
export const cuantos = (total, proporcion) => Math.max(1, Math.round(total * proporcion))
