import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { MUNDO } from '../../data/mundo.js'
import { useExperiencia } from '../../store/useExperiencia'
import { alturaDelTerreno } from '../isla/terreno.js'
import { PALETA } from '../paleta'
import { useCalidad } from '../useCalidad'
import { ANTESALA, ANTORCHAS, GALERIA, PUERTA, ruido } from './galeria'
import { Piedras } from '../naturaleza/Piedras'
import { useMaterialPBR, uvPorCaja } from '../materiales'

// Cueva de los murales (02 Z5, 06 §11): fachada de roca con una puerta en arco detrás de la cascada,
// una antesala corta y una galería en cúpula con antorchas, cristales y estalactitas. Preparada para
// entrar caminando (sprint 4): el suelo es llano y la única abertura es la puerta tras la cortina.
// Desde dentro, por la puerta, se ve caer la cascada (su malla es de doble cara)

const FACHADA = { x: [0.8, 7.2], z: -17.85 }


// ¿El punto (x, y) cae dentro del hueco de la puerta? Rectángulo con remate de medio óvalo
function dentroDeLaPuerta(x, y) {
  const mitad = PUERTA.ancho / 2
  const dx = Math.abs(x - PUERTA.x)
  if (dx >= mitad) return false
  const arranque = PUERTA.alto - mitad * 0.75
  return y < arranque + 0.75 * Math.sqrt(mitad * mitad - dx * dx)
}

// Malla facetada a partir de quads (cada quad, dos triángulos con sus propios vértices)
function deQuads(quads) {
  const posiciones = []
  for (const [a, b, c, d] of quads) posiciones.push(...a, ...b, ...c, ...b, ...d, ...c)
  const geometria = new THREE.BufferGeometry()
  geometria.setAttribute('position', new THREE.Float32BufferAttribute(posiciones, 3))
  geometria.computeVertexNormals()
  return geometria
}

// Fachada: pared de roca que tapa la ranura del terreno, del suelo a la cima de la pared, con la
// puerta abierta abajo. Es algo más ancha que la ranura para cubrir sus bordes irregulares
function crearFachada() {
  const columnas = 16
  const filas = 26
  const punto = (i, j) => {
    const x = FACHADA.x[0] + ((FACHADA.x[1] - FACHADA.x[0]) * i) / columnas
    const cima = alturaDelTerreno(x, -18.45) + 0.3
    const y = (cima * j) / filas
    // en los costados se mete hacia la pared del terreno para fundirse con ella
    const borde = Math.min(i, columnas - i) / 3
    const z = FACHADA.z + ruido(x, y) * 0.22 - (borde < 1 ? (1 - borde) * 0.35 : 0)
    return [x, y, z]
  }
  const quads = []
  for (let i = 0; i < columnas; i++) {
    for (let j = 0; j < filas; j++) {
      const a = punto(i, j)
      const d = punto(i + 1, j + 1)
      if (dentroDeLaPuerta((a[0] + d[0]) / 2, (a[1] + d[1]) / 2)) continue
      quads.push([a, punto(i + 1, j), punto(i, j + 1), d])
    }
  }
  return deQuads(quads)
}

// Antesala: túnel en arco de la fachada a la galería
function crearAntesala() {
  const lados = 12
  const anillos = [ANTESALA.z[0], (ANTESALA.z[0] + ANTESALA.z[1]) / 2, ANTESALA.z[1]]
  const punto = (k, z) => {
    const a = (Math.PI * k) / lados
    const r = 1 + 0.06 * ruido(k, z)
    return [PUERTA.x + Math.cos(a) * (PUERTA.ancho / 2 + 0.1) * r, 0.02 + Math.sin(a) * (PUERTA.alto + 0.05) * r, z]
  }
  const quads = []
  for (let n = 0; n < anillos.length - 1; n++) {
    for (let k = 0; k < lados; k++) quads.push([punto(k, anillos[n]), punto(k + 1, anillos[n]), punto(k, anillos[n + 1]), punto(k + 1, anillos[n + 1])])
  }
  return deQuads(quads)
}


// Rocas que enmarcan la puerta y tapan los bordes escalonados del hueco
const ROCAS_PORTAL = [
  [2.35, 0.5, 0.75], [2.25, 1.5, 0.7], [2.45, 2.4, 0.65], [3.1, 3.05, 0.6], [4, 3.3, 0.7],
  [4.9, 3.05, 0.6], [5.55, 2.4, 0.65], [5.75, 1.5, 0.7], [5.65, 0.5, 0.75],
]

// Luces puntuales reales para las antorchas: ≤ 5 en total con la fogata y el farol (06 §19.1)
const LUCES_ANTORCHA = { alta: 4, media: 1, baja: 0 }

