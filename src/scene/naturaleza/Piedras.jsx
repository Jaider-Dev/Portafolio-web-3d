import { useMemo } from 'react'
import { Instance, Instances } from '@react-three/drei'
import { PALETA } from '../paleta'
import { LOSAS, porPieza, ROCAS, useKit, usePiedra } from './kit.js'

// Piedras del kit de rocas (17-nov): reemplazan a los dodecaedros. Cada piedra es { posicion, escala,
// rotacion } con la escala como medio ancho en cada eje (igual que con el dodecaedro de radio 1), así
// que los afloramientos, el mirador, el sendero y el vado conservan sus medidas. Si no trae `pieza`,
// se elige una según su posición (siempre la misma). Una InstancedMesh por pieza distinta
const indice = ([x, y, z], n) => Math.abs(Math.round(x * 7.3 + y * 3.7 + z * 13.1)) % n

export function Piedras({ piedras, nombre, color = PALETA.roca, losas = false, sombra = true }) {
  const geometrias = useKit('rocas')
  const material = usePiedra(color)
  const lista = losas ? LOSAS : ROCAS
  const grupos = useMemo(() => porPieza(piedras.map((p) => ({ ...p, pieza: p.pieza ?? lista[indice(p.posicion, lista.length)] }))), [piedras, lista])
  return (
    <group name={nombre}>
      {grupos.map(([pieza, grupo]) => (
        <Instances key={pieza} limit={grupo.length} geometry={geometrias[pieza]} material={material} castShadow={sombra} receiveShadow>
          {grupo.map(({ posicion, escala, rotacion }) => <Instance key={posicion.join()} position={posicion} scale={escala} rotation={rotacion} />)}
        </Instances>
      ))}
    </group>
  )
}
