import { useMemo, useState } from 'react'
import { useCursor } from '@react-three/drei'
import * as THREE from 'three'
import { VISION } from '../../data/perfil'
import { MURAL_PROXIMA, PROYECTOS } from '../../data/proyectos'
import { TEXTOS } from '../../data/textos'
import { useExperiencia } from '../../store/useExperiencia'
import { esMarcador } from '../../utils/marcadores'
import { PALETA } from '../paleta'
import { puntoEnLaPared } from './galeria'

// Murales de la cueva (02 Z5, 06 §11.3): cada proyecto es una pintura sobre la roca con su título,
// enmarcada en piedra. Al pasar el puntero se ilumina y al hacer clic abre su ficha (HU-22). El
// destacado es más grande y está al fondo; el último está sin terminar ("Próxima expedición").
// Las pinturas se dibujan en un canvas con la paleta: cuando haya capturas de los proyectos
// (mural.imagen) se pintarán dentro del mismo marco

const ALTURA = 1.55
// Por dentro de la pared: la cúpula se cierra hacia el techo y su roca es irregular (±7 %). A 0.74 del
// radio ni el borde superior del destacado (a 2,35 m) toca la roca
const FRACCION_PARED = 0.74
const INCLINACION = -0.18 // la pared se cierra hacia el techo: el mural se recuesta con ella
const TAMANO = { normal: [1.7, 1.15], destacado: [2.5, 1.6] }

const tituloDe = (proyecto, numero) => (esMarcador(proyecto.titulo) ? `Proyecto ${numero}` : proyecto.titulo)

// Motivos de pintura rupestre, uno por proyecto (cambiarán por las capturas)
const MOTIVOS = [
  (ctx, w, h) => { // sol sobre montañas
    ctx.beginPath(); ctx.arc(w * 0.68, h * 0.3, h * 0.09, 0, Math.PI * 2); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(w * 0.15, h * 0.62); ctx.lineTo(w * 0.35, h * 0.3); ctx.lineTo(w * 0.5, h * 0.5); ctx.lineTo(w * 0.62, h * 0.38); ctx.lineTo(w * 0.85, h * 0.62); ctx.stroke()
  },
  (ctx, w, h) => { // espiral
    ctx.beginPath()
    for (let t = 0; t < 18; t += 0.2) ctx.lineTo(w / 2 + Math.cos(t) * t * 6, h * 0.42 + Math.sin(t) * t * 5)
    ctx.stroke()
  },
  (ctx, w, h) => { // olas del río
    for (let fila = 0; fila < 3; fila++) {
      ctx.beginPath()
      for (let x = w * 0.15; x <= w * 0.85; x += 6) ctx.lineTo(x, h * (0.3 + fila * 0.12) + Math.sin(x / 18) * 8)
      ctx.stroke()
    }
  },
  (ctx, w, h) => { // explorador con bastón
    const x = w / 2
    const y = h * 0.22
    ctx.beginPath(); ctx.arc(x, y, 12, 0, Math.PI * 2); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(x, y + 12); ctx.lineTo(x, y + 70); ctx.moveTo(x - 30, y + 35); ctx.lineTo(x + 30, y + 30)
    ctx.moveTo(x, y + 70); ctx.lineTo(x - 22, y + 110); ctx.moveTo(x, y + 70); ctx.lineTo(x + 22, y + 110)
    ctx.moveTo(x + 30, y + 30); ctx.lineTo(x + 34, y + 112); ctx.stroke()
  },
  (ctx, w, h) => { // constelación
    const puntos = [[0.25, 0.2], [0.4, 0.35], [0.55, 0.25], [0.7, 0.42], [0.5, 0.55], [0.32, 0.5]]
    ctx.beginPath(); puntos.forEach(([u, v]) => ctx.lineTo(w * u, h * v)); ctx.stroke()
    puntos.forEach(([u, v]) => { ctx.beginPath(); ctx.arc(w * u, h * v, 5, 0, Math.PI * 2); ctx.fill() })
  },
  (ctx, w, h) => { // manos
    for (const [u, giro] of [[0.38, -0.2], [0.6, 0.25]]) {
      ctx.save(); ctx.translate(w * u, h * 0.42); ctx.rotate(giro)
      ctx.beginPath(); ctx.ellipse(0, 18, 20, 26, 0, 0, Math.PI * 2); ctx.fill()
      for (let d = -2; d <= 2; d++) { ctx.beginPath(); ctx.ellipse(d * 9, -20 - (2 - Math.abs(d)) * 6, 4, 16, d * 0.15, 0, Math.PI * 2); ctx.fill() }
      ctx.restore()
    }
  },
]

// Fondo de piedra moteada con pigmento ocre: semilla fija por mural
function pintarFondo(ctx, w, h, semilla) {
  let s = semilla
  const azar = () => ((s = (s * 16807) % 2147483647) / 2147483647)
  ctx.fillStyle = PALETA.piedra
  ctx.fillRect(0, 0, w, h)
  for (let i = 0; i < 260; i++) {
    ctx.globalAlpha = 0.06 + azar() * 0.1
    ctx.fillStyle = azar() > 0.5 ? PALETA.cueva : '#ffffff'
    ctx.beginPath(); ctx.arc(azar() * w, azar() * h, 2 + azar() * 14, 0, Math.PI * 2); ctx.fill()
  }
  ctx.globalAlpha = 1
}

