import { useMemo } from 'react'
import { Instance, Instances } from '@react-three/drei'
import { MUNDO } from '../../data/mundo.js'
import { PALETA } from '../paleta'
import { useCalidad } from '../useCalidad'
import { cuantos } from '../../utils/calidad.js'
import { alturaDelTerreno } from '../isla/terreno.js'
import { DETALLES, elegir, generador, MATERIAL_VEGETACION, porPieza, useKit, usePiedra } from './kit.js'
import { Piedras } from './Piedras'
import { lugarLibre } from './ubicacion.js'

// Detalles del suelo (17-nov): matas de pasto, hongos y pedregales del kit de Blender,
// repartidos con semilla fija por los prados y el bosque. Respetan el sendero, el agua y los lugares
// (ubicacion.js). La cantidad baja con la calidad, como los árboles (06 §19.1)

// Puntos al azar dentro de la isla que cumplan `reglas`
function sembrar(cantidad, semilla, reglas) {
  const azar = generador(semilla)
  const puntos = []
  for (let intento = 0; puntos.length < cantidad && intento < cantidad * 40; intento++) {
    const x = -27 + azar() * 54
    const z = -34 + azar() * 57
    if (lugarLibre(x, z, reglas)) puntos.push([x, z, azar])
  }
  return puntos
}

function crearDetalles() {
  const azar = generador(5)
  const item = (lista, escala) => ([x, z]) => ({
    x, z, pieza: elegir(lista, azar), giro: azar() * Math.PI * 2, escala: escala[0] + azar() * (escala[1] - escala[0]),
  })
  return {
    pasto: sembrar(170, 202, { camino: 0.9, puntos: 1.6, agua: 0.3, inclinacion: 1 }).map(item(DETALLES.pasto, [0.8, 1.5])),
    hongos: sembrar(18, 303, { camino: 1.2, puntos: 2, agua: 1, inclinacion: 0.6 }).map(item(DETALLES.hongos, [0.9, 1.5])),
  }
}

// Entre el campamento y el puente no van pedregales (17-nov: estorbaban la vista del campamento)
const [XF, , ZF] = MUNDO.fogata
const [XP, , ZP] = MUNDO.puente
function enElClaro(x, z) {
  const dx = XP - XF
  const dz = ZP - ZF
  const t = Math.min(1, Math.max(0, ((x - XF) * dx + (z - ZF) * dz) / (dx * dx + dz * dz)))
  return Math.hypot(x - XF - t * dx, z - ZF - t * dz) < 6
}

// Pedregales: una roca grande y dos o tres pequeñas apoyadas a su alrededor. Pocas piezas distintas:
// cada una es una llamada de dibujo (HU-11)
const PIEZAS_GRANDES = ['pena-1', 'pena-4']
const PIEZAS_PEQUENAS = ['roca-3']
function crearPedregales() {
  return sembrar(14, 404, { camino: 2.2, puntos: 3.5, agua: 1.2, inclinacion: 0.7 }).filter(([x, z]) => !enElClaro(x, z)).slice(0, 8).flatMap(([x, z, azar]) => {
    const grande = 0.5 + azar() * 0.5
    const y = alturaDelTerreno(x, z)
    const piedras = [{ posicion: [x, y + grande * 0.4, z], escala: [grande * 1.2, grande, grande], rotacion: [0, azar() * 6, 0], pieza: elegir(PIEZAS_GRANDES, azar) }]
    const n = 2 + Math.floor(azar() * 2)
    for (let i = 0; i < n; i++) {
      const a = azar() * Math.PI * 2
      const r = 0.2 + azar() * 0.2
      const px = x + Math.cos(a) * (grande + r + 0.1)
      const pz = z + Math.sin(a) * (grande + r + 0.1)
      piedras.push({ posicion: [px, alturaDelTerreno(px, pz) + r * 0.3, pz], escala: [r * 1.2, r * 0.8, r], rotacion: [azar(), azar() * 6, azar()], pieza: elegir(PIEZAS_PEQUENAS, azar) })
    }
    return piedras
  })
}

// Dolmen en la cima (en llano, lejos del claro y del mirador): ruina que se ve desde el sendero
const DOLMEN = [16, -20]

function Grupo({ items, geometrias, sombra }) {
  return porPieza(items).map(([pieza, grupo]) => (
    <Instances key={pieza} name={pieza} limit={grupo.length} geometry={geometrias[pieza]} material={MATERIAL_VEGETACION} castShadow={sombra} receiveShadow>
      {grupo.map(({ x, z, escala, giro }) => (
        <Instance key={`${x},${z}`} position={[x, alturaDelTerreno(x, z) - 0.04, z]} rotation-y={giro} scale={escala} />
      ))}
    </Instances>
  ))
}

export function Detalles() {
  const { perfil } = useCalidad()
  const vegetales = useKit('detalles')
  const rocas = useKit('rocas')
  const piedra = usePiedra(PALETA.piedra)
  const todos = useMemo(() => crearDetalles(), [])
  const pedregales = useMemo(() => crearPedregales(), [])
  const visibles = useMemo(() => {
    const parte = (lista) => lista.slice(0, cuantos(lista.length, perfil.vegetacion))
    return { pasto: parte(todos.pasto), hongos: parte(todos.hongos) }
  }, [todos, perfil.vegetacion])
  const [dx, dz] = DOLMEN

  return (
    <group name="detalles">
      {/* lo pequeño no proyecta sombra: no se notaría y cuesta un pase más por instancia */}
      <Grupo items={visibles.pasto} geometrias={vegetales} sombra={false} />
      <Grupo items={visibles.hongos} geometrias={vegetales} sombra={false} />
      <Piedras nombre="pedregales" piedras={pedregales} color={PALETA.roca} />
      <mesh name="dolmen" geometry={rocas.dolmen} material={piedra} position={[dx, alturaDelTerreno(dx, dz) - 0.1, dz]} rotation-y={0.5} castShadow receiveShadow />
    </group>
  )
}
