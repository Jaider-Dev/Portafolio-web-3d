# PRUEBA ANTERIOR (13–15-nov-2026): personaje construido solo con primitivas. El personaje del proyecto
# es ahora el modelo descargado, preparado con blender/preparar_personaje.py. Este script se conserva como
# ejemplo del flujo (quads, Mirror, pose T) y escribe en blender/procedural/ para no pisar al definitivo.
# El Explorador (personaje del modo explorador, HU-27/HU-31; decisión de diseño P-4/PL-06).
# Versión 4 (13-nov-2026): aventurero de corte medieval. Túnica con falda y escote en V sobre una cota de
# malla, hombrera de placas en un solo hombro, brazaletes de cuero, guantes sin dedos, cinturón con
# hebilla, bolsa en bandolera y botas altas. Cabello negro y liso con flequillo de lado; piel trigueña clara.
# Uso:
#   "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" --background --factory-startup --python blender/personaje.py [-- carpeta_de_vistas]
# Escribe blender/personaje.blend, blender/personaje.fbx (para subir a Mixamo) y public/models/personaje.glb.
#
# Diseño ORIGINAL (01 · Concepto §6, 03 · Guion §3): toma prendas genéricas de aventurero medieval, pero no la
# identidad de ningún personaje existente: sin gorro, sin orejas puntiagudas, sin armas, sin emblemas, y la
# túnica en el azul de la paleta (PALETA.agua), no en verde. Lleva el farol y el diario del guion; la
# mochila pasa a una bolsa en bandolera.
# Proporción estilizada ≈ 1:3,5 y ≈ 1,5 m de alto (05 · Estilo §4). Sombreado suave (05 §6: personaje).
#
# Técnicas de la clase (sesiones 9 y 10):
# - SOLO QUADS: las piezas redondas salen de un cubo subdividido y proyectado a esfera (la técnica "de un
#   cubo a una esfera" de la sesión 10), estirado en cápsula para brazos, piernas y mechones. El script
#   comprueba que no quede ninguna cara que no sea quad.
# - Pose T para el autorig de Mixamo; modificador Mirror en las piezas de un lado.
# - Una sola malla con varios materiales; transformaciones aplicadas; +Y Up al exportar.
# - Mira hacia −Y (Blender) = +Z (Three.js). Origen entre los pies.
import math
import os
import random
import sys

import bmesh
import bpy
from mathutils import Vector

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SALIDA_GLB = os.path.join(RAIZ, 'blender', 'procedural', 'personaje_procedural.glb')
SALIDA_FBX = os.path.join(RAIZ, 'blender', 'procedural', 'personaje_procedural.fbx')
SALIDA_BLEND = os.path.join(RAIZ, 'blender', 'procedural', 'personaje_procedural.blend')
VISTAS = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else None

bpy.ops.wm.read_factory_settings(use_empty=True)
escena = bpy.context.scene


