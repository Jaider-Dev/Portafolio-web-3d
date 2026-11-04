import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Solo en desarrollo: guarda en docs/capturas lo que envía la página (capturas del blockout de HT-05)
const guardarCapturas = () => ({
  name: 'guardar-capturas',
  apply: 'serve',
  configureServer(server) {
    server.middlewares.use('/__captura', (req, res) => {
      const nombre = new URL(req.url, 'http://local').searchParams.get('nombre')
      if (req.method !== 'POST' || !/^[\w-]+$/.test(nombre ?? '')) {
        res.statusCode = 400
        res.end()
        return
      }
      const partes = []
      req.on('data', (parte) => partes.push(parte))
      req.on('end', () => {
        const carpeta = resolve(import.meta.dirname, 'docs/capturas')
        mkdirSync(carpeta, { recursive: true })
        writeFileSync(resolve(carpeta, `${nombre}.png`), Buffer.concat(partes))
        res.end('ok')
      })
    })
  },
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), guardarCapturas()],
  server: { port: 5173 },
})
