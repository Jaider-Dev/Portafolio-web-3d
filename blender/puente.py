# Puente del río modelado en Blender (HU-11; flujo Blender → GLB de las sesiones 9 y 10).
# Uso:
#   "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" --background --factory-startup --python blender/puente.py
# Escribe blender/puente.blend y public/models/puente.glb.
#
# Técnicas de la clase:
# - Modificador Array: un tablón se repite 19 veces a lo largo del puente; luego se aplica y cada
#   vértice se mueve según la curva del arco (más alto en el centro, como un puente de arco).
# - Bevel en los tablones y los postes: bordes menos filosos que atrapan brillos.
# - Medidas como el modelo provisional: 7 m de largo en X, 1,6 m de ancho; origen en el centro del
#   tablero (MUNDO.puente lo coloca). La flecha del arco es 0,48 m.
# - Transformaciones aplicadas, un solo material "madera" (Lugares.jsx lo pinta con la paleta), sin Draco.
import math
import os

import bmesh
import bpy
from mathutils import Vector

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SALIDA_GLB = os.path.join(RAIZ, 'public', 'models', 'puente.glb')
SALIDA_BLEND = os.path.join(RAIZ, 'blender', 'puente.blend')

LARGO = 6.8          # de extremo a extremo de los tablones
ANCHO = 1.6
TABLONES = 19
FLECHA = 0.48        # cuánto bajan los extremos respecto al centro


def curva(x):
    """Altura del tablero en x: arco suave, 0 en el centro y −FLECHA en los extremos (como el provisional)."""
    return -FLECHA * (x / 3.5) ** 2


bpy.ops.wm.read_factory_settings(use_empty=True)
escena = bpy.context.scene

madera = bpy.data.materials.new('madera')
if madera.node_tree is None:
    madera.use_nodes = True
bsdf = madera.node_tree.nodes.get('Principled BSDF')
bsdf.inputs['Base Color'].default_value = (0.32, 0.32, 0.32, 1)
bsdf.inputs['Roughness'].default_value = 0.85


def nuevo(nombre, bm):
    malla = bpy.data.meshes.new(nombre)
    bm.to_mesh(malla)
    bm.free()
    malla.materials.append(madera)
    obj = bpy.data.objects.new(nombre, malla)
    escena.collection.objects.link(obj)
    return obj


def aplicar(obj, modificador):
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=modificador.name)


def caja(bm, centro, tamano):
    res = bmesh.ops.create_cube(bm, size=1)
    bmesh.ops.scale(bm, vec=tamano, verts=res['verts'])
    bmesh.ops.translate(bm, vec=centro, verts=res['verts'])


def cilindro(bm, desde, hasta, radio, lados=6):
    eje = hasta - desde
    res = bmesh.ops.create_cone(bm, cap_ends=True, segments=lados, radius1=radio, radius2=radio, depth=eje.length)
    rot = Vector((0, 0, 1)).rotation_difference(eje.normalized()).to_matrix().to_4x4()
    bmesh.ops.transform(bm, matrix=rot, verts=res['verts'])
    bmesh.ops.translate(bm, vec=desde + eje / 2, verts=res['verts'])


# --- Tablero: un tablón + Array (19 copias), luego se aplica y se curva vértice a vértice ---
paso = LARGO / (TABLONES - 1)
bm = bmesh.new()
caja(bm, Vector((-LARGO / 2, 0, 0)), Vector((0.34, ANCHO, 0.07)))
tablero = nuevo('puente_tablero', bm)
bisel = tablero.modifiers.new('Bisel', 'BEVEL')
bisel.width = 0.012
bisel.segments = 1
aplicar(tablero, bisel)
fila = tablero.modifiers.new('Fila', 'ARRAY')
fila.count = TABLONES
fila.use_relative_offset = False
fila.use_constant_offset = True
fila.constant_offset_displace = (paso, 0, 0)
aplicar(tablero, fila)
# Cada tablón sigue el arco: se desplaza y se inclina con la pendiente (los vértices de cada tablón
# comparten centro, así que se agrupan por el tablón más cercano)
for v in tablero.data.vertices:
    indice = round((v.co.x + LARGO / 2) / paso)
    cx = -LARGO / 2 + indice * paso
    pendiente = -2 * FLECHA * cx / 3.5 ** 2
    v.co.z += curva(cx) + (v.co.x - cx) * pendiente

# --- Barandas: postes y cuerdas siguiendo el arco ---
bm = bmesh.new()
puntos = [-3.3, -1.65, 0, 1.65, 3.3]
for y in (-0.74, 0.74):
    for x in puntos:
        cilindro(bm, Vector((x, y, curva(x) - 0.02)), Vector((x, y, curva(x) + 0.95)), 0.055)
    # Cuerda en tramos cortos: se adapta a la curva sin necesidad de un modificador Curve
    tramos = 16
    for i in range(tramos):
        x0 = -3.3 + 6.6 * i / tramos
        x1 = -3.3 + 6.6 * (i + 1) / tramos
        caida = lambda x: 0.06 * math.sin(math.pi * ((x + 3.3) % 1.65) / 1.65)  # se descuelga entre postes
        cilindro(bm, Vector((x0, y, curva(x0) + 0.86 - caida(x0))), Vector((x1, y, curva(x1) + 0.86 - caida(x1))), 0.022, lados=4)
barandas = nuevo('puente_barandas', bm)

# Una sola malla con un solo material: un draw call para todo el puente
bpy.ops.object.select_all(action='DESELECT')
tablero.select_set(True)
barandas.select_set(True)
bpy.context.view_layer.objects.active = tablero
bpy.ops.object.join()
puente = tablero
puente.name = 'puente'

# UV para texturas de madera futuras (HU-12)
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.mesh.remove_doubles(threshold=0.0001)
bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.02)
bpy.ops.object.mode_set(mode='OBJECT')

assert tuple(puente.location) == (0, 0, 0) and tuple(puente.scale) == (1, 1, 1)
tri = sum(len(p.vertices) - 2 for p in puente.data.polygons)
print(f'puente: {tri} triángulos')

bpy.ops.wm.save_as_mainfile(filepath=SALIDA_BLEND)
bpy.ops.export_scene.gltf(
    filepath=SALIDA_GLB,
    export_format='GLB',
    export_yup=True,
    export_apply=True,
    export_texcoords=True,
    export_normals=True,
    export_materials='EXPORT',
    export_draco_mesh_compression_enable=False,
    export_extras=False,
)
print('Exportado:', SALIDA_GLB)