def lineal(hex_srgb):
    """Blender guarda el color base en espacio lineal: se convierte desde el hex sRGB de la paleta."""
    c = [int(hex_srgb[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c) + (1,)


# Colores: (hex sRGB, rugosidad, metálico). Salen de paleta.js; piel y cabello los eligió el autor.
COLOR_TUNICA = '#6eb7ca'  # PALETA.agua (elegido por el autor el 15-nov). Cambiar aquí el color de la túnica (siempre desde la paleta)
COLORES = {
    'piel': ('#d9a982', 0.65, 0),      # trigueña clara (PALETA.piel)
    'cabello': ('#151315', 0.5, 0),    # negro (PALETA.cabello)
    'labios': ('#a3665a', 0.5, 0),     # (PALETA.labios)
    'iris': ('#4a2e1c', 0.3, 0),       # ojos cafés (PALETA.iris)
    'esclerotica': ('#efe8dc', 0.4, 0),  # (PALETA.esclerotica)
    'suela': ('#2a2620', 0.9, 0),      # PALETA.sombra (pupila y suelas)
    'tunica': (COLOR_TUNICA, 0.85, 0),
    'ribete': ('#3a2818', 0.7, 0),     # PALETA.letrero: ribete de la túnica
    'malla': ('#847e6c', 0.45, 0.7),   # PALETA.roca, metálica: cota de malla
    'metal': ('#a89f81', 0.35, 0.8),   # PALETA.piedra, metálica: hombrera
    'cuero': ('#926440', 0.7, 0),      # PALETA.madera: brazaletes, botas, bolsa
    'cuero_oscuro': ('#3a2818', 0.7, 0),  # PALETA.letrero: cinturón, correas, guantes
    'pantalon': ('#cdc8bd', 0.9, 0),   # PALETA.humo: lino claro
    'laton': ('#f4af36', 0.35, 0.6),   # PALETA.fuego: hebillas y vidrio del farol
}
MATERIALES = {}
for nombre, (hex_srgb, rugosidad, metalico) in COLORES.items():
    m = bpy.data.materials.new(nombre)
    if m.node_tree is None:
        m.use_nodes = True
    bsdf = m.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = lineal(hex_srgb)
    bsdf.inputs['Roughness'].default_value = rugosidad
    bsdf.inputs['Metallic'].default_value = metalico
    m.diffuse_color = lineal(hex_srgb)
    MATERIALES[nombre] = m

mallas = {}  # un bmesh por (material, ¿espejo?)


def bm_de(material, espejo=False):
    return mallas.setdefault((material, espejo), bmesh.new())


_PLANTILLAS = {}


def _plantilla(cortes):
    """Cubo subdividido y proyectado a la esfera unidad (todas sus caras son quads), en un bmesh aparte:
    se guarda como lista de vértices y caras y se copia en cada pieza."""
    if cortes not in _PLANTILLAS:
        tmp = bmesh.new()
        bmesh.ops.create_cube(tmp, size=2)
        if cortes:
            bmesh.ops.subdivide_edges(tmp, edges=tmp.edges[:], cuts=cortes, use_grid_fill=True)
        tmp.verts.index_update()
        coords = [v.co.normalized() for v in tmp.verts]
        caras = [[v.index for v in f.verts] for f in tmp.faces]
        tmp.free()
        _PLANTILLAS[cortes] = (coords, caras)
    return _PLANTILLAS[cortes]


def _esfera_unidad(bm, cortes):
    coords, indices = _plantilla(cortes)
    verts = [bm.verts.new(c) for c in coords]
    caras = [bm.faces.new([verts[i] for i in cara]) for cara in indices]
    return verts, caras


def esfera(material, centro, radios, cortes=2, espejo=False, liso=True):
    bm = bm_de(material, espejo)
    verts, caras = _esfera_unidad(bm, cortes)
    for v in verts:
        v.co = Vector((v.co.x * radios[0], v.co.y * radios[1], v.co.z * radios[2])) + Vector(centro)
    for f in caras:
        f.smooth = liso
    return verts


def capsula(material, a, b, r1, r2=None, cortes=2, perfil=(1, 1, 1), espejo=False, liso=True):
    """Cápsula de quads entre los centros a (radio r1) y b (radio r2). perfil = (ancho, fondo, alto de las tapas)."""
    r2 = r1 if r2 is None else r2
    bm = bm_de(material, espejo)
    a, b = Vector(a), Vector(b)
    eje = b - a
    verts, caras = _esfera_unidad(bm, cortes)
    for v in verts:
        arriba = v.co.z > 0
        r = r2 if arriba else r1
        v.co = Vector((v.co.x * r * perfil[0], v.co.y * r * perfil[1],
                       v.co.z * r * perfil[2] + (eje.length / 2 if arriba else -eje.length / 2)))
    rot = Vector((0, 0, 1)).rotation_difference(eje.normalized()).to_matrix()
    for v in verts:
        v.co = rot @ v.co + a + eje / 2
    for f in caras:
        f.smooth = liso
    return verts


def caja(material, centro, tamano, espejo=False):
    bm = bm_de(material, espejo)
    res = bmesh.ops.create_cube(bm, size=1)
    for v in res['verts']:
        v.co = Vector((v.co.x * tamano[0], v.co.y * tamano[1], v.co.z * tamano[2])) + Vector(centro)
    for f in {f for v in res['verts'] for f in v.link_faces}:
        f.smooth = False
    return res['verts']


def toro(material, centro, radio, grosor, segmentos=16, lados=6, eje='Y', espejo=False):
    """Anillo de quads (rollo de cuerda, aros): rejilla (u, v) cerrada en los dos sentidos."""
    bm = bm_de(material, espejo)
    c = Vector(centro)
    anillo = []
    for i in range(segmentos):
        u = 2 * math.pi * i / segmentos
        fila = []
        for j in range(lados):
            v = 2 * math.pi * j / lados
            p = Vector(((radio + grosor * math.cos(v)) * math.cos(u), (radio + grosor * math.cos(v)) * math.sin(u), grosor * math.sin(v)))
            if eje == 'Y':
                p = Vector((p.x, p.z, p.y))
            elif eje == 'X':
                p = Vector((p.z, p.y, p.x))
            fila.append(bm.verts.new(c + p))
        anillo.append(fila)
    for i in range(segmentos):
        for j in range(lados):
            f = bm.faces.new((anillo[i][j], anillo[(i + 1) % segmentos][j],
                              anillo[(i + 1) % segmentos][(j + 1) % lados], anillo[i][(j + 1) % lados]))
            f.smooth = True


# =========================== CABEZA Y CARA ===========================
CABEZA = Vector((0, -0.005, 1.29))
esfera('piel', CABEZA, (0.17, 0.165, 0.195), cortes=4)
esfera('piel', (0, -0.04, 1.205), (0.125, 0.115, 0.085), cortes=2)                       # mandíbula y mentón
esfera('piel', (0, -0.115, 1.165), (0.045, 0.04, 0.03), cortes=1)                        # barbilla
esfera('piel', (0.17, 0.0, 1.275), (0.022, 0.035, 0.05), cortes=1, espejo=True)          # orejas redondas
esfera('piel', (0.185, -0.003, 1.276), (0.008, 0.02, 0.032), cortes=1, espejo=True)      # pliegue de la oreja
capsula('piel', (0, 0, 1.05), (0, 0, 1.15), 0.056)                                        # cuello

OJO = Vector((0.06, -0.142, 1.3))
esfera('esclerotica', OJO, (0.034, 0.019, 0.024), cortes=2, espejo=True)
esfera('iris', OJO + Vector((0, -0.015, -0.002)), (0.017, 0.008, 0.018), cortes=1, espejo=True)
esfera('suela', OJO + Vector((0, -0.019, -0.002)), (0.008, 0.004, 0.009), cortes=1, espejo=True)       # pupila
esfera('esclerotica', OJO + Vector((0.006, -0.022, 0.005)), (0.004, 0.002, 0.004), cortes=1, espejo=True)  # brillo
esfera('piel', OJO + Vector((0, 0.002, 0.012)), (0.037, 0.021, 0.016), cortes=2, espejo=True)          # párpado
capsula('cabello', (0.03, -0.158, 1.34), (0.065, -0.162, 1.35), 0.01, cortes=1, espejo=True)           # cejas
capsula('cabello', (0.065, -0.162, 1.35), (0.098, -0.15, 1.338), 0.008, cortes=1, espejo=True)
capsula('piel', (0, -0.16, 1.29), (0, -0.177, 1.248), 0.012, 0.021, cortes=1)                          # nariz
esfera('piel', (0.018, -0.166, 1.241), (0.014, 0.013, 0.012), cortes=1, espejo=True)
capsula('labios', (0, -0.164, 1.2), (0.034, -0.155, 1.205), 0.009, 0.0065, perfil=(1, 0.9, 1), cortes=1, espejo=True)
capsula('labios', (-0.025, -0.16, 1.188), (0.025, -0.16, 1.188), 0.0105, perfil=(1, 0.85, 1), cortes=1)

# =========================== CABELLO NEGRO Y LISO ===========================
azar = random.Random(11)
gorro = esfera('cabello', CABEZA + Vector((0, 0.012, 0.022)), (0.18, 0.178, 0.205), cortes=3)
bm = bm_de('cabello')
bmesh.ops.delete(bm, geom=[v for v in gorro if v.co.y < -0.07 and v.co.z < 1.43], context='VERTS')  # despeja la cara


def mechon(arriba, abajo, r1, r2, ancho=2.3, fondo=0.4):
    capsula('cabello', arriba, abajo, r1, r2, cortes=1, perfil=(ancho, fondo, 1))


# Flequillo peinado de lado: los mechones nacen en la coronilla y caen hacia la derecha del personaje
for k in range(8):
    x = -0.11 + 0.028 * k
    mechon((x, -0.09, 1.49), (x + 0.04, -0.168, 1.38 - 0.009 * k), 0.026, 0.014)
# Mechones que enmarcan la cara hasta la mandíbula
for lado in (-1, 1):
    mechon((lado * 0.15, -0.09, 1.42), (lado * 0.165, -0.1, 1.25), 0.028, 0.014, ancho=1.6, fondo=0.5)
    mechon((lado * 0.172, -0.04, 1.4), (lado * 0.18, -0.045, 1.19), 0.03, 0.016, ancho=1.0, fondo=1.6)
    mechon((lado * 0.168, 0.03, 1.42), (lado * 0.18, 0.04, 1.14), 0.032, 0.018, ancho=1.0, fondo=1.6)
# Melena lisa por detrás, hasta la nuca y el arranque de los hombros
for k in range(12):
    x = -0.16 + 0.32 * k / 11
    y = 0.1 + 0.035 * math.cos(x * 7)
    largo = 1.07 + azar.uniform(-0.02, 0.02)
    mechon((x * 0.9, y - 0.02, 1.44), (x, y + 0.03, largo), 0.036, 0.02, ancho=1.9, fondo=0.5)
# Volumen de la coronilla
for k in range(6):
    a = 2 * math.pi * k / 6
    mechon((0.06 * math.cos(a), 0.02 + 0.06 * math.sin(a), 1.5), (0.15 * math.cos(a), 0.04 + 0.13 * math.sin(a), 1.4),
           0.035, 0.03, ancho=2.0, fondo=0.5)

# =========================== TORSO: COTA DE MALLA Y TÚNICA ===========================
capsula('malla', (0, 0, 0.74), (0, 0, 0.97), 0.138, 0.155, cortes=3, perfil=(1, 0.68, 0.4))      # cota de malla
capsula('malla', (0, 0, 1.015), (0, 0, 1.055), 0.078, cortes=2, perfil=(1, 0.95, 0.5))          # cuello de malla
tunica = capsula('tunica', (0, 0, 0.72), (0, 0, 0.975), 0.15, 0.168, cortes=3, perfil=(1, 0.72, 0.4))
bm = bm_de('tunica')
escote = [f for f in bm.faces if all(v in tunica for v in f.verts)
          and f.calc_center_median().y < -0.06 and f.calc_center_median().z > 0.9 and abs(f.calc_center_median().x) < 0.06]
bmesh.ops.delete(bm, geom=escote, context='FACES')                                               # escote en V
capsula('ribete', (0, -0.112, 1.0), (0.06, -0.122, 0.915), 0.009, cortes=1, espejo=True)       # ribete del escote
capsula('tunica', (-0.15, 0, 0.985), (0.15, 0, 0.985), 0.06, cortes=2, perfil=(1, 0.9, 0.9))   # hombros
# Falda de la túnica, acampanada, con ribete oscuro en el bajo
capsula('tunica', (0, 0, 0.66), (0, 0, 0.5), 0.152, 0.19, cortes=3, perfil=(1, 0.76, 0.35))
capsula('ribete', (0, 0, 0.445), (0, 0, 0.46), 0.193, cortes=3, perfil=(1, 0.77, 0.35))
# Cinturón ancho con hebilla, bolsita y presillas
capsula('cuero_oscuro', (0, 0, 0.675), (0, 0, 0.715), 0.158, cortes=3, perfil=(1, 0.75, 0.3))
caja('laton', (0, -0.118, 0.695), (0.05, 0.012, 0.042))
caja('cuero_oscuro', (0, -0.121, 0.695), (0.028, 0.012, 0.022))
caja('cuero', (0.11, -0.095, 0.65), (0.06, 0.03, 0.07))                                          # bolsita
caja('cuero_oscuro', (0.11, -0.112, 0.675), (0.064, 0.008, 0.022))
# Bolsa en bandolera: correa del hombro derecho a la cadera izquierda, bolsa atrás a la izquierda
capsula('cuero_oscuro', (0.1, -0.128, 1.0), (-0.13, -0.128, 0.7), 0.011, cortes=1, perfil=(2.4, 0.6, 1))
capsula('cuero_oscuro', (0.1, 0.12, 1.0), (-0.13, 0.13, 0.7), 0.011, cortes=1, perfil=(2.4, 0.6, 1))
capsula('cuero_oscuro', (0.1, -0.128, 1.0), (0.1, 0.12, 1.0), 0.011, cortes=1, perfil=(2.4, 0.6, 1))
capsula('cuero', (-0.175, 0.07, 0.6), (-0.175, 0.07, 0.68), 0.065, cortes=2, perfil=(0.6, 1.3, 0.5))
caja('cuero_oscuro', (-0.2, 0.07, 0.675), (0.02, 0.15, 0.05))                                    # solapa de la bolsa
caja('laton', (-0.212, 0.07, 0.66), (0.006, 0.02, 0.018))
# Hombrera de placas solo en el hombro izquierdo (−X), sujeta con una correa
for k, (z, r) in enumerate(((1.04, 0.078), (1.0, 0.074), (0.965, 0.068))):
    esfera('metal', (-0.205 - 0.012 * k, 0, z), (r, 0.072, 0.03), cortes=2)
caja('cuero_oscuro', (-0.2, 0, 1.06), (0.02, 0.15, 0.01))

# =========================== BRAZOS (pose T) ===========================
capsula('malla', (0.17, 0, 0.985), (0.385, 0, 0.985), 0.05, 0.044, espejo=True)                # mangas de malla
capsula('tunica', (0.15, 0, 0.985), (0.27, 0, 0.985), 0.061, 0.056, espejo=True)                # manga corta
capsula('ribete', (0.265, 0, 0.985), (0.28, 0, 0.985), 0.058, perfil=(1, 1, 0.5), espejo=True)
capsula('cuero', (0.39, 0, 0.985), (0.56, 0, 0.985), 0.046, 0.041, espejo=True)                 # brazalete largo
for x in (0.42, 0.47, 0.52):
    capsula('cuero_oscuro', (x, 0, 0.985), (x + 0.012, 0, 0.985), 0.048, perfil=(1, 1, 0.4), espejo=True)  # cordones
esfera('cuero_oscuro', (0.605, 0, 0.983), (0.049, 0.028, 0.044), cortes=2, espejo=True)          # guante sin dedos
for k, (largo, y) in enumerate(((0.048, -0.018), (0.054, -0.006), (0.051, 0.006), (0.042, 0.017))):
    capsula('piel', (0.645, y, 0.983), (0.645 + largo, y, 0.981 - 0.004 * k), 0.0085, 0.0075, cortes=1, espejo=True)
capsula('piel', (0.585, -0.025, 0.985), (0.615, -0.05, 0.982), 0.011, 0.009, cortes=1, espejo=True)  # pulgar

# =========================== PIERNAS Y BOTAS ALTAS ===========================
capsula('pantalon', (0, 0, 0.58), (0, 0, 0.66), 0.14, cortes=3, perfil=(1, 0.7, 0.4))          # cadera
capsula('pantalon', (0.08, 0, 0.6), (0.085, 0, 0.36), 0.066, 0.056, espejo=True)
capsula('pantalon', (0.085, 0, 0.36), (0.085, 0, 0.3), 0.055, espejo=True)
capsula('cuero', (0.085, 0, 0.06), (0.085, 0, 0.33), 0.064, 0.06, espejo=True)                  # caña de la bota
capsula('cuero_oscuro', (0.085, 0, 0.33), (0.085, 0, 0.36), 0.069, perfil=(1, 1, 0.5), espejo=True)  # vuelta
for z in (0.14, 0.25):
    capsula('cuero_oscuro', (0.085, 0, z), (0.085, 0, z + 0.014), 0.066, perfil=(1, 1, 0.35), espejo=True)  # correas
    caja('laton', (0.13, -0.035, z + 0.007), (0.008, 0.02, 0.016), espejo=True)
capsula('cuero', (0.085, 0.0, 0.045), (0.085, -0.12, 0.04), 0.049, 0.045, perfil=(1.1, 0.8, 1), espejo=True)  # empeine
caja('suela', (0.085, -0.055, 0.008), (0.105, 0.22, 0.016), espejo=True)

# =========================== EQUIPO DEL GUION ===========================
# Farol colgado del cinturón (cadera izquierda, delante de la bolsa): asa, tapa, vidrio y base
capsula('cuero_oscuro', (-0.17, -0.07, 0.63), (-0.17, -0.07, 0.67), 0.006, cortes=1)
caja('cuero_oscuro', (-0.17, -0.07, 0.618), (0.05, 0.05, 0.016))
capsula('laton', (-0.17, -0.07, 0.535), (-0.17, -0.07, 0.6), 0.028, cortes=2, perfil=(1, 1, 0.5))
caja('cuero_oscuro', (-0.17, -0.07, 0.518), (0.054, 0.054, 0.016))
# Diario a la cadera derecha, detrás de la bolsita
caja('cuero', (0.172, 0.03, 0.62), (0.035, 0.1, 0.12))
caja('cuero_oscuro', (0.172, 0.03, 0.62), (0.038, 0.103, 0.014))

# =========================== MALLA FINAL ===========================
objetos = []
for (material, espejo), bm in mallas.items():
    nombre = f'explorador_{material}' + ('_espejo' if espejo else '')
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    malla = bpy.data.meshes.new(nombre)
    bm.to_mesh(malla)
    bm.free()
    malla.materials.append(MATERIALES[material])
    obj = bpy.data.objects.new(nombre, malla)
    escena.collection.objects.link(obj)
    if espejo:
        mod = obj.modifiers.new('Espejo', 'MIRROR')
        mod.use_axis = (True, False, False)
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=mod.name)
    objetos.append(obj)

bpy.ops.object.select_all(action='DESELECT')
for obj in objetos:
    obj.select_set(True)
bpy.context.view_layer.objects.active = objetos[0]
bpy.ops.object.join()
explorador = bpy.context.view_layer.objects.active
explorador.name = explorador.data.name = 'explorador'

bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.mesh.normals_make_consistent(inside=False)
bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.01)
bpy.ops.object.mode_set(mode='OBJECT')

