import { GRISES } from './grises'
import { Agua } from './agua/Agua'
import { Isla } from './isla/Isla'
import { Vegetacion } from './isla/Vegetacion'
import { Campamento, Cima, Cueva, Menhires, Puente, Sendero, Vado } from './lugares/Lugares'
import { Letrero, Poste } from './lugares/Senales'

// Composición de la isla (06 §7). Luz de trabajo neutra hasta decidir la hora del día (P-2)
export function Mundo() {
  return (
    <>
      <color attach="background" args={[GRISES.fondo]} />
      <hemisphereLight args={['#ffffff', '#555555', 1.4]} />
      <directionalLight position={[-30, 40, 20]} intensity={2.2} />
      <Isla />
      <Agua />
      <Vegetacion />
      <Campamento />
      <Puente />
      <Vado />
      <Cueva />
      <Sendero />
      <Cima />
      <Menhires />
      <Letrero />
      <Poste />
    </>
  )
}
