# Créditos y licencias

## Modelos 3D

### Propios

La tienda y el puente se modelan en **Blender 5.2** con scripts de Python (`blender/`). Los personajes son autoría propia, preparados en Blender (`blender/preparar_personaje.py`, `preparar_candidatos.py` y `riggear_candidato3.py`).

| Archivo | Triángulos | Peso | Presupuesto | Origen |
|---|---|---|---|---|
| `models/tienda.glb` | 752 | 57,6 KB | ≤ 5.000 | Propio · Blender (`blender/tienda.py`) |
| `models/puente.glb` | 1.420 | 101,8 KB | ≤ 5.000 | Propio · Blender (`blender/puente.py`) |
| `models/personaje.glb` | 13.764 (6.882 quads) | 1.066 KB (2 texturas WebP de 1K) | ≤ 15.000 | Propio · Blender: quads, color por zonas con la paleta, esqueleto de 22 huesos y animaciones (reposo, caminar, correr) |
| `models/personaje-3.glb` | 654 (217 quads de 437 caras) | 124 KB (1 textura WebP) | ≤ 15.000 | Propio · Blender: colores de la paleta, cabello largo, quads, 1,5 m; esqueleto de 22 huesos con nombres de Mixamo, pose T y animación "reposo". Para Mixamo: `blender/personaje-3-mixamo.fbx` |

### De Sketchfab (CC-BY 4.0)

Paquetes descargados de [Sketchfab](https://sketchfab.com) con licencia **Creative Commons Atribución 4.0** (<http://creativecommons.org/licenses/by/4.0/>). Los originales están en `blender/fuente/` (no se suben al repositorio).

| Paquete | Autor | Enlace |
|---|---|---|
| "Arboles, piedras, pasto y hongos low poly" | bishion (<https://sketchfab.com/bishion>) | <https://sketchfab.com/3d-models/arboles-piedras-pasto-y-hongos-low-poly-73bdd8a49719460e8de6195553140710> |
| "Lowpoly Trees" | Carlos_SR (<https://sketchfab.com/CarlosSR>) | <https://sketchfab.com/3d-models/lowpoly-trees-84149cefe9844f318f4ac495be9e9e3a> |
| "Fogata" | Akxme_17 (<https://sketchfab.com/akxme0411>) | <https://sketchfab.com/3d-models/fogata-8a511bd52f64483d803eb9e41077e101> |

**Modificaciones** (17-nov-2026, `blender/kit_naturaleza.py`): cada pieza se separó en su propio modelo (en "Lowpoly Trees", cada copa se asignó a su tronco), se recoloreó con la paleta del proyecto (color por vértice), se escaló a metros y se pasó a quads. Se exportan sin normales (la escena usa sombreado plano).

| Archivo | Piezas | Triángulos | Peso | Presupuesto | Sale de |
|---|---|---|---|---|---|
| `models/naturaleza/arboles.glb` | 15 árboles grandes (pinos, abetos, álamos, robles, frondosos, retorcidos y el paraguas) | 12.667 | 246,7 KB | ≤ 15.000 | bishion y Carlos_SR |
| `models/naturaleza/detalles.glb` | 8: matas de pasto y hongos | 3.132 | 66,7 KB | ≤ 5.000 | bishion |
| `models/naturaleza/rocas.glb` | 31: rocas, losas, peñas y un dolmen (con UV para la textura de roca) | 1.672 | 61,4 KB | ≤ 5.000 | bishion y Carlos_SR |
| `models/fogata.glb` | leños (Akxme_17, sin su llama fija: la llama es animada), anillo de piedras (bishion) y lecho de brasas propio | 510 | 11,4 KB | ≤ 5.000 | Akxme_17 y bishion |

Sin Draco por ahora: suman 1,74 MB de los 15 MB permitidos. Con piezas pequeñas el decodificador pesaría más que lo que ahorra; el personaje (1 MB, casi todo texturas) es el primero en el que conviene volver a medirlo en la optimización (sesión 12, HT-15).

## Sonido

El ambiente sonoro (viento, fogata, río, cascadas y grillos) **se sintetiza en el navegador** con Web Audio (`src/scene/sonido/sintesis.js`): no hay archivos de audio ni licencias de terceros.

## Fuentes (provisionales hasta PL-04)

| Archivo | Fuente | Licencia |
|---|---|---|
| `fonts/inter-700.typeface.json` | Inter Bold, convertida a *typeface JSON* para el texto 3D con `npm run fuente:generar` (ASCII y Latin-1: tildes, eñe, ¿ ¡). Sustituye a Helvetiker, que no traía tildes | SIL OFL 1.1, en `fonts/inter-LICENSE.txt` |
| `fonts/inter-latin-400-normal.woff` | Inter, del paquete `@fontsource/inter` | SIL OFL 1.1, en `fonts/inter-LICENSE.txt` |

## Librerías

React, React Three Fiber, Drei, three.js, React Router y Zustand, con licencia MIT.


## Texturas

| Archivo | Tamaño | Origen |
|---|---|---|
| `textures/roca_detalle.webp`, `roca_normal.webp`, `roca_rugosidad.webp` | 512 px · 158 KB en total | Propias · generadas en Blender con ruido periódico (`blender/texturas_pbr.py`) |
| `textures/suelo_detalle.webp`, `suelo_normal.webp` | 512 px · 154 KB en total | Propias · `blender/texturas_pbr.py` |

## Documentos

| Archivo | Origen |
|---|---|
| `cv/CV_Jaider_Bermudez_Giron.pdf` | CV del autor (entregado el 17-nov-2026). Es público: incluye su correo y su teléfono |
