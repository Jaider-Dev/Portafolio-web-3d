import { Link } from 'react-router-dom'
import { TEXTOS } from '../data/textos'
import { RUTA_CLASICA } from '../utils/rutas'
import { hayWebGL } from '../utils/webgl'

const T = TEXTOS.clasico

export function MenuClasico() {
  return (
    <header className="clasico-menu">
      <nav aria-label={T.navegacion}>
        <ul>
          {Object.entries(T.secciones).map(([id, { titulo }]) => (
            <li key={id}><Link to={`${RUTA_CLASICA}#${id}`}>{titulo}</Link></li>
          ))}
        </ul>
      </nav>
      {hayWebGL() ? (
        <div className="selector" role="group" aria-label={T.selector}>
          <span aria-current="page" aria-label={T.version2d}>2D</span>
          <Link to="/" aria-label={T.version3d}>3D</Link>
        </div>
      ) : <p className="selector-aviso">{T.sinWebgl}</p>}
    </header>
  )
}
