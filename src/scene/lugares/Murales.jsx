import { useMemo, useState } from 'react'
import { useCursor } from '@react-three/drei'
import * as THREE from 'three'
import { VISION } from '../../data/perfil'
import { MURAL_PROXIMA, PROYECTOS } from '../../data/proyectos'
import { TEXTOS } from '../../data/textos'
import { useExperiencia } from '../../store/useExperiencia'
import { esMarcador } from '../../utils/marcadores'
import { PALETA } from '../paleta'
import { crearGaleria, GALERIA } from './galeria'

// Murales de la cueva (02 Z5, 06 §11.3): cada proyecto está PINTADO sobre la roca, no colgado. El mural
// es un parche de malla que copia la forma de la pared (rayos desde el interior contra la geometría de
// la galería, 3 cm por delante) y su pintura tiene fondo transparente y bordes difuminados, como un
// pigmento absorbido por la piedra. Al pasar el puntero se aviva y al hacer clic abre su ficha (HU-22).
// Cuando haya capturas de los proyectos (mural.imagen) se pintarán dentro del mismo parche

const ALTURA = 1.75 // centro del mural
const SEPARACION = 0.03 // por delante de la roca: sin parpadeo entre las dos superficies
const TAMANO = { normal: [1.9, 1.25], destacado: [2.8, 1.75] } // ancho (a lo largo de la pared) y alto

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
    const y = h * 0.2
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
      ctx.save(); ctx.translate(w * u, h * 0.4); ctx.rotate(giro)
      ctx.beginPath(); ctx.ellipse(0, 18, 20, 26, 0, 0, Math.PI * 2); ctx.fill()
      for (let d = -2; d <= 2; d++) { ctx.beginPath(); ctx.ellipse(d * 9, -20 - (2 - Math.abs(d)) * 6, 4, 16, d * 0.15, 0, Math.PI * 2); ctx.fill() }
      ctx.restore()
    }
  },
]

// Pintura sobre fondo transparente: una mancha de pigmento irregular, el motivo, el título y los bordes
// difuminados (máscara radial con destination-in: lo que queda fuera se vuelve transparente)
function crearPintura({ titulo, motivo, etiqueta, sinTerminar = false, semilla }) {
  const w = 512
  const h = 340
  const lienzo = document.createElement('canvas')
  lienzo.width = w
  lienzo.height = h
  const ctx = lienzo.getContext('2d')
  let s = semilla
  const azar = () => ((s = (s * 16807) % 2147483647) / 2147483647)

  // Lavado de ocre: muchas manchas suaves, como pigmento frotado sobre la roca
  ctx.fillStyle = PALETA.sendero
  for (let i = 0; i < 70; i++) {
    ctx.globalAlpha = 0.04 + azar() * 0.06
    ctx.beginPath(); ctx.ellipse(w * (0.15 + azar() * 0.7), h * (0.15 + azar() * 0.7), 40 + azar() * 90, 30 + azar() * 60, azar() * 3, 0, Math.PI * 2); ctx.fill()
  }
  // Marco de puntos pintados con el dedo
  ctx.globalAlpha = sinTerminar ? 0.35 : 0.8
  ctx.fillStyle = PALETA.lona
  for (let x = 40; x <= w - 40; x += 22) for (const y of [26, h - 26]) { ctx.beginPath(); ctx.arc(x + azar() * 4, y + azar() * 4, 4 + azar() * 2, 0, Math.PI * 2); ctx.fill() }
  // Motivo en ocre y fuego; sin terminar, solo el boceto en tiza
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = sinTerminar ? PALETA.nube : PALETA.lona
  ctx.fillStyle = sinTerminar ? PALETA.nube : PALETA.fuego
  ctx.lineWidth = sinTerminar ? 3 : 8
  ctx.globalAlpha = sinTerminar ? 0.5 : 0.95
  ctx.setLineDash(sinTerminar ? [10, 9] : [])
  MOTIVOS[motivo % MOTIVOS.length](ctx, w, h)
  ctx.setLineDash([])
  // Título y etiqueta en ocre claro: se leen sobre la roca oscura
  ctx.globalAlpha = 1
  ctx.fillStyle = PALETA.sendero
  ctx.textAlign = 'center'
  if (etiqueta) {
    ctx.font = '600 20px system-ui, sans-serif'
    ctx.fillText(etiqueta.toUpperCase(), w / 2, 62)
  }
  ctx.font = `700 ${titulo.length > 22 ? 32 : 40}px system-ui, sans-serif`
  ctx.fillText(titulo, w / 2, h - 56, w - 80)
  // Bordes difuminados
  ctx.globalCompositeOperation = 'destination-in'
  const mascara = ctx.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, w * 0.56)
  mascara.addColorStop(0, 'rgba(0,0,0,1)')
  mascara.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = mascara
  ctx.fillRect(0, 0, w, h)

  const textura = new THREE.CanvasTexture(lienzo)
  textura.colorSpace = THREE.SRGBColorSpace
  textura.anisotropy = 4
  return textura
}

