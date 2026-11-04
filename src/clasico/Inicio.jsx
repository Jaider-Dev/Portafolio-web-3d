import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ENLACES } from '../data/enlaces'
import { HABILIDADES } from '../data/habilidades'
import { PERFIL, VISION } from '../data/perfil'
import { PROYECTOS } from '../data/proyectos'
import { TEXTOS } from '../data/textos'
import { TRAYECTORIA } from '../data/trayectoria'
import { EnlaceClasico } from './EnlaceClasico'
import { RUTA_CLASICA, rutaIslaDe } from '../utils/rutas'
import { hayWebGL } from '../utils/webgl'

const T = TEXTOS.clasico

function Seccion({ id, children }) {
  const { titulo, lugar } = T.secciones[id]
  return (
    <section id={id} className="clasico-seccion" aria-labelledby={`${id}-titulo`}>
      <h2 id={`${id}-titulo`}>{titulo} <span className="subtitulo">· {lugar}</span></h2>
      {children}
      {hayWebGL() && <p><Link to={rutaIslaDe(id)}>{T.verEnIsla}</Link></p>}
    </section>
  )
}

export function Inicio() {
  const { hash } = useLocation()

  // React Router no desplaza hasta el ancla por sí solo
  useEffect(() => {
    if (!hash) return
    const reducir = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    document.querySelector(hash)?.scrollIntoView({ behavior: reducir ? 'auto' : 'smooth' })
  }, [hash])

  return (
    <>
      <section className="clasico-portada" aria-labelledby="clasico-nombre">
        <h1 id="clasico-nombre">{PERFIL.nombre}</h1>
        <p>{PERFIL.rol}</p>
        <div className="acciones">
          <Link className="boton boton-principal" to={`${RUTA_CLASICA}#proyectos`}>{T.verProyectos}</Link>
          <Link className="boton" to={`${RUTA_CLASICA}#contacto`}>{T.contacto}</Link>
        </div>
      </section>

      <Seccion id="sobre-mi">
        <p>{PERFIL.resumen}</p>
        <ul>{PERFIL.datos.map((dato) => <li key={dato}>{dato}</li>)}</ul>
      </Seccion>

      <Seccion id="habilidades">
        {HABILIDADES.map((habilidad) => (
          <article key={habilidad.id}>
            <h3>{habilidad.categoria}</h3>
            <dl>
              {Object.entries(T.niveles).map(([nivel, etiqueta]) => (
                habilidad[nivel].length > 0 && (
                  <div key={nivel}>
                    <dt>{etiqueta}</dt>
                    <dd>{habilidad[nivel].join(' · ')}</dd>
                  </div>
                )
              ))}
            </dl>
          </article>
        ))}
      </Seccion>

      <Seccion id="proyectos">
        <ul className="clasico-tarjetas">
          {PROYECTOS.map((proyecto) => (
            <li key={proyecto.id}>
              <h3><Link to={`${RUTA_CLASICA}/proyecto/${proyecto.id}`}>{proyecto.titulo}</Link></h3>
              <p>{proyecto.resumen}</p>
            </li>
          ))}
        </ul>
        <p>{T.vision.proximo}: {VISION.proyectoActual}</p>
      </Seccion>

      <Seccion id="trayectoria">
        <ol>
          {TRAYECTORIA.map((hito) => (
            <li key={hito.id}>
              <strong>{hito.anio} · {hito.titulo}</strong>, {hito.lugar}. {hito.logro}
            </li>
          ))}
        </ol>
      </Seccion>

      <Seccion id="vision">
        <dl>
          <div><dt>{T.vision.busco}</dt><dd>{VISION.busco}</dd></div>
          <div><dt>{T.vision.intereses}</dt><dd>{VISION.intereses}</dd></div>
          <div><dt>{T.vision.disponibilidad}</dt><dd>{VISION.disponibilidad}</dd></div>
        </dl>
      </Seccion>

      <Seccion id="contacto">
        <p>{TEXTOS.contacto.invitacion}</p>
        <p>{TEXTOS.contacto.correo}: {ENLACES.correo}</p>
        <div className="acciones">
          <EnlaceClasico etiqueta={TEXTOS.contacto.cv} url={ENLACES.cv} />
          <EnlaceClasico etiqueta={TEXTOS.contacto.linkedin} url={ENLACES.linkedin} />
          <EnlaceClasico etiqueta={TEXTOS.contacto.github} url={ENLACES.github} />
        </div>
      </Seccion>
    </>
  )
}
