import { Route, Routes } from 'react-router-dom'
import { TEXTOS } from '../data/textos'
import { CasoProyecto } from './CasoProyecto'
import { Inicio } from './Inicio'
import { MenuClasico } from './MenuClasico'
import './clasico.css'

// Versión clásica (decisión D11): lee los mismos src/data, sin canvas y sin importar three
export default function Clasico() {
  return (
    <div className="clasico">
      <a className="saltar" href="#contenido">{TEXTOS.clasico.saltar}</a>
      <MenuClasico />
      <main id="contenido" tabIndex={-1}>
        <Routes>
          <Route index element={<Inicio />} />
          <Route path="proyecto/:proyectoId" element={<CasoProyecto />} />
        </Routes>
      </main>
    </div>
  )
}
