# Prepara el personaje descargado (blender/fuente/personaje_descargado.glb) para el proyecto.
# Uso:
#   "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" --background --factory-startup --python blender/preparar_personaje.py [-- carpeta_de_vistas]
# Escribe blender/personaje.blend (con esqueleto y animaciones, para seguir a mano), blender/personaje.fbx
# (malla sin esqueleto, por si se prefiere riggear en Mixamo) y public/models/personaje.glb.
#
# El modelo de origen (generado por IA a partir de una imagen) llega como suelen llegar estos modelos:
# un millón de triángulos sueltos, sin materiales, sin UV y sin esqueleto. Los pasos (sesiones 9 a 11):
#   1. Normalizar: transformaciones aplicadas, 1,5 m de alto (05 · Estilo §4), pies en el origen, Z arriba.
#   2. Retopología a QUADS: soldar vértices → remallado por vóxeles (malla cerrada de quads) → QuadriFlow
#      hasta ~7 mil quads, dentro del presupuesto del personaje (≤ 15 mil triángulos en la GPU).
#      QuadriFlow rechaza mallas con aristas muy cortas ("no es manifold"): se trabaja a escala ×100.
#   3. Color por zonas con la paleta (paleta.js), pintado en la malla de alta resolución.
#   4. Baking (horneado): el detalle del millón de triángulos pasa a un mapa de normales y el color a una
#      textura, las dos de 1K, sobre la malla ligera (presupuesto: "1 textura de 1K", 06 §20).
#   5. Esqueleto humanoide (nombres tipo Mixamo) y pesos automáticos por calor.
#   6. Animaciones propias en bucle: reposo, caminar y correr (clips para useAnimations, sesión 5).
import math
import os
import sys
import time

import bmesh
import bpy
from mathutils import Quaternion, Vector

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FUENTE = os.path.join(RAIZ, 'blender', 'fuente', 'personaje_descargado.glb')
SALIDA_GLB = os.path.join(RAIZ, 'public', 'models', 'personaje.glb')
SALIDA_FBX = os.path.join(RAIZ, 'blender', 'personaje.fbx')
SALIDA_BLEND = os.path.join(RAIZ, 'blender', 'personaje.blend')
VISTAS = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else None

ALTURA = 1.5
QUADS_OBJETIVO = 7500      # QuadriFlow entrega ~6,8 mil quads (~13,6 mil triángulos en la GPU)
ESCALA_TRABAJO = 100       # ver paso 2
TEXTURA = 1024
FPS = 30

bpy.ops.wm.read_factory_settings(use_empty=True)
escena = bpy.context.scene
escena.render.fps = FPS
INICIO = time.time()


def marca(texto):
    print(f'[{time.time() - INICIO:6.0f} s] {texto}', flush=True)


def activar(*objs):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[-1]


def lineal(hex_srgb):
    c = [int(hex_srgb[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c) + (1,)


# =========================== 1. NORMALIZAR ===========================
bpy.ops.import_scene.gltf(filepath=FUENTE)
alta = next(o for o in escena.objects if o.type == 'MESH')
activar(alta)
bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM')
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
for o in list(escena.objects):
    if o is not alta:
        bpy.data.objects.remove(o)

bm = bmesh.new()
bm.from_mesh(alta.data)
bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.0001)  # el origen trae los triángulos sueltos
minimo = Vector((min(v.co.x for v in bm.verts), min(v.co.y for v in bm.verts), min(v.co.z for v in bm.verts)))
maximo = Vector((max(v.co.x for v in bm.verts), max(v.co.y for v in bm.verts), max(v.co.z for v in bm.verts)))
factor = ALTURA / (maximo.z - minimo.z)
centro = Vector(((minimo.x + maximo.x) / 2, (minimo.y + maximo.y) / 2, minimo.z))
for v in bm.verts:
    v.co = (v.co - centro) * factor  # pies en el origen, centrado en X e Y
bm.normal_update()
bm.to_mesh(alta.data)
bm.free()
alta.name = 'alta_resolucion'
for atributo in [a.name for a in alta.data.attributes if a.name in ('custom_normal', 'sharp_face')]:
    alta.data.attributes.remove(alta.data.attributes[atributo])
for p in alta.data.polygons:
    p.use_smooth = True

# =========================== 2. RETOPOLOGÍA A QUADS ===========================
baja = alta.copy()
baja.data = alta.data.copy()
escena.collection.objects.link(baja)
activar(baja)
baja.scale = (ESCALA_TRABAJO,) * 3
bpy.ops.object.transform_apply(scale=True)
baja.data.remesh_voxel_size = 0.006 * ESCALA_TRABAJO
bpy.ops.object.voxel_remesh()


def solo_la_pieza_mayor(malla):
    bm = bmesh.new()
    bm.from_mesh(malla)
    bm.verts.ensure_lookup_table()
    pieza_de = {}
    pieza = 0
    for v in bm.verts:
        if v.index in pieza_de:
            continue
        pila = [v]
        pieza_de[v.index] = pieza
        while pila:
            x = pila.pop()
            for e in x.link_edges:
                o = e.other_vert(x)
                if o.index not in pieza_de:
                    pieza_de[o.index] = pieza
                    pila.append(o)
        pieza += 1
    conteo = {}
    for k in pieza_de.values():
        conteo[k] = conteo.get(k, 0) + 1
    mayor = max(conteo, key=conteo.get)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if pieza_de[v.index] != mayor], context='VERTS')
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(malla)
    bm.free()


