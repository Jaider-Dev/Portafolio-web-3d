import { useState } from 'react'
import { Center, Text, Text3D, useCursor } from '@react-three/drei'
import { useLocation, useNavigate } from 'react-router-dom'
import { ENLACES } from '../../data/enlaces'
import { MUNDO } from '../../data/mundo.js'
import { PERFIL } from '../../data/perfil'
import { TEXTOS } from '../../data/textos'
import { useExperiencia } from '../../store/useExperiencia'
import { esMarcador } from '../../utils/marcadores'
import { rutaClasicaDe } from '../../utils/rutas'
import { PALETA } from '../paleta'

// Inter Bold convertida con scripts/generar-fuente-3d.mjs: Helvetiker no trae tildes. Provisional hasta PL-04
const FUENTE_3D = '/fonts/inter-700.typeface.json'
const FUENTE_2D = '/fonts/inter-latin-400-normal.woff' // provisional hasta PL-04

// Letrero con el nombre, en texto 3D (HU-09). Ajustes de 06 §17 para no gastar triángulos
export function Letrero() {
  // El nombre siempre cabe en la tabla, sea cual sea su largo
  const tamano = Math.min(0.38, 2.9 / (PERFIL.nombre.length * 0.62))
  return (
    <group position={MUNDO.letrero} name="letrero" rotation-y={0.7}>
      {[-1.35, 1.35].map((x) => (
        <mesh key={x} position={[x, 0.75, 0]}>
          <cylinderGeometry args={[0.08, 0.1, 1.5, 6]} />
          <meshStandardMaterial color={PALETA.madera} flatShading />
        </mesh>
      ))}
      <mesh position={[0, 1.35, 0]}>
        <boxGeometry args={[3.2, 0.9, 0.12]} />
        <meshStandardMaterial color={PALETA.madera} flatShading />
      </mesh>
      <Center position={[0, 1.35, 0.1]}>
        <Text3D font={FUENTE_3D} size={tamano} height={0.08} curveSegments={4} bevelEnabled bevelSize={0.012} bevelThickness={0.012} bevelSegments={2}>
          {PERFIL.nombre}
          <meshStandardMaterial color={PALETA.realce} />
        </Text3D>
      </Center>
    </group>
  )
}

function Flecha({ etiqueta, altura, giro, alActivar }) {
  const [encima, setEncima] = useState(false)
  useCursor(encima)
  return (
    <group position-y={altura} rotation-y={giro}>
      <group
        scale={encima ? 1.12 : 1}
        onClick={(e) => {
          if (e.delta > 4) return // fue un arrastre de cámara, no un clic
          e.stopPropagation()
          alActivar()
        }}
        onPointerOver={(e) => {
          e.stopPropagation()
          setEncima(true)
        }}
        onPointerOut={() => setEncima(false)}
      >
        <mesh position={[0.65, 0, 0]}>
          <boxGeometry args={[1.1, 0.26, 0.08]} />
          <meshStandardMaterial color={encima ? PALETA.realce : PALETA.madera} flatShading />
        </mesh>
        <mesh position={[1.3, 0, 0]} rotation-z={-Math.PI / 2}>
          <coneGeometry args={[0.22, 0.34, 4]} />
          <meshStandardMaterial color={encima ? PALETA.realce : PALETA.madera} flatShading />
        </mesh>
      </group>
      {encima && (
        <Text font={FUENTE_2D} position={[0.8, 0.34, 0]} fontSize={0.26} color={PALETA.letrero} anchorX="center" outlineWidth={0.018} outlineColor={PALETA.realce}>
          {etiqueta}
        </Text>
      )}
    </group>
  )
}

// Poste de caminos (HU-09): cada flecha apunta a otro lugar donde encontrar al autor
export function Poste() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const notificar = useExperiencia((s) => s.notificar)

  const abrirExterno = (etiqueta, url) => {
    if (esMarcador(url)) {
      notificar({ tipo: 'enlace-pendiente', destino: etiqueta })
      return
    }
    window.open(url, '_blank', 'noopener')
  }

  const flechas = [
    { etiqueta: TEXTOS.poste.linkedin, giro: 0.5, alActivar: () => abrirExterno(TEXTOS.poste.linkedin, ENLACES.linkedin) },
    { etiqueta: TEXTOS.poste.github, giro: 2.4, alActivar: () => abrirExterno(TEXTOS.poste.github, ENLACES.github) },
    { etiqueta: TEXTOS.poste.clasico, giro: -0.6, alActivar: () => navigate(rutaClasicaDe(pathname)) },
    { etiqueta: TEXTOS.poste.cv, giro: 3.7, alActivar: () => abrirExterno(TEXTOS.poste.cv, ENLACES.cv) },
  ]

  return (
    <group position={MUNDO.poste} name="poste">
      <mesh position={[0, 1.4, 0]}>
        <cylinderGeometry args={[0.09, 0.11, 2.8, 6]} />
        <meshStandardMaterial color={PALETA.madera} flatShading />
      </mesh>
      {flechas.map((flecha, i) => <Flecha key={flecha.etiqueta} {...flecha} altura={2.5 - i * 0.48} />)}
    </group>
  )
}
