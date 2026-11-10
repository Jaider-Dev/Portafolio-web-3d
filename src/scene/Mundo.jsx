import { Ambiente } from './ambiente/Ambiente'
import { Agua } from './agua/Agua'
import { Isla } from './isla/Isla'
import { Vegetacion } from './isla/Vegetacion'
import { Campamento, Cima, Cueva, Menhires, Puente, Sendero, Vado } from './lugares/Lugares'
import { Letrero, Poste } from './lugares/Senales'

// Composición de la isla (06 §7). La luz depende de la hora del día: mañana o noche (D12, HU-37)
export function Mundo() {
  return (
    <>
      <Ambiente />
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
