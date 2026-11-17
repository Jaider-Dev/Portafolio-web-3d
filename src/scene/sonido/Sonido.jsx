import { useEffect, useMemo, useState } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { MUNDO } from '../../data/mundo.js'
import { useExperiencia } from '../../store/useExperiencia'
import { useHora } from '../../store/hora'
import { llenarFogata, llenarGrillos, llenarRuido } from './sintesis.js'

// Ambiente sonoro de la isla (HU-18, 05 §13, 06 §18). Silencio hasta que el visitante lo activa: el
// botón del HUD guarda la preferencia (ajustes.sonido) y reanuda el AudioContext dentro del clic.
// - Viento: global (THREE.Audio), con ráfagas lentas.
// - Fogata, río y cascadas: posicionales (THREE.PositionalAudio). Suben al acercar la cámara; la cascada
//   alta es la guía sonora hacia la cueva (02 §7).
// - Grillos: solo de noche.
// Todo se sintetiza en el navegador (sintesis.js): no hay archivos de audio.

// Fuentes posicionales: posición, tipo de sonido, volumen, distancia de referencia y filtro
const FUENTES = [
  { id: 'fogata', posicion: [MUNDO.fogata[0], 0.6, MUNDO.fogata[2]], sonido: 'fogata', volumen: 1.3, referencia: 4 },
  { id: 'cascada-alta', posicion: [MUNDO.cascadaAlta.borde[0], 6, MUNDO.cascadaAlta.borde[2] + 0.5], sonido: 'rosa', volumen: 0.9, referencia: 5, filtro: ['lowpass', 2400] },
  { id: 'cascada-baja', posicion: [MUNDO.cascadaBaja[0], 0, MUNDO.cascadaBaja[2]], sonido: 'rosa', volumen: 0.6, referencia: 6, filtro: ['lowpass', 1800] },
  { id: 'rio-puente', posicion: MUNDO.puente, sonido: 'blanco', volumen: 0.35, referencia: 5, filtro: ['bandpass', 1100] },
  { id: 'rio-vado', posicion: [0, 0, MUNDO.vado.z], sonido: 'blanco', volumen: 0.35, referencia: 5, filtro: ['bandpass', 900] },
]

// Volumen general del ambiente (13-nov: el autor lo pidió más bajo; antes era 1). Es un fondo, no protagonista
const VOLUMEN_GENERAL = 0.45

const VOLUMEN = {
  viento: { manana: 0.16, noche: 0.1 },
  grillos: { manana: 0, noche: 0.05 },
}

function bufer(contexto, segundos, llenar) {
  const b = contexto.createBuffer(1, Math.floor(contexto.sampleRate * segundos), contexto.sampleRate)
  llenar(b.getChannelData(0), contexto.sampleRate)
  return b
}

function enBucle(contexto, buffer) {
  const fuente = contexto.createBufferSource()
  fuente.buffer = buffer
  fuente.loop = true
  fuente.start()
  return fuente
}

function filtrar(contexto, entrada, [tipo, frecuencia], q = 0.7) {
  const filtro = contexto.createBiquadFilter()
  filtro.type = tipo
  filtro.frequency.value = frecuencia
  filtro.Q.value = q
  entrada.connect(filtro)
  return filtro
}

