import * as THREE from 'three'
import { PALETA } from '../paleta'

// Texturas del agua dibujadas en un canvas al cargar: sin descargas y con los colores de la paleta.
// Se repiten en V (a lo largo del flujo); en U van de orilla a orilla

// Pseudoaleatorio con semilla: el dibujo sale igual en cada visita
function generador(semilla) {
  let s = semilla
  return () => ((s = (s * 16807) % 2147483647) / 2147483647)
}

// Fondo del color del agua con vetas alargadas más claras (la corriente) y, si se pide, espuma
// en las orillas (U = 0 y U = 1)
export function crearTexturaDeFlujo({ orillas }) {
  const ancho = 64
  const alto = 256
  const lienzo = document.createElement('canvas')
  lienzo.width = ancho
  lienzo.height = alto
  const ctx = lienzo.getContext('2d')
  ctx.fillStyle = PALETA.agua
  ctx.fillRect(0, 0, ancho, alto)

  const azar = generador(orillas ? 11 : 23)
  ctx.fillStyle = PALETA.espuma
  for (let i = 0; i < 26; i++) {
    const x = azar() * ancho
    const y = azar() * alto
    const largo = 18 + azar() * 46
    ctx.globalAlpha = 0.18 + azar() * 0.3
    // Cada veta se dibuja también una altura arriba y abajo: si sale por un borde entra por el otro
    // y la textura empalma sin costura al repetirse en V
    for (const dy of [-alto, 0, alto]) {
      ctx.beginPath()
      ctx.ellipse(x, y + dy, 1 + azar() * 1.5, largo / 2, 0, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  if (orillas) {
    for (const [desde, hacia] of [[0, 9], [ancho, ancho - 9]]) {
      const degradado = ctx.createLinearGradient(desde, 0, hacia, 0)
      degradado.addColorStop(0, 'rgba(255,255,255,0.75)')
      degradado.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.globalAlpha = 1
      ctx.fillStyle = degradado
      ctx.fillRect(Math.min(desde, hacia), 0, 9, alto)
    }
  }

  ctx.globalAlpha = 1
  const textura = new THREE.CanvasTexture(lienzo)
  textura.colorSpace = THREE.SRGBColorSpace // el canvas está en sRGB, como los colores de la paleta
  textura.wrapS = THREE.ClampToEdgeWrapping
  textura.wrapT = THREE.RepeatWrapping
  textura.anisotropy = 4 // el río se ve muy de lado desde la cámara
  return textura
}

// alphaMap a lo largo de la cascada: opaco en el borde (V = 0) y transparente al final (V = 1), para que
// la cascada baja se pierda entre las nubes. Sin flipY, la fila 0 del canvas es V = 0.
// Un alphaMap se lee en el canal verde y no es un color: no lleva espacio de color sRGB
export function crearDegradado() {
  const lienzo = document.createElement('canvas')
  lienzo.width = 4
  lienzo.height = 128
  const ctx = lienzo.getContext('2d')
  const degradado = ctx.createLinearGradient(0, 0, 0, 128)
  degradado.addColorStop(0, '#fff')
  degradado.addColorStop(0.35, '#fff')
  degradado.addColorStop(1, '#000')
  ctx.fillStyle = degradado
  ctx.fillRect(0, 0, 4, 128)
  const textura = new THREE.CanvasTexture(lienzo)
  textura.flipY = false
  return textura
}

// alphaMap radial para la espuma donde cae la cascada: densa en el centro, se diluye hacia el borde,
// con un anillo irregular para que no parezca un disco perfecto
export function crearEspumaRadial() {
  const lado = 64
  const lienzo = document.createElement('canvas')
  lienzo.width = lienzo.height = lado
  const ctx = lienzo.getContext('2d')
  const degradado = ctx.createRadialGradient(lado / 2, lado / 2, 0, lado / 2, lado / 2, lado / 2)
  degradado.addColorStop(0, '#fff')
  degradado.addColorStop(0.45, '#bbb')
  degradado.addColorStop(1, '#000')
  ctx.fillStyle = degradado
  ctx.fillRect(0, 0, lado, lado)
  const azar = generador(5)
  ctx.fillStyle = '#fff'
  for (let i = 0; i < 40; i++) {
    const angulo = azar() * Math.PI * 2
    const r = lado * (0.15 + azar() * 0.25)
    ctx.globalAlpha = 0.25 + azar() * 0.35
    ctx.beginPath()
    ctx.arc(lado / 2 + Math.cos(angulo) * r, lado / 2 + Math.sin(angulo) * r, 1.5 + azar() * 3, 0, Math.PI * 2)
    ctx.fill()
  }
  return new THREE.CanvasTexture(lienzo)
}
