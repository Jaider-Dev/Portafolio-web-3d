import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { MUNDO } from '../../data/mundo.js'
import { useExperiencia } from '../../store/useExperiencia'
import { useHora } from '../../store/hora'
import { AMBIENTES, DURACION_CAMBIO, PALETA } from '../paleta'

const RADIO_CIELO = 450 // la bóveda sigue a la cámara: siempre dentro de su far (600)
const { manana: M, noche: N } = AMBIENTES
const color = (hex) => new THREE.Color(hex)
const mezcla = (a, b, t) => a + (b - a) * t
const progresoDe = (hora) => (hora === 'noche' ? 1 : 0)

// Cielo en degradado: cénit → horizonte → "mar" de nubes bajo la isla. Shader propio en lugar de
// <Sky> de Drei porque así cada hora usa exactamente los colores elegidos y se interpolan sin saltos
const cieloVertex = /* glsl */`
  varying vec3 vDireccion;
  void main() {
    // Direccion vista desde la camara (no desde el centro): el horizonte queda a la altura de los ojos
    vDireccion = (modelMatrix * vec4(position, 1.0)).xyz - cameraPosition;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`
const cieloFragment = /* glsl */`
  uniform vec3 cenit;
  uniform vec3 horizonte;
  uniform vec3 bajo;
  varying vec3 vDireccion;
  void main() {
    float h = normalize(vDireccion).y; // normalizar por pixel: sin facetas en el horizonte (solo ASCII dentro de GLSL)
    vec3 c = h > 0.0 ? mix(horizonte, cenit, pow(h, 0.55)) : mix(horizonte, bajo, pow(-h, 0.45));
    gl_FragColor = vec4(c, 1.0);
    #include <colorspace_fragment>
  }`

// Estrellas: puntos en la bóveda, repartidos con una semilla fija para que no cambien entre visitas
function crearEstrellas(cantidad = 1400) {
  let semilla = 7
  const azar = () => ((semilla = (semilla * 16807) % 2147483647) / 2147483647)
  const posiciones = new Float32Array(cantidad * 3)
  for (let i = 0; i < cantidad; i++) {
    const y = 0.04 + azar() * 0.96 // solo sobre el horizonte
    const angulo = azar() * Math.PI * 2
    const r = Math.sqrt(1 - y * y)
    posiciones.set([Math.cos(angulo) * r, y, Math.sin(angulo) * r].map((v) => v * (RADIO_CIELO - 10)), i * 3)
  }
  const geometria = new THREE.BufferGeometry()
  geometria.setAttribute('position', new THREE.BufferAttribute(posiciones, 3))
  return geometria
}

// Punto redondo generado en un canvas: sin descargar texturas
function crearPunto() {
  const lienzo = document.createElement('canvas')
  lienzo.width = lienzo.height = 32
  const ctx = lienzo.getContext('2d')
  const degradado = ctx.createRadialGradient(16, 16, 0, 16, 16, 16)
  degradado.addColorStop(0, '#fff')
  degradado.addColorStop(0.4, '#fff')
  degradado.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = degradado
  ctx.fillRect(0, 0, 32, 32)
  return new THREE.CanvasTexture(lienzo)
}

const direccion = (posicion) => new THREE.Vector3(...posicion).normalize().multiplyScalar(RADIO_CIELO - 20)

