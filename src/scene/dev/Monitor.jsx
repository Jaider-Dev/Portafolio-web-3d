import { useEffect, useRef } from 'react'
import { Stats } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

// Helpers de la luz principal (HU-13): su dirección y la caja de su cámara de sombras, para ajustar
// esa caja a la isla. Siguen a la luz durante el cambio de mañana a noche
function AyudasDeLuz() {
  const escena = useThree((s) => s.scene)
  const ayudas = useRef([])

  // La luz la crea otro componente: se buscan y se añaden a mano (sistema externo a React)
  useEffect(() => {
    const luz = escena.getObjectByName('luz-principal')
    if (!luz) return undefined
    ayudas.current = [new THREE.DirectionalLightHelper(luz, 4), new THREE.CameraHelper(luz.shadow.camera)]
    ayudas.current.forEach((ayuda) => escena.add(ayuda))
    return () => {
      ayudas.current.forEach((ayuda) => {
        escena.remove(ayuda)
        ayuda.dispose()
      })
      ayudas.current = []
    }
  }, [escena])

  useFrame(() => ayudas.current.forEach((ayuda) => ayuda.update()))

  return null
}

// Solo en desarrollo (HT-06): panel de rendimiento, gl.info en consola y, con ?depurar, ejes, rejilla
// y los helpers de la luz principal
export default function Monitor() {
  const estado = useThree()
  const conAyudas = new URLSearchParams(window.location.search).has('depurar')

  useEffect(() => {
    window.__escena = () => ({
      ...estado.gl.info.render,
      memoria: estado.gl.info.memory,
      programas: estado.gl.info.programs?.length,
      dpr: estado.gl.getPixelRatio(),
    })
    window.__estadoR3F = estado
    return () => {
      delete window.__escena
      delete window.__estadoR3F
    }
  }, [estado])

  return (
    <>
      <Stats className="stats-dev" />
      {conAyudas && (
        <>
          <axesHelper args={[10]} />
          <gridHelper args={[60, 60]} />
          <AyudasDeLuz />
        </>
      )}
    </>
  )
}
