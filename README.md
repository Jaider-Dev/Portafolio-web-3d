# Bitácora · Portafolio 3D

Portafolio profesional con forma de isla flotante que se recorre. Proyecto del curso 750047C *Diseño de Experiencias Web 3D* (Universidad del Valle, 2026-II). "Bitácora" es un nombre provisional.

**Demo:** pendiente de desplegar en Vercel.
**Estado:** *sprint* 1, "La isla existe": *blockout* navegable en modo panorámico, primeros modelos GLB, carga e intro, Sobre mí, contacto, menú de viaje y versión clásica en 2D. El contenido personal sigue con marcadores (`{NOMBRE}`, `{ROL}`…) y la escena usa grises neutros porque la paleta aún no está decidida.

## Instalación y ejecución

Requiere Node.js LTS.

```bash
npm install
npm run dev
```

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo en <http://localhost:5173> |
| `npm run build` | Compila para producción en `dist/` |
| `npm run preview` | Sirve `dist/` para probarlo en local |
| `npm run lint` | Oxlint |
| `npm test` | Máquina de estados y coordenadas contra `02 · Mapa` §5 |
| `npm run modelos:generar` | Regenera los GLB provisionales de `public/models` |
| `npm run modelos:revisar` | Revisa triángulos y peso de cada GLB frente a su presupuesto |

**Solo en desarrollo:** `?depurar` muestra ejes y rejilla, `?sinwebgl` simula un navegador sin WebGL y `?fallarcarga` simula un error de carga. El panel de rendimiento aparece siempre en desarrollo y nunca en producción.

## Estructura

```
src/
├── main.jsx          rutas: la isla y la versión clásica, cada una en su propio chunk
├── Experiencia.jsx   une URL, store, interfaz y Canvas
├── data/             todo el contenido y los textos (también los lee la versión clásica)
├── store/            estado global y máquina de estados (Zustand)
├── scene/            mundo 3D: isla, agua, lugares, cámara
├── ui/               interfaz HTML: carga, intro, HUD, paneles, menú de viaje
├── clasico/          versión clásica en 2D, sin three
└── utils/            rutas, WebGL, marcadores
```

**Para cambiar el contenido** basta con editar `src/data`: `perfil.js`, `enlaces.js`, `proyectos.js`, `habilidades.js` y `trayectoria.js`. Mientras un enlace sea un marcador, la interfaz lo muestra como "pendiente" y no lleva a ningún sitio.

## Flujo de *assets* 3D

Ningún modelo entra al proyecto sin pasar por estos pasos:

1. **Revisar** triángulos, texturas y licencia: `npm run modelos:revisar`.
2. **Normalizar:** 1 unidad = 1 m, +Y arriba, origen en la base de la pieza.
3. **Exportar** a GLB en `public/models/`, con el nombre en minúsculas.
4. **Comprimir** si hace falta: `npx gltfjsx modelo.glb --transform` o `gltf-transform`.
5. **Unificar materiales** con los compartidos del proyecto.
6. **Registrar** origen y licencia en [`CREDITS.md`](CREDITS.md).

| Pieza | Presupuesto |
|---|---|
| Isla | ≤ 60 mil triángulos |
| Isla de colisión | ≤ 5 mil |
| Cueva | ≤ 40 mil |
| Personaje | ≤ 15 mil, 1 textura de 1K |
| Objetos | ≤ 5 mil |
| Árbol / roca o arbusto | ≤ 1.500 / ≤ 500 |
| Total de modelos | ≤ 15 MB |

## Rendimiento

Presupuesto de calidad alta: ≤ 400 mil triángulos y ≤ 150 *draw calls*.

| *Sprint* | Lugar | Triángulos | *Draw calls* | Texturas | Equipo |
|---|---|---|---|---|---|
| 1 | Vista aérea | 27.974 | 58 | 1 | Vista de pruebas de 1280×720, DPR 2 |
| 1 | Campamento | 27.880 | 54 | 1 | Igual |
| 1 | Vado | 27.694 | 48 | 1 | Igual |
| 1 | Sendero | 20.998 | 20 | 1 | Igual |
| 1 | Cima | 20.260 | 12 | 1 | Igual |
| 1 | Cueva | 19.766 | 5 | 1 | Igual |

Peso que descarga la isla: **455 KB con gzip** (0,19 s a 20 Mbps, sin contar el tiempo de ejecución).

**Falta medir** los FPS en el portátil de referencia y en un móvil real. El panel de rendimiento marcó hasta 60 FPS en la vista de pruebas, pero esa vista no es un equipo de referencia.

## Advertencias conocidas

- `THREE.Clock: This module has been deprecated`: la genera R3F 9.7 y es inofensiva.

## Decisiones del *sprint* 1

- **Versiones fijadas** a las del curso (`~`), porque las particularidades del stack se comprobaron con ellas.
- **Vuelos de cámara propios** en `DirectorDeCamara`: la curva y la duración son exactas (3,5 s y 1,5 s). `setLookAt(…, true)` no permite fijar ninguna de las dos.
- **Terreno calculado por función** (`scene/isla/terreno.js`) en lugar de un cilindro y cajas: permite tallar el río y la poza a su altura, y probar las alturas con `npm test`.
- **Modelos generados por código** (`scripts/generar-modelos.mjs`): son provisionales hasta modelar en Blender.
- **En móvil vertical** la distancia máxima de cámara supera los 60 m, porque con ese límite la isla no cabe a lo ancho.

Diseño completo y trazabilidad en los documentos del curso (`Documentos/Proyecto final/`).