// Las N luces reales se reparten cada 0,25 s entre las antorchas más cercanas a la cámara (06 §11.2):
// al girar o avanzar por la galería, las antorchas "revelan" los murales que tienes cerca. Una luz que
// cambia de antorcha vuelve a encenderse desde 0, sin saltos. Todas se apagan lejos de la cueva
const CENTRO = new THREE.Vector3(...GALERIA.centro)
function LucesDeAntorchas({ cantidad }) {
  const luces = useRef([])
  const asignadas = useRef([])
  const espera = useRef(0)
  const punto = useMemo(() => new THREE.Vector3(), [])

  useFrame(({ clock, camera }, delta) => {
    espera.current -= delta
    if (espera.current <= 0) {
      espera.current = 0.25
      const cercanas = ANTORCHAS
        .map(({ luz, indice }) => [indice, camera.position.distanceToSquared(punto.set(...luz))])
        .sort((a, b) => a[1] - b[1])
        .slice(0, cantidad)
        .map(([indice]) => indice)
      // las que ya estaban encendidas conservan su luz; las nuevas toman las luces libres
      const libres = luces.current.map((_, k) => k).filter((k) => !cercanas.includes(asignadas.current[k]))
      cercanas.filter((indice) => !asignadas.current.includes(indice)).forEach((indice, n) => {
        const k = libres[n]
        if (k === undefined) return
        asignadas.current[k] = indice
        luces.current[k].position.set(...ANTORCHAS[indice].luz)
        luces.current[k].intensity = 0
      })
    }
    // Se encienden al acercarse a la cueva: nada a 14 m del centro, plena luz a 6 m
    const cerca = THREE.MathUtils.smoothstep(14 - camera.position.distanceTo(CENTRO), 0, 8)
    const quieto = useExperiencia.getState().ajustes.reducirMovimiento
    luces.current.forEach((luz, k) => {
      const s = clock.elapsedTime + (asignadas.current[k] ?? k) * 1.7
      // fuego vivo: dos senos rápidos desfasados, sin destellos (≤ 3 cambios bruscos por segundo)
      const objetivo = 14 * cerca * (quieto ? 1 : 1 + 0.12 * Math.sin(s * 7) + 0.06 * Math.sin(s * 13.1))
      luz.intensity = THREE.MathUtils.damp(luz.intensity, objetivo, 4, delta)
    })
  })

  return Array.from({ length: cantidad }, (_, k) => (
    <pointLight key={k} ref={(luz) => { luces.current[k] = luz }} color={PALETA.fuego} intensity={0} distance={9} decay={1.6} />
  ))
}

// Rocas del kit de Blender alrededor de la boca (antes, dodecaedros)
const PIEDRAS_PORTAL = ROCAS_PORTAL.map(([x, y, r]) => ({ posicion: [x, y, FACHADA.z + 0.25], escala: [r, r, r], rotacion: [x, y, x * y] }))

// Carga diferida por zonas (HT-12, 06 §7 y §11.1): la galería, sus antorchas, cristales y murales (y el
// video del destacado, HU-23) viven en CuevaInterior.jsx, un chunk aparte que no está en la carga
// inicial. Se monta al acercar la cámara a la cueva o al viajar a ella; después de la intro se
// descarga en segundo plano (sin montarlo) para que al entrar no haya espera. Tiene su propio
// <Suspense>: mientras llega, el resto de la isla sigue funcionando
const cargarInterior = () => import('./CuevaInterior')
const CuevaInterior = lazy(cargarInterior)
const DISTANCIA_CARGA = 30 // metros al centro de la galería: algo antes de verse por la puerta

function InteriorDiferido() {
  const [montado, setMontado] = useState(false)
  const fase = useExperiencia((s) => s.fase)
  const haciaLaCueva = useExperiencia((s) => s.destino === 'cueva' || s.zona === 'cueva')

  // Precarga en segundo plano al terminar la intro, cuando el navegador esté libre
  useEffect(() => {
    if (fase !== 'explorando') return undefined
    const pedir = window.requestIdleCallback ?? ((f) => setTimeout(f, 1500))
    const cancelar = window.cancelIdleCallback ?? clearTimeout
    const id = pedir(() => cargarInterior())
    return () => cancelar(id)
  }, [fase])

  useFrame(({ camera }) => {
    if (!montado && camera.position.distanceTo(CENTRO) < DISTANCIA_CARGA) setMontado(true)
  })

  return (montado || haciaLaCueva)
    ? <Suspense fallback={<Tapa />}><CuevaInterior /></Suspense>
    : <Tapa />
}

// Tapa provisional: el fondo de la antesala, oscuro, hasta que el interior está listo
function Tapa() {
  return (
    <mesh position={[PUERTA.x, PUERTA.alto / 2, ANTESALA.z[1] + 0.05]} name="cueva-tapa">
      <planeGeometry args={[PUERTA.ancho + 0.4, PUERTA.alto + 0.4]} />
      <meshBasicMaterial color={PALETA.sombra} />
    </mesh>
  )
}

export function Cueva() {
  const geometrias = useMemo(() => ({ fachada: uvPorCaja(crearFachada()), antesala: uvPorCaja(crearAntesala()) }), [])
  const roca = useMaterialPBR('roca')
  const { nivel } = useCalidad()
  const luces = LUCES_ANTORCHA[nivel] ?? LUCES_ANTORCHA.alta

  return (
    <group name="cueva">
      <mesh geometry={geometrias.fachada} castShadow receiveShadow name="cueva-fachada">
        <meshStandardMaterial {...roca} color={PALETA.roca} flatShading roughness={1} side={THREE.DoubleSide} />
      </mesh>
      <Piedras nombre="cueva-portal" piedras={PIEDRAS_PORTAL} color={PALETA.roca} />
      <mesh geometry={geometrias.antesala} receiveShadow name="cueva-antesala">
        <meshStandardMaterial {...roca} color={PALETA.roca} flatShading roughness={1} side={THREE.DoubleSide} />
      </mesh>
      {/* Interior en su propio chunk (HT-12): se descarga al acercarse a la cueva o al viajar a ella.
          Mientras tanto, una tapa oscura cierra el fondo de la antesala */}
      <InteriorDiferido />
      {/* key por cantidad: si cambia la calidad se rehacen las luces (y se recompilan los shaders) */}
      <LucesDeAntorchas key={luces} cantidad={luces} />
      {/* Repisa de piedras que se pierde tras la cortina (02 Z4) */}
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh castShadow key={i} position={[MUNDO.repisa.desde + i, MUNDO.repisa.y + 0.08, MUNDO.repisa.z]}>
          <boxGeometry args={[0.8, 0.16, 0.7]} />
          <meshStandardMaterial color={PALETA.piedra} flatShading />
        </mesh>
      ))}
    </group>
  )
}
