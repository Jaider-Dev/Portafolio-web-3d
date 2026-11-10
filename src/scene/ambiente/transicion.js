// Progreso compartido del cambio de hora: 0 = mañana, 1 = noche (ya suavizado).
// Lo escribe Ambiente en cada fotograma y lo leen, también en useFrame, los objetos que cambian con la
// hora (farol del letrero, fogata, nubes). Es un objeto mutable y no estado de React a propósito:
// cambia 60 veces por segundo y no debe provocar renders (como un ref compartido)
export const transicionHora = { t: 0 }