solo_la_pieza_mayor(baja.data)
resultado = bpy.ops.object.quadriflow_remesh(mode='FACES', target_faces=QUADS_OBJETIVO, use_mesh_symmetry=False,
                                             use_preserve_sharp=False, use_preserve_boundary=False, smooth_normals=False, seed=7)
assert resultado == {'FINISHED'}, 'QuadriFlow no pudo rehacer la malla'
baja.scale = (1 / ESCALA_TRABAJO,) * 3
bpy.ops.object.transform_apply(scale=True)
baja.name = baja.data.name = 'explorador'
for p in baja.data.polygons:
    p.use_smooth = True
lados = {}
for p in baja.data.polygons:
    lados[len(p.vertices)] = lados.get(len(p.vertices), 0) + 1
marca('retopología lista')
print(f'retopología: {len(baja.data.polygons)} caras {lados} · alto {baja.dimensions.z:.3f} m')

# =========================== 3. COLOR POR ZONAS (en la malla de alta) ===========================
# Medidas tomadas de las vistas del modelo (pies en z = 0, mira hacia −Y, su izquierda es +X)
PALETA = {
    'piel': '#d9a982', 'cabello': '#151315', 'tunica': '#6eb7ca', 'pantalon': '#cdc8bd',
    'cuero': '#926440', 'cuero_oscuro': '#3a2818', 'ojo': '#2a2620', 'labios': '#a3665a', 'laton': '#f4af36', 'metal': '#a89f81',
}
COLOR = {k: lineal(v) for k, v in PALETA.items()}


def cerca_de_segmento(p, a, b, radio):
    ab = b - a
    t = max(0, min(1, (p - a).dot(ab) / ab.length_squared))
    return (a + ab * t - p).length < radio


CORREA_DELANTE = (Vector((-0.15, 0, 1.22)), Vector((0.15, 0, 0.88)))
CORREA_DETRAS = (Vector((0.13, 0, 1.19)), Vector((-0.13, 0, 0.9)))


