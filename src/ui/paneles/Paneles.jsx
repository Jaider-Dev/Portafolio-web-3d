import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ENLACES } from '../../data/enlaces'
import { PERFIL } from '../../data/perfil'
import { PROYECTOS } from '../../data/proyectos'
import { TEXTOS } from '../../data/textos'
import { useExperiencia } from '../../store/useExperiencia'
import { OPCIONES } from '../../utils/calidad.js'
import { esMarcador } from '../../utils/marcadores'
import { RUTA_CLASICA, rutaClasicaDe } from '../../utils/rutas'
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

// Ajustes (HU-17): de momento, la calidad gráfica. Un grupo de radios nativos: se recorre con las
// flechas, el lector anuncia "1 de 4" y la opción marcada, sin ARIA extra
function Ajustes() {
  const A = TEXTOS.ajustes
  const calidad = useExperiencia((s) => s.ajustes.calidad)
  const calidadAuto = useExperiencia((s) => s.calidadAuto)
  const cambiarAjuste = useExperiencia((s) => s.cambiarAjuste)
  return (
    <Panel lugar={A.lugar} seccion={A.seccion}>
      <fieldset className="opciones">
        <legend>{A.calidad}</legend>
        {OPCIONES.map((opcion) => (
          <label key={opcion} className="opcion">
            <input type="radio" name="calidad" value={opcion} checked={calidad === opcion} onChange={() => cambiarAjuste('calidad', opcion)} />
            <span>
              <strong>{A.opciones[opcion].titulo}</strong>
              <span className="opcion-detalle">
                {A.opciones[opcion].detalle}
                {opcion === 'auto' && calidad === 'auto' && ` · ${A.ahora(A.opciones[calidadAuto].titulo.toLowerCase())}`}
              </span>
            </span>
          </label>
        ))}
      </fieldset>
    </Panel>
  )
}

// Ficha de un proyecto (HU-22): se abre desde su mural. Los mismos apartados que la versión clásica
function Proyecto() {
  const panel = useExperiencia((s) => s.panel)
  const indice = PROYECTOS.findIndex((p) => p.id === panel.id)
  const proyecto = PROYECTOS[indice]
  if (!proyecto) return null
  const C = TEXTOS.clasico.caso
  const titulo = esMarcador(proyecto.titulo) ? `Proyecto ${indice + 1}` : proyecto.titulo
  return (
    <Panel
      lugar={TEXTOS.murales.lugar}
      seccion={titulo}
      acciones={<Link className="boton" to={`${RUTA_CLASICA}/proyecto/${proyecto.id}`}>{TEXTOS.murales.verClasico}</Link>}
    >
      <p>{proyecto.resumen}</p>
      <h3>{C.reto}</h3>
      <p>{proyecto.problema}</p>
      <h3>{C.papel}</h3>
      <p>{proyecto.rol}</p>
      <h3>{C.tecnologias}</h3>
      <p>{proyecto.tecnologias.join(' · ')}</p>
      <h3>{C.logro}</h3>
      <p>{proyecto.resultado}</p>
      <div className="acciones">
        <EnlaceExterno etiqueta={C.codigo} url={proyecto.enlaces.codigo} />
        <EnlaceExterno etiqueta={C.demo} url={proyecto.enlaces.demo} />
      </div>
    </Panel>
  )
}

const PANELES = { 'sobre-mi': SobreMi, contacto: Contacto, ajustes: Ajustes, proyecto: Proyecto }

export function Paneles() {
  const panel = useExperiencia((s) => s.panel)
  const Contenido = panel ? PANELES[panel.tipo] : null
  return Contenido ? <Contenido key={`${panel.tipo}-${panel.id ?? ""}`} /> : null
}
