import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { HABILIDADES } from '../../data/habilidades'
import { MUNDO } from '../../data/mundo.js'
import { TEXTOS } from '../../data/textos'
import { useExperiencia } from '../../store/useExperiencia'
import { Interactivo } from '../interaccion/Interactivo'
import { LOSAS, useKit, usePiedra } from '../naturaleza/kit.js'
import { PALETA } from '../paleta'
import { tocarTono } from '../sonido/tono'

// Vado de las runas (HU-20, 02 Z2, 03 E6): cinco losas que asoman del río, una por categoría de
// habilidades. Cada una lleva su glifo grabado (G8–G12, 05 §12) con MatCap (HU-12): el material lee el
// color de una esfera pintada según la normal, así el glifo brilla sin luces extra, también de noche.
// Apagado, el glifo es apenas una marca clara en la piedra; al activarlo se enciende, suena un tono y
// se abre su tarjeta. Al activar las cinco se avisa "Habilidades completas" (store: marcarVisitado).

const ESCALA_LOSA = [0.5, 0.24, 0.46]
const NOTAS = [523.25, 587.33, 659.25, 783.99, 880] // escala pentatónica: cualquier orden suena bien

// Trazos de cada glifo en un lienzo de 1 × 1 (0,0 arriba a la izquierda)
const GLIFOS = [
  [[[0.5, 0.12], [0.5, 0.88]], [[0.5, 0.3], [0.78, 0.12]], [[0.5, 0.5], [0.78, 0.32]]], // frontend: rama
  [[[0.5, 0.12], [0.82, 0.32], [0.82, 0.7], [0.5, 0.88], [0.18, 0.7], [0.18, 0.32], [0.5, 0.12]], [[0.18, 0.32], [0.5, 0.52], [0.82, 0.32]], [[0.5, 0.52], [0.5, 0.88]]], // 3D: cubo
  [[[0.32, 0.18], [0.16, 0.5], [0.32, 0.82]], [[0.68, 0.18], [0.84, 0.5], [0.68, 0.82]], [[0.58, 0.2], [0.42, 0.8]]], // lenguajes: < / >
  [[[0.22, 0.82], [0.62, 0.42]], [[0.5, 0.2], [0.8, 0.5]], [[0.62, 0.14], [0.86, 0.38]]], // herramientas: martillo
  [[[0.2, 0.25], [0.8, 0.25]], [[0.2, 0.5], [0.8, 0.5]], [[0.2, 0.75], [0.8, 0.75]], [[0.35, 0.12], [0.35, 0.88]], [[0.65, 0.12], [0.65, 0.88]]], // backend: red
]

function lienzo(lado, dibujar) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = lado
  dibujar(canvas.getContext('2d'), lado)
  const textura = new THREE.CanvasTexture(canvas)
  textura.colorSpace = THREE.SRGBColorSpace
  return textura
}

// Máscara del glifo: blanco donde hay trazo (alphaMap usa el canal verde)
const crearGlifo = (trazos) => lienzo(128, (ctx, lado) => {
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = lado * 0.075
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (const trazo of trazos) {
    ctx.beginPath()
    trazo.forEach(([x, y]) => ctx.lineTo(x * lado, y * lado))
    ctx.stroke()
  }
})

// MatCap ámbar (el color de realce de la paleta): brillo arriba a la izquierda, borde de brasa
const crearMatcapAmbar = () => lienzo(128, (ctx, lado) => {
  const g = ctx.createRadialGradient(lado * 0.36, lado * 0.32, lado * 0.02, lado / 2, lado / 2, lado / 2)
  g.addColorStop(0, '#ffffff')
  g.addColorStop(0.3, PALETA.realce)
  g.addColorStop(0.75, PALETA.llama)
  g.addColorStop(1, PALETA.madera)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, lado, lado)
})

const APAGADO = new THREE.Color(PALETA.humo).multiplyScalar(0.55)
const ENCENDIDO = new THREE.Color('#ffffff')

function Glifo({ textura, matcap, encendido, encima, indice }) {
  const material = useRef()
  useFrame(({ clock }, delta) => {
    const quieto = useExperiencia.getState().ajustes.reducirMovimiento
    const pulso = encendido && !quieto ? 0.88 + 0.12 * Math.sin(clock.elapsedTime * 2 + indice) : 1
    const objetivo = encendido || encima ? ENCENDIDO : APAGADO
    material.current.color.lerp(objetivo, Math.min(1, delta * 6))
    material.current.opacity = THREE.MathUtils.damp(material.current.opacity, (encendido ? 1 : encima ? 0.9 : 0.55) * pulso, 6, delta)
  })
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, ESCALA_LOSA[1] + 0.012, 0]} raycast={() => null}>
      <circleGeometry args={[0.32, 20]} />
      <meshMatcapMaterial ref={material} matcap={matcap} alphaMap={textura} transparent opacity={0.55} depthWrite={false}
        polygonOffset polygonOffsetFactor={-2} toneMapped={false} />
    </mesh>
  )
}

export function Runas() {
  const geometrias = useKit('rocas')
  const material = usePiedra(PALETA.piedra)
  const visitados = useExperiencia((s) => s.visitados)
  const recursos = useMemo(() => ({ glifos: GLIFOS.map(crearGlifo), matcap: crearMatcapAmbar() }), [])
  const { desde, hasta, y, z, piedras } = MUNDO.vado

  return (
    <group name="vado">
      {HABILIDADES.slice(0, piedras).map((habilidad, i) => {
        const id = `runa-${habilidad.id}`
        const x = desde + (i * (hasta - desde)) / (piedras - 1)
        return (
          <Interactivo key={habilidad.id} id={id} etiqueta={TEXTOS.interaccion.runa(habilidad.categoria)} pista={TEXTOS.interaccion.pistaRuna}
            position={[x, y + 0.02, z + 0.12 * Math.sin(i * 2.3)]} altura={1} realce={1.06} marca={false}
            alActivar={() => {
              tocarTono(NOTAS[i % NOTAS.length])
              useExperiencia.getState().abrirPanel({ tipo: 'runa', id: habilidad.id })
            }}>
            {({ encima }) => (
              <>
                <mesh geometry={geometrias[LOSAS[i % LOSAS.length]]} material={material} scale={ESCALA_LOSA} rotation-y={i * 1.9} receiveShadow name="losa" />
                <Glifo textura={recursos.glifos[i % GLIFOS.length]} matcap={recursos.matcap} encendido={visitados.includes(id)} encima={encima} indice={i} />
              </>
            )}
          </Interactivo>
        )
      })}
    </group>
  )
}
