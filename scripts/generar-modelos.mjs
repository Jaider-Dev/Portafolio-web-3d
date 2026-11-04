// Primeros modelos GLB del proyecto (HU-04): tienda, fogata, puente y menhir, construidos por código.
// Medidas de 02 · Mapa §2 y §5. 1 unidad = 1 m, +Y arriba, origen en la base de la pieza.
// Grises provisionales: los colores se deciden en PL-05. Se sustituirán por los de Blender en el sprint 2.
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as THREE from 'three'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

// GLTFExporter usa FileReader, que Node no tiene
globalThis.FileReader = class {
  async readAsArrayBuffer(blob) {
    this.result = await blob.arrayBuffer()
    this.onloadend?.()
  }
  async readAsDataURL(blob) {
    const base64 = Buffer.from(await blob.arrayBuffer()).toString('base64')
    this.result = `data:${blob.type};base64,${base64}`
    this.onloadend?.()
  }
}

const salida = resolve(dirname(fileURLToPath(import.meta.url)), '../public/models')
mkdirSync(salida, { recursive: true })

const material = (name, gris, roughness = 0.9) => new THREE.MeshStandardMaterial({
  name, color: new THREE.Color().setRGB(gris, gris, gris), roughness, metalness: 0, flatShading: true,
})
const MATERIALES = {
  lona: material('lona', 0.72),
  madera: material('madera', 0.32),
  piedra: material('piedra', 0.48),
  brasa: material('brasa', 0.9, 0.6),
  sombra: material('sombra', 0.08),
}

const colocar = (geometria, { p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1] } = {}) => {
  const matriz = new THREE.Matrix4().compose(
    new THREE.Vector3(...p),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(...r)),
    new THREE.Vector3(...s),
  )
  const plana = geometria.index ? geometria.toNonIndexed() : geometria.clone()
  plana.deleteAttribute('uv')
  plana.applyMatrix4(matriz)
  return plana
}

// Una malla por material: cada pieza cuesta un draw call por material
const pieza = (nombre, partes) => {
  const grupo = new THREE.Group()
  grupo.name = nombre
  for (const [clave, geometrias] of Object.entries(partes)) {
    const malla = new THREE.Mesh(mergeGeometries(geometrias), MATERIALES[clave])
    malla.name = `${nombre}_${clave}`
    grupo.add(malla)
  }
  return grupo
}

const prisma = (ancho, alto, largo) => {
  const forma = new THREE.Shape([
    new THREE.Vector2(-ancho / 2, 0), new THREE.Vector2(ancho / 2, 0), new THREE.Vector2(0, alto),
  ])
  const geometria = new THREE.ExtrudeGeometry(forma, { depth: largo, bevelEnabled: false })
  geometria.translate(0, 0, -largo / 2)
  return geometria
}

// Planta de 3 × 2,5 m y 2 m de alto; la entrada mira a +Z
const tienda = () => {
  const palo = new THREE.CylinderGeometry(0.04, 0.05, 2.1, 5)
  return pieza('tienda', {
    lona: [colocar(prisma(2.5, 2, 3))],
    sombra: [colocar(prisma(1.5, 1.45, 0.02), { p: [0, 0, 1.51] })],
    madera: [
      colocar(palo, { p: [0, 1.05, 1.56] }),
      colocar(palo, { p: [0, 1.05, -1.56] }),
    ],
  })
}

// Anillo de piedras de radio ≈ 0,6 m, leños cruzados y una llama de bulto
const fogata = () => {
  const roca = new THREE.DodecahedronGeometry(0.16)
  const piedras = Array.from({ length: 9 }, (_, i) => {
    const angulo = (i / 9) * Math.PI * 2
    return colocar(roca, {
      p: [Math.cos(angulo) * 0.6, 0.1, Math.sin(angulo) * 0.6],
      r: [i, i * 2, 0],
      s: [1, 0.7 + (i % 3) * 0.12, 1],
    })
  })
  const leno = new THREE.CylinderGeometry(0.06, 0.07, 0.9, 6)
  const lenos = [0, 1, 2].map((i) => colocar(leno, {
    p: [0, 0.2, 0],
    r: [0, (i * Math.PI) / 1.5, Math.PI / 2 - 0.25],
  }))
  return pieza('fogata', {
    piedra: piedras,
    madera: lenos,
    brasa: [colocar(new THREE.ConeGeometry(0.28, 0.9, 6), { p: [0, 0.65, 0] })],
  })
}

// 7 m de largo en X y 1,6 m de ancho; el origen es el centro del tablero
const puente = () => {
  const curva = (x) => -0.48 * (x / 3.5) ** 2
  const pendiente = (x) => (-0.96 * x) / 3.5 ** 2
  const tablon = new THREE.BoxGeometry(0.34, 0.07, 1.6)
  const tablones = Array.from({ length: 19 }, (_, i) => {
    const x = -3.4 + (i * 6.8) / 18
    return colocar(tablon, { p: [x, curva(x), 0], r: [0, 0, Math.atan(pendiente(x))] })
  })
  const poste = new THREE.CylinderGeometry(0.05, 0.06, 0.95, 6)
  const cuerda = new THREE.CylinderGeometry(0.025, 0.025, 1.75, 5)
  const postes = []
  const cuerdas = []
  const puntos = [-3.3, -1.65, 0, 1.65, 3.3]
  for (const z of [-0.74, 0.74]) {
    puntos.forEach((x, i) => {
      postes.push(colocar(poste, { p: [x, curva(x) + 0.45, z] }))
      if (i === puntos.length - 1) return
      const mitad = x + 0.825
      cuerdas.push(colocar(cuerda, {
        p: [mitad, curva(mitad) + 0.86, z],
        r: [0, 0, Math.PI / 2 + Math.atan(pendiente(mitad))],
      }))
    })
  }
  return pieza('puente', { madera: [...tablones, ...postes, ...cuerdas] })
}

// La misma silueta en los cinco puntos de viaje (02 · Mapa §7): monolito con remate y base
const menhir = () => pieza('menhir', {
  piedra: [
    colocar(new THREE.CylinderGeometry(0.3, 0.52, 2.5, 5), { p: [0, 1.3, 0], r: [0, 0.4, 0] }),
    colocar(new THREE.ConeGeometry(0.31, 0.45, 5), { p: [0, 2.77, 0], r: [0, 0.4, 0] }),
    colocar(new THREE.CylinderGeometry(0.72, 0.85, 0.16, 7), { p: [0, 0.08, 0] }),
  ],
})

const exportar = (nombre, escena) => new Promise((ok, error) => {
  new GLTFExporter().parse(escena, (glb) => {
    writeFileSync(resolve(salida, `${nombre}.glb`), Buffer.from(glb))
    ok()
  }, error, { binary: true })
})

await exportar('tienda', tienda())
await exportar('fogata', fogata())
await exportar('puente', puente())
await exportar('menhir', menhir())
console.log(`Modelos escritos en ${salida}`)
