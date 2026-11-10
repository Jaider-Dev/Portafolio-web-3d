// Convierte Inter (WOFF de @fontsource/inter) al formato "typeface JSON" que usan
// FontLoader de three y Text3D de Drei. Helvetiker, la fuente de los ejemplos de three,
// no trae tildes ni eñes: "Bermúdez" salía sin la ú.
// Uso: npm run fuente:generar
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import opentype from 'opentype.js'

const ORIGEN = fileURLToPath(import.meta.resolve('@fontsource/inter/files/inter-latin-700-normal.woff'))
const DESTINO = new URL('../public/fonts/inter-700.typeface.json', import.meta.url)

// ASCII imprimible y Latin-1 (tildes, eñe, diéresis, ¿ ¡)
const CARACTERES = [...Array.from({ length: 95 }, (_, i) => 32 + i), ...Array.from({ length: 96 }, (_, i) => 160 + i)]
  .map((codigo) => String.fromCharCode(codigo))

const buffer = readFileSync(ORIGEN)
const fuente = opentype.parse(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength))
const redondear = (n) => Math.round(n)

// Formato de three (Font.createPath): "m x y", "l x y", "q x y cx cy", "b x y c1x c1y c2x c2y"
// (en q y b va primero el punto final y después los de control)
function contorno(glifo) {
  let previo = null
  return glifo.path.commands.map((c) => {
    const punto = c.type === 'Z' ? previo : `${redondear(c.x)} ${redondear(c.y)}`
    const repetido = c.type === 'L' && punto === previo // segmento de longitud cero: estropea las normales del bisel
    previo = punto
    if (repetido) return ''
    switch (c.type) {
      case 'M': return `m ${redondear(c.x)} ${redondear(c.y)}`
      case 'L': return `l ${redondear(c.x)} ${redondear(c.y)}`
      case 'Q': return `q ${redondear(c.x)} ${redondear(c.y)} ${redondear(c.x1)} ${redondear(c.y1)}`
      case 'C': return `b ${redondear(c.x)} ${redondear(c.y)} ${redondear(c.x1)} ${redondear(c.y1)} ${redondear(c.x2)} ${redondear(c.y2)}`
      default: return '' // Z: three cierra cada contorno al construir las formas
    }
  }).filter(Boolean).join(' ')
}

const glyphs = {}
for (const caracter of CARACTERES) {
  const glifo = fuente.charToGlyph(caracter)
  if (!glifo || glifo.index === 0) continue // .notdef: la fuente no lo tiene
  const caja = glifo.getBoundingBox()
  glyphs[caracter] = {
    ha: redondear(glifo.advanceWidth),
    x_min: redondear(caja.x1),
    x_max: redondear(caja.x2),
    o: contorno(glifo),
  }
}

const { head, post } = fuente.tables
const datos = {
  glyphs,
  familyName: fuente.names.fontFamily?.en ?? 'Inter',
  ascender: redondear(fuente.ascender),
  descender: redondear(fuente.descender),
  underlinePosition: redondear(post.underlinePosition),
  underlineThickness: redondear(post.underlineThickness),
  boundingBox: { xMin: head.xMin, yMin: head.yMin, xMax: head.xMax, yMax: head.yMax },
  resolution: fuente.unitsPerEm,
  original_font_information: { format: 0, fontFamily: 'Inter', fontSubfamily: 'Bold', license: 'SIL Open Font License 1.1' },
  cssFontWeight: 'bold',
  cssFontStyle: 'normal',
}

writeFileSync(DESTINO, JSON.stringify(datos))
const faltan = CARACTERES.filter((c) => c.trim() && !glyphs[c])
console.log(`${Object.keys(glyphs).length} glifos → public/fonts/inter-700.typeface.json (${(JSON.stringify(datos).length / 1024).toFixed(1)} KB)`)
if (faltan.length) console.log(`Sin glifo en Inter: ${faltan.join(' ')}`)
