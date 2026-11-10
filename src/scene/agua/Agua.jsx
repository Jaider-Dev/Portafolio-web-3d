import { useMemo, useRef } from 'react'
import { Sparkles } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { ARROYO, CAUCE, MUNDO } from '../../data/mundo.js'
import { ESTANQUE, MARGEN_ORILLA, medioAnchoDelRio } from '../isla/terreno.js'
import { useExperiencia } from '../../store/useExperiencia'
import { useHora } from '../../store/hora'
import { PALETA } from '../paleta'
import { cuantos } from '../../utils/calidad.js'
import { useCalidad } from '../useCalidad'
import { crearDegradado, crearEspumaRadial, crearTexturaDeFlujo } from './texturas'

const ARRIBA = new THREE.Vector3(0, 1, 0)
const GRAVEDAD = 4.9 // la mitad de la real: la caída se lee mejor y sigue acelerando

// Cinta que sigue una curva (06 §9.1). Por defecto la coordenada V va de 0 a 1 a lo largo del agua.
// Con `caida`, V es el tiempo (en segundos) que tarda el agua en llegar a cada punto, con
// v = √(v0² + 2·g·h): si la textura avanza a ritmo constante en V, en la cascada las vetas arrancan a
// la velocidad de la corriente y se estiran al acelerar, como el agua que cae
function crearCinta(puntos, { ancho, lateral, caida, segmentos = 80 }) {
  const curva = new THREE.CatmullRomCurve3(puntos.map((p) => new THREE.Vector3(...p)))
  const longitud = curva.getLength()
  const posiciones = []
  const uvs = []
  const indices = []
  const lado = new THREE.Vector3()
  const anterior = new THREE.Vector3()
  const alturaInicial = curva.getPointAt(0).y
  let tiempo = 0
  for (let i = 0; i <= segmentos; i++) {
    const t = i / segmentos
    const punto = curva.getPointAt(t) // por longitud de arco: el agua avanza a ritmo constante
    const tangente = curva.getTangentAt(t)
    if (lateral) lado.copy(lateral(t, tangente))
    else lado.crossVectors(tangente, ARRIBA)
    lado.normalize().multiplyScalar(ancho(punto, t) / 2)
    posiciones.push(punto.x - lado.x, punto.y - lado.y, punto.z - lado.z, punto.x + lado.x, punto.y + lado.y, punto.z + lado.z)
    if (caida && i > 0) {
      const velocidad = Math.sqrt(caida.v0 ** 2 + 2 * GRAVEDAD * Math.max(0, alturaInicial - punto.y))
      tiempo += punto.distanceTo(anterior) / velocidad
    }
    anterior.copy(punto)
    const v = caida ? tiempo : t
    uvs.push(0, v, 1, v)
    if (i < segmentos) {
      const a = i * 2
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
    }
  }
  const geometria = new THREE.BufferGeometry()
  geometria.setAttribute('position', new THREE.Float32BufferAttribute(posiciones, 3))
  geometria.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometria.setIndex(indices)
  geometria.computeVertexNormals()
  return { geometria, curva, longitud, duracion: tiempo }
}

// Ancho de 02 · Mapa §5: 4 m aguas arriba, 3,5 m en el vado, 4,5 m cerca del borde
// El agua usa el mismo ancho que el cauce del terreno más un margen: su orilla queda bajo la tierra
const anchoDelRio = ({ z }) => 2 * (medioAnchoDelRio(z) + MARGEN_ORILLA)
const ANCHO_ARROYO = 2 // el cauce del arroyo sube entre 0,6 y 1,6 m del eje (terreno.js)
const SALIDA_DEL_BORDE = [-4.8, -0.3, 24]

const METROS_POR_REPETICION = 5 // una "ola" de la textura cada 5 m: misma densidad en todo el cauce
// Velocidad en metros por segundo a lo largo del agua; en las cascadas es la de entrada (luego aceleran)
const VELOCIDAD = { rio: 1.4, arroyo: 2.2, poza: 0.35 }

// Cascada alta: continúa el arroyo desde su final, se curva sobre el labio, cae delante de la pared
// (cortina de la cueva, 06 §9.3) y entra en la poza
const RECORRIDO_ALTA = [ARROYO[1], [3.8, 11.75, -16.7], [3.75, 10.5, -16.55], [3.7, 6, -16.45], [3.6, 1.5, -16.3], [3.4, 0, -15.6], [3.2, -0.22, -14.5]]
// Cascada baja: continúa el río desde su final, se curva sobre el borde y cae hacia las nubes
const RECORRIDO_BAJA = [SALIDA_DEL_BORDE, [-4.95, -0.9, 24.5], [-5.05, -3, 25.1], [-5.2, -12, 25.9], [-5.4, -26, 26.6]]
const IMPACTO_ALTA = [3.25, -0.24, -14.7]