function crearPintura({ titulo, motivo, etiqueta, sinTerminar = false, semilla }) {
  const w = 512
  const h = 344
  const lienzo = document.createElement('canvas')
  lienzo.width = w
  lienzo.height = h
  const ctx = lienzo.getContext('2d')
  pintarFondo(ctx, w, h, semilla)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  // Marco pintado a mano
  ctx.strokeStyle = PALETA.madera
  ctx.lineWidth = 5
  ctx.setLineDash(sinTerminar ? [14, 12] : [])
  ctx.strokeRect(16, 16, w - 32, h - 32)
  // Motivo en ocre (el naranja de la lona); sin terminar, solo el boceto
  ctx.strokeStyle = PALETA.lona
  ctx.fillStyle = PALETA.lona
  ctx.lineWidth = sinTerminar ? 3 : 7
  ctx.globalAlpha = sinTerminar ? 0.55 : 1
  MOTIVOS[motivo % MOTIVOS.length](ctx, w, h)
  ctx.globalAlpha = 1
  ctx.setLineDash([])
  // Rótulo
  ctx.fillStyle = PALETA.letrero
  ctx.textAlign = 'center'
  if (etiqueta) {
    ctx.font = '600 20px system-ui, sans-serif'
    ctx.fillText(etiqueta.toUpperCase(), w / 2, 46)
  }
  ctx.font = `700 ${titulo.length > 22 ? 30 : 38}px system-ui, sans-serif`
  ctx.fillText(titulo, w / 2, h - 46, w - 60)
  const textura = new THREE.CanvasTexture(lienzo)
  textura.colorSpace = THREE.SRGBColorSpace
  textura.anisotropy = 4
  return textura
}

function Marco({ ancho, alto }) {
  const grosor = 0.13
  const barras = [
    [0, alto / 2 + grosor / 2, ancho + grosor * 2, grosor], [0, -alto / 2 - grosor / 2, ancho + grosor * 2, grosor],
    [-ancho / 2 - grosor / 2, 0, grosor, alto], [ancho / 2 + grosor / 2, 0, grosor, alto],
  ]
  return barras.map(([x, y, w, h]) => (
    <mesh key={`${x},${y}`} position={[x, y, -0.02]} castShadow>
      <boxGeometry args={[w, h, 0.16]} />
      <meshStandardMaterial color={PALETA.piedra} flatShading roughness={1} />
    </mesh>
  ))
}

function Mural({ angulo, tamano, textura, alActivar, nombre }) {
  const [encima, setEncima] = useState(false)
  useCursor(encima && Boolean(alActivar))
  const { posicion, giro } = puntoEnLaPared(angulo, FRACCION_PARED, ALTURA)
  const [ancho, alto] = tamano
  return (
    <group position={posicion} rotation={[INCLINACION, giro, 0, 'YXZ']} name={nombre}>
      <mesh
        onClick={alActivar && ((e) => {
          if (e.delta > 4) return // fue un arrastre de cámara, no un clic
          e.stopPropagation()
          alActivar()
        })}
        onPointerOver={alActivar && ((e) => { e.stopPropagation(); setEncima(true) })}
        onPointerOut={alActivar && (() => setEncima(false))}
      >
        <planeGeometry args={[ancho, alto]} />
        {/* La propia pintura brilla un poco (emissiveMap): se adivina en la penumbra y la antorcha la
            revela; al pasar el puntero se ilumina más */}
        <meshStandardMaterial map={textura} emissive="#ffffff" emissiveMap={textura} emissiveIntensity={encima ? 0.55 : 0.14} roughness={0.95} />
      </mesh>
      <Marco ancho={ancho} alto={alto} />
    </group>
  )
}

export function Murales() {
  const abrirPanel = useExperiencia((s) => s.abrirPanel)
  const texturas = useMemo(() => ({
    proyectos: PROYECTOS.map((proyecto, i) => crearPintura({
      titulo: tituloDe(proyecto, i + 1),
      motivo: i,
      etiqueta: proyecto.destacado ? TEXTOS.murales.destacado : null,
      semilla: 101 + i * 37,
    })),
    proxima: crearPintura({
      titulo: esMarcador(VISION.proyectoActual) ? TEXTOS.murales.pintando : VISION.proyectoActual,
      motivo: 3,
      etiqueta: TEXTOS.murales.proxima,
      sinTerminar: true,
      semilla: 7,
    }),
  }), [])

  return (
    <group name="murales">
      {PROYECTOS.map((proyecto, i) => (
        <Mural
          key={proyecto.id}
          nombre={`mural-${proyecto.id}`}
          angulo={proyecto.mural.angulo}
          tamano={proyecto.destacado ? TAMANO.destacado : TAMANO.normal}
          textura={texturas.proyectos[i]}
          alActivar={() => abrirPanel({ tipo: 'proyecto', id: proyecto.id })}
        />
      ))}
      <Mural nombre="mural-proxima" angulo={MURAL_PROXIMA.angulo} tamano={TAMANO.normal} textura={texturas.proxima} />
    </group>
  )
}
