# Esqueleto y pose T para el candidato 3 (17-nov-2026). Parte de blender/personaje-3.blend (salida de
# preparar_candidatos.py -- 3). Uso:
#   "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" --background --factory-startup --python blender/riggear_candidato3.py [-- carpeta_de_vistas]
#
# 1. Mide las articulaciones sobre la malla (manos, codos, hombros, piernas).
# 2. Crea un esqueleto humanoide con los nombres de Mixamo (Hips, Spine, LeftArm…).
# 3. Pesos por distancia a cada hueso (3 huesos más cercanos, 1/d⁴, sin cruzar de lado).
# 4. Lleva los brazos de "manos en la cintura" a pose T y la aplica como pose de reposo de la malla.
# 5. Animación "reposo" (brazos abajo y respiración) para la isla.
# Escribe public/models/personaje-3.glb (con esqueleto), blender/personaje-3-rig.blend y
# blender/personaje-3-mixamo.fbx (solo la malla en T, con texturas, para el auto-rig de Mixamo).
import math
import os
import sys

import bpy
from mathutils import Matrix, Vector

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENTRADA = os.path.join(RAIZ, 'blender', 'personaje-3.blend')
SALIDA_GLB = os.path.join(RAIZ, 'public', 'models', 'personaje-3.glb')
SALIDA_BLEND = os.path.join(RAIZ, 'blender', 'personaje-3-rig.blend')
SALIDA_FBX = os.path.join(RAIZ, 'blender', 'personaje-3-mixamo.fbx')
VISTAS = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else None

bpy.ops.wm.open_mainfile(filepath=ENTRADA)
malla = next(o for o in bpy.data.objects if o.type == 'MESH')
# La malla queda con sus transformaciones aplicadas: coordenadas en metros, pies en z = 0, mira a −Y
for o in bpy.context.view_layer.objects:
    o.select_set(False)
bpy.context.view_layer.objects.active = malla
malla.select_set(True)
bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM')
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
for o in list(bpy.data.objects):
    if o.type == 'EMPTY':
        bpy.data.objects.remove(o)
me = malla.data
V = [v.co.copy() for v in me.vertices]
H = max(v.z for v in V)
print('alto', round(H, 3))

# =========================== 1. MEDIR ===========================
# Las manos son caras color piel a media altura; el codo es el punto del brazo más alejado del eje
uv = me.uv_layers.active.data
img = next(n.image for n in me.materials[0].node_tree.nodes if n.type == 'TEX_IMAGE')
px = list(img.pixels)
W, Hh = img.size


def color_de(p):
    u = sum(uv[l].uv.x for l in p.loop_indices) / p.loop_total
    v = sum(uv[l].uv.y for l in p.loop_indices) / p.loop_total
    i = (min(Hh - 1, int(v * Hh)) * W + min(W - 1, int(u * W))) * 4
    return px[i:i + 3]


def es_piel(c):
    r, g, b = c
    return r > g > b and r - b > 0.15 and r > 0.45


mano = {}
for lado, s in (('Left', 1), ('Right', -1)):
    pts = [p.center for p in me.polygons if 0.3 * H < p.center.z < 0.62 * H and p.center.x * s > 0.05 and es_piel(color_de(p))]
    mano[lado] = sum(pts, Vector()) / len(pts)
codo, hombro = {}, {}
for lado, s in (('Left', 1), ('Right', -1)):
    brazo = [v for v in V if 0.45 * H < v.z < 0.78 * H and v.x * s > 0]
    codo[lado] = max(brazo, key=lambda v: v.x * s).copy()
    # el hombro: arriba del torso, a 3/4 de la anchura de los hombros
    alto_hombro = max(v.z for v in V if v.z < 0.82 * H and abs(v.x) > 0.1)
    ancho = max(abs(v.x) for v in V if abs(v.z - alto_hombro) < 0.04)
    hombro[lado] = Vector((s * ancho * 0.72, 0.0, alto_hombro - 0.06))
