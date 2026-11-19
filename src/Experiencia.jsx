import { Component, Fragment, lazy, Suspense, useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { useProgress } from '@react-three/drei'
import { useLocation, useNavigate } from 'react-router-dom'
import { LUGARES_POR_ID } from './data/lugares.js'
import { PROYECTOS } from './data/proyectos'
import { PERFIL } from './data/perfil'
import { TEXTOS } from './data/textos'
import { DirectorDeCamara } from './scene/camara/DirectorDeCamara'
import { Calidad } from './scene/Calidad'
import { Mundo } from './scene/Mundo'
import { useCalidad } from './scene/useCalidad'
import { useExperiencia } from './store/useExperiencia'
import { useIdioma } from './store/idioma'
import { HUD } from './ui/HUD'
import { Intro } from './ui/Intro'
import { MenuViaje } from './ui/MenuViaje'
import { Notificaciones } from './ui/Notificaciones'
import { PantallaDeCarga, PantallaDeError } from './ui/PantallaDeCarga'
import { Paneles } from './ui/paneles/Paneles'
import { lugarDeRuta, proyectoDeRuta, rutaDeEstado } from './utils/rutas'
import './ui/ui.css'

const Monitor = import.meta.env.DEV ? lazy(() => import('./scene/dev/Monitor')) : null
const simulaErrorDeCarga = () => new URLSearchParams(window.location.search).has('fallarcarga')

// Si falla la descarga de un recurso esencial, useGLTF lanza el error y llega aquí
class LimiteDeError extends Component {
  state = { conError: false }

  static getDerivedStateFromError() {
    return { conError: true }
  }

  componentDidCatch() {
    this.props.alFallar()
  }

  render() {
    return this.state.conError ? null : this.props.children
  }
}

const FalloSimulado = import.meta.env.DEV
  ? () => { throw new Error('Fallo de carga simulado') }
  : null

// Se monta cuando el Suspense termina: el núcleo de la isla ya está listo
function CargaLista() {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const { fase, setFase, viajar } = useExperiencia.getState()
    if (fase !== 'cargando') return
    setFase('intro')
    const lugar = lugarDeRuta(pathname)
    const proyecto = PROYECTOS.find((p) => p.id === proyectoDeRuta(pathname))
    // Enlace directo: se salta la intro (04, R-E). Un proyecto lleva a la cueva con su ficha abierta (HU-26)
    if (proyecto) viajar('cueva', { tipo: 'proyecto', id: proyecto.id })
    else if (LUGARES_POR_ID[lugar]) viajar(lugar)
    else if (pathname !== '/') navigate('/', { replace: true }) // enlace inválido: intro normal
  }, [pathname, navigate])

  return null
}

// La URL refleja lo que se ve sin llenar el historial (06 §6): /lugar/<id> al llegar a un lugar y
// /proyecto/<id> con la ficha de un proyecto abierta (HU-26). El canvas no se vuelve a montar
function SincronizarUrl() {
  const fase = useExperiencia((s) => s.fase)
  const zona = useExperiencia((s) => s.zona)
  const panel = useExperiencia((s) => s.panel)
  const faseTrasPanel = useExperiencia((s) => s.faseTrasPanel)
  const { pathname } = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const ruta = rutaDeEstado({ fase, zona, panel, faseTrasPanel })
    if (ruta && pathname !== ruta) navigate(ruta, { replace: true })
  }, [fase, zona, panel, faseTrasPanel, pathname, navigate])

  return null
}

export default function Experiencia() {
  // Antes del primer render: al volver de la versión clásica la escena se carga de nuevo
  useState(() => useExperiencia.getState().reiniciar())
  const fase = useExperiencia((s) => s.fase)
  const setFase = useExperiencia((s) => s.setFase)
  const reducirMovimiento = useExperiencia((s) => s.ajustes.reducirMovimiento)
  const { progress } = useProgress()
  const { perfil } = useCalidad()
  // Cambiar de idioma reescribe los textos (i18n/aplicar.js) y vuelve a montar la interfaz HTML con ellos.
  // El canvas no se toca: la isla, la cámara y el estado siguen igual
  const idioma = useIdioma((s) => s.idioma)

  useEffect(() => {
    document.querySelector('.experiencia canvas')?.setAttribute('aria-label', TEXTOS.canvas(PERFIL.nombre))
  }, [idioma])

  return (
    <main className="experiencia" data-reducir={reducirMovimiento || undefined}>
      <LimiteDeError alFallar={() => setFase('fallback')}>
        <Canvas
          shadows="percentage"
          dpr={perfil.dpr} // según la calidad (HU-17): el Canvas lo vuelve a aplicar si cambia
          camera={{ fov: 38, near: 0.5, far: 600, position: [40, 46, 85] }}
          onCreated={({ gl }) => {
            gl.domElement.setAttribute('role', 'img')
            gl.domElement.setAttribute('aria-label', TEXTOS.canvas(PERFIL.nombre))
          }}
        >
          <Suspense fallback={null}>
            {FalloSimulado && simulaErrorDeCarga() && <FalloSimulado />}
            <Mundo />
            <Calidad />
            <CargaLista />
          </Suspense>
          <DirectorDeCamara />
          {Monitor && <Suspense fallback={null}><Monitor /></Suspense>}
        </Canvas>
      </LimiteDeError>

      <SincronizarUrl />
      <Fragment key={idioma}>
      {fase === 'cargando' && <PantallaDeCarga porcentaje={Math.round(progress)} />}
      {fase === 'fallback' && <PantallaDeError />}
      <Intro />
      <HUD />
      <Paneles />
      <MenuViaje />
      <Notificaciones />
      </Fragment>
    </main>
  )
}
