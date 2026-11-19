import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { PERFIL } from '../data/perfil'
import { PROYECTO_DESTACADO } from '../data/proyectos'
import { TEXTOS } from '../data/textos'
import { useExperiencia } from '../store/useExperiencia'
import { RUTA_CLASICA } from '../utils/rutas'
import { BotonHora } from './BotonHora'
import { BotonIdioma } from './BotonIdioma'

// Escena E1: nombre, rol y accesos directos sobre el plano aéreo (HU-03)
export function Intro() {
  const fase = useExperiencia((s) => s.fase)
  const faseTrasPanel = useExperiencia((s) => s.faseTrasPanel)
  const comenzar = useExperiencia((s) => s.comenzar)
  const abrirPanel = useExperiencia((s) => s.abrirPanel)
  const viajar = useExperiencia((s) => s.viajar)
  const principal = useRef(null)
  // Sigue montada bajo el diario: al cerrarlo, el foco vuelve al botón que lo abrió
  const visible = fase === 'intro' || (fase === 'panel' && faseTrasPanel === 'intro')

  useEffect(() => {
    if (visible) principal.current?.focus()
  }, [visible])

  if (!visible) return null

  return (
    <>
      <section className="intro" aria-labelledby="intro-titulo">
        <h1 id="intro-titulo" className="intro-nombre">{PERFIL.nombre}</h1>
        <p className="intro-rol">{PERFIL.rol}</p>
        <p>{TEXTOS.intro.frase}</p>
        <div className="acciones">
          <button ref={principal} type="button" className="boton boton-principal" onClick={comenzar}>{TEXTOS.intro.comenzar}</button>
          {/* Acceso directo a los proyectos (HU-22, pilar P1): viaja a la cueva con la ficha del destacado */}
          <button type="button" className="boton" onClick={() => viajar('cueva', { tipo: 'proyecto', id: PROYECTO_DESTACADO.id })}>{TEXTOS.intro.proyectos}</button>
          <button type="button" className="boton" onClick={() => abrirPanel({ tipo: 'contacto' })}>{TEXTOS.intro.contacto}</button>
          <Link className="boton" to={RUTA_CLASICA}>{TEXTOS.intro.clasico}</Link>
        </div>
      </section>
      {/* La hora y el idioma se eligen desde el primer momento: la intro ya muestra la isla y es lo
          primero que lee quien llega (después, el idioma está en Ajustes) */}
      {fase === 'intro' && <BotonIdioma className="esquina-idioma" />}
      {fase === 'intro' && <BotonHora className="esquina-hora" />}
    </>
  )
}
