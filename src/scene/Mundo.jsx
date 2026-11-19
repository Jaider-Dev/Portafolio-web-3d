import { useIdioma } from '../store/idioma'
import { Ambiente } from './ambiente/Ambiente'
import { Nubes } from './ambiente/Nubes'
import { Particulas } from './ambiente/Particulas'
import { Agua } from './agua/Agua'
import { Isla } from './isla/Isla'
import { Cueva } from './lugares/Cueva'
import { Faroles } from './lugares/Faroles'
import { EtiquetasDeLugares } from './lugares/EtiquetasDeLugares'
import { Campamento, Cima, Menhires, Puente, Sendero } from './lugares/Lugares'
import { Mojones } from './lugares/Mojones'
import { Runas } from './lugares/Runas'
import { Letrero, Poste } from './lugares/Senales'
import { Bosque } from './naturaleza/Bosque'
import { Detalles } from './naturaleza/Detalles'
import { Sonido } from './sonido/Sonido'

// Composición de la isla (06 §7). La luz depende de la hora del día: mañana o noche (D12, HU-37)
export function Mundo() {
  // Lo que muestra texto dentro de la escena (rótulos del poste) se vuelve a crear al cambiar de idioma
  const idioma = useIdioma((s) => s.idioma)
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
      <Runas />
      <Cueva />
      <Sendero />
      <Mojones />
      <Cima />
      <Menhires />
      <EtiquetasDeLugares />
      <Faroles />
      <Letrero />
      <Poste key={idioma} />
      <Particulas />
      <Sonido />
    </>
  )
}
