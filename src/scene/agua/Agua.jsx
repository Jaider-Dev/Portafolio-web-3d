import { useMemo } from 'react'
import { Sparkles } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { ARROYO, CAUCE, MUNDO } from '../../data/mundo.js'
import { useExperiencia } from '../../store/useExperiencia'
import { useHora } from '../../store/hora'
import { PALETA } from '../paleta'
import { crearDegradado, crearTexturaDeFlujo } from './texturas'

// Cinta que sigue una curva; la coordenada V avanza con el agua (06 §9.1): desplazar la textura en V
// hace "correr" el río. Devuelve también su longitud para repetir la textura sin estirarla
function crearCinta(puntos, ancho, segmentos = 80) {
  const curva = new THREE.CatmullRomCurve3(puntos.map((p) => new THREE.Vector3(...p)))
  const posiciones = []
  const uvs = []
  const indices = []
  const arriba = new THREE.Vector3(0, 1, 0)
  const lateral = new THREE.Vector3()
  for (let i = 0; i <= segmentos; i++) {
    const t = i / segmentos
    const punto = curva.getPointAt(t) // por longitud de arco: el agua avanza a ritmo constante
    lateral.crossVectors(curva.getTangentAt(t), arriba).normalize().multiplyScalar(ancho(punto) / 2)
    posiciones.push(punto.x - lateral.x, punto.y, punto.z - lateral.z, punto.x + lateral.x, punto.y, punto.z + lateral.z)
    uvs.push(0, t, 1, t)
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
  return { geometria, longitud: curva.getLength() }
}

// Ancho de 02 · Mapa §5: 4 m aguas arriba, 3,5 m en el vado, 4,5 m cerca del borde
const anchoDelRio = ({ z }) => (z > 15 ? 4.5 : z > 4 ? 3.5 : 4)

const SALIDA_DEL_BORDE = [-4.8, -0.3, 24]
const ALTO_CASCADA_BAJA = 25.4
const METROS_POR_REPETICION = 5 // una "ola" de la textura cada 5 m: misma densidad en todo el cauce

// Velocidad en metros por segundo a lo largo del agua (las cascadas caen bastante más rápido)
const VELOCIDAD = { rio: 1.4, arroyo: 2.2, poza: 0.35, cascada: 7 }

// Cada superficie tiene su propia textura (un clon que comparte la imagen) para moverse a su ritmo
function useCorrientes() {
  const texturas = useMemo(() => {
    const conOrillas = crearTexturaDeFlujo({ orillas: true })
    const sinOrillas = crearTexturaDeFlujo({ orillas: false })
    const clon = (base, largo) => {
      const t = base.clone()
      t.repeat.set(1, largo / METROS_POR_REPETICION)
      return t
    }
    const rio = crearCinta([...CAUCE, SALIDA_DEL_BORDE], anchoDelRio)
    const arroyo = crearCinta(ARROYO, () => 1.5, 12)
    return {
      rio: { ...rio, mapa: clon(conOrillas, rio.longitud), velocidad: VELOCIDAD.rio / rio.longitud },
      arroyo: { ...arroyo, mapa: clon(conOrillas, arroyo.longitud), velocidad: VELOCIDAD.arroyo / arroyo.longitud },
      poza: { mapa: clon(sinOrillas, MUNDO.poza.radio * 2), velocidad: VELOCIDAD.poza / (MUNDO.poza.radio * 2) },
      alta: { mapa: clon(sinOrillas, MUNDO.cascadaAlta.borde[1]), velocidad: VELOCIDAD.cascada / MUNDO.cascadaAlta.borde[1] },
      baja: { mapa: clon(sinOrillas, ALTO_CASCADA_BAJA), velocidad: VELOCIDAD.cascada / ALTO_CASCADA_BAJA },
      desvanecer: crearDegradado(), // alphaMap fijo: la cascada baja se pierde hacia abajo
    }
  }, [])

  // offset en "texturas por segundo" × delta: la velocidad aparente no depende de los FPS.
  // En el río la V crece aguas abajo (offset negativo); en un plano la V crece hacia arriba y el agua
  // cae, así que ahí el offset es positivo
  useFrame((_, delta) => {
    const d = Math.min(delta, 0.1) // tras una pestaña en segundo plano no da un salto
    const { rio, arroyo, poza, alta, baja } = texturas
    for (const corriente of [rio, arroyo, poza]) corriente.mapa.offset.y -= corriente.mapa.repeat.y * corriente.velocidad * d
    for (const caida of [alta, baja]) caida.mapa.offset.y += caida.mapa.repeat.y * caida.velocidad * d
  })

  return texturas
}

function MaterialDeAgua({ mapa, alphaMap, opacidad = 0.88 }) {
  return (
    <meshStandardMaterial
      map={mapa}
      alphaMap={alphaMap}
      roughness={0.25}
      transparent
      opacity={opacidad}
      side={THREE.DoubleSide}
      depthWrite={false}
    />
  )
}

// Bruma y espuma de partículas en la base de las cascadas (05 §8). De noche, más tenue
function Bruma(props) {
  const noche = useHora((s) => s.hora === 'noche')
  const reducir = useExperiencia((s) => s.ajustes.reducirMovimiento)
  return (
    <Sparkles
      count={40}
      size={6}
      speed={reducir ? 0 : 0.5}
      opacity={noche ? 0.35 : 0.8}
      color={PALETA.espuma}
      noise={1}
      {...props}
    />
  )
}

export function Agua() {
  const { rio, arroyo, poza, alta, baja, desvanecer } = useCorrientes()
  const { centro, radio } = MUNDO.poza
  const [xAlta, yAlta, zAlta] = MUNDO.cascadaAlta.borde

  return (
    <group name="agua">
      <mesh geometry={rio.geometria} receiveShadow name="rio">
        <MaterialDeAgua mapa={rio.mapa} />
      </mesh>
      <mesh geometry={arroyo.geometria} receiveShadow name="arroyo">
        <MaterialDeAgua mapa={arroyo.mapa} />
      </mesh>
      {/* Poza poco profunda: más transparente y casi quieta (se puede cruzar caminando, sprint 4) */}
      <mesh position={centro} rotation-x={-Math.PI / 2} receiveShadow name="poza">
        <circleGeometry args={[radio, 24]} />
        <MaterialDeAgua mapa={poza.mapa} opacidad={0.72} />
      </mesh>
      {/* Cascada alta: cortina delante de la cueva (06 §9.3) */}
      <mesh position={[xAlta, yAlta / 2, zAlta - 0.2]} name="cascada-alta">
        <planeGeometry args={[MUNDO.cascadaAlta.ancho, yAlta]} />
        <MaterialDeAgua mapa={alta.mapa} />
      </mesh>
      <Bruma position={[xAlta, 0.8, zAlta + 1]} scale={[MUNDO.cascadaAlta.ancho + 1.5, 1.8, 2.5]} />
      {/* Cascada baja: cae por el borde y se desvanece hacia las nubes bajo la isla */}
      <mesh position={[SALIDA_DEL_BORDE[0], -0.3 - ALTO_CASCADA_BAJA / 2, SALIDA_DEL_BORDE[2]]} name="cascada-baja">
        <planeGeometry args={[4.5, ALTO_CASCADA_BAJA]} />
        <MaterialDeAgua mapa={baja.mapa} alphaMap={desvanecer} />
      </mesh>
      <Bruma position={[SALIDA_DEL_BORDE[0], -0.6, SALIDA_DEL_BORDE[2] + 0.6]} scale={[5, 1.5, 2]} count={30} />
    </group>
  )
}
