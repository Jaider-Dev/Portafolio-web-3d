import { useEffect, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useExperiencia } from '../../store/useExperiencia'
import { activarInteractivo, masCercano } from '../interaccion/registro'
import { Explorador } from './Explorador'
import { CANDIDATO_ACTIVO, CANDIDATOS } from './candidatos'
import { ENTRADA, EXPLORADOR, FRENTE_DE_LA_CUEVA, VELOCIDAD, alturaAlCaminar, enLaBocaDeLaCueva, llegadaDe, lugarCercano, siguientePaso } from './movimiento'

// Modo explorador básico (19-nov, adelanto de HU-27 y HU-28): WASD o flechas para caminar en la
// dirección en la que mira la cámara, Shift para correr y E para usar lo que está al alcance. En
// pantallas táctiles, el joystick de ui/Joystick.jsx escribe en ENTRADA. Sin física (ver movimiento.js)
const TECLAS = {
  adelante: ['KeyW', 'ArrowUp'],
  atras: ['KeyS', 'ArrowDown'],
  izquierda: ['KeyA', 'ArrowLeft'],
  derecha: ['KeyD', 'ArrowRight'],
  correr: ['ShiftLeft', 'ShiftRight'],
}
const ALCANCE = 2.8 // metros hasta un interactivo para usarlo con E
const CADA = 0.2 // segundos entre búsquedas del interactivo cercano y del lugar en el que se está

const escribiendo = (e) => e.target instanceof HTMLElement && e.target.closest('input, textarea, select, [contenteditable]')

export function Caminante() {
  const modo = useExperiencia((s) => s.modo)
  return modo === 'explorador' ? <CaminanteActivo /> : null
}

