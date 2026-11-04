import { useRef } from 'react'
import { TEXTOS } from '../data/textos'
import { useExperiencia } from '../store/useExperiencia'
import { useDialogo } from './useDialogo'

// Diálogo común de todas las secciones (HT-08): doble nombre, contenido, acciones y "Cerrar"
export function Panel({ lugar, seccion, acciones, children }) {
  const cerrarPanel = useExperiencia((s) => s.cerrarPanel)
  const menuAbierto = useExperiencia((s) => s.menuViaje)
  const contenedor = useRef(null)

  useDialogo(contenedor, { alCerrar: cerrarPanel, activo: !menuAbierto })

  return (
    <div className="capa-dialogo" onClick={(e) => e.target === e.currentTarget && cerrarPanel()}>
      <div ref={contenedor} className="panel" role="dialog" aria-modal="true" aria-labelledby="panel-titulo">
        <h2 id="panel-titulo">{lugar} · {seccion}</h2>
        <div className="panel-contenido">{children}</div>
        <div className="acciones">
          {acciones}
          <button type="button" className="boton" onClick={cerrarPanel}>{TEXTOS.panel.cerrar}</button>
        </div>
      </div>
    </div>
  )
}