// Parche que sigue la pared: una rejilla de rayos horizontales desde el eje de la galería, cada uno
// hacia un punto de la pared (a lo largo del arco y de la altura). Donde golpea la roca va el vértice
const objetivoDelRayo = new THREE.Raycaster()
function crearParche(angulo, [ancho, alto], columnas = 18, filas = 10) {
  const pared = new THREE.Mesh(crearGaleria(), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }))
  const [cx, , cz] = GALERIA.centro
  const [rx, , rz] = GALERIA.radios
  const a0 = angulo * Math.PI
  const radioLocal = Math.hypot(Math.cos(a0) * rx, Math.sin(a0) * rz) // para pasar metros de arco a ángulo
  const posiciones = []
  const uvs = []
  const indices = []
  const origen = new THREE.Vector3()
  const direccion = new THREE.Vector3()
  for (let j = 0; j <= filas; j++) {
    const y = ALTURA + (j / filas - 0.5) * alto
    for (let i = 0; i <= columnas; i++) {
      // Mirando hacia la pared, la derecha es (−sen a, 0, cos a): el ángulo crece hacia la derecha
      const a = a0 + ((i / columnas - 0.5) * ancho) / radioLocal
      origen.set(cx, y, cz)
      direccion.set(Math.cos(a) * rx, 0, Math.sin(a) * rz).normalize()
      objetivoDelRayo.set(origen, direccion)
      const [impacto] = objetivoDelRayo.intersectObject(pared)
      const distancia = (impacto ? impacto.distance : Math.min(rx, rz) * 0.8) - SEPARACION
      posiciones.push(...origen.addScaledVector(direccion, distancia).toArray())
      uvs.push(i / columnas, j / filas)
      if (i < columnas && j < filas) {
        const k = j * (columnas + 1) + i
        indices.push(k, k + 1, k + columnas + 1, k + 1, k + columnas + 2, k + columnas + 1)
      }
    }
  }
  const geometria = new THREE.BufferGeometry()
  geometria.setAttribute('position', new THREE.Float32BufferAttribute(posiciones, 3))
  geometria.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometria.setIndex(indices)
  geometria.computeVertexNormals()
  return geometria
}

function Mural({ geometria, textura, alActivar, nombre }) {
  const [encima, setEncima] = useState(false)
  useCursor(encima && Boolean(alActivar))
  return (
    <mesh
      geometry={geometria}
      name={nombre}
      onClick={alActivar && ((e) => {
        if (e.delta > 4) return // fue un arrastre de cámara, no un clic
        e.stopPropagation()
        alActivar()
      })}
      onPointerOver={alActivar && ((e) => { e.stopPropagation(); setEncima(true) })}
      onPointerOut={alActivar && (() => setEncima(false))}
    >
      {/* La pintura recibe la luz de las antorchas como la roca y brilla apenas por sí misma
          (emissiveMap): se adivina en la penumbra; al pasar el puntero se aviva */}
      <meshStandardMaterial
        map={textura}
        emissive="#ffffff"
        emissiveMap={textura}
        emissiveIntensity={encima ? 0.6 : 0.1}
        transparent
        depthWrite={false}
        roughness={1}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

export function Murales() {
  const abrirPanel = useExperiencia((s) => s.abrirPanel)
  const murales = useMemo(() => [
    ...PROYECTOS.map((proyecto, i) => ({
      id: proyecto.id,
      geometria: crearParche(proyecto.mural.angulo, proyecto.destacado ? TAMANO.destacado : TAMANO.normal),
      textura: crearPintura({
        titulo: tituloDe(proyecto, i + 1),
        motivo: i,
        etiqueta: proyecto.destacado ? TEXTOS.murales.destacado : null,
        semilla: 101 + i * 37,
      }),
    })),
    {
      id: 'proxima',
      geometria: crearParche(MURAL_PROXIMA.angulo, TAMANO.normal),
      textura: crearPintura({
        titulo: esMarcador(VISION.proyectoActual) ? TEXTOS.murales.pintando : VISION.proyectoActual,
        motivo: 3,
        etiqueta: TEXTOS.murales.proxima,
        sinTerminar: true,
        semilla: 7,
      }),
    },
  ], [])

  return (
    <group name="murales">
      {murales.map(({ id, geometria, textura }) => (
        <Mural
          key={id}
          nombre={`mural-${id}`}
          geometria={geometria}
          textura={textura}
          alActivar={id === 'proxima' ? null : () => abrirPanel({ tipo: 'proyecto', id })}
        />
      ))}
    </group>
  )
}