// Lateral que gira suavemente desde el de la corriente que llega hasta `final` en el primer tramo:
// así el borde de la cascada coincide con el de su arroyo o río y después cae de frente
const lateralQueGira = (inicial, final, tramo = 0.25) => (t) =>
  new THREE.Vector3().lerpVectors(inicial, final, THREE.MathUtils.smoothstep(t, 0, tramo))

// Poza de contorno irregular (no un círculo perfecto), en abanico desde el centro. Las UV van de 0 a 1
// sobre su diámetro, como las de un círculo, para que la textura se repita igual
function crearPoza(radio, lados = 40) {
  const posiciones = [0, 0, 0]
  const uvs = [0.5, 0.5]
  const indices = []
  for (let i = 0; i < lados; i++) {
    const a = (i / lados) * Math.PI * 2
    const r = radio * (1 + 0.07 * Math.sin(a * 3 + 0.6) + 0.04 * Math.sin(a * 7 + 2.1))
    posiciones.push(Math.cos(a) * r, Math.sin(a) * r, 0)
    uvs.push(0.5 + (Math.cos(a) * r) / (2 * radio), 0.5 + (Math.sin(a) * r) / (2 * radio))
    indices.push(0, 1 + i, 1 + ((i + 1) % lados))
  }
  const geometria = new THREE.BufferGeometry()
  geometria.setAttribute('position', new THREE.Float32BufferAttribute(posiciones, 3))
  geometria.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometria.setIndex(indices)
  geometria.computeVertexNormals()
  return geometria
}

function crearAgua() {
  const conOrillas = crearTexturaDeFlujo({ orillas: true })
  const sinOrillas = crearTexturaDeFlujo({ orillas: false })
  const porMetros = (base, largo) => {
    const t = base.clone()
    t.repeat.set(1, largo / METROS_POR_REPETICION)
    return t
  }
  // En una cascada V son segundos: una repetición cada METROS_POR_REPETICION / v0 segundos hace que,
  // en la unión, las vetas tengan la misma separación que en la corriente que llega
  const porTiempo = (base, v0) => {
    const t = base.clone()
    t.repeat.set(1, v0 / METROS_POR_REPETICION)
    return t
  }

  const rio = crearCinta([...CAUCE, SALIDA_DEL_BORDE], { ancho: anchoDelRio })
  const arroyo = crearCinta(ARROYO, { ancho: () => ANCHO_ARROYO, segmentos: 12 })
  const lateralFinal = (cinta) => new THREE.Vector3().crossVectors(cinta.curva.getTangentAt(1), ARRIBA).normalize()

  const alta = crearCinta(RECORRIDO_ALTA, {
    // del ancho del arroyo a 3 m en la caída y 3,2 m al entrar en la poza
    ancho: (_, t) => (t < 0.25 ? THREE.MathUtils.lerp(ANCHO_ARROYO, 3, t / 0.25) : THREE.MathUtils.lerp(3, 3.2, (t - 0.25) / 0.75)),
    lateral: lateralQueGira(lateralFinal(arroyo), new THREE.Vector3(-1, 0, 0)),
    caida: { v0: VELOCIDAD.arroyo },
  })
  const salidaRio = lateralFinal(rio)
  const baja = crearCinta(RECORRIDO_BAJA, {
    ancho: () => anchoDelRio({ z: SALIDA_DEL_BORDE[2] }), // el mismo ancho con el que llega el río
    lateral: () => salidaRio, // sigue de frente al río: cae como una lámina
    caida: { v0: VELOCIDAD.rio },
  })

  // alphaMap: V de la cascada baja va de 0 (borde) a su duración en segundos; se escala a 0–1
  const desvanecer = crearDegradado()
  desvanecer.repeat.set(1, 1 / baja.duracion)

  return {
    rio: { ...rio, mapa: porMetros(conOrillas, rio.longitud), avance: VELOCIDAD.rio / METROS_POR_REPETICION },
    arroyo: { ...arroyo, mapa: porMetros(conOrillas, arroyo.longitud), avance: VELOCIDAD.arroyo / METROS_POR_REPETICION },
    poza: { mapa: porMetros(sinOrillas, MUNDO.poza.radio * 2), avance: VELOCIDAD.poza / METROS_POR_REPETICION },
    alta: { ...alta, mapa: porTiempo(conOrillas, VELOCIDAD.arroyo) },
    baja: { ...baja, mapa: porTiempo(conOrillas, VELOCIDAD.rio) },
    desvanecer,
    espuma: crearEspumaRadial(),
  }
}

// Todas las superficies avanzan en la dirección en que crece su V: offset negativo.
// offset por segundo = repeticiones por segundo; × delta, la velocidad no depende de los FPS
function useCorrientes() {
  const agua = useMemo(() => crearAgua(), [])
  useFrame((_, delta) => {
    const d = Math.min(delta, 0.1) // tras una pestaña en segundo plano no da un salto
    const { rio, arroyo, poza, alta, baja } = agua
    for (const corriente of [rio, arroyo, poza]) corriente.mapa.offset.y -= corriente.avance * d
    // en las cascadas V son segundos: avanzan `repeat.y` unidades de textura por segundo
    for (const caida of [alta, baja]) caida.mapa.offset.y -= caida.mapa.repeat.y * d
  })
  return agua
}