def zona(p, n):
    ax = abs(p.x)
    # Brazos (fuera del tronco): mano, brazalete, manga de la camisa interior o manga de la túnica
    if ax > 0.2 and p.z > 0.72:
        if ax > 0.535:
            return 'piel'
        if ax > 0.35:
            return 'cuero'
        if p.x > 0.12 and p.z > 1.1 and ax < 0.33 and p.y > -0.12:
            return 'metal'  # hombrera (lado izquierdo)
        if ax > 0.275:
            return 'pantalon'  # manga de lino de la camisa interior
        return 'tunica'
    # Cabeza y pelo; ojos y cejas pintados (el relieve horneado solo no los hace legibles)
    if p.z > 1.205:
        cara = p.z < 1.43 and ax < 0.075 and n.y < -0.25 and p.y < -0.02
        if cara and n.y < -0.45:
            if (Vector((ax, p.z)) - Vector((0.036, 1.35))).length < 0.0075:
                return 'ojo'
            if cerca_de_segmento(Vector((ax, 0, p.z)), Vector((0.0, 0, 1.262)), Vector((0.02, 0, 1.265)), 0.0035):
                return 'labios'
            if cerca_de_segmento(Vector((ax, 0, p.z)), Vector((0.016, 0, 1.38)), Vector((0.06, 0, 1.376)), 0.0055):
                return 'cabello'
        return 'piel' if cara else 'cabello'
    if p.z > 1.13 and (p.y > 0.035 or 0.11 < ax < 0.17) and ax < 0.21 and p.z > 1.16 - 0.25 * max(0.0, p.y):
        return 'cabello'  # melena sobre la espalda (por delante solo junto al cuello)
    if p.z > 1.15 and ax < 0.06:
        return 'piel'  # cuello
    # Hombrera
    if p.x > 0.12 and p.z > 1.1 and p.y > -0.12:
        return 'metal'
    # Correa de la bolsa, por delante y por detrás
    if 0.86 < p.z < 1.24:
        if p.y < -0.03 and cerca_de_segmento(Vector((p.x, 0, p.z)), *CORREA_DELANTE, 0.022):
            return 'cuero_oscuro'
        if p.y > 0.03 and cerca_de_segmento(Vector((p.x, 0, p.z)), *CORREA_DETRAS, 0.022):
            return 'cuero_oscuro'
    # Cinturón y hebilla
    if 0.848 < p.z < 0.912 and ax < 0.21:
        if ax < 0.035 and p.y < -0.09:
            return 'laton'
        return 'cuero_oscuro'
    # Bolsa (izquierda) y bolsita + farol (derecha)
    if 0.1 < p.x < 0.25 and 0.7 < p.z < 0.93 and p.y < 0.12:
        return 'cuero'
    if -0.21 < p.x < -0.1 and 0.79 < p.z < 0.9:
        return 'cuero'
    if -0.105 < p.x < -0.055 and 0.69 < p.z < 0.78 and p.y < -0.07:
        return 'laton'  # vidrio del farol
    # Túnica hasta el bajo, pantalón y botas
    if p.z > 0.58:
        return 'tunica'
    if p.z > 0.365:
        return 'pantalon'
    return 'cuero'


capa = alta.data.color_attributes.new('Col', 'BYTE_COLOR', 'POINT')
conteo = {}
colores = []
for v in alta.data.vertices:
    z = zona(v.co, v.normal)
    conteo[z] = conteo.get(z, 0) + 1
    colores.extend(COLOR[z])
# Una sola escritura masiva: asignar capa.data[i].color vértice a vértice tardaba ~2 horas con 500 mil vértices
capa.data.foreach_set('color', colores)
print('zonas:', conteo)
marca('color por zonas listo')

mat_alta = bpy.data.materials.new('fuente')
if mat_alta.node_tree is None:
    mat_alta.use_nodes = True
nodos = mat_alta.node_tree.nodes
bsdf_alta = nodos.get('Principled BSDF')
color_attr = nodos.new('ShaderNodeVertexColor')
color_attr.layer_name = 'Col'
mat_alta.node_tree.links.new(color_attr.outputs['Color'], bsdf_alta.inputs['Base Color'])
alta.data.materials.append(mat_alta)

# =========================== 4. UV + BAKING ===========================
activar(baja)
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.uv.smart_project(angle_limit=math.radians(60), island_margin=0.004)
bpy.ops.object.mode_set(mode='OBJECT')

img_color = bpy.data.images.new('explorador_color', TEXTURA, TEXTURA)
img_normal = bpy.data.images.new('explorador_normal', TEXTURA, TEXTURA)
img_normal.colorspace_settings.name = 'Non-Color'

mat = bpy.data.materials.new('explorador')
if mat.node_tree is None:
    mat.use_nodes = True
n = mat.node_tree.nodes
l = mat.node_tree.links
bsdf = n.get('Principled BSDF')
bsdf.inputs['Roughness'].default_value = 0.75
tex_color = n.new('ShaderNodeTexImage')
tex_color.image = img_color
tex_normal = n.new('ShaderNodeTexImage')
tex_normal.image = img_normal
mapa_normal = n.new('ShaderNodeNormalMap')
baja.data.materials.append(mat)

escena.render.engine = 'CYCLES'
escena.cycles.device = 'CPU'
escena.cycles.samples = 1  # el horneado de normales y color no necesita más muestras
escena.cycles.use_denoising = False
escena.render.bake.use_selected_to_active = True
escena.render.bake.cage_extrusion = 0.02
escena.render.bake.max_ray_distance = 0.06
escena.render.bake.margin = 8
activar(alta, baja)