codo = {k: Vector((v.x * 0.92, v.y * 0.5, v.z)) for k, v in codo.items()}  # hacia el centro del brazo
pierna = {}
for lado, s in (('Left', 1), ('Right', -1)):
    bota = [v for v in V if v.z < 0.12 * H and v.x * s > 0]
    pierna[lado] = Vector((sum(v.x for v in bota) / len(bota), sum(v.y for v in bota) / len(bota), 0))
for k in ('Left', 'Right'):
    print(k, 'hombro', tuple(round(c, 3) for c in hombro[k]), 'codo', tuple(round(c, 3) for c in codo[k]),
          'mano', tuple(round(c, 3) for c in mano[k]), 'pierna', tuple(round(c, 3) for c in pierna[k]))

# =========================== 2. ESQUELETO ===========================
J = {
    'Hips': Vector((0, 0, 0.52 * H)), 'Spine': Vector((0, 0, 0.6 * H)), 'Spine1': Vector((0, 0, 0.67 * H)),
    'Spine2': Vector((0, 0, 0.74 * H)), 'Neck': Vector((0, 0, 0.8 * H)), 'Head': Vector((0, 0, 0.85 * H)),
    'HeadTop_End': Vector((0, 0, H)),
}
for lado, s in (('Left', 1), ('Right', -1)):
    px_ = pierna[lado].x
    J[f'{lado}Shoulder'] = Vector((s * 0.03, 0, hombro[lado].z + 0.01))
    J[f'{lado}Arm'] = hombro[lado]
    J[f'{lado}ForeArm'] = codo[lado]
    J[f'{lado}Hand'] = mano[lado] + (codo[lado] - mano[lado]).normalized() * 0.04
    J[f'{lado}HandEnd'] = mano[lado] - (codo[lado] - mano[lado]).normalized() * 0.05
    J[f'{lado}UpLeg'] = Vector((px_, 0, 0.5 * H))
    J[f'{lado}Leg'] = Vector((px_, 0, 0.27 * H))
    J[f'{lado}Foot'] = Vector((px_, 0, 0.07 * H))
    J[f'{lado}ToeBase'] = Vector((px_, -0.1, 0.02))
    J[f'{lado}ToeEnd'] = Vector((px_, -0.16, 0.02))
CADENA = [('Hips', 'Spine', None), ('Spine', 'Spine1', 'Hips'), ('Spine1', 'Spine2', 'Spine'),
          ('Spine2', 'Neck', 'Spine1'), ('Neck', 'Head', 'Spine2'), ('Head', 'HeadTop_End', 'Neck')]
for lado in ('Left', 'Right'):
    L = lado
    CADENA += [(f'{L}Shoulder', f'{L}Arm', 'Spine2'), (f'{L}Arm', f'{L}ForeArm', f'{L}Shoulder'),
               (f'{L}ForeArm', f'{L}Hand', f'{L}Arm'), (f'{L}Hand', f'{L}HandEnd', f'{L}ForeArm'),
               (f'{L}UpLeg', f'{L}Leg', 'Hips'), (f'{L}Leg', f'{L}Foot', f'{L}UpLeg'),
               (f'{L}Foot', f'{L}ToeBase', f'{L}Leg'), (f'{L}ToeBase', f'{L}ToeEnd', f'{L}Foot')]
datos = bpy.data.armatures.new('esqueleto')
esqueleto = bpy.data.objects.new('esqueleto', datos)
bpy.context.scene.collection.objects.link(esqueleto)
bpy.context.view_layer.objects.active = esqueleto
bpy.ops.object.mode_set(mode='EDIT')
for nombre, fin, padre in CADENA:
    b = datos.edit_bones.new(nombre)
    b.head, b.tail = J[nombre], J[fin]
    if padre:
        b.parent = datos.edit_bones[padre]
        b.use_connect = (datos.edit_bones[padre].tail - b.head).length < 1e-4
bpy.ops.object.mode_set(mode='OBJECT')
HUESOS = [n for n, _, _ in CADENA]


# =========================== 3. PESOS ===========================
def distancia(p, a, b):
    ab = b - a
    t = max(0.0, min(1.0, (p - a).dot(ab) / ab.length_squared))
    return (p - (a + ab * t)).length


segmentos = {n: (J[n], J[f]) for n, f, _ in CADENA}
grupos = {n: malla.vertex_groups.new(name=n) for n in HUESOS}