function MaterialDeAgua({ mapa, alphaMap, opacidad = 0.88, escribeProfundidad = false }) {
  return (
    <meshStandardMaterial
      map={mapa}
      alphaMap={alphaMap}
      roughness={0.25}
      transparent
      opacity={opacidad}
      side={THREE.DoubleSide}
      depthWrite={escribeProfundidad}
    />
  )
}

// Bruma y espuma de partículas en la base de las cascadas (05 §8). De noche, más tenue
function Bruma({ count = 40, speed = 0.5, ...props }) {
  const noche = useHora((s) => s.hora === 'noche')
  const reducir = useExperiencia((s) => s.ajustes.reducirMovimiento)
  const { perfil } = useCalidad() // menos partículas en calidad media y baja (06 §19.1)
  return (
    <Sparkles
      count={cuantos(count, perfil.particulas)}
      size={6}
      speed={reducir ? 0 : speed}
      opacity={noche ? 0.35 : 0.8}
      color={PALETA.espuma}
      noise={1}
      {...props}
    />
  )
}

// Espuma donde la cascada alta golpea la poza: un disco con borde difuso que "late" despacio
function EspumaDeImpacto({ textura }) {
  const disco = useRef()
  useFrame(({ clock }) => {
    if (useExperiencia.getState().ajustes.reducirMovimiento) return
    disco.current.scale.setScalar(1 + 0.08 * Math.sin(clock.elapsedTime * 2.4))
  })
  return (
    <mesh ref={disco} position={IMPACTO_ALTA} rotation-x={-Math.PI / 2} name="espuma-impacto">
      <circleGeometry args={[1.9, 24]} />
      <meshStandardMaterial color={PALETA.espuma} alphaMap={textura} transparent opacity={0.85} depthWrite={false} roughness={0.6} />
    </mesh>
  )
}

export function Agua() {
  const { rio, arroyo, poza, alta, baja, desvanecer, espuma } = useCorrientes()
  const { centro } = MUNDO.poza
  const pozaOrganica = useMemo(() => crearPoza(MUNDO.poza.radio), [])
  const estanqueOrganico = useMemo(() => crearPoza(ESTANQUE.radio, 24), [])

  return (
    <group name="agua">
      <mesh geometry={rio.geometria} receiveShadow name="rio">
        <MaterialDeAgua mapa={rio.mapa} />
      </mesh>
      <mesh geometry={arroyo.geometria} receiveShadow name="arroyo">
        <MaterialDeAgua mapa={arroyo.mapa} />
      </mesh>
      {/* Poza poco profunda: más transparente y casi quieta (se puede cruzar caminando, sprint 4) */}
      {/* La poza se dibuja antes que el río (renderOrder), 1 cm más alta y escribiendo profundidad: donde se
          solapan, el río queda detrás y no se suman dos transparencias (la unión no se oscurece) */}
      <mesh position={[centro[0], centro[1] + 0.01, centro[2]]} rotation-x={-Math.PI / 2} receiveShadow name="poza" renderOrder={-1}>
        <primitive object={pozaOrganica} attach="geometry" />
        <MaterialDeAgua mapa={poza.mapa} escribeProfundidad />
      </mesh>
      <mesh geometry={alta.geometria} name="cascada-alta">
        <MaterialDeAgua mapa={alta.mapa} />
      </mesh>
      <EspumaDeImpacto textura={espuma} />
      <Bruma position={[IMPACTO_ALTA[0], 0.6, IMPACTO_ALTA[2] - 0.3]} scale={[3.6, 1.6, 2.4]} />
      <mesh geometry={baja.geometria} name="cascada-baja">
        <MaterialDeAgua mapa={baja.mapa} alphaMap={desvanecer} />
      </mesh>
      <Bruma position={[SALIDA_DEL_BORDE[0], -0.8, SALIDA_DEL_BORDE[2] + 0.7]} scale={[5, 1.5, 2]} count={30} />
      {/* Estanque del manantial: el agua brota aquí (burbujas) y de aquí sale el arroyo hacia la cascada */}
      <mesh position={ESTANQUE.centro} rotation-x={-Math.PI / 2} receiveShadow name="estanque">
        <primitive object={estanqueOrganico} attach="geometry" />
        <MaterialDeAgua mapa={poza.mapa} />
      </mesh>
      <Bruma position={[ESTANQUE.centro[0], ESTANQUE.centro[1] + 0.25, ESTANQUE.centro[2]]} scale={[1.6, 0.5, 1.6]} count={14} size={4} speed={1.2} />
    </group>
  )
}
