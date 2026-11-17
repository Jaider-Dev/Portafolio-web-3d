import { useMemo } from 'react'
import { Instance, Instances } from '@react-three/drei'
import { useCalidad } from '../useCalidad'
import { alturaDelTerreno } from '../isla/terreno.js'
import { ARBOLES, elegir, generador, MATERIAL_VEGETACION, porPieza, useKit } from './kit.js'
import { lugarLibre } from './ubicacion.js'

// Bosque de 02 · Mapa §1: rodea la colina y el campamento, sin tapar caminos ni puntos de interés.
// Antes eran conos; desde el 17-nov son árboles grandes de Blender (kit de árboles) repartidos por zonas
const POSICIONES = [
  [-23, -6], [-21, -2], [-24, 2], [-22, 6], [-20, 12], [-24, 9], [-16, 15], [-13, 18], [-19, -8], [-25, -10],
  [-16, -12], [-11, -14], [-22, -14], [-14, -7], [-7, -8], [-6, -13],
  [12, 8], [16, 10], [20, 4], [22, -2], [18, 14], [10, 15], [14, 17], [24, 3],
  [-2, -26], [-8, -24], [3, -27], [15, -25], [20, -18], [22, -12],
]

// El de la silueta de la cima (02 · Mapa §7): el árbol más reconocible, solo y más grande (hito)
const HITO = [14, -24]

// Densidad según la calidad (06 §19.1: 100 %, 75 %, 50 %): de cada 4 árboles se quitan los mismos
// siempre, repartidos por todo el bosque. El hito no se quita nunca
const seQueda = (i, densidad) => i % 4 < Math.round(densidad * 4)

// Especie según el sitio: coníferas en la colina y el fondo; copas anchas solo donde hay espacio
// (lejos del sendero, del agua y de los lugares); el resto, árboles esbeltos
function especie(x, z, azar) {
  const enLaColina = alturaDelTerreno(x, z) > 3 || z < -18
  if (enLaColina) return elegir(azar() < 0.75 ? ARBOLES.conifera : ARBOLES.esbelto, azar)
  const hayEspacio = lugarLibre(x, z, { camino: 5, puntos: 6, agua: 3, inclinacion: 0.6, borde: 1 })
  const r = azar()
  if (hayEspacio && r < 0.45) return elegir(ARBOLES.ancho, azar)
  return elegir(r < 0.75 ? ARBOLES.esbelto : ARBOLES.conifera, azar)
}

function crearArboles() {
  const azar = generador(13)
  return POSICIONES.map(([x, z]) => ({ x, z, pieza: especie(x, z, azar), escala: 0.95 + azar() * 0.25, giro: azar() * Math.PI * 2 }))
}

export function Bosque() {
  const { perfil } = useCalidad()
  const geometrias = useKit('arboles')
  const todos = useMemo(() => crearArboles(), [])
  const arboles = useMemo(() => {
    const visibles = todos.filter((_, i) => seQueda(i, perfil.vegetacion))
    const [hx, hz] = HITO
    visibles.push({ x: hx, z: hz, pieza: ARBOLES.hito, escala: 1.25, giro: 0.6 })
    return visibles
  }, [todos, perfil.vegetacion])

  return (
    <group name="bosque">
      {porPieza(arboles).map(([pieza, grupo]) => (
        <Instances key={pieza} name={pieza} limit={grupo.length} geometry={geometrias[pieza]} material={MATERIAL_VEGETACION} castShadow receiveShadow>
          {grupo.map(({ x, z, escala, giro }) => (
            // un poco hundido: en las laderas la base no queda en el aire
            <Instance key={`${x},${z}`} position={[x, alturaDelTerreno(x, z) - 0.15, z]} rotation-y={giro} scale={escala} />
          ))}
        </Instances>
      ))}
    </group>
  )
}
