import { useMemo } from 'react'
import { Clone, Instance, Instances, useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { PANEL_DE_LUGAR, useExperiencia } from '../../store/useExperiencia'
import { LUGARES, LUGARES_POR_ID } from '../../data/lugares.js'
import { TEXTOS } from '../../data/textos'
import { Interactivo } from '../interaccion/Interactivo'
import { MUNDO } from '../../data/mundo.js'
import { PALETA } from '../paleta'
import { alturaDelTerreno, ESTANQUE, SENDERO_DENSO } from '../isla/terreno.js'
import { FuegoVivo } from './Fogata'
import { transicionHora } from '../ambiente/transicion'
import { useMaterialPBR } from '../materiales'
import { useKit } from '../naturaleza/kit.js'
import { Piedras } from '../naturaleza/Piedras'
import { Explorador } from '../personaje/Explorador'
import { CANDIDATO_ACTIVO, CANDIDATOS } from '../personaje/candidatos'

const RUTAS = {
  tienda: '/models/tienda.glb',
  fogata: '/models/fogata.glb',
  puente: '/models/puente.glb',
}

// Los GLB provisionales salen en gris; al cargarlos, cada material toma su color de la paleta por su
// nombre (05 §14: los modelos usan los materiales del proyecto). Es idempotente: useGLTF los cachea
const COLOR_POR_MATERIAL = {
  lona: PALETA.lona,
  madera: PALETA.madera,
  piedra: PALETA.piedra,
  brasa: PALETA.fuego,
  sombra: PALETA.sombra,
}

// Una roca facetada con proporciones y giro propios a partir de una semilla (determinista)
const roca = (posicion, radio, aplastada = 1, semilla = posicion[0] * 7 + posicion[2]) => ({
  posicion,
  escala: [radio * (1 + 0.15 * Math.sin(semilla)), radio * aplastada, radio * (1 - 0.15 * Math.cos(semilla))],
  rotacion: [Math.sin(semilla * 1.3) * 0.5, semilla, Math.cos(semilla * 0.7) * 0.4],
})

const pintados = new WeakSet()
const materialesBrasa = new Set()
const CENIZA = new THREE.Color(PALETA.cueva)
const FUEGO = new THREE.Color(PALETA.fuego)

// Lecho de la fogata (17-nov): de día ceniza apagada; de noche brasas que brillan (sigue la hora)
function BrasasDelModelo() {
  useFrame(() => {
    const t = transicionHora.t
    for (const material of materialesBrasa) {
      material.color.lerpColors(CENIZA, FUEGO, t)
      material.emissiveIntensity = 0.9 * t
    }
  })
  return null
}

function usePintado(ruta) {
  const { scene } = useGLTF(ruta)
  if (!pintados.has(scene)) {
    pintados.add(scene)
    scene.traverse(({ material }) => {
      const hex = COLOR_POR_MATERIAL[material?.name]
      if (!hex) return
      material.color.set(hex)
      if (material.name === 'brasa') {
        material.emissive.set(PALETA.fuego) // las brasas brillan con luz propia (BrasasDelModelo)
        materialesBrasa.add(material)
      }
    })
  }
  return scene
}

function Modelo({ ruta, ...props }) {
  const scene = usePintado(ruta)
  return <Clone object={scene} castShadow {...props} />
}

// Menhires (02 §7): piedras hincadas irregulares y algo inclinadas, con piedras pequeñas en la base.
// Antes eran obeliscos tallados (cilindro + punta) y parecían torres; desde el 17-nov cada uno es una
// roca distinta del kit de Blender, estirada en vertical
// Cada menhir abre la sección de su lugar (17-nov): Sobre mí, habilidades, proyectos, trayectoria, visión
const PIEZA_MENHIR = ['pena-1', 'roca-8', 'pena-3', 'roca-15', 'pena-6']

// Desde el 19-nov cada menhir es un <Interactivo> (HT-11): viaja a su lugar con su sección abierta
function Menhir({ lugar, posicion, semilla, pieza }) {
  const geometrias = useKit('rocas')
  const texturaRoca = useMaterialPBR('roca')
  const activar = () => {
    const { viajar, abrirEn } = useExperiencia.getState()
    if (lugar === 'cueva') viajar('cueva')
    else abrirEn(lugar, { tipo: lugar === 'campamento' ? 'sobre-mi' : PANEL_DE_LUGAR[lugar] })
  }
  const [x, , z] = posicion
  const y = alturaDelTerreno(x, z)
  const { nombre, seccion } = LUGARES_POR_ID[lugar]
  return (
    <Interactivo id={`menhir-${lugar}`} etiqueta={TEXTOS.interaccion.menhir(nombre, seccion)} pista={TEXTOS.interaccion.pistaMenhir}
      position={[x, y, z]} altura={2.9} realce={1.04} alActivar={activar}>
      {({ encima }) => (
        <mesh position={[0, 1.05, 0]} scale={[0.42, 1.2, 0.3]} rotation={[0.07 * Math.sin(semilla), semilla, 0.08 * Math.cos(semilla)]} castShadow receiveShadow name="menhir">
          <primitive object={geometrias[pieza]} attach="geometry" />
          <meshStandardMaterial {...texturaRoca} color={encima ? PALETA.realce : PALETA.piedra} flatShading roughness={1} />
        </mesh>
      )}
    </Interactivo>
  )
}

// Piedras pequeñas al pie de cada menhir. Las de los cinco van en un solo grupo de instancias (HU-11)
function basesDeMenhires() {
  return LUGARES.flatMap((lugar, i) => {
    const semilla = 3 + i * 11
    const azar = generador(semilla)
    const [x, , z] = lugar.menhir
    const y = alturaDelTerreno(x, z)
    return Array.from({ length: 3 }, (_, k) => {
      const a = (k / 3) * Math.PI * 2 + azar() * 1.5
      return { ...roca([x + Math.cos(a) * 0.6, y + 0.05, z + Math.sin(a) * 0.6], 0.22 + azar() * 0.12, 0.6, semilla + k), pieza: PIEZA_BASE[k] }
    })
  })
}
const PIEZA_BASE = ['roca-2', 'roca-6', 'roca-11']

export function Menhires() {
  const bases = useMemo(() => basesDeMenhires(), [])
  return (
    <group name="menhires">
      {LUGARES.map((lugar, i) => <Menhir key={lugar.id} lugar={lugar.id} posicion={lugar.menhir} semilla={3 + i * 11} pieza={PIEZA_MENHIR[i]} />)}
      <Piedras nombre="bases-de-menhires" piedras={bases} color={PALETA.piedra} sombra={false} />
    </group>
  )
}


export function Campamento() {
  // En el modo explorador el personaje lo dibuja Caminante.jsx (el que camina): aquí no se repite
  const modo = useExperiencia((s) => s.modo)
  const [xFogata, , zFogata] = MUNDO.fogata
  const { radio, cantidad } = MUNDO.troncos
  // La tienda mira hacia la fogata: su entrada es +Z
  const haciaFogata = Math.atan2(xFogata - MUNDO.tienda[0], zFogata - MUNDO.tienda[2])
  return (
    <group name="campamento">
      <Modelo ruta={RUTAS.tienda} position={MUNDO.tienda} rotation-y={haciaFogata} />
      <Interactivo id="fogata" etiqueta={TEXTOS.interaccion.fogata} pista={TEXTOS.interaccion.pistaFogata} position={MUNDO.fogata}
        altura={1.4} alActivar={() => useExperiencia.getState().abrirEn('campamento', { tipo: 'sobre-mi' })}>
        <Modelo ruta={RUTAS.fogata} />
      </Interactivo>
      <FuegoVivo position={MUNDO.fogata} />
      <BrasasDelModelo />
      {MOSTRAR_EXPLORADOR && modo === 'panoramico' && <ExploradorEnElCampamento />}
      {/* Los troncos alrededor del fuego, en una sola malla instanciada */}
      <Instances limit={cantidad} castShadow name="troncos">
        <cylinderGeometry args={[0.22, 0.24, 1.3, 7]} />
        <meshStandardMaterial color={PALETA.madera} flatShading />
        {Array.from({ length: cantidad }, (_, i) => {
          const angulo = Math.PI / 4 + (i / cantidad) * Math.PI * 2
          return (
            <group key={i} position={[xFogata + Math.cos(angulo) * radio, 0.22, zFogata + Math.sin(angulo) * radio]} rotation-y={-angulo + Math.PI / 2}>
              <Instance rotation-z={Math.PI / 2} />
            </group>
          )
        })}
      </Instances>
      <Interactivo id="mochila" etiqueta={TEXTOS.interaccion.mochila} pista={TEXTOS.interaccion.pistaMochila} position={MUNDO.mochila}
        altura={1.4} alActivar={() => useExperiencia.getState().abrirEn('campamento', { tipo: 'contacto' })}>
        <mesh position={[0, 0.4, 0]} castShadow>
          <boxGeometry args={[0.6, 0.8, 0.4]} />
          <meshStandardMaterial color={PALETA.madera} flatShading />
        </mesh>
        <mesh position={[0, 0.84, 0]} rotation-x={-0.25}>
          <boxGeometry args={[0.42, 0.06, 0.3]} />
          <meshStandardMaterial color={PALETA.agua} flatShading />
        </mesh>
      </Interactivo>
    </group>
  )
}

// El explorador espera junto a la fogata, mirándola. Sale solo el candidato activo (19-nov: el 3, el
// más liviano); el otro sigue en public/models y en candidatos.js, listo para cambiarlo
const MOSTRAR_EXPLORADOR = true

function ExploradorEnElCampamento() {
  const [x, z] = MUNDO.explorador
  const [xFogata, , zFogata] = MUNDO.fogata
  const giro = Math.atan2(xFogata - x, zFogata - z)
  const { ruta, sinColor, nombre } = CANDIDATOS[CANDIDATO_ACTIVO]
  return <Explorador ruta={ruta} sinColor={sinColor} name={nombre} position={[x, alturaDelTerreno(x, z), z]} rotation-y={giro} />
}

export function Puente() {
  return <Modelo ruta={RUTAS.puente} position={MUNDO.puente} name="puente" />
}

// Pseudoaleatorio con semilla: las piedras quedan igual en cada visita
function generador(semilla) {
  let s = semilla
  return () => ((s = (s * 16807) % 2147483647) / 2147483647)
}

// Piedras del sendero (02 Z6): el camino de tierra está pintado en el terreno (isla/Isla.jsx); aquí solo
// van losas planas e irregulares, medio hundidas, donde la cuesta lo pide (≥ 0,35 m de subida por metro)
function piedrasDelSendero() {
  const azar = generador(29)
  const piedras = []
  let recorrido = 0
  for (let i = 1; i < SENDERO_DENSO.length; i++) {
    const [x0, z0] = SENDERO_DENSO[i - 1]
    const [x, z] = SENDERO_DENSO[i]
    const paso = Math.hypot(x - x0, z - z0)
    recorrido += paso
    const pendiente = Math.abs(alturaDelTerreno(x, z) - alturaDelTerreno(x0, z0)) / paso
    if (recorrido < 1.15 || pendiente < 0.35) continue
    recorrido = 0
    const giro = Math.atan2(x - x0, z - z0)
    const lado = (azar() - 0.5) * 0.5 // no todas en el centro del camino
    const px = x + Math.cos(giro) * lado
    const pz = z - Math.sin(giro) * lado
    piedras.push({
      posicion: [px, alturaDelTerreno(px, pz) + 0.02, pz],
      rotacion: [(azar() - 0.5) * 0.15, giro + (azar() - 0.5) * 0.6, (azar() - 0.5) * 0.15],
      escala: [0.55 + azar() * 0.25, 0.14 + azar() * 0.06, 0.4 + azar() * 0.15],
    })
  }
  return piedras
}

export function Sendero() {
  const piedras = useMemo(() => piedrasDelSendero(), [])
  return <Piedras nombre="sendero" piedras={piedras} color={PALETA.piedra} losas sombra={false} />
}

// Pasa piedras de coordenadas del mundo a las de un grupo con origen en `origen` (para <Interactivo>,
// que escala desde su origen), con la misma semilla que antes: quedan exactamente igual
const relativas = (piedras, [ox, oy, oz]) => piedras.map((p) => ({ ...p, posicion: [p.posicion[0] - ox, p.posicion[1] - oy, p.posicion[2] - oz] }))

// Cima (HU-25): el mirador es un afloramiento de losas (antes, un cilindro) y el manantial, una roca.
// Los dos son interactivos (19-nov): el manantial abre la visión y el mirador abre la vista de toda la
// isla con la etiqueta de cada lugar (EtiquetasDeLugares)
export function Cima() {
  const [mx, my, mz] = MUNDO.mirador
  const losas = [
    roca([mx, my + 0.05, mz], 1.6, 0.22), roca([mx + 1.1, my + 0.15, mz - 0.6], 0.9, 0.3),
    roca([mx - 1.2, my + 0.1, mz + 0.5], 0.8, 0.28), roca([mx + 0.3, my + 0.12, mz + 1.2], 0.7, 0.25),
  ]
  // El manantial: rocas detrás del estanque (del lado contrario al arroyo); el agua brota a sus pies
  const [ex, , ez] = ESTANQUE.centro
  const detras = (distancia, lado, radio, aplastada) => {
    const x = ex + 0.55 * distancia + 0.83 * lado
    const z = ez - 0.83 * distancia + 0.55 * lado
    return roca([x, alturaDelTerreno(x, z) + radio * 0.35, z], radio, aplastada)
  }
  const manantial = [detras(1.9, 0, 0.9, 0.8), detras(1.6, 1.1, 0.55, 0.7), detras(1.6, -1.1, 0.5, 0.7)]
  const origenManantial = manantial[0].posicion
  const I = TEXTOS.interaccion
  return (
    <group name="cima">
      <Interactivo id="mirador" etiqueta={I.mirador} pista={I.pistaMirador} position={[mx, my, mz]} altura={1.6} realce={1.03}
        alActivar={() => {
          const { setVistaMirador, notificar } = useExperiencia.getState()
          setVistaMirador(true)
          notificar({ tipo: 'mirador' })
        }}>
        <Piedras nombre="mirador" piedras={relativas(losas, [mx, my, mz])} color={PALETA.piedra} sombra={false} />
      </Interactivo>
      <Interactivo id="manantial" etiqueta={I.manantial} pista={I.pistaManantial} position={origenManantial} altura={1.5} realce={1.05}
        alActivar={() => useExperiencia.getState().abrirEn('cima', { tipo: 'vision' })}>
        <Piedras nombre="manantial" piedras={relativas(manantial, origenManantial)} />
      </Interactivo>
    </group>
  )
}

useGLTF.preload(RUTAS.tienda)
useGLTF.preload(RUTAS.fogata)
useGLTF.preload(RUTAS.puente)

