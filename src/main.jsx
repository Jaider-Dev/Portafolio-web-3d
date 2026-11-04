import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { PantallaDeCarga } from './ui/PantallaDeCarga'
import { RedirigirSinWebGL } from './ui/RedirigirSinWebGL'
import { RUTA_CLASICA } from './utils/rutas'
import './ui/base.css'

// Cada rama descarga solo su chunk: la versión clásica nunca baja three, R3F ni Drei (06 §6)
/* oxlint-disable react/only-export-components -- main.jsx es la entrada: no exporta nada */
const Experiencia = lazy(() => import('./Experiencia'))
const Clasico = lazy(() => import('./clasico/Clasico'))

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path={`${RUTA_CLASICA}/*`} element={<Suspense fallback={null}><Clasico /></Suspense>} />
        <Route
          path="/*"
          element={(
            <RedirigirSinWebGL>
              <Suspense fallback={<main><PantallaDeCarga /></main>}><Experiencia /></Suspense>
            </RedirigirSinWebGL>
          )}
        />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
