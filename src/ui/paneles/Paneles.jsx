import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ENLACES } from '../../data/enlaces'
import { PERFIL } from '../../data/perfil'
import { TEXTOS } from '../../data/textos'
import { useExperiencia } from '../../store/useExperiencia'
import { esMarcador } from '../../utils/marcadores'
import { rutaClasicaDe } from '../../utils/rutas'
import { Panel } from '../Panel'

const T = TEXTOS.contacto

function SobreMi() {
  const viajar = useExperiencia((s) => s.viajar)
  const abrirPanel = useExperiencia((s) => s.abrirPanel)
  return (
    <Panel
      lugar={TEXTOS.sobreMi.lugar}
      seccion={TEXTOS.sobreMi.seccion}
      acciones={(
        <>
          <button type="button" className="boton boton-principal" onClick={() => viajar('cueva')}>{TEXTOS.sobreMi.proyectos}</button>
          <button type="button" className="boton" onClick={() => abrirPanel({ tipo: 'contacto' })}>{TEXTOS.sobreMi.contactar}</button>
        </>
      )}
    >
      <p>{PERFIL.resumen}</p>
      <ul>
        {PERFIL.datos.map((dato) => <li key={dato}>{dato}</li>)}
      </ul>
    </Panel>
  )
}

// Enlace externo con su icono de salida. Mientras sea un marcador (PL-02) no lleva a ningún sitio
export function EnlaceExterno({ etiqueta, url, descargar = false }) {
  if (esMarcador(url)) {
    return <span className="boton boton-pendiente" aria-disabled="true">{etiqueta} ({T.pendiente})</span>
  }
  return (
    <a className="boton" href={url} target="_blank" rel="noopener noreferrer" download={descargar || undefined}>
      {etiqueta} <span aria-hidden="true">↗</span>
      <span className="solo-lector"> {T.pestanaNueva}</span>
    </a>
  )
}

function Contacto() {
  const { pathname } = useLocation()
  const [estadoCopia, setEstadoCopia] = useState(null)
  const correoListo = !esMarcador(ENLACES.correo)

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(ENLACES.correo)
      setEstadoCopia(T.copiado)
    } catch {
      setEstadoCopia(T.errorCopia)
    }
  }

  return (
    <Panel lugar={T.lugar} seccion={T.seccion}>
      <p>{T.invitacion}</p>
      <p>
        {T.correo}:{' '}
        {correoListo ? <a href={`mailto:${ENLACES.correo}`}>{ENLACES.correo}</a> : ENLACES.correo}
      </p>
      <div className="acciones">
        <button type="button" className="boton boton-principal" disabled={!correoListo} onClick={copiar}>{T.copiar}</button>
        <EnlaceExterno etiqueta={T.cv} url={ENLACES.cv} descargar />
      </div>
      <p role="status" className="panel-estado">{estadoCopia}</p>
      <div className="acciones">
        <EnlaceExterno etiqueta={T.linkedin} url={ENLACES.linkedin} />
        <EnlaceExterno etiqueta={T.github} url={ENLACES.github} />
        <Link className="boton" to={rutaClasicaDe(pathname, { tipo: 'contacto' })}>{T.clasico}</Link>
      </div>
    </Panel>
  )
}

const PANELES = { 'sobre-mi': SobreMi, contacto: Contacto }

export function Paneles() {
  const panel = useExperiencia((s) => s.panel)
  const Contenido = panel ? PANELES[panel.tipo] : null
  return Contenido ? <Contenido key={panel.tipo} /> : null
}