function CaminanteActivo() {
  const grupo = useRef()
  const pulsadas = useRef(new Set())
  const espera = useRef(0)
  const alejado = useRef(true) // lejos de la boca de la cueva desde la última salida
  const [paso, setPaso] = useState('reposo') // 'reposo' | 'caminar' | 'correr'
  const camara = useThree((s) => s.camera)
  const adelante = useRef(new THREE.Vector3())
  const { ruta, sinColor, nombre } = CANDIDATOS[CANDIDATO_ACTIVO]

  useEffect(() => {
    const pulsa = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey || escribiendo(e)) return
      pulsadas.current.add(e.code)
      const { fase, cercano } = useExperiencia.getState()
      if (fase !== 'explorando') return
      if (e.code === 'KeyE' && !e.repeat && cercano) activarInteractivo(cercano)
      // Las flechas no desplazan la página ni mueven el foco mientras se camina
      if (e.code.startsWith('Arrow') && e.target === document.body) e.preventDefault()
    }
    const suelta = (e) => pulsadas.current.delete(e.code)
    const olvida = () => pulsadas.current.clear() // al cambiar de pestaña no queda una tecla "pegada"
    window.addEventListener('keydown', pulsa)
    window.addEventListener('keyup', suelta)
    window.addEventListener('blur', olvida)
    return () => {
      window.removeEventListener('keydown', pulsa)
      window.removeEventListener('keyup', suelta)
      window.removeEventListener('blur', olvida)
      useExperiencia.getState().setCercano(null)
    }
  }, [])

  // Al viajar con el menú, un menhir o un enlace, el explorador aparece en el punto de llegada del destino
  useEffect(() => useExperiencia.subscribe((s, antes) => {
    if (!s.destino || s.destino === antes.destino) return
    const llegada = llegadaDe(s.destino)
    if (!llegada) return
    Object.assign(EXPLORADOR, llegada)
    // De espaldas a la cámara del lugar, mirando hacia donde mira ella
    EXPLORADOR.giro = s.destino === 'cueva' ? Math.PI : EXPLORADOR.giro
  }), [])

  useFrame((_, delta) => {
    const g = grupo.current
    if (!g) return
    const estado = useExperiencia.getState()
    const dt = Math.min(delta, 0.1)
    const teclas = pulsadas.current
    const tiene = (accion) => TECLAS[accion].some((codigo) => teclas.has(codigo))

    let haciaAdelante = 0
    let haciaElLado = 0
    if (estado.fase === 'explorando' && !estado.menuViaje) {
      haciaAdelante = (tiene('adelante') ? 1 : 0) - (tiene('atras') ? 1 : 0) + ENTRADA.adelante
      haciaElLado = (tiene('derecha') ? 1 : 0) - (tiene('izquierda') ? 1 : 0) + ENTRADA.lado
    }
    const fuerza = Math.min(1, Math.hypot(haciaAdelante, haciaElLado))
    const moviendose = fuerza > 0.05

    if (moviendose && estado.zona === 'cueva') {
      // Dentro de la galería: al pedir moverse, el explorador sale por la boca y la cámara lo sigue
      const [x, z] = FRENTE_DE_LA_CUEVA
      Object.assign(EXPLORADOR, { x, z, y: alturaAlCaminar(x, z), giro: 0 })
      alejado.current = false
      estado.entrarZona(lugarCercano(x, z, Infinity))
    } else if (moviendose) {
      // Dirección según la cámara, en el plano: "adelante" es hacia donde mira
      camara.getWorldDirection(adelante.current)
      const ax = adelante.current.x
      const az = adelante.current.z
      const largo = Math.hypot(ax, az) || 1
      const [fx, fz] = [ax / largo, az / largo]
      const escala = fuerza / Math.hypot(haciaAdelante, haciaElLado)
      const dx = (fx * haciaAdelante - fz * haciaElLado) * escala
      const dz = (fz * haciaAdelante + fx * haciaElLado) * escala
      // Con el joystick se corre al llevarlo hasta el borde
      const corre = tiene('correr') || Math.hypot(ENTRADA.adelante, ENTRADA.lado) > 0.95
      const distancia = (corre ? VELOCIDAD.correr : VELOCIDAD.caminar) * dt
      const [x, z] = siguientePaso(EXPLORADOR.x, EXPLORADOR.z, dx * distancia, dz * distancia)
      EXPLORADOR.giro = Math.atan2(dx, dz)
      EXPLORADOR.x = x
      EXPLORADOR.z = z
      EXPLORADOR.y = THREE.MathUtils.damp(EXPLORADOR.y, alturaAlCaminar(x, z), 20, dt)
      // Se entra a la cueva caminando hacia su boca; tras salir hay que alejarse un poco antes de
      // volver a entrar (si no, seguir pulsando "adelante" la haría entrar otra vez)
      if (z > FRENTE_DE_LA_CUEVA[1] + 0.5) alejado.current = true
      if (alejado.current && enLaBocaDeLaCueva(x, z) && dz < 0) estado.viajar('cueva')
      const siguiente = corre ? 'correr' : 'caminar'
      if (paso !== siguiente) setPaso(siguiente)
    } else if (paso !== 'reposo') {
      setPaso('reposo')
    }

    // El modelo mira hacia +Z: el giro es el ángulo de la dirección de avance
    g.position.set(EXPLORADOR.x, EXPLORADOR.y, EXPLORADOR.z)
    const diferencia = Math.atan2(Math.sin(EXPLORADOR.giro - g.rotation.y), Math.cos(EXPLORADOR.giro - g.rotation.y))
    g.rotation.y += estado.ajustes.reducirMovimiento ? diferencia : diferencia * Math.min(1, dt * 12)

    // Cada poco: qué interactivo está al alcance y en qué lugar se está (el que se descubre al llegar a pie)
    espera.current -= dt
    if (espera.current > 0 || estado.zona === 'cueva') return
    espera.current = CADA
    estado.setCercano(estado.fase === 'explorando' ? masCercano(EXPLORADOR.x, EXPLORADOR.y + 0.5, EXPLORADOR.z, ALCANCE) : null)
    const lugar = lugarCercano(EXPLORADOR.x, EXPLORADOR.z)
    if (lugar && estado.fase === 'explorando' && lugar !== estado.zona) {
      estado.entrarZona(lugar)
      estado.descubrir(lugar)
    }
  })

  // Sin animación de caminar todavía (el candidato 3 solo trae "reposo"): si el modelo la tiene, se usa
  return (
    <group ref={grupo} name="explorador-caminante">
      <Explorador ruta={ruta} sinColor={sinColor} name={nombre} animacion={paso} />
    </group>
  )
}
