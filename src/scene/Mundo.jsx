import { Ambiente } from './ambiente/Ambiente'
import { Nubes } from './ambiente/Nubes'
import { Particulas } from './ambiente/Particulas'
import { Agua } from './agua/Agua'
import { Isla } from './isla/Isla'
import { Cueva } from './lugares/Cueva'
import { Faroles } from './lugares/Faroles'
import { Campamento, Cima, Menhires, Puente, Sendero, Vado } from './lugares/Lugares'
import { Letrero, Poste } from './lugares/Senales'
import { Bosque } from './naturaleza/Bosque'
import { Detalles } from './naturaleza/Detalles'
import { Sonido } from './sonido/Sonido'

// Composición de la isla (06 §7). La luz depende de la hora del día: mañana o noche (D12, HU-37)
export function Mundo() {
  return (
    <>
      <Ambiente />
      <Nubes />
      <Isla />
      <Agua />
      <Bosque />
      <Detalles />
      <Campamento />
      <Puente />
      <Vado />
      <Cueva />
      <Sendero />
      <Cima />
      <Menhires />
      <Faroles />
      <Letrero />
      <Poste />
      <Particulas />
      <Sonido />
    </>
  )
}
