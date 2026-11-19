import { Html } from '@react-three/drei'
import { LUGARES } from '../../data/lugares.js'
import { useExperiencia } from '../../store/useExperiencia'
import { alturaDelTerreno } from '../isla/terreno.js'

// Etiquetas de los lugares en la vista del mirador (HU-25, requisito de HTML 3D): cada una anclada sobre
// su menhir con el doble nombre (lugar · sección). Son botones: llevan a ese lugar con el mismo viaje
// que el menú. Solo existen mientras dura la vista panorámica del mirador
export function EtiquetasDeLugares() {
  const visible = useExperiencia((s) => s.vistaMirador)
  const viajar = useExperiencia((s) => s.viajar)
  if (!visible) return null
  return LUGARES.map(({ id, nombre, seccion, menhir }) => (
    <Html key={id} position={[menhir[0], alturaDelTerreno(menhir[0], menhir[2]) + 3.6, menhir[2]]} center zIndexRange={[20, 10]}>
      {/* stopPropagation en pointerdown: si sube al contenedor del canvas, CameraControls lo toma como
          el inicio de un arrastre, cierra la vista del mirador y la etiqueta desaparece antes del clic */}
      <button type="button" className="etiqueta-lugar" onPointerDown={(e) => e.stopPropagation()} onClick={() => viajar(id)}>
        <strong>{nombre}</strong>
        <span>{seccion}</span>
      </button>
    </Html>
  ))
}