n.active = tex_normal
bpy.ops.object.bake(type='NORMAL', normal_space='TANGENT')
marca('mapa de normales horneado')
n.active = tex_color
escena.render.bake.use_pass_direct = False
escena.render.bake.use_pass_indirect = False
escena.render.bake.use_pass_color = True
bpy.ops.object.bake(type='DIFFUSE')
img_color.pack()
img_normal.pack()
marca('color horneado')

# Material final: color y relieve horneados
l.new(tex_color.outputs['Color'], bsdf.inputs['Base Color'])
l.new(tex_normal.outputs['Color'], mapa_normal.inputs['Color'])
l.new(mapa_normal.outputs['Normal'], bsdf.inputs['Normal'])
bpy.data.objects.remove(alta)
escena.render.engine = 'BLENDER_EEVEE' if 'BLENDER_EEVEE' in [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items] else 'BLENDER_WORKBENCH'

# Malla sin esqueleto para Mixamo (alternativa)
activar(baja)
bpy.ops.export_scene.fbx(filepath=SALIDA_FBX, use_selection=True, apply_scale_options='FBX_SCALE_ALL',
                         axis_forward='-Z', axis_up='Y', path_mode='COPY', embed_textures=True)

# =========================== 5. ESQUELETO ===========================
# Articulaciones medidas sobre el modelo en pose A (brazos a ~42° hacia abajo)
J = {
    'Hips': (0, 0, 0.8), 'Spine': (0, 0.005, 0.9), 'Spine1': (0, 0.01, 1.0), 'Spine2': (0, 0.01, 1.1),
    'Neck': (0, 0.0, 1.19), 'Head': (0, -0.005, 1.25), 'HeadTop_End': (0, -0.005, 1.48),
}
for lado, s in (('Left', 1), ('Right', -1)):
    J.update({
        f'{lado}Shoulder': (s * 0.05, 0.0, 1.16), f'{lado}Arm': (s * 0.2, 0.0, 1.14),
        f'{lado}ForeArm': (s * 0.36, 0.0, 1.005), f'{lado}Hand': (s * 0.51, -0.005, 0.875),
        f'{lado}HandEnd': (s * 0.6, -0.01, 0.79),
        f'{lado}UpLeg': (s * 0.09, 0.0, 0.79), f'{lado}Leg': (s * 0.1, -0.005, 0.44),
        f'{lado}Foot': (s * 0.105, 0.01, 0.09), f'{lado}ToeBase': (s * 0.105, -0.08, 0.03),
        f'{lado}ToeEnd': (s * 0.105, -0.15, 0.03),
    })
J = {k: Vector(v) for k, v in J.items()}
CADENA = [('Hips', 'Spine', None), ('Spine', 'Spine1', 'Hips'), ('Spine1', 'Spine2', 'Spine'),
          ('Spine2', 'Neck', 'Spine1'), ('Neck', 'Head', 'Spine2'), ('Head', 'HeadTop_End', 'Neck')]
for lado in ('Left', 'Right'):
    CADENA += [
        (f'{lado}Shoulder', f'{lado}Arm', 'Spine2'), (f'{lado}Arm', f'{lado}ForeArm', f'{lado}Shoulder'),
        (f'{lado}ForeArm', f'{lado}Hand', f'{lado}Arm'), (f'{lado}Hand', f'{lado}HandEnd', f'{lado}ForeArm'),
        (f'{lado}UpLeg', f'{lado}Leg', 'Hips'), (f'{lado}Leg', f'{lado}Foot', f'{lado}UpLeg'),
        (f'{lado}Foot', f'{lado}ToeBase', f'{lado}Leg'), (f'{lado}ToeBase', f'{lado}ToeEnd', f'{lado}Foot'),
    ]

datos_esq = bpy.data.armatures.new('esqueleto')
esqueleto = bpy.data.objects.new('esqueleto', datos_esq)
escena.collection.objects.link(esqueleto)
activar(esqueleto)
bpy.ops.object.mode_set(mode='EDIT')
for nombre, punta, padre in CADENA:
    hueso = datos_esq.edit_bones.new(nombre)
    hueso.head = J[nombre]
    hueso.tail = J[punta]
    if padre:
        hueso.parent = datos_esq.edit_bones[padre]
        hueso.use_connect = (datos_esq.edit_bones[padre].tail - hueso.head).length < 1e-4
    hueso.roll = 0
bpy.ops.object.mode_set(mode='OBJECT')

