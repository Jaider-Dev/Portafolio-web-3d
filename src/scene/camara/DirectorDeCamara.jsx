import { useEffect, useRef } from 'react'
import { CameraControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { LUGARES_POR_ID } from '../../data/lugares.js'
import { PROYECTOS } from '../../data/proyectos'
import { useExperiencia } from '../../store/useExperiencia'
import { centroDelMural, puntoEnLaPared } from '../lugares/galeria'

// Límites del modo panorámico (06 §12)
const MIN_DISTANCIA = 3
const MAX_DISTANCIA = 60
const MAX_POLAR = Math.PI * 0.48
const LIMITES = new THREE.Box3(new THREE.Vector3(-30, 0, -33), new THREE.Vector3(30, 18, 26))
// Galería de la cueva (lugares/galeria.js, elipse de 7 × 5,6 m y 4,6 m de alto): el objetivo queda cerca
// del centro y la cámara a ≤ 3 m de él, así nunca sale de la cúpula (con 4 m llegaba a atravesar el fondo)
const LIMITES_CUEVA = new THREE.Box3(new THREE.Vector3(2.5, 1.2, -25.5), new THREE.Vector3(5.5, 2.2, -23))
const DISTANCIA_CUEVA = 3
const MIN_POLAR_CUEVA = 1.1 // la cámara no sube más de ~1,4 m sobre el objetivo: no atraviesa el techo

const DURACION = { vuelo: 3.5, viajando: 1.5 } // segundos (HU-03 y HU-08)
const FOV_INTRO = 38
const FOV_NORMAL = 50

const CENTRO_ISLA = new THREE.Vector3(0, 2, -5.5)
// Vista del mirador (HU-25): toda la isla desde lo alto, dentro de los límites del modo panorámico
const VISTA_MIRADOR = [CENTRO_ISLA.x + 26, CENTRO_ISLA.y + 32, CENTRO_ISLA.z + 34]
const ORBITA = { radio: 118, altura: 52, velocidad: 0.07, mirandoA: [0, -16, -5.5] } // la isla queda sobre la tarjeta de título
const MEDIO_ANCHO_ISLA = 32

const suave = (t) => t * t * (3 - 2 * t)

// En pantallas verticales cabe menos a lo ancho: la cámara retrocede en la misma línea de visión
const retrocesoVertical = (aspecto, referencia) => Math.max(1, referencia / aspecto)

const dentroDeOrbita = (angulo, aspecto) => {
  const k = retrocesoVertical(aspecto, 0.74)
  return [
    CENTRO_ISLA.x + Math.sin(angulo) * ORBITA.radio * k,
    ORBITA.altura * k,
    CENTRO_ISLA.z + Math.cos(angulo) * ORBITA.radio * k,
  ]
}

const encuadreDe = (lugar, aspecto) => {
  const { posicion, objetivo } = lugar.camara
  // La cueva es una sala cerrada: retroceder dejaría la cámara fuera de ella
  const k = lugar.id === 'cueva' ? 1 : retrocesoVertical(aspecto, 1.15)
  return {
    objetivo,
    posicion: posicion.map((valor, eje) => objetivo[eje] + (valor - objetivo[eje]) * k),
  }
}

const distanciaMaxima = (aspecto) => {
  if (aspecto >= 1.1) return MAX_DISTANCIA
  // En vertical la isla es más ancha que la pantalla: se permite alejar lo justo para que quepa
  return Math.max(MAX_DISTANCIA, MEDIO_ANCHO_ISLA / (Math.tan(THREE.MathUtils.degToRad(FOV_NORMAL / 2)) * aspecto))
}

const hazFov = (camara, fov) => {
  if (camara.fov === fov) return
  camara.fov = fov
  camara.updateProjectionMatrix()
}

export function DirectorDeCamara() {
  const controles = useRef(null)
  const vuelo = useRef(null)
  const angulo = useRef(0.4)
  const camara = useThree((s) => s.camera)
  const aspecto = useThree((s) => s.viewport.aspect)
  const fase = useExperiencia((s) => s.fase)
  const destino = useExperiencia((s) => s.destino)
  const menuViaje = useExperiencia((s) => s.menuViaje)
  const zona = useExperiencia((s) => s.zona)
  const panel = useExperiencia((s) => s.panel)
  const vistaMirador = useExperiencia((s) => s.vistaMirador)
  const enMural = useRef(false) // la cámara se acercó a un mural: al cerrar la ficha vuelve al encuadre de la cueva

  // Límites y bloqueo según la fase: en cinemática no hay límites, explorando sí
  useEffect(() => {
    const c = controles.current
    if (!c) return
    const explorando = fase === 'explorando'
    // Dentro de la cueva se orbita alrededor del centro de la galería sin salir de ella: girando
    // se ven los murales del fondo y, hacia la entrada, la cascada cayendo tras la puerta
    const enCueva = explorando && zona === 'cueva'
    if (enCueva && enMural.current) {
      // Antes de poner los límites de la galería: el objetivo vuelve a su centro y no se recorta de golpe
      enMural.current = false
      const { posicion, objetivo } = LUGARES_POR_ID.cueva.camara
      const suave = !useExperiencia.getState().ajustes.reducirMovimiento
      c.setLookAt(...posicion, ...objetivo, suave)
      c.setFocalOffset(0, 0, 0, suave)
    }
    c.enabled = explorando && !menuViaje
    c.minDistance = enCueva ? 1 : explorando ? MIN_DISTANCIA : 0
    c.maxDistance = enCueva ? DISTANCIA_CUEVA : explorando ? distanciaMaxima(aspecto) : Infinity
    c.maxPolarAngle = explorando ? MAX_POLAR : Math.PI
    c.minPolarAngle = enCueva ? MIN_POLAR_CUEVA : 0
    c.setBoundary(enCueva ? LIMITES_CUEVA : explorando ? LIMITES : null)
  }, [fase, menuViaje, aspecto, zona])

  // Ficha de un proyecto abierta en la cueva (HU-22): la cámara se coloca de frente a su mural, desde
  // el centro de la galería. Con "Anterior" o "Siguiente" se desplaza al mural del otro proyecto
  useEffect(() => {
    const c = controles.current
    if (!c || fase !== 'panel' || zona !== 'cueva' || panel?.tipo !== 'proyecto' || vuelo.current) return
    const proyecto = PROYECTOS.find((p) => p.id === panel.id)
    if (!proyecto) return
    const { angulo } = proyecto.mural
    const suave = !useExperiencia.getState().ajustes.reducirMovimiento
    enMural.current = true
    // Desde cerca del centro de la galería: el mural destacado (2,8 m) cabe entero junto a la ficha
    const desde = puntoEnLaPared(angulo, 0.1, 1.8).posicion
    const mural = centroDelMural(angulo)
    c.setLookAt(...desde, ...mural, suave)
    // La ficha ocupa la derecha de la pantalla (440 px): la vista se corre para que el mural quede
    // centrado en la parte que sigue a la vista. En pantallas estrechas la ficha la cubre entera
    const ancho = window.innerWidth
    if (ancho > 640) {
      const distancia = Math.hypot(desde[0] - mural[0], desde[2] - mural[2])
      const medioAncho = distancia * Math.tan(THREE.MathUtils.degToRad(camara.fov / 2)) * camara.aspect
      c.setFocalOffset((Math.min(440, ancho) / ancho) * medioAncho, 0, 0, suave)
    }
  }, [fase, zona, panel, camara])

  // Mirador de la cima (HU-25): la cámara se abre a toda la isla. Al arrastrar se vuelve a explorar
  // y las etiquetas de los lugares desaparecen
  useEffect(() => {
    const c = controles.current
    if (!c || !vistaMirador) return undefined
    c.setLookAt(...VISTA_MIRADOR, CENTRO_ISLA.x, CENTRO_ISLA.y, CENTRO_ISLA.z, !useExperiencia.getState().ajustes.reducirMovimiento)
    const terminar = () => useExperiencia.getState().setVistaMirador(false)
    c.addEventListener('controlstart', terminar)
    return () => c.removeEventListener('controlstart', terminar)
  }, [vistaMirador])

  // Empieza un vuelo cuando el store pide ir a un destino
  useEffect(() => {
    const c = controles.current
    if (!c || !destino || (fase !== 'vuelo' && fase !== 'viajando')) return undefined

    const { posicion, objetivo } = encuadreDe(LUGARES_POR_ID[destino], camara.aspect)
    const { llegar, ajustes } = useExperiencia.getState()
    c.setFocalOffset(0, 0, 0, false) // por si venía de un mural
    enMural.current = false
    if (ajustes.reducirMovimiento) {
      c.setLookAt(...posicion, ...objetivo, false)
      hazFov(camara, FOV_NORMAL)
      llegar()
      return undefined
    }

    const desde = c.getPosition(new THREE.Vector3())
    const mirandoDesde = c.getTarget(new THREE.Vector3())
    const hasta = new THREE.Vector3(...posicion)
    // Punto de control elevado: la cámara sube y baja en arco (06 §12)
    const control = desde.clone().lerp(hasta, 0.5)
    control.y = Math.max(desde.y, hasta.y) + desde.distanceTo(hasta) * 0.25
    vuelo.current = {
      curva: new THREE.QuadraticBezierCurve3(desde, control, hasta),
      mirandoDesde,
      mirandoHasta: new THREE.Vector3(...objetivo),
      fovDesde: camara.fov,
      duracion: DURACION[fase],
      t: 0,
    }

    // Toda cinemática se puede saltar con Esc o con un clic (04 §6)
    const saltar = (e) => {
      if (e.type === 'keydown' && e.key !== 'Escape') return
      if (vuelo.current) vuelo.current.t = 1
    }
    window.addEventListener('keydown', saltar)
    window.addEventListener('pointerdown', saltar)
    return () => {
      window.removeEventListener('keydown', saltar)
      window.removeEventListener('pointerdown', saltar)
    }
  }, [destino, fase, camara])

  const punto = useRef(new THREE.Vector3())
  const mirada = useRef(new THREE.Vector3())
  const objetivoActual = useRef(new THREE.Vector3())

  useFrame((_, delta) => {
    const c = controles.current
    if (!c) return
    const { fase: faseActual, ajustes, panel, llegar } = useExperiencia.getState()
    const paso = Math.min(delta, 0.1)

    const conVistaAerea = faseActual === 'intro' || faseActual === 'cargando' || (faseActual === 'panel' && !vuelo.current && useExperiencia.getState().faseTrasPanel === 'intro')
    if (conVistaAerea) {
      if (!ajustes.reducirMovimiento && !panel) angulo.current += ORBITA.velocidad * paso
      hazFov(camara, FOV_INTRO)
      c.setLookAt(...dentroDeOrbita(angulo.current, camara.aspect), ...ORBITA.mirandoA, false)
      return
    }

    if (vuelo.current) {
      const v = vuelo.current
      v.t = Math.min(1, v.t + Math.min(delta, 0.25) / v.duracion) // tiempo real: un frame lento no alarga el vuelo
      const avance = suave(v.t)
      v.curva.getPoint(avance, punto.current)
      mirada.current.lerpVectors(v.mirandoDesde, v.mirandoHasta, avance)
      hazFov(camara, THREE.MathUtils.lerp(v.fovDesde, FOV_NORMAL, avance))
      c.setLookAt(punto.current.x, punto.current.y, punto.current.z, mirada.current.x, mirada.current.y, mirada.current.z, false)
      if (v.t === 1) {
        vuelo.current = null
        llegar()
      }
      return
    }

    // Al alejarse, el centro de giro se acerca al de la isla para que siga entera en el encuadre (HU-01)
    if (faseActual === 'explorando') {
      const lejos = THREE.MathUtils.smoothstep(c.distance, 28, MAX_DISTANCIA)
      if (lejos > 0) {
        c.getTarget(objetivoActual.current)
        objetivoActual.current.lerp(CENTRO_ISLA, lejos * Math.min(1, paso * 4))
        c.moveTo(objetivoActual.current.x, objetivoActual.current.y, objetivoActual.current.z, false)
      }
    }
  })

  return <CameraControls ref={controles} makeDefault smoothTime={0.15} />
}
