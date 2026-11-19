import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ENLACES } from '../../data/enlaces'
import { HABILIDADES } from '../../data/habilidades'
import { PERFIL, VISION } from '../../data/perfil'
import { PROYECTOS, PROYECTO_DESTACADO } from '../../data/proyectos'
import { TEXTOS } from '../../data/textos'
import { TRAYECTORIA } from '../../data/trayectoria'
import { useIdioma } from '../../store/idioma'
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
          <button type="button" className="boton boton-principal" onClick={() => viajar('cueva', { tipo: 'proyecto', id: PROYECTO_DESTACADO.id })}>{TEXTOS.sobreMi.proyectos}</button>
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
  if (!url) return null // sin repositorio o demo públicos
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

// Ajustes (HU-17): calidad gráfica e idioma (P-7). Un grupo de radios nativos: se recorre con las
// flechas, el lector anuncia "1 de 4" y la opción marcada, sin ARIA extra
function Ajustes() {
  const A = TEXTOS.ajustes
  const calidad = useExperiencia((s) => s.ajustes.calidad)
  const calidadAuto = useExperiencia((s) => s.calidadAuto)
  const cambiarAjuste = useExperiencia((s) => s.cambiarAjuste)
  const idioma = useIdioma((s) => s.idioma)
  const elegirIdioma = useIdioma((s) => s.elegir)
  return (
    <Panel lugar={A.lugar} seccion={A.seccion}>
      {/* Cada idioma con su propio nombre (y su lang): se reconoce sin saber el otro */}
      <fieldset className="opciones">
        <legend>{TEXTOS.idioma.titulo}</legend>
        {[['es', 'Español'], ['en', 'English']].map(([codigo, nombre]) => (
          <label key={codigo} className="opcion" lang={codigo}>
            <input type="radio" name="idioma" value={codigo} checked={idioma === codigo} onChange={() => elegirIdioma(codigo)} />
            <span><strong>{nombre}</strong></span>
          </label>
        ))}
      </fieldset>
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

// Ficha de un proyecto (HU-22): se abre desde su mural, desde "Ver proyectos" o con /proyecto/<id>
// (HU-26). Los mismos apartados que la versión clásica. "Anterior" y "Siguiente" recorren los murales en
// el orden de visita de la galería (la cámara se desplaza al mural de cada uno: DirectorDeCamara)
// Ángulo del mural de 0 a 2 (en fracciones de π): la visita va de la izquierda de la entrada (≈ 0,86)
// por el fondo (1,5) hasta la derecha (≈ 1,85), igual que en la galería (02 Z5)
const vuelta = (angulo) => ((angulo % 2) + 2) % 2
const EN_ORDEN_DE_VISITA = () => [...PROYECTOS].sort((a, b) => vuelta(a.mural.angulo) - vuelta(b.mural.angulo))

function Proyecto() {
  const panel = useExperiencia((s) => s.panel)
  const abrirEn = useExperiencia((s) => s.abrirEn)
  const cerrarPanel = useExperiencia((s) => s.cerrarPanel)
  const indice = PROYECTOS.findIndex((p) => p.id === panel.id)
  const proyecto = PROYECTOS[indice]
  if (!proyecto) return null
  const C = TEXTOS.clasico.caso
  const M = TEXTOS.murales
  const titulo = esMarcador(proyecto.titulo) ? `Proyecto ${indice + 1}` : proyecto.titulo
  const orden = EN_ORDEN_DE_VISITA()
  const posicion = orden.findIndex((p) => p.id === proyecto.id)
  const ir = (paso) => abrirEn('cueva', { tipo: 'proyecto', id: orden[(posicion + paso + orden.length) % orden.length].id })
  return (
    <Panel
      lugar={M.lugar}
      seccion={titulo}
      acciones={(
        <>
          <button type="button" className="boton" onClick={() => ir(-1)}><span aria-hidden="true">← </span>{M.anterior}</button>
          <button type="button" className="boton" onClick={() => ir(1)}>{M.siguiente}<span aria-hidden="true"> →</span></button>
          <button type="button" className="boton" onClick={cerrarPanel}>{M.explorar}</button>
          <Link className="boton" to={`${RUTA_CLASICA}/proyecto/${proyecto.id}`}>{M.verClasico}</Link>
        </>
      )}
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
      {/* El video del destacado se proyecta en su mural (HU-23); aquí, su contenido en texto */}
      {proyecto.video?.transcripcion && (
        <details>
          <summary>{M.transcripcion}</summary>
          <p>{proyecto.video.transcripcion}</p>
        </details>
      )}
    </Panel>
  )
}

// Secciones de los lugares (17-nov): el vado, el sendero y la cima. Mismo contenido que la versión clásica
const S = TEXTOS.clasico.secciones
const C2 = TEXTOS.clasico

function EnClasico({ seccion }) {
  return <Link className="boton" to={`${RUTA_CLASICA}#${seccion}`}>{TEXTOS.murales.verClasico}</Link>
}

function Habilidades() {
  return (
    <Panel lugar={S.habilidades.lugar} seccion={S.habilidades.titulo} acciones={<EnClasico seccion="habilidades" />}>
      {HABILIDADES.map((h) => (
        <section key={h.id} className="panel-grupo">
          <h3>{h.categoria}</h3>
          <dl>
            {Object.entries(C2.niveles).map(([nivel, etiqueta]) => h[nivel].length > 0 && (
              <div key={nivel}>
                <dt>{etiqueta}</dt>
                <dd>{h[nivel].join(' · ')}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </Panel>
  )
}

function Trayectoria() {
  // El sendero se sube: el hito más reciente arriba
  return (
    <Panel lugar={S.trayectoria.lugar} seccion={S.trayectoria.titulo} acciones={<EnClasico seccion="trayectoria" />}>
      <ol className="panel-hitos" reversed>
        {[...TRAYECTORIA].reverse().map((hito) => (
          <li key={hito.id}>
            <strong>{hito.anio} · {hito.titulo}</strong>
            <span className="opcion-detalle">{hito.lugar}</span>
            <p>{hito.logro}</p>
          </li>
        ))}
      </ol>
    </Panel>
  )
}

function Vision() {
  const abrirPanel = useExperiencia((s) => s.abrirPanel)
  const viajar = useExperiencia((s) => s.viajar)
  return (
    <Panel
      lugar={S.vision.lugar}
      seccion={S.vision.titulo}
      acciones={(
        <>
          <button type="button" className="boton boton-principal" onClick={() => abrirPanel({ tipo: 'contacto' })}>{TEXTOS.sobreMi.contactar}</button>
          <button type="button" className="boton" onClick={() => abrirPanel({ tipo: 'construccion' })}>{TEXTOS.vision.construccion}</button>
          <button type="button" className="boton" onClick={() => viajar('campamento')}>{TEXTOS.vision.volver}</button>
        </>
      )}
    >
      <dl>
        <div><dt>{C2.vision.busco}</dt><dd>{VISION.busco}</dd></div>
        <div><dt>{C2.vision.intereses}</dt><dd>{VISION.intereses}</dd></div>
        <div><dt>{C2.vision.disponibilidad}</dt><dd>{VISION.disponibilidad}</dd></div>
        <div><dt>{C2.vision.proximo}</dt><dd>{VISION.proyectoActual}</dd></div>
      </dl>
    </Panel>
  )
}

// Tarjeta de una runa del vado (HU-20): sus habilidades en tres grupos, sin porcentajes
function Runa() {
  const panel = useExperiencia((s) => s.panel)
  const abrirPanel = useExperiencia((s) => s.abrirPanel)
  const activadas = useExperiencia((s) => s.visitados.filter((v) => v.startsWith('runa-')).length)
  const habilidad = HABILIDADES.find((h) => h.id === panel.id)
  if (!habilidad) return null
  const R = TEXTOS.runa
  return (
    <Panel
      lugar={R.lugar}
      seccion={R.titulo(habilidad.categoria)}
      acciones={<button type="button" className="boton" onClick={() => abrirPanel({ tipo: 'habilidades' })}>{R.todas}</button>}
    >
      <dl>
        {Object.entries(C2.niveles).map(([nivel, etiqueta]) => habilidad[nivel].length > 0 && (
          <div key={nivel}>
            <dt>{etiqueta}</dt>
            <dd>{habilidad[nivel].join(' · ')}</dd>
          </div>
        ))}
      </dl>
      <p className="panel-estado">{R.activadas(activadas, HABILIDADES.length)}</p>
    </Panel>
  )
}

// Tarjeta de un mojón del sendero (HU-24): año, título, lugar y una línea de logro
function Hito() {
  const panel = useExperiencia((s) => s.panel)
  const abrirPanel = useExperiencia((s) => s.abrirPanel)
  const hito = TRAYECTORIA.find((h) => h.id === panel.id)
  if (!hito) return null
  return (
    <Panel
      lugar={TEXTOS.hito.lugar}
      seccion={`${hito.anio} · ${hito.titulo}`}
      acciones={<button type="button" className="boton" onClick={() => abrirPanel({ tipo: 'trayectoria' })}>{TEXTOS.hito.todos}</button>}
    >
      <p className="opcion-detalle">{hito.lugar}</p>
      <p>{hito.logro}</p>
    </Panel>
  )
}

// "Cómo construí esta isla" (HU-25, 03 E14): el stack, las decisiones técnicas y los créditos (CREDITS.md)
function Construccion() {
  const K = TEXTOS.construccion
  const bitacora = PROYECTOS.find((p) => p.id === 'bitacora')
  return (
    <Panel lugar={K.lugar} seccion={K.titulo} acciones={<EnlaceExterno etiqueta={K.codigo} url={bitacora?.enlaces.codigo} />}>
      <h3>{K.stack}</h3>
      <ul>{K.stackLista.map((linea) => <li key={linea}>{linea}</li>)}</ul>
      <h3>{K.decisiones}</h3>
      <ul>{K.decisionesLista.map((linea) => <li key={linea}>{linea}</li>)}</ul>
      <h3>{K.creditos}</h3>
      <ul>{K.creditosLista.map((linea) => <li key={linea}>{linea}</li>)}</ul>
    </Panel>
  )
}

const PANELES = {
  'sobre-mi': SobreMi, contacto: Contacto, ajustes: Ajustes, proyecto: Proyecto, habilidades: Habilidades,
  trayectoria: Trayectoria, vision: Vision, runa: Runa, hito: Hito, construccion: Construccion,
}

export function Paneles() {
  const panel = useExperiencia((s) => s.panel)
  const Contenido = panel ? PANELES[panel.tipo] : null
  return Contenido ? <Contenido key={`${panel.tipo}-${panel.id ?? ""}`} /> : null
}