# Pesos por distancia a cada hueso. Los pesos "de calor" de Blender fallan con este modelo (escala y
# malla densa: "failed to find solution"); el cálculo geométrico es predecible: cada vértice sigue a sus
# 3 huesos más cercanos (peso ∝ 1/d⁴), sin cruzar de lado, y el pelo solo sigue a cabeza, cuello y espalda.
def distancia_a_hueso(p, a, b):
    ab = b - a
    t = max(0, min(1, (p - a).dot(ab) / ab.length_squared))
    return (a + ab * t - p).length


huesos = {b.name: (b.head_local.copy(), b.tail_local.copy()) for b in datos_esq.bones}
grupos = {nombre: baja.vertex_groups.new(name=nombre) for nombre in huesos}
for v in baja.data.vertices:
    p = v.co
    if zona(p, v.normal) in ('cabello', 'ojo') and p.z > 1.1 and abs(p.x) < 0.25:
        candidatos = ['Head', 'Neck', 'Spine2']
    else:
        candidatos = [h for h in huesos if not (p.x > 0.05 and h.startswith('Right')) and not (p.x < -0.05 and h.startswith('Left'))]
    cercanos = sorted((distancia_a_hueso(p, *huesos[h]), h) for h in candidatos)[:3]
    pesos = [(1 / (d ** 4 + 1e-10), h) for d, h in cercanos]
    total = sum(w for w, _ in pesos)
    for w, h in pesos:
        if w / total > 0.01:
            grupos[h].add([v.index], w / total, 'REPLACE')
baja.parent = esqueleto
armadura = baja.modifiers.new('Esqueleto', 'ARMATURE')
armadura.object = esqueleto
sin_peso = sum(1 for v in baja.data.vertices if not v.groups)
print(f'pesos: {len(baja.vertex_groups)} grupos, {sin_peso} vértices sin peso')
marca('esqueleto y pesos listos')

# =========================== 6. ANIMACIONES ===========================
X, Y, Z = Vector((1, 0, 0)), Vector((0, 1, 0)), Vector((0, 0, 1))


def giro(pb, eje, grados):
    """Rotación alrededor de un eje del mundo, expresada en el espacio local del hueso."""
    b = pb.bone.matrix_local.to_quaternion()
    return b.inverted() @ Quaternion(eje, math.radians(grados)) @ b


def clave(pb, frame, *giros, loc=None):
    q = Quaternion()
    for eje, grados in giros:
        q = giro(pb, eje, grados) @ q
    pb.rotation_mode = 'QUATERNION'
    pb.rotation_quaternion = q
    pb.keyframe_insert('rotation_quaternion', frame=frame)
    if loc is not None:
        pb.location = loc
        pb.keyframe_insert('location', frame=frame)


P = esqueleto.pose.bones
# Brazos en reposo: de la pose A a los costados (giro alrededor de Y; el signo depende del lado)
BRAZO_ABAJO = {'Left': 32, 'Right': -32}


def nueva_accion(nombre):
    accion = bpy.data.actions.new(nombre)
    accion.use_fake_user = True
    esqueleto.animation_data_create()
    esqueleto.animation_data.action = accion
    for pb in P:
        pb.rotation_mode = 'QUATERNION'
        pb.rotation_quaternion = Quaternion()
        pb.location = Vector()
    return accion


def ciclo(nombre, cuadros, pose):
    """pose(t) se evalúa en t ∈ [0, 1) y en t = 1 se repite la primera clave: bucle sin saltos."""
    accion = nueva_accion(nombre)
    pasos = 8
    for k in range(pasos + 1):
        t = (k % pasos) / pasos
        frame = 1 + round(k * cuadros / pasos)
        pose(t, frame)
    for curva in accion.fcurves if hasattr(accion, 'fcurves') else []:
        for kp in curva.keyframe_points:
            kp.interpolation = 'BEZIER'
    return accion


def reposo(t, f):
    s = math.sin(2 * math.pi * t)
    clave(P['Hips'], f, loc=Vector((0, 0, 0.004 * s)))
    clave(P['Spine1'], f, (X, -1.5 * s))
    clave(P['Spine2'], f, (X, -1.0 * s))
    clave(P['Head'], f, (X, 1.0 * s), (Z, 2 * math.sin(math.pi * 2 * t + 1)))
    for lado in ('Left', 'Right'):
        clave(P[f'{lado}Arm'], f, (Y, BRAZO_ABAJO[lado] + (2 * s if lado == 'Left' else -2 * s)))
        clave(P[f'{lado}ForeArm'], f, (X, -8))