// Cielo, astros, estrellas, luces, sombras y niebla de la hora del día (D12, HU-37, HU-13)
export function Ambiente() {
  const progreso = useRef(progresoDe(useHora.getState().hora)) // 0 = mañana, 1 = noche
  const sol = useRef()
  const relleno = useRef()
  const fogata = useRef()
  const niebla = useRef()
  const discoSol = useRef()
  const discoLuna = useRef()
  const estrellas = useRef()
  const boveda = useRef()
  const [objetivo] = useState(() => new THREE.Object3D())
  // Calidad "baja" apaga las sombras; "media" usa un mapa de 1024 y el resto, 2048 (HU-17 la ajustará)
  const calidad = useExperiencia((s) => s.ajustes.calidad)
  const resolucion = calidad === 'media' ? 1024 : 2048

  const datos = useMemo(() => ({
    materialCielo: new THREE.ShaderMaterial({
      uniforms: { cenit: { value: color(M.cenit) }, horizonte: { value: color(M.horizonte) }, bajo: { value: color(M.bajo) } },
      vertexShader: cieloVertex,
      fragmentShader: cieloFragment,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    }),
    estrellas: crearEstrellas(),
    punto: crearPunto(),
    posicionSol: direccion(M.luz.posicion),
    posicionLuna: direccion(N.luz.posicion),
    colores: Object.fromEntries(['cenit', 'horizonte', 'bajo'].map((k) => [k, [color(M[k]), color(N[k])]])),
    luz: [color(M.luz.color), color(N.luz.color)],
    relleno: [color(M.cielo.color), color(N.cielo.color)],
    suelo: [color(M.cielo.suelo), color(N.cielo.suelo)],
    posicion: [new THREE.Vector3(...M.luz.posicion), new THREE.Vector3(...N.luz.posicion)],
  }), [])

  useFrame(({ clock, camera }, delta) => {
    boveda.current.position.copy(camera.position)
    // Avanza hacia la hora elegida; con "reducir movimiento" salta directamente
    const meta = progresoDe(useHora.getState().hora)
    const inmediato = useExperiencia.getState().ajustes.reducirMovimiento
    const paso = inmediato ? 1 : Math.min(delta, 0.1) / DURACION_CAMBIO
    const actual = progreso.current
    progreso.current = actual < meta ? Math.min(meta, actual + paso) : Math.max(meta, actual - paso)
    const t = THREE.MathUtils.smoothstep(progreso.current, 0, 1)

    const { uniforms } = datos.materialCielo
    for (const k of ['cenit', 'horizonte', 'bajo']) uniforms[k].value.lerpColors(...datos.colores[k], t)
    niebla.current.color.copy(uniforms.horizonte.value)

    sol.current.color.lerpColors(...datos.luz, t)
    sol.current.intensity = mezcla(M.luz.intensidad, N.luz.intensidad, t)
    sol.current.position.lerpVectors(...datos.posicion, t)
    relleno.current.color.lerpColors(...datos.relleno, t)
    relleno.current.groundColor.lerpColors(...datos.suelo, t)
    relleno.current.intensity = mezcla(M.cielo.intensidad, N.cielo.intensidad, t)

    // La fogata "respira": dos senos lentos desfasados, sin parpadeo brusco (05 §7)
    const s = clock.elapsedTime
    const respiracion = inmediato ? 1 : 1 + 0.12 * Math.sin(s * 3.1) + 0.06 * Math.sin(s * 7.3 + 1.7)
    fogata.current.intensity = mezcla(M.fogata, N.fogata, t) * respiracion

    discoSol.current.material.opacity = 1 - t
    discoLuna.current.material.opacity = t
    estrellas.current.material.opacity = mezcla(M.estrellas, N.estrellas, t) * 0.9
  })

  const [xF, , zF] = MUNDO.fogata
  return (
    <>
      <fog ref={niebla} attach="fog" args={[M.horizonte, 160, 460]} />
      {/* La bóveda viaja con la cámara (como un skybox): nunca queda más allá del far y no hay paralaje */}
      <group ref={boveda}>
        <mesh material={datos.materialCielo} renderOrder={-1}>
          <sphereGeometry args={[RADIO_CIELO, 48, 32]} />
        </mesh>
        <points ref={estrellas} geometry={datos.estrellas}>
          <pointsMaterial size={2.4} sizeAttenuation={false} color="#ffffff" alphaMap={datos.punto} transparent depthWrite={false} fog={false} toneMapped={false} />
        </points>
        <mesh ref={discoSol} position={datos.posicionSol} onUpdate={(m) => m.lookAt(0, 0, 0)}>
          <circleGeometry args={[16, 24]} />
          <meshBasicMaterial color={M.astro} transparent depthWrite={false} fog={false} toneMapped={false} />
        </mesh>
        <mesh ref={discoLuna} position={datos.posicionLuna} onUpdate={(m) => m.lookAt(0, 0, 0)}>
          <circleGeometry args={[11, 24]} />
          <meshBasicMaterial color={N.astro} transparent depthWrite={false} fog={false} toneMapped={false} />
        </mesh>
      </group>
      <hemisphereLight ref={relleno} args={[M.cielo.color, M.cielo.suelo, M.cielo.intensidad]} />
      {/* Sol de día y luna de noche: la única luz con sombras dinámicas (06 §10, HU-13). Target explícito
          en la escena (<primitive>): así su matriz se actualiza sin depender de un helper */}
      <primitive object={objetivo} position={[0, 0, 0]} />
      <directionalLight
        ref={sol}
        name="luz-principal"
        target={objetivo}
        position={M.luz.posicion}
        color={M.luz.color}
        intensity={M.luz.intensidad}
        castShadow={calidad !== 'baja'}
        shadow-mapSize={[resolucion, resolucion]}
        shadow-camera-left={-34}
        shadow-camera-right={34}
        shadow-camera-top={34}
        shadow-camera-bottom={-34}
        shadow-camera-near={10}
        shadow-camera-far={130}
        shadow-bias={-0.0005}
        shadow-normalBias={0.04}
      />
      {/* Sin sombras: una luz puntual con sombras renderiza la escena 6 veces más */}
      <pointLight ref={fogata} position={[xF, 1.3, zF]} color={PALETA.fuego} intensity={M.fogata} distance={18} decay={2} />
    </>
  )
}
