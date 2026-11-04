import { useEffect } from 'react'
import { Stats } from '@react-three/drei'
import { useThree } from '@react-three/fiber'

// Solo en desarrollo (HT-06): panel de rendimiento, gl.info en consola y, con ?depurar, ejes y rejilla
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
        </>
      )}
    </>
  )
}
