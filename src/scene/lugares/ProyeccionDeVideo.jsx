import { useEffect } from 'react'
import { useVideoTexture } from '@react-three/drei'
import * as THREE from 'three'
import { PROYECTO_DESTACADO } from '../../data/proyectos'
import { centroDelMural, GALERIA } from './galeria'

// La proyección del video (HU-23). Va en su propio chunk: useVideoTexture de Drei incluye hls.js
// (~450 kB) y solo hace falta si el destacado tiene video y su ficha está abierta (VideoDelMural.jsx)

const ANCHO = 2.2
const ALTO = ANCHO * (9 / 16)

export default function ProyeccionDeVideo({ src }) {
  const textura = useVideoTexture(src, { muted: true, loop: true, start: true, playsInline: true, crossOrigin: 'anonymous' })
  useEffect(() => {
    const video = textura.image
    return () => video.pause() // fuera de la cueva o con la ficha cerrada, se pausa
  }, [textura])
  const [x, y, z] = centroDelMural(PROYECTO_DESTACADO.mural.angulo)
  const [cx, , cz] = GALERIA.centro
  // Un poco por delante de la pared, mirando al centro de la galería
  const hacia = new THREE.Vector3(cx - x, 0, cz - z).normalize()
  return (
    <mesh position={[x + hacia.x * 0.12, y, z + hacia.z * 0.12]} rotation-y={Math.atan2(hacia.x, hacia.z)} name="video-del-mural">
      <planeGeometry args={[ANCHO, ALTO]} />
      <meshBasicMaterial map={textura} toneMapped={false} transparent opacity={0.92} />
    </mesh>
  )
}