# Revisión (sesión 10): solo quads, transformaciones en 0/0/1, presupuesto
no_quads = sum(1 for p in explorador.data.polygons if len(p.vertices) != 4)
assert no_quads == 0, f'{no_quads} caras no son quads'
assert tuple(explorador.location) == (0, 0, 0) and tuple(explorador.scale) == (1, 1, 1)
quads = len(explorador.data.polygons)
dims = explorador.dimensions
print(f'explorador: {quads} quads ({quads * 2} triángulos en la GPU), 0 triángulos ni n-gonos · '
      f'{dims.x:.2f} × {dims.y:.2f} × {dims.z:.2f} m · {len(explorador.data.materials)} materiales')

bpy.ops.wm.save_as_mainfile(filepath=SALIDA_BLEND)
bpy.ops.export_scene.fbx(filepath=SALIDA_FBX, use_selection=False, apply_scale_options='FBX_SCALE_ALL',
                         axis_forward='-Z', axis_up='Y')
bpy.ops.export_scene.gltf(filepath=SALIDA_GLB, export_format='GLB', export_yup=True, export_apply=True,
                          export_texcoords=True, export_normals=True, export_materials='EXPORT',
                          export_draco_mesh_compression_enable=False, export_extras=False)
print('Exportado:', SALIDA_GLB, SALIDA_FBX)

