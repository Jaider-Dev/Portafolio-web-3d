# Tienda del campamento modelada en Blender (HU-11, primera prueba del flujo Blender → GLB; sesiones 9 y 10).
# Uso (sin abrir la interfaz):
#   "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" --background --factory-startup --python blender/tienda.py
# Escribe blender/tienda.blend (para abrirla y seguir modelando a mano) y public/models/tienda.glb.
#
# Reglas de la clase que aplica:
# - Blender usa Z arriba; el exportador convierte a +Y arriba (export_yup). La entrada mira a −Y en Blender,
#   que es +Z en Three.js (Lugares.jsx la orienta hacia la fogata con esa convención).
# - 1 unidad = 1 m. Planta de 2,5 × 3 m y 2 m de alto, como el modelo provisional (02 · Mapa §5).
# - Origen en la base y transformaciones aplicadas (posición 0, rotación 0, escala 1).
# - Caras de cuatro lados donde se puede (paneles en rejilla); los tímpanos son triángulos por forma.
# - La lona tiene grosor (Solidify): Three.js no dibuja la cara trasera, y una lona de una sola cara
#   sería invisible desde dentro o desde atrás.
# - Una malla por material (menos draw calls) y materiales con nombre: Lugares.jsx los pinta con la paleta.
# - Sin Draco: con ~1 k triángulos el decodificador (cientos de KB) pesa más que lo que ahorra.
import math
import os

import bmesh
import bpy
from mathutils import Vector

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SALIDA_GLB = os.path.join(RAIZ, 'public', 'models', 'tienda.glb')
SALIDA_BLEND = os.path.join(RAIZ, 'blender', 'tienda.blend')

ANCHO = 2.5      # X
LARGO = 3.0      # Y (Blender); la entrada está en −Y
ALTO = 2.0       # Z
ALERO = 0.05     # la lona no toca el suelo
GROSOR = 0.025   # grosor de la lona

# Escena vacía
bpy.ops.wm.read_factory_settings(use_empty=True)
escena = bpy.context.scene
escena.unit_settings.system = 'METRIC'


def material(nombre, gris, rugosidad=0.9):
    mat = bpy.data.materials.new(nombre)
    if mat.node_tree is None:  # Blender 4.x; en 5.x los materiales nuevos ya traen nodos
        mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (gris, gris, gris, 1)
    bsdf.inputs['Roughness'].default_value = rugosidad
    bsdf.inputs['Metallic'].default_value = 0
    mat.diffuse_color = (gris, gris, gris, 1)
    return mat


MATERIALES = {
    'lona': material('lona', 0.72),
    'madera': material('madera', 0.32),
    'sombra': material('sombra', 0.08, 1.0),
}


def objeto(nombre, bm, mat):
    malla = bpy.data.meshes.new(nombre)
    bm.normal_update()
    bm.to_mesh(malla)
    bm.free()
    malla.materials.append(MATERIALES[mat])
    obj = bpy.data.objects.new(nombre, malla)
    escena.collection.objects.link(obj)
    obj['material'] = mat
    return obj


def rejilla(bm, origen, eje_u, eje_v, nu, nv, combar=None):
    """Panel de nu × nv quads: origen + u·eje_u + v·eje_v (u, v en 0..1). combar(u, v) devuelve un desplazamiento."""
    filas = []
    for j in range(nv + 1):
        fila = []
        for i in range(nu + 1):
            u, v = i / nu, j / nv
            p = origen + eje_u * u + eje_v * v
            if combar:
                p = p + combar(u, v)
            fila.append(bm.verts.new(p))
        filas.append(fila)
    for j in range(nv):
        for i in range(nu):
            bm.faces.new((filas[j][i], filas[j][i + 1], filas[j + 1][i + 1], filas[j + 1][i]))


def cilindro(bm, desde, hasta, radio, lados=6):
    """Cilindro de 'lados' caras entre dos puntos (palos y cuerdas)."""
    eje = hasta - desde
    largo = eje.length
    resultado = bmesh.ops.create_cone(bm, cap_ends=True, segments=lados, radius1=radio, radius2=radio, depth=largo)
    verts = resultado['verts']
    rot = Vector((0, 0, 1)).rotation_difference(eje.normalized()).to_matrix().to_4x4()
    bmesh.ops.transform(bm, matrix=rot, verts=verts)
    bmesh.ops.translate(bm, vec=desde + eje / 2, verts=verts)


# --- Lona: dos faldones combados, tímpano trasero y dos solapas abiertas en la entrada ---
cumbrera_atras = Vector((0, LARGO / 2, ALTO))
cumbrera_frente = Vector((0, -LARGO / 2, ALTO))
bm = bmesh.new()
for lado in (-1, 1):
    alero_frente = Vector((lado * ANCHO / 2, -LARGO / 2, ALERO))
    normal_interior = Vector((-lado * ALTO, 0, -ANCHO / 2)).normalized()

    def combar(u, v, n=normal_interior):
        # La lona cede un poco entre la cumbrera y el alero, más en el centro
        return n * (0.13 * math.sin(math.pi * u) * math.sin(math.pi * v))

    rejilla(bm, cumbrera_frente, alero_frente - cumbrera_frente, Vector((0, LARGO, 0)), 3, 5, combar)
bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.0001)  # une los dos faldones en la cumbrera
bm.faces.new((
    bm.verts.new((-ANCHO / 2, LARGO / 2, ALERO)),
    bm.verts.new((ANCHO / 2, LARGO / 2, ALERO)),
    bm.verts.new(cumbrera_atras + Vector((0, 0.001, 0))),
))
# Solapas de la entrada, recogidas hacia fuera
for lado in (-1, 1):
    bm.faces.new((
        bm.verts.new(cumbrera_frente + Vector((lado * 0.02, -0.01, -0.05))),
        bm.verts.new((lado * ANCHO / 2, -LARGO / 2 - 0.01, ALERO)),
        bm.verts.new((lado * 0.62, -LARGO / 2 - 0.42, 0.18)),
    ))
lona = objeto('tienda_lona', bm, 'lona')
solidificar = lona.modifiers.new('Grosor', 'SOLIDIFY')
solidificar.thickness = GROSOR
solidificar.offset = 0

# --- Interior oscuro visible por la entrada, un poco hacia dentro (sin z-fighting con la lona) ---
bm = bmesh.new()
bm.faces.new((
    bm.verts.new((-ANCHO / 2 + 0.08, -LARGO / 2 + 0.12, ALERO)),
    bm.verts.new((ANCHO / 2 - 0.08, -LARGO / 2 + 0.12, ALERO)),
    bm.verts.new((0, -LARGO / 2 + 0.12, ALTO - 0.1)),
))
interior = objeto('tienda_sombra', bm, 'sombra')
interior.modifiers.new('Grosor', 'SOLIDIFY').thickness = 0.02

# --- Madera: dos postes, cumbrera, vientos (cuerdas) y estacas ---
bm = bmesh.new()
for y in (-LARGO / 2 - 0.03, LARGO / 2 + 0.03):
    cilindro(bm, Vector((0, y, 0)), Vector((0, y, ALTO + 0.12)), 0.045)
cilindro(bm, cumbrera_frente + Vector((0, -0.05, 0.04)), cumbrera_atras + Vector((0, 0.05, 0.04)), 0.03)
estacas = [Vector((0, -LARGO / 2 - 1.1, 0)), Vector((0, LARGO / 2 + 1.1, 0)),
           Vector((-ANCHO / 2 - 0.55, 0, 0)), Vector((ANCHO / 2 + 0.55, 0, 0))]
anclajes = [cumbrera_frente + Vector((0, 0, 0.08)), cumbrera_atras + Vector((0, 0, 0.08)),
            Vector((-ANCHO / 2, 0, ALERO + 0.02)), Vector((ANCHO / 2, 0, ALERO + 0.02))]
for estaca, anclaje in zip(estacas, anclajes):
    cilindro(bm, estaca + Vector((0, 0, 0.06)), anclaje, 0.012, lados=4)
    cilindro(bm, estaca + Vector((0, 0, -0.1)), estaca + Vector((0, 0, 0.14)), 0.025, lados=4)
madera = objeto('tienda_madera', bm, 'madera')
madera.modifiers.new('Bisel', 'BEVEL').width = 0.006  # bordes de los palos menos filosos

# --- UV: proyección inteligente, lista para texturas PBR (HU-12) ---
for obj in (lona, interior, madera):
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.02)
bpy.ops.object.mode_set(mode='OBJECT')

# --- Pieza: un vacío "tienda" con origen en la base agrupa las mallas ---
raiz = bpy.data.objects.new('tienda', None)
escena.collection.objects.link(raiz)
for obj in (lona, interior, madera):
    obj.parent = raiz

# Revisión antes de exportar (lista de la sesión 10): transformaciones en 0/0/1 y conteo de triángulos
deps = bpy.context.evaluated_depsgraph_get()
total = 0
for obj in (lona, interior, madera):
    assert tuple(obj.location) == (0, 0, 0) and tuple(obj.scale) == (1, 1, 1)
    evaluada = obj.evaluated_get(deps).to_mesh()
    tri = sum(len(p.vertices) - 2 for p in evaluada.polygons)
    obj.evaluated_get(deps).to_mesh_clear()
    total += tri
    print(f'{obj.name}: {tri} triángulos')
print(f'Total: {total} triángulos')

os.makedirs(os.path.dirname(SALIDA_GLB), exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=SALIDA_BLEND)
bpy.ops.export_scene.gltf(
    filepath=SALIDA_GLB,
    export_format='GLB',
    export_yup=True,            # Z arriba (Blender) → Y arriba (Three.js)
    export_apply=True,          # aplica Solidify y Bevel al exportar
    export_texcoords=True,
    export_normals=True,
    export_materials='EXPORT',
    export_draco_mesh_compression_enable=False,
    export_extras=False,
)
print('Exportado:', SALIDA_GLB)
