import { TEXTOS } from '../data/textos'
import { useIdioma } from '../store/idioma'

// Cambia entre español e inglés (P-7). Muestra el idioma al que lleva ("EN" / "ES"), con su nombre
// accesible escrito en ese idioma: quien no lee el actual también lo entiende. Sin three: también
// lo usa la versión clásica
export function BotonIdioma({ className = '' }) {
  const idioma = useIdioma((s) => s.idioma)
  const alternar = useIdioma((s) => s.alternar)
  const destino = idioma === 'es' ? 'en' : 'es'
  return (
    <button
      type="button"
      className={`boton boton-icono boton-idioma ${className}`}
      aria-label={TEXTOS.idioma.cambiar}
      title={TEXTOS.idioma.cambiar}
      lang={destino}
      onClick={alternar}
    >
      {TEXTOS.idioma.corto}
    </button>
  )
}
