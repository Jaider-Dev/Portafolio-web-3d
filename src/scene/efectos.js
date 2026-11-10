import * as THREE from 'three'

// Texturas de luz compartidas (dibujadas una vez en un canvas, sin descargas): el halo de un fuego y el
// "charco de luz" que una lámpara deja en el suelo. Se usan con mezcla aditiva: suman luz a lo que
// hay detrás sin necesitar una luz puntual real, que encarecería todos los materiales de la escena

function degradadoRadial(paradas, lado = 64) {
  const lienzo = document.createElement('canvas')
  lienzo.width = lienzo.height = lado
  const ctx = lienzo.getContext('2d')
  const g = ctx.createRadialGradient(lado / 2, lado / 2, 0, lado / 2, lado / 2, lado / 2)
  for (const [posicion, color] of paradas) g.addColorStop(posicion, color)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, lado, lado)
  const textura = new THREE.CanvasTexture(lienzo)
  textura.colorSpace = THREE.SRGBColorSpace
  return textura
}

let halo = null
export const texturaHalo = () => (halo ??= degradadoRadial([
  [0, 'rgba(255,220,150,0.9)'],
  [0.35, 'rgba(244,175,54,0.35)'],
  [1, 'rgba(244,175,54,0)'],
]))

let charco = null
export const texturaCharco = () => (charco ??= degradadoRadial([
  [0, 'rgba(244,175,54,0.8)'],
  [0.5, 'rgba(244,175,54,0.3)'],
  [1, 'rgba(244,175,54,0)'],
], 128))
