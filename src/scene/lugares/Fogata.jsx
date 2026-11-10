import { useEffect, useMemo, useRef } from 'react'
import { Instance, Instances } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useExperiencia } from '../../store/useExperiencia'
import { cuantos } from '../../utils/calidad.js'
import { PALETA } from '../paleta'
import { useCalidad } from '../useCalidad'

// Fogata viva (HU-14): llamas que respiran, brasas que suben y una columna de humo que se ve desde el
// sendero y la cima (hito de orientación, 02 §7). La luz que la acompaña está en Ambiente (una sola
// luz puntual con distancia limitada). Todo se mueve con senos suaves: sin destellos ni saltos

const LLAMAS = [
  { posicion: [0, 0.45, 0], escala: [0.32, 0.9, 0.32], color: PALETA.llama, fase: 0 },
  { posicion: [0.16, 0.38, 0.08], escala: [0.2, 0.62, 0.2], color: PALETA.fuego, fase: 1.7 },
  { posicion: [-0.14, 0.36, -0.1], escala: [0.18, 0.55, 0.18], color: PALETA.fuego, fase: 3.1 },
]

const PUFFS = 12
const ALTURA_HUMO = 10

// Cada brasa con su propio inicio, velocidad y giro; semilla fija: el fuego es igual en cada visita
function crearSemillas(cantidad, semilla, abertura) {
  let s = semilla
  const azar = () => ((s = (s * 16807) % 2147483647) / 2147483647)
  return Array.from({ length: cantidad }, () => ({ inicio: azar(), velocidad: 0.5 + azar() * 0.6, giro: azar() * Math.PI * 2, radio: abertura * (0.3 + azar()) }))
}
const COLOR_BRASA = new THREE.Color(PALETA.fuego)

function Llama({ posicion, escala, color, fase }) {
  const llama = useRef()
  useFrame(({ clock }) => {
    if (useExperiencia.getState().ajustes.reducirMovimiento) return
    const s = clock.elapsedTime
    // Estira y encoge la llama con dos senos lentos; inclina un poco, como movida por el aire
    llama.current.scale.y = escala[1] * (1 + 0.16 * Math.sin(s * 3.3 + fase) + 0.07 * Math.sin(s * 7.1 + fase * 2))
    llama.current.rotation.z = 0.08 * Math.sin(s * 1.9 + fase)
  })
  return (
    <mesh ref={llama} position={posicion} scale={escala}>
      <coneGeometry args={[1, 1, 5]} />
      {/* Sin luz propia: se ve igual de brillante de día y de noche, como un fuego real */}
      <meshBasicMaterial color={color} toneMapped={false} />
    </mesh>
  )
}

// Brasas: puntos que suben en bucle desde un fuego y se apagan con la altura. Con mezcla aditiva un
// punto negro no suma nada: oscurecer su color de vértice equivale a desvanecerlo. Las usan la fogata
// y las antorchas de la cueva (con menos brasas, más bajas y más juntas)
export function Brasas({ cantidad = 26, altura = 3.2, abertura = 0.35, base = 0.4, tamano = 0.09, semilla = 31 }) {
  const puntos = useRef()
  const { geometria, semillas } = useMemo(() => {
    const nueva = new THREE.BufferGeometry()
    nueva.setAttribute('position', new THREE.BufferAttribute(new Float32Array(cantidad * 3), 3))
    nueva.setAttribute('color', new THREE.BufferAttribute(new Float32Array(cantidad * 3), 3))
    return { geometria: nueva, semillas: crearSemillas(cantidad, semilla, abertura) }
  }, [cantidad, semilla, abertura])

  // Calidad: se dibujan solo las primeras N brasas (drawRange), sin rehacer la geometría
  const { perfil } = useCalidad()
  useEffect(() => {
    puntos.current.geometry.setDrawRange(0, cuantos(cantidad, perfil.particulas))
  }, [perfil.particulas, cantidad])

  // Las posiciones se escriben a través del ref, como cualquier objeto de three que se anima
  useFrame(({ clock }) => {
    const reducir = useExperiencia.getState().ajustes.reducirMovimiento
    const s = reducir ? 0 : clock.elapsedTime
    const { position: posiciones, color: colores } = puntos.current.geometry.attributes
    semillas.forEach(({ inicio, velocidad, giro, radio }, i) => {
      const avance = (inicio + (s * velocidad) / altura) % 1 // 0 en la fogata, 1 arriba
      const angulo = giro + s * 0.8
      const abierto = radio * (1 + avance)
      posiciones.setXYZ(i, Math.cos(angulo) * abierto, base + avance * altura, Math.sin(angulo) * abierto)
      const brillo = (1 - avance) ** 1.5
      colores.setXYZ(i, COLOR_BRASA.r * brillo, COLOR_BRASA.g * brillo, COLOR_BRASA.b * brillo)
    })
    posiciones.needsUpdate = true
    colores.needsUpdate = true
  })

  return (
    <points ref={puntos} geometry={geometria}>
      <pointsMaterial vertexColors size={tamano} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
    </points>
  )
}

// Humo: bolas facetadas que suben en bucle, crecen y se encogen al final (sin transparencia por
// instancia, que el material estándar no tiene). Una columna de ~10 m: se ve desde la cima
function Humo() {
  const instancias = useRef([])
  useFrame(({ clock }) => {
    const reducir = useExperiencia.getState().ajustes.reducirMovimiento
    const s = reducir ? 0 : clock.elapsedTime
    instancias.current.forEach((puff, i) => {
      if (!puff) return
      const avance = (i / PUFFS + s * 0.06) % 1
      const tamano = Math.sin(avance * Math.PI) * (0.3 + avance * 1.1) // crece y al final se deshace
      // el viento lo inclina: se aleja de la fogata a medida que sube
      puff.position.set(Math.sin(avance * 5 + i) * 0.3 + avance * avance * 3, 1.2 + avance * ALTURA_HUMO, Math.cos(avance * 4 + i) * 0.3 + avance * 1.2)
      puff.scale.setScalar(Math.max(0.001, tamano))
    })
  })
  return (
    <Instances limit={PUFFS}>
      <icosahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color={PALETA.humo} flatShading roughness={1} transparent opacity={0.45} depthWrite={false} />
      {Array.from({ length: PUFFS }, (_, i) => <Instance key={i} ref={(puff) => { instancias.current[i] = puff }} />)}
    </Instances>
  )
}

export function FuegoVivo({ position }) {
  return (
    <group position={position} name="fuego-vivo">
      {LLAMAS.map((llama) => <Llama key={llama.fase} {...llama} />)}
      <Brasas />
      <Humo />
    </group>
  )
}
