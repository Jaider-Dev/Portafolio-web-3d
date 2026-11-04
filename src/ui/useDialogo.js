import { useEffect, useRef } from 'react'

const ENFOCABLES = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'

// Comportamiento común de un diálogo modal (HT-08): atrapa el foco, cierra con Esc y devuelve el foco.
// Equivale a lo que da FocusTrap de @angular/cdk/a11y. `activo` es falso si otro diálogo está encima.
export function useDialogo(contenedor, { alCerrar, activo = true }) {
  const alCerrarActual = useRef(alCerrar)

  useEffect(() => {
    alCerrarActual.current = alCerrar
  })

  useEffect(() => {
    const previo = document.activeElement
    contenedor.current?.querySelector(ENFOCABLES)?.focus()
    return () => {
      if (previo?.isConnected) previo.focus()
    }
  }, [contenedor])

  useEffect(() => {
    if (!activo) return undefined
    const alPulsar = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        alCerrarActual.current()
        return
      }
      if (e.key !== 'Tab') return
      const enfocables = [...(contenedor.current?.querySelectorAll(ENFOCABLES) ?? [])]
      if (enfocables.length === 0) return
      const primero = enfocables[0]
      const ultimo = enfocables[enfocables.length - 1]
      const fuera = !contenedor.current.contains(document.activeElement)
      if (e.shiftKey && (document.activeElement === primero || fuera)) {
        e.preventDefault()
        ultimo.focus()
      } else if (!e.shiftKey && (document.activeElement === ultimo || fuera)) {
        e.preventDefault()
        primero.focus()
      }
    }
    document.addEventListener('keydown', alPulsar)
    return () => document.removeEventListener('keydown', alPulsar)
  }, [activo, contenedor])
}
