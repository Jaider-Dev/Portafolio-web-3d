# Créditos y licencias

## Modelos 3D

Generados por código con `scripts/generar-modelos.mjs`; son trabajo propio y provisional.

| Archivo | Triángulos | Peso | Presupuesto | Origen |
|---|---|---|---|---|
| `models/tienda.glb` | 56 | 6,2 KB | ≤ 5.000 | Propio |
| `models/fogata.glb` | 408 | 31,3 KB | ≤ 5.000 | Propio |
| `models/puente.glb` | 628 | 45,1 KB | ≤ 5.000 | Propio |
| `models/menhir.glb` | 58 | 5,1 KB | ≤ 5.000 | Propio |

No necesitan compresión: suman 88 KB de los 15 MB permitidos.

## Fuentes (provisionales hasta PL-04)

| Archivo | Fuente | Licencia |
|---|---|---|
| `fonts/inter-700.typeface.json` | Inter Bold, convertida a *typeface JSON* para el texto 3D con `npm run fuente:generar` (ASCII y Latin-1: tildes, eñe, ¿ ¡). Sustituye a Helvetiker, que no traía tildes | SIL OFL 1.1, en `fonts/inter-LICENSE.txt` |
| `fonts/inter-latin-400-normal.woff` | Inter, del paquete `@fontsource/inter` | SIL OFL 1.1, en `fonts/inter-LICENSE.txt` |

## Librerías

React, React Three Fiber, Drei, three.js, React Router y Zustand, con licencia MIT.
