import { Ambiente } from './ambiente/Ambiente'
import { Nubes } from './ambiente/Nubes'
import { Agua } from './agua/Agua'
import { Isla } from './isla/Isla'
import { Vegetacion } from './isla/Vegetacion'
import { Cueva } from './lugares/Cueva'
import { Campamento, Cima, Menhires, Puente, Sendero, Vado } from './lugares/Lugares'
import { Letrero, Poste } from './lugares/Senales'

// Composición de la isla (06 §7). La luz depende de la hora del día: mañana o noche (D12, HU-37)
export function Mundo() {
  return (
    <>
      <Ambiente />
      <Nubes />
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