# Piezas conexas de la malla (soldando los vértices duplicados por las costuras UV). Las manos tocan la
# cintura: sin esto, la túnica junto a las manos se iría con ellas al abrir los brazos
padre = list(range(len(me.vertices)))


def raiz(i):
    while padre[i] != i:
        padre[i] = padre[padre[i]]
        i = padre[i]
    return i


por_posicion = {}
for v in me.vertices:
    k = tuple(round(c, 4) for c in v.co)
    if k in por_posicion:
        padre[raiz(v.index)] = raiz(por_posicion[k])
    else:
        por_posicion[k] = v.index
for p in me.polygons:
    vs = list(p.vertices)
    for a in vs[1:]:
        padre[raiz(a)] = raiz(vs[0])
piezas = {}
for v in me.vertices:
    piezas.setdefault(raiz(v.index), []).append(v.index)
pieza_de = {}
es_brazo = {}
for r, ids in piezas.items():
    centro = sum((me.vertices[i].co for i in ids), Vector()) / len(ids)
    xs = [abs(me.vertices[i].co.x) for i in ids]
    zs = [me.vertices[i].co.z for i in ids]
    # Brazo o mano: pieza a un solo lado, fuera del eje, entre la cadera y los hombros
    brazo = min(xs) > 0.06 and 0.45 * H < centro.z < 0.8 * H and max(zs) - min(zs) < 0.45 * H
    for i in ids:
        pieza_de[i] = r
        es_brazo[i] = brazo
print('piezas', len(piezas), '· de brazos', len({pieza_de[i] for i in es_brazo if es_brazo[i]}))
BRAZO = ('Shoulder', 'Arm', 'ForeArm', 'Hand')

for v in me.vertices:
    p = v.co
    candidatos = []
    for n, (a, b) in segmentos.items():
        if n.endswith('End') or n == 'Head' and p.z < J['Neck'].z:
            continue
        if (n.startswith('Left') and p.x < -0.02) or (n.startswith('Right') and p.x > 0.02):
            continue
        del_brazo = n.endswith(BRAZO) and n.startswith(('Left', 'Right'))
        if es_brazo[v.index] != del_brazo and not (es_brazo[v.index] and n == 'Spine2'):
            continue  # las piezas del brazo solo siguen al brazo (y la espalda); el resto, nunca al brazo
        if p.z > 0.84 * H and not n.startswith(('Head', 'Neck')):
            continue  # la cabeza (y el pelo) solo sigue a la cabeza y el cuello
        candidatos.append((distancia(p, a, b), n))
    candidatos.sort()
    elegidos = candidatos[:3]
    pesos = [(1 / max(d, 0.01) ** 4, n) for d, n in elegidos]
    total = sum(w for w, _ in pesos)
    for w, n in pesos:
        grupos[n].add([v.index], w / total, 'REPLACE')
mod = malla.modifiers.new('Armature', 'ARMATURE')
mod.object = esqueleto
malla.parent = esqueleto


# =========================== 4. POSE T ===========================
def apuntar(nombre, direccion):
    # Gira el hueso (en pose) para que apunte en esa dirección del espacio del esqueleto
    pb = esqueleto.pose.bones[nombre]
    bpy.context.view_layer.update()
    actual = (pb.tail - pb.head).normalized()
    giro = actual.rotation_difference(direccion.normalized())
    m = pb.matrix.copy()
    pos = m.to_translation()
    nueva = Matrix.Translation(pos) @ giro.to_matrix().to_4x4() @ Matrix.Translation(-pos) @ m
    pb.matrix = nueva
    bpy.context.view_layer.update()


for lado, s in (('Left', 1), ('Right', -1)):
    apuntar(f'{lado}Arm', Vector((s, 0, 0)))
    apuntar(f'{lado}ForeArm', Vector((s, 0, 0)))
    apuntar(f'{lado}Hand', Vector((s, 0, 0)))
