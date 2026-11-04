import { TEXTOS } from '../data/textos'
import { esMarcador } from '../utils/marcadores'

const T = TEXTOS.contacto

export function EnlaceClasico({ etiqueta, url }) {
  if (esMarcador(url)) {
    return <span className="boton boton-pendiente" aria-disabled="true">{etiqueta} ({T.pendiente})</span>
  }
  return (
    <a className="boton" href={url} target="_blank" rel="noopener noreferrer">
      {etiqueta} <span aria-hidden="true">↗</span>
      <span className="solo-lector"> {T.pestanaNueva}</span>
    </a>
  )
}
