import { useEffect, useMemo, useRef } from 'react'
import { useAnimations, useGLTF } from '@react-three/drei'
import { clone as clonarConEsqueleto } from 'three/examples/jsm/utils/SkeletonUtils.js'
import * as THREE from 'three'
import { useExperiencia } from '../../store/useExperiencia'
import { PALETA } from '../paleta'
import { CANDIDATO_ACTIVO, CANDIDATOS } from './candidatos'

// El explorador (personaje de HU-27/HU-31). Modelo preparado en Blender con blender/preparar_personaje.py:
// malla de quads, color y relieve horneados en dos texturas de 1K, esqueleto y tres clips en bucle:
// "reposo", "caminar" y "correr" (sesión 5: useAnimations). Mira hacia +Z.
// En el modo panorámico espera en el campamento; el modo explorador (sprint 4) lo moverá con física.
function materialMaqueta(original) {
  return new THREE.MeshStandardMaterial({
    color: PALETA.humo, // gris cálido de la paleta: no se añade ningún color nuevo
    normalMap: original.normalMap ?? null,
    roughness: 0.85,
    metalness: 0,
  })
}

// sinColor (17-nov): se muestra como maqueta gris, sin la textura de color pintada por zonas; conserva el
// mapa de normales para que se lean los pliegues
export function Explorador({ ruta = CANDIDATOS[CANDIDATO_ACTIVO].ruta, sinColor = false, animacion = 'reposo', ...props }) {
  const { scene, animations } = useGLTF(ruta)
  // Un SkinnedMesh no se puede reutilizar con <Clone>: SkeletonUtils.clone duplica también los huesos
  const modelo = useMemo(() => {
    const copia = clonarConEsqueleto(scene)
    copia.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true
        o.receiveShadow = true
        if (sinColor) o.material = materialMaqueta(o.material)
      }
    })
    return copia
  }, [scene, sinColor])
  const grupo = useRef()
  const { actions } = useAnimations(animations, grupo)
  const reducir = useExperiencia((s) => s.ajustes.reducirMovimiento)

  useEffect(() => {
    const accion = actions[animacion]
    if (!accion) return undefined
    // Con "reducir movimiento" se queda quieto en la primera pose del clip (velocidad 0)
    accion.reset().setEffectiveTimeScale(reducir ? 0 : 1).fadeIn(0.3).play()
    return () => accion.fadeOut(0.3)
  }, [actions, animacion, reducir])

  return (
    <group ref={grupo} name="explorador" {...props} dispose={null}>
      <primitive object={modelo} />
    </group>
  )
}

// Solo el candidato que sale en la isla: el otro no se descarga mientras no se elija
useGLTF.preload(CANDIDATOS[CANDIDATO_ACTIVO].ruta)
