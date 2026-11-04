// Un valor entre llaves aún no tiene contenido real (PL-02): no se debe enlazar ni copiar
export const esMarcador = (valor) => /^\{.*\}$/.test(valor ?? '')
