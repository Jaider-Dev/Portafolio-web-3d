import { Link, useParams } from 'react-router-dom'
import { PROYECTOS } from '../data/proyectos'
import { TEXTOS } from '../data/textos'
import { RUTA_CLASICA } from '../utils/rutas'
import { EnlaceClasico } from './EnlaceClasico'
import { hayWebGL } from '../utils/webgl'

const T = TEXTOS.clasico.caso
const VOLVER = `${RUTA_CLASICA}#proyectos`

export function CasoProyecto() {
  const { proyectoId } = useParams()
  const indice = PROYECTOS.findIndex((p) => p.id === proyectoId)
  const proyecto = PROYECTOS[indice]

  if (!proyecto) {
    return (
      <section className="clasico-seccion">
        <h1>{T.noEncontrado}</h1>
        <p><Link to={VOLVER}>{T.volver}</Link></p>
      </section>
    )
  }

  const anterior = PROYECTOS[indice - 1]
  const siguiente = PROYECTOS[indice + 1]

  return (
    <article className="clasico-seccion">
      <p><Link to={VOLVER}>{T.volver}</Link></p>
      <h1>{proyecto.titulo}</h1>
      <p>{proyecto.resumen}</p>
      <h2>{T.reto}</h2>
      <p>{proyecto.problema}</p>
      <h2>{T.papel}</h2>
      <p>{proyecto.rol}</p>
      <h2>{T.tecnologias}</h2>
      <p>{proyecto.tecnologias.join(' · ')}</p>
      <h2>{T.logro}</h2>
      <p>{proyecto.resultado}</p>
      <div className="acciones">
        <EnlaceClasico etiqueta={T.codigo} url={proyecto.enlaces.codigo} />
        <EnlaceClasico etiqueta={T.demo} url={proyecto.enlaces.demo} />
      </div>
      <nav className="acciones clasico-paginacion" aria-label={TEXTOS.clasico.secciones.proyectos.titulo}>
        {anterior && <Link to={`${RUTA_CLASICA}/proyecto/${anterior.id}`}>{T.anterior}</Link>}
        {siguiente && <Link to={`${RUTA_CLASICA}/proyecto/${siguiente.id}`}>{T.siguiente}</Link>}
        {hayWebGL() && <Link to="/lugar/cueva">{T.mural}</Link>}
      </nav>
    </article>
  )
}