# La pose T pasa a ser la de reposo: se hornea en la malla y en el esqueleto
bpy.context.view_layer.objects.active = malla
bpy.ops.object.modifier_apply(modifier='Armature')
bpy.context.view_layer.objects.active = esqueleto
bpy.ops.object.mode_set(mode='POSE')
bpy.ops.pose.armature_apply(selected=False)
bpy.ops.object.mode_set(mode='OBJECT')
mod = malla.modifiers.new('Armature', 'ARMATURE')
mod.object = esqueleto

# FBX para Mixamo: solo la malla en pose T, con sus texturas dentro (Mixamo pone su propio esqueleto)
for o in bpy.context.view_layer.objects:
    o.select_set(False)
malla.select_set(True)
bpy.context.view_layer.objects.active = malla
bpy.ops.export_scene.fbx(filepath=SALIDA_FBX, use_selection=True, object_types={'MESH'}, use_armature_deform_only=True,
                         add_leaf_bones=False, path_mode='COPY', embed_textures=True, use_mesh_modifiers=False)
print('FBX para Mixamo:', SALIDA_FBX)

# =========================== 5. REPOSO ===========================
FPS = 30
bpy.context.scene.render.fps = FPS
esqueleto.animation_data_create()
accion = bpy.data.actions.new('reposo')
esqueleto.animation_data.action = accion
pb = esqueleto.pose.bones
for b in pb:
    b.rotation_mode = 'XYZ'


def bajar_brazos(f, t):
    # De la T a los costados: el brazo baja ~72° alrededor del eje Y del esqueleto, el antebrazo se dobla un poco
    for lado, s in (('Left', 1), ('Right', -1)):
        for nombre, grados in ((f'{lado}Arm', 72 + 1.5 * t), (f'{lado}ForeArm', 8)):
            b = pb[nombre]
            eje_local = (b.bone.matrix_local.to_3x3().inverted() @ Vector((0, 1, 0))).normalized()
            q = Matrix.Rotation(math.radians(s * grados), 3, eje_local)
            b.rotation_mode = 'QUATERNION'
            b.rotation_quaternion = q.to_quaternion()
            b.keyframe_insert('rotation_quaternion', frame=f)
    for nombre, grados in (('Spine2', 1.2 * t), ('Head', -1.0 * t)):
        b = pb[nombre]
        b.rotation_euler = (math.radians(grados), 0, 0)
        b.keyframe_insert('rotation_euler', frame=f)


for f in range(0, 91, 5):
    bajar_brazos(f, math.sin(f / 90 * 2 * math.pi))
bpy.context.scene.frame_start, bpy.context.scene.frame_end = 0, 90

bpy.ops.wm.save_as_mainfile(filepath=SALIDA_BLEND)
for o in bpy.context.view_layer.objects:
    o.select_set(True)
bpy.ops.export_scene.gltf(filepath=SALIDA_GLB, export_format='GLB', export_yup=True, export_image_format='WEBP',
                          export_image_quality=85, export_animations=True, export_animation_mode='ACTIONS',
                          export_skins=True, export_morph=False, export_def_bones=True)
print('Exportado:', SALIDA_GLB, round(os.path.getsize(SALIDA_GLB) / 1024, 1), 'KB')

# =========================== VISTAS ===========================
if VISTAS:
    esc = bpy.context.scene
    esc.render.engine = 'BLENDER_WORKBENCH'
    esc.display.shading.light = 'STUDIO'
    esc.display.shading.color_type = 'TEXTURE'
    esc.render.resolution_x, esc.render.resolution_y = 1000, 800
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
    esc.collection.objects.link(cam)
    esc.camera = cam
    cam.data.type = 'ORTHO'
    cam.data.ortho_scale = 1.9
    c = Vector((0, 0, 0.78))
    cam.location = c + Vector((0, -6, 0))
    cam.rotation_euler = (c - cam.location).to_track_quat('-Z', 'Y').to_euler()
    for nombre, frame, accion_activa in (('pose_t', 0, None), ('reposo', 22, accion)):
        esqueleto.animation_data.action = accion_activa
        if accion_activa is None:
            for b in pb:
                b.matrix_basis.identity()
        esc.frame_set(frame)
        esc.render.filepath = os.path.join(VISTAS, f'rig3_{nombre}.png')
        bpy.ops.render.render(write_still=True)
