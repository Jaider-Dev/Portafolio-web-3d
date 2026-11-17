// Sonidos de la isla generados por código (HU-18): ruido filtrado para el viento y el agua, chasquidos
// para la fogata y chirridos para los grillos de la noche. No hay archivos de audio que descargar ni
// licencias que acreditar, y cada búfer se repite en bucle. Funciones puras sobre Float32Array: se
// prueban sin navegador (sintesis.test.js).

// Generador pseudoaleatorio con semilla: el mismo sonido en cada visita
export function generador(semilla = 1) {
  let s = semilla >>> 0 || 1
  return () => {
    s ^= s << 13
    s ^= s >>> 17
    s ^= s << 5
    return ((s >>> 0) / 4294967296) * 2 - 1 // −1 … 1
  }
}

// Ruido blanco (agua que salpica), rosa (cascada) o marrón (viento, rumor grave)
export function llenarRuido(datos, tipo = 'blanco', semilla = 1) {
  const azar = generador(semilla)
  let b0 = 0, b1 = 0, b2 = 0, ultimo = 0
  for (let i = 0; i < datos.length; i++) {
    const blanco = azar()
    if (tipo === 'rosa') {
      // Filtro de Paul Kellet, versión económica
      b0 = 0.99765 * b0 + blanco * 0.099046
      b1 = 0.963 * b1 + blanco * 0.2965164
      b2 = 0.57 * b2 + blanco * 1.0526913
      datos[i] = (b0 + b1 + b2 + blanco * 0.1848) * 0.2
    } else if (tipo === 'marron') {
      ultimo = (ultimo + 0.02 * blanco) / 1.02
      datos[i] = ultimo * 3.5
    } else {
      datos[i] = blanco
    }
  }
  return suavizarCostura(limitar(datos))
}

// Chasquidos de leña: impulsos cortos que decaen rápido, sobre un siseo grave
export function llenarFogata(datos, frecuenciaMuestreo, semilla = 7) {
  const azar = generador(semilla)
  llenarRuido(datos, 'marron', semilla)
  for (let i = 0; i < datos.length; i++) datos[i] *= 0.25
  const segundos = datos.length / frecuenciaMuestreo
  const chasquidos = Math.round(segundos * 9)
  for (let k = 0; k < chasquidos; k++) {
    const inicio = Math.floor(((azar() + 1) / 2) * (datos.length - 1))
    const fuerza = 0.25 + ((azar() + 1) / 2) * 0.75
    const caida = frecuenciaMuestreo * (0.002 + ((azar() + 1) / 2) * 0.006)
    const largo = Math.min(Math.floor(caida * 6), datos.length - inicio)
    for (let j = 0; j < largo; j++) datos[inicio + j] += azar() * fuerza * Math.exp(-j / caida)
  }
  return limitar(datos)
}

// Grillos: grupos de tres chirridos agudos (≈ 4,6 kHz) cada 0,9 s
export function llenarGrillos(datos, frecuenciaMuestreo) {
  datos.fill(0)
  const periodo = 0.9 * frecuenciaMuestreo
  const pulso = 0.022 * frecuenciaMuestreo
  const hueco = 0.045 * frecuenciaMuestreo
  for (let inicio = 0; inicio < datos.length; inicio += periodo) {
    for (let p = 0; p < 3; p++) {
      const desde = Math.floor(inicio + p * hueco)
      for (let j = 0; j < pulso && desde + j < datos.length; j++) {
        const envolvente = Math.sin((Math.PI * j) / pulso)
        datos[desde + j] = 0.5 * envolvente * Math.sin((2 * Math.PI * 4600 * j) / frecuenciaMuestreo)
      }
    }
  }
  return datos
}

// Funde el final con el principio para que el bucle no haga "clic" al repetirse
function suavizarCostura(datos, muestras = 512) {
  const n = Math.min(muestras, Math.floor(datos.length / 4))
  for (let i = 0; i < n; i++) {
    const t = i / n
    datos[i] *= t
    datos[datos.length - 1 - i] *= t
  }
  return datos
}

function limitar(datos) {
  for (let i = 0; i < datos.length; i++) datos[i] = Math.max(-1, Math.min(1, datos[i]))
  return datos
}