# =========================== VISTAS PREVIAS (opcional) ===========================
if VISTAS:
    os.makedirs(VISTAS, exist_ok=True)
    escena.render.engine = 'BLENDER_WORKBENCH'
    escena.display.shading.light = 'STUDIO'
    escena.display.shading.color_type = 'MATERIAL'
    escena.display.shading.show_cavity = True
    escena.render.resolution_x, escena.render.resolution_y = 700, 800
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
    escena.collection.objects.link(cam)
    escena.camera = cam

    def foto(nombre, angulo, objetivo, distancia, altura, lente=50):
        a = math.radians(angulo)
        cam.data.lens = lente
        cam.location = objetivo + Vector((distancia * math.sin(a), -distancia * math.cos(a), altura))
        cam.rotation_euler = (objetivo - cam.location).to_track_quat('-Z', 'Y').to_euler()
        escena.render.filepath = os.path.join(VISTAS, f'explorador_{nombre}.png')
        bpy.ops.render.render(write_still=True)

    cuerpo = Vector((0, 0, 0.78))
    foto('frente', 0, cuerpo, 3.4, 0.35)
    foto('tres_cuartos', 35, cuerpo, 3.4, 0.35)
    foto('espalda', 180, cuerpo, 3.4, 0.35)
    foto('cara', 20, Vector((0, 0, 1.28)), 1.1, 0.05, lente=60)
    # Alambre: una copia con el modificador Wireframe deja ver que la malla es de quads
    copia = explorador.copy()
    copia.data = explorador.data.copy()
    escena.collection.objects.link(copia)
    alambre = copia.modifiers.new('Alambre', 'WIREFRAME')
    alambre.thickness = 0.0025
    alambre.use_replace = True
    explorador.hide_render = True
    foto('alambre', 20, Vector((0, 0, 1.15)), 1.6, 0.1, lente=55)
    print('Vistas en', VISTAS)
