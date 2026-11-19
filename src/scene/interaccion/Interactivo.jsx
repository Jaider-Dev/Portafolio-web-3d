import { useEffect, useRef, useState } from 'react'
import { Html, useCursor } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useExperiencia } from '../../store/useExperiencia'
import { PALETA } from '../paleta'
import { registrar } from './registro'

// Sistema de interacción unificado (HT-11, 06 §14.1). Un objeto se vuelve interactivo envolviéndolo:
//
//   <Interactivo id="mochila" etiqueta="Diario · Contacto" position={[x, y, z]} alActivar={abrir}>
//     <mesh … />
//   </Interactivo>
//
// - Realce al pasar el puntero: el objeto crece un poco (escala amortiguada) y el cursor pasa a mano.
//   Si el hijo es una función, recibe { encima, visitado } para hacer su propio realce (emisión, color).
// - Etiqueta HTML anclada al objeto (<Html> de Drei, requisito de HTML 3D) con qué hace.
// - Clic o toque: abre su contenido. Arrastrar no es hacer clic (e.delta > 4 px) y stopPropagation evita
//   que el clic atraviese el objeto y llegue a lo que hay detrás (sesión 5: eventos de R3F).
// - Estados de 04 §7: reposo, disponible (encima), activo (al abrirse) y visitado (marca sutil: un rombo
//   pequeño sobre el objeto). Lo visitado se guarda en el store y en localStorage.
// - Se registra (registro.js) para que el modo explorador del sprint 4 elija el más centrado o cercano.
//
// Importante: los hijos van en coordenadas locales, porque el realce escala el grupo desde su origen.

const FASES_ACTIVAS = ['explorando', 'panel']

// `etiquetaEn`: dónde anclar la etiqueta y la marca si el objeto no está en el origen del grupo (los
// murales están pintados en coordenadas del mundo y no se escalan: realce = 1)
export function Interactivo({ id, etiqueta, pista, alActivar, children, altura = 1.6, realce = 1.08, marca = true, etiquetaEn, ...props }) {
  const grupo = useRef()
  const [encima, setEncima] = useState(false)
  const visitado = useExperiencia((s) => s.visitados.includes(id))
  const activo = useExperiencia((s) => FASES_ACTIVAS.includes(s.fase))
  useCursor(encima && activo)

  const activar = () => {
    alActivar()
    useExperiencia.getState().marcarVisitado(id)
  }
  // El registro guarda una función estable que llama a la acción vigente (alActivar puede cambiar)
  const activarRef = useRef(activar)
  useEffect(() => { activarRef.current = activar })
  useEffect(() => registrar(id, grupo.current, () => activarRef.current()), [id])

  useFrame((_, delta) => {
    const objetivo = encima && activo ? realce : 1
    const escala = grupo.current.scale.x
    if (Math.abs(escala - objetivo) < 0.001) return
    const quieto = useExperiencia.getState().ajustes.reducirMovimiento
    grupo.current.scale.setScalar(quieto ? objetivo : THREE.MathUtils.damp(escala, objetivo, 14, delta))
  })

  return (
    <group
      ref={grupo}
      name={`interactivo-${id}`}
      {...props}
      onClick={(e) => {
        if (e.delta > 4) return // fue un arrastre de la cámara, no un clic
        e.stopPropagation()
        if (useExperiencia.getState().fase === 'intro') return
        activar()
      }}
      onPointerOver={(e) => { e.stopPropagation(); setEncima(true) }}
      onPointerOut={() => setEncima(false)}
    >
      {typeof children === 'function' ? children({ encima: encima && activo, visitado }) : children}
      {marca && visitado && !encima && <MarcaVisitado posicion={etiquetaEn ?? [0, altura, 0]} />}
      {encima && activo && (
        <Html position={etiquetaEn ?? [0, altura, 0]} center className="etiqueta-3d" pointerEvents="none" zIndexRange={[20, 10]}>
          <strong>{etiqueta}</strong>
          {pista && <span>{pista}</span>}
          {visitado && <span className="etiqueta-visitado" aria-hidden="true">✓</span>}
        </Html>
      )}
    </group>
  )
}

// Marca de visitado: un rombo pequeño del color de realce que gira despacio sobre el objeto
function MarcaVisitado({ posicion: [x, y, z] }) {
  const rombo = useRef()
  useFrame((_, delta) => {
    if (!useExperiencia.getState().ajustes.reducirMovimiento) rombo.current.rotation.y += delta * 0.8
  })
  return (
    <mesh ref={rombo} position={[x, y - 0.2, z]} scale={[0.07, 0.11, 0.07]} raycast={() => null}>
      <octahedronGeometry args={[1, 0]} />
      <meshBasicMaterial color={PALETA.realce} transparent opacity={0.85} toneMapped={false} />
    </mesh>
  )
}