// Crea el grafo de audio una vez; devuelve lo que hay que montar en la escena y cómo pararlo
function crearAmbiente(oyente) {
  const contexto = oyente.context
  const ruidos = {
    blanco: bufer(contexto, 4, (d) => llenarRuido(d, 'blanco', 11)),
    rosa: bufer(contexto, 5, (d) => llenarRuido(d, 'rosa', 23)),
    marron: bufer(contexto, 6, (d) => llenarRuido(d, 'marron', 31)),
    fogata: bufer(contexto, 4, (d, sr) => llenarFogata(d, sr)),
    grillos: bufer(contexto, 1.8, (d, sr) => llenarGrillos(d, sr)),
  }
  const fuentes = []

  // Viento: ruido marrón paso bajo con una ganancia que sube y baja muy despacio (ráfagas)
  const brisa = enBucle(contexto, ruidos.marron)
  fuentes.push(brisa)
  const rafagas = contexto.createGain()
  rafagas.gain.value = 0.7
  filtrar(contexto, brisa, ['lowpass', 520]).connect(rafagas)
  const lfo = contexto.createOscillator()
  lfo.frequency.value = 0.07
  const profundidad = contexto.createGain()
  profundidad.gain.value = 0.3
  lfo.connect(profundidad).connect(rafagas.gain)
  lfo.start()
  fuentes.push(lfo)
  const viento = new THREE.Audio(oyente).setNodeSource(rafagas)
  viento.gain.gain.value = 0 // entra de forma gradual (efecto de la hora)

  const grillosFuente = enBucle(contexto, ruidos.grillos)
  fuentes.push(grillosFuente)
  const grillos = new THREE.Audio(oyente).setNodeSource(filtrar(contexto, grillosFuente, ['highpass', 3000]))
  grillos.gain.gain.value = 0

  const posicionales = FUENTES.map(({ id, posicion, sonido, volumen, referencia, filtro }) => {
    const fuente = enBucle(contexto, ruidos[sonido])
    fuente.playbackRate.value = 0.94 + (id.length % 5) * 0.03 // las dos copias del río no suenan idénticas
    fuentes.push(fuente)
    const audio = new THREE.PositionalAudio(oyente)
    audio.setNodeSource(filtro ? filtrar(contexto, fuente, filtro) : fuente)
    audio.setDistanceModel('inverse')
    audio.setRefDistance(referencia)
    audio.setRolloffFactor(1.1)
    audio.setVolume(volumen)
    audio.name = `sonido-${id}`
    return { id, posicion, audio }
  })

  // Orden importante: primero se sueltan los THREE.Audio (desconectan su fuente de su salida) y luego
  // las fuentes. Al revés, Audio.disconnect() lanza InvalidAccessError y tumba el Canvas
  const detener = () => {
    for (const a of [viento, grillos, ...posicionales.map((p) => p.audio)]) {
      try {
        a.disconnect()
      } catch {
        // ya desconectado
      }
      a.gain.disconnect()
    }
    for (const f of fuentes) {
      try {
        f.stop()
      } catch {
        // ya estaba parada
      }
      f.disconnect()
    }
  }
  return { viento, grillos, posicionales, detener }
}

function Ambiente() {
  const camara = useThree((s) => s.camera)
  const hora = useHora((s) => s.hora)
  const oyente = useMemo(() => {
    const o = new THREE.AudioListener()
    o.setMasterVolume(VOLUMEN_GENERAL)
    return o
  }, [])
  // El grafo se crea en un efecto y no en useMemo: StrictMode ejecuta useMemo dos veces en desarrollo
  // y la copia descartada seguiría sonando sin que nadie la pare
  const [ambiente, setAmbiente] = useState(null)

  useEffect(() => {
    const creado = crearAmbiente(oyente)
    camara.add(oyente)
    // Sincroniza con un sistema externo (Web Audio): el grafo solo existe mientras el efecto vive
    // oxlint-disable-next-line react/set-state-in-effect
    setAmbiente(creado)
    return () => {
      camara.remove(oyente)
      creado.detener()
      setAmbiente(null)
    }
  }, [camara, oyente])

  // Si la preferencia venía guardada de otra visita, el navegador deja el contexto suspendido hasta
  // la primera interacción: se reanuda en ese momento
  useEffect(() => {
    const contexto = oyente.context
    if (contexto.state === 'running') return undefined
    const reanudar = () => contexto.resume()
    window.addEventListener('pointerdown', reanudar, { once: true })
    window.addEventListener('keydown', reanudar, { once: true })
    return () => {
      window.removeEventListener('pointerdown', reanudar)
      window.removeEventListener('keydown', reanudar)
    }
  }, [oyente])

  // Con la pestaña oculta la isla no se dibuja: tampoco debe sonar
  useEffect(() => {
    const contexto = oyente.context
    const alCambiar = () => (document.hidden ? contexto.suspend() : contexto.resume())
    document.addEventListener('visibilitychange', alCambiar)
    return () => document.removeEventListener('visibilitychange', alCambiar)
  }, [oyente])

  // Mañana y noche: transición suave del viento y de los grillos (y entrada gradual al activar)
  useEffect(() => {
    if (!ambiente) return
    const t = oyente.context.currentTime
    ambiente.viento.gain.gain.setTargetAtTime(VOLUMEN.viento[hora], t, 1.2)
    ambiente.grillos.gain.gain.setTargetAtTime(VOLUMEN.grillos[hora], t, 1.2)
  }, [hora, oyente, ambiente])

  if (!ambiente) return null
  return (
    <group name="sonido">
      {ambiente.posicionales.map(({ id, posicion, audio }) => (
        <primitive key={id} object={audio} position={posicion} />
      ))}
    </group>
  )
}

export function Sonido() {
  const activo = useExperiencia((s) => s.ajustes.sonido)
  return activo ? <Ambiente /> : null
}
