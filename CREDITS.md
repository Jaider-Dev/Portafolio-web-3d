# Créditos y licencias

## Modelos 3D

Todos son trabajo propio. La tienda y el puente se modelan en **Blender 5.2** con scripts de Python (`blender/`); la fogata y el menhir siguen generados por código (`scripts/generar-modelos.mjs`) hasta pasarlos también a Blender.

| Archivo | Triángulos | Peso | Presupuesto | Origen |
|---|---|---|---|---|
| `models/tienda.glb` | 752 | 57,6 KB | ≤ 5.000 | Propio · Blender (`blender/tienda.py`) |
| `models/puente.glb` | 1.420 | 101,8 KB | ≤ 5.000 | Propio · Blender (`blender/puente.py`) |
| `models/personaje.glb` | 13.764 (6.882 quads) | 1.066 KB (2 texturas WebP de 1K) | ≤ 15.000 | **Modelo descargado por el autor (16-nov-2026), origen y licencia PENDIENTES de registrar.** Original en `blender/fuente/personaje_descargado.glb` (1 millón de triángulos); preparado con `blender/preparar_personaje.py`: retopología a quads, color por zonas con la paleta y horneado de color y normales, esqueleto de 22 huesos y animaciones propias (reposo, caminar, correr) |
| `models/personaje-3.glb` | 654 (217 quads de 437 caras) | 124 KB (1 textura WebP, esqueleto y animación) | ≤ 15.000 | Candidato (17-nov-2026). **"Guest male 3 - Medieval Fantasy Challenge" de tuturu** (<https://sketchfab.com/tuturu>), licencia **CC-BY 4.0** (<http://creativecommons.org/licenses/by/4.0/>), <https://sketchfab.com/3d-models/guest-male-3-medieval-fantasy-challenge-a7546264137f4df89223a3729cd4df19>. **Modificado:** piel, cabello y ropa recoloreados con la paleta, sin barba ni bigote, cabello alargado, Tris to Quads, 1,5 m (`blender/preparar_candidatos.py -- 3`); esqueleto de 22 huesos con nombres de Mixamo, pose T y animación "reposo" (`blender/riggear_candidato3.py`). Para Mixamo: `blender/personaje-3-mixamo.fbx` |
| `models/fogata.glb` | 408 | 31,3 KB | ≤ 5.000 | Propio · código |
| `models/menhir.glb` | 58 | 5,1 KB | ≤ 5.000 | Propio · código (sin usar: los menhires se dibujan en `Lugares.jsx`) |

Sin Draco por ahora: suman 1,26 MB de los 15 MB permitidos. Con piezas pequeñas el decodificador pesaría más que lo que ahorra; el personaje (1 MB, casi todo texturas) es el primero en el que conviene volver a medirlo en la optimización (sesión 12, HT-15).

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
