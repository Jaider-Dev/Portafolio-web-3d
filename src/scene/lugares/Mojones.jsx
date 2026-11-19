import { Billboard, Text } from '@react-three/drei'
import { TEXTOS } from '../../data/textos'
import { TRAYECTORIA } from '../../data/trayectoria'
import { useExperiencia } from '../../store/useExperiencia'
import { Interactivo } from '../interaccion/Interactivo'
import { alturaDelTerreno, SENDERO_DENSO } from '../isla/terreno.js'
import { ROCAS, useKit, usePiedra } from '../naturaleza/kit.js'
import { PALETA } from '../paleta'

// Mojones del sendero (HU-24, 02 Z6, 03 E12): un montón de piedras apiladas por cada hito de la
// trayectoria, de abajo (lo más antiguo) hacia arriba (lo más reciente). Sobre cada uno, su año en texto
// 2D (<Text> de Drei con la fuente local Inter: sin descargas de CDN) que siempre mira a la cámara.
// Al hacer clic se abre la tarjeta del hito; el del descanso, a media subida, invita a mirar atrás.

// Dónde va cada mojón a lo largo del sendero (fracción del recorrido) y a qué lado del camino
const FRACCIONES = [0.12, 0.34, 0.56, 0.78, 0.92]
const APARTE = 1.3 // metros fuera del centro del camino
const DESCANSO = 1 // índice del hito del descanso, a media subida (02 Z6)
const FUENTE = '/fonts/inter-latin-400-normal.woff'

// Tres piedras apiladas, de mayor a menor (coordenadas locales: el mojón está en su base)
const PILA = [
  { posicion: [0, 0.22, 0], escala: [0.42, 0.26, 0.38], pieza: ROCAS[2] },
  { posicion: [0.03, 0.6, -0.02], escala: [0.3, 0.2, 0.28], pieza: ROCAS[6] },
  { posicion: [-0.02, 0.88, 0.01], escala: [0.19, 0.14, 0.18], pieza: ROCAS[11] },
]

function ubicar(fraccion, lado) {
  const n = SENDERO_DENSO.length
  const i = Math.min(n - 2, Math.floor(fraccion * (n - 1)))
  const [x0, z0] = SENDERO_DENSO[i]
  const [x1, z1] = SENDERO_DENSO[i + 1]
  const largo = Math.hypot(x1 - x0, z1 - z0) || 1
  // perpendicular al camino, alternando el lado
  const x = x0 - ((z1 - z0) / largo) * APARTE * lado
  const z = z0 + ((x1 - x0) / largo) * APARTE * lado
  return [x, alturaDelTerreno(x, z) - 0.05, z]
}

const MOJONES = TRAYECTORIA.map((hito, i) => ({ id: hito.id, posicion: ubicar(FRACCIONES[i] ?? 0.95, i % 2 ? -1 : 1), indice: i }))

export function Mojones() {
  const geometrias = useKit('rocas')
  const material = usePiedra(PALETA.piedra)
  return (
    <group name="mojones">
      {MOJONES.map(({ id, posicion, indice }) => {
        const hito = TRAYECTORIA[indice]
        return (
          <Interactivo key={id} id={`mojon-${id}`} etiqueta={TEXTOS.interaccion.mojon(hito.anio, hito.titulo)} pista={TEXTOS.interaccion.pistaMojon}
            position={posicion} altura={1.85} realce={1.06}
            alActivar={() => {
              const { abrirPanel, notificar } = useExperiencia.getState()
              abrirPanel({ tipo: 'hito', id })
              if (indice === DESCANSO) notificar({ tipo: 'mirarAtras' })
            }}>
            {PILA.map(({ posicion: p, escala, pieza }, k) => (
              <mesh key={k} geometry={geometrias[pieza]} material={material} position={p} scale={escala} rotation-y={indice + k * 1.3} castShadow receiveShadow />
            ))}
            <Billboard position={[0, 1.35, 0]}>
              <Text font={FUENTE} fontSize={0.34} color={PALETA.nube} outlineWidth={0.025} outlineColor={PALETA.sombra} anchorY="middle">
                {hito.anio}
              </Text>
            </Billboard>
          </Interactivo>
        )
      })}
    </group>
  )
}
