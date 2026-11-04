// Paso de revisión del flujo de assets (06 §20): triángulos, peso y mallas de cada GLB frente a su presupuesto.
// Termina con error si algo se pasa, para que ningún modelo entre sin cumplirlo.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const carpeta = resolve(dirname(fileURLToPath(import.meta.url)), '../public/models')

const POR_DEFECTO = 5000 // objetos: tienda, puente, fogata…
const PRESUPUESTO = { isla: 60000, 'isla-colision': 5000, cueva: 40000, personaje: 15000 }
const PESO_TOTAL_MAXIMO = 15 * 1024 * 1024

function leerGlb(ruta) {
  const datos = readFileSync(ruta)
  if (datos.readUInt32LE(0) !== 0x46546c67) throw new Error(`${ruta} no es un GLB`)
  const largo = datos.readUInt32LE(12)
  return JSON.parse(datos.subarray(20, 20 + largo).toString('utf8'))
}

function triangulos(gltf) {
  const porInstancia = (malla) => malla.primitives.reduce((suma, primitiva) => {
    const accesor = gltf.accessors[primitiva.indices ?? primitiva.attributes.POSITION]
    return suma + accesor.count / 3
  }, 0)
  return (gltf.nodes ?? []).reduce((suma, nodo) => (
    nodo.mesh === undefined ? suma : suma + porInstancia(gltf.meshes[nodo.mesh])
  ), 0)
}

const archivos = readdirSync(carpeta).filter((nombre) => nombre.endsWith('.glb'))
let hayError = false
let pesoTotal = 0
const filas = archivos.map((archivo) => {
  const ruta = resolve(carpeta, archivo)
  const gltf = leerGlb(ruta)
  const nombre = archivo.replace('.glb', '')
  const tri = triangulos(gltf)
  const limite = PRESUPUESTO[nombre] ?? POR_DEFECTO
  const peso = statSync(ruta).size
  const minuscula = archivo === archivo.toLowerCase()
  pesoTotal += peso
  if (tri > limite || !minuscula) hayError = true
  return {
    modelo: archivo,
    triangulos: tri,
    presupuesto: limite,
    mallas: gltf.meshes?.length ?? 0,
    materiales: gltf.materials?.length ?? 0,
    KB: +(peso / 1024).toFixed(1),
    estado: tri <= limite && minuscula ? 'ok' : 'EXCEDE',
  }
})

console.table(filas)
console.log(`Peso total: ${(pesoTotal / 1024).toFixed(1)} KB de ${PESO_TOTAL_MAXIMO / 1024} KB`)
if (pesoTotal > PESO_TOTAL_MAXIMO) hayError = true
process.exit(hayError ? 1 : 0)