def andar(amplitud_pierna, amplitud_brazo, rodilla, bote, inclinacion):
    def pose(t, f):
        a = 2 * math.pi * t
        s, c = math.sin(a), math.cos(a)
        clave(P['Hips'], f, (Z, 4 * s), loc=Vector((0, 0, bote * abs(math.cos(a)) - bote * 0.5)))
        clave(P['Spine'], f, (X, -inclinacion), (Z, -6 * s))
        clave(P['Head'], f, (X, inclinacion * 0.6))
        for lado, fase in (('Left', 1), ('Right', -1)):
            ps = fase * s
            clave(P[f'{lado}UpLeg'], f, (X, -amplitud_pierna * ps))
            dobla = rodilla * max(0.0, math.sin(a * 1 + (0 if fase > 0 else math.pi) + math.pi / 2))
            clave(P[f'{lado}Leg'], f, (X, dobla))
            clave(P[f'{lado}Foot'], f, (X, -0.3 * dobla + 8 * ps))
            clave(P[f'{lado}Arm'], f, (Y, BRAZO_ABAJO[lado]), (X, amplitud_brazo * ps))
            clave(P[f'{lado}ForeArm'], f, (X, -12 - 10 * max(0.0, -ps)))
    return pose


ciclo('reposo', 90, reposo)
ciclo('caminar', 32, andar(26, 22, 38, 0.025, 3))
ciclo('correr', 20, andar(42, 40, 70, 0.05, 10))
esqueleto.animation_data.action = bpy.data.actions['reposo']
escena.frame_start, escena.frame_end = 1, 90

# Comprobaciones
lados = {}
for p in baja.data.polygons:
    lados[len(p.vertices)] = lados.get(len(p.vertices), 0) + 1
assert set(lados) == {4}, f'hay caras que no son quads: {lados}'
print(f'explorador: {len(baja.data.polygons)} quads ({2 * len(baja.data.polygons)} triángulos en la GPU) · '
      f'{len(datos_esq.bones)} huesos · animaciones {[a.name for a in bpy.data.actions]}')

bpy.ops.wm.save_as_mainfile(filepath=SALIDA_BLEND)
activar(baja, esqueleto)
bpy.ops.export_scene.gltf(filepath=SALIDA_GLB, export_format='GLB', use_selection=True, export_yup=True,
                          export_apply=False, export_texcoords=True, export_normals=True,
                          export_materials='EXPORT', export_image_format='WEBP', export_image_quality=88,
                          export_skins=True, export_animations=True, export_animation_mode='ACTIONS',
                          export_draco_mesh_compression_enable=False, export_extras=False)
marca('exportado')
print('Exportado:', SALIDA_GLB)

# =========================== VISTAS PREVIAS (opcional) ===========================
if VISTAS:
    escena.render.engine = 'BLENDER_WORKBENCH'
    escena.display.shading.light = 'STUDIO'
    escena.display.shading.color_type = 'TEXTURE'
    escena.display.shading.show_cavity = False
    escena.render.resolution_x, escena.render.resolution_y = 640, 720
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
    escena.collection.objects.link(cam)
    escena.camera = cam
    cam.data.type = 'ORTHO'

    def foto(nombre, centro, ancho, angulo, accion='reposo', frame=1):
        esqueleto.animation_data.action = bpy.data.actions[accion]
        escena.frame_set(frame)
        a = math.radians(angulo)
        cam.data.ortho_scale = ancho
        cam.location = centro + Vector((4 * math.sin(a), -4 * math.cos(a), 0.3))
        cam.rotation_euler = (centro - cam.location).to_track_quat('-Z', 'Y').to_euler()
        escena.render.filepath = os.path.join(VISTAS, f'explorador_{nombre}.png')
        bpy.ops.render.render(write_still=True)

    cuerpo = Vector((0, 0, 0.75))
    foto('frente', cuerpo, 1.75, 0)
    foto('tres_cuartos', cuerpo, 1.75, 30)
    foto('espalda', cuerpo, 1.75, 180)
    foto('cara', Vector((0, 0, 1.3)), 0.42, 15)
    foto('caminar', cuerpo, 1.75, 90, 'caminar', 9)
    foto('correr', cuerpo, 1.75, 90, 'correr', 6)
    print('Vistas en', VISTAS)
