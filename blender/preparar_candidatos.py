# Prepara los dos personajes candidatos (17-nov-2026) para compararlos en la isla.
# Uso:
#   "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" --background --factory-startup --python blender/preparar_candidatos.py -- <2|3> [carpeta_de_vistas]
#
#   2 · realista, con esqueleto de Character Creator y texturas (descartado el 17-nov).
#   3 · low poly, una textura, sin esqueleto.
#
# Pasos (pedidos por el autor el 17-nov): piel morena y cabello oscuro (recoloreando las texturas: se
# conservan los detalles pintados), cabello largo (se estira la parte de atrás y de los lados del pelo
# hasta los hombros), malla en quads (Tris to Quads; el GLB siempre guarda triángulos, el .blend queda en
# quads), 1,5 m de alto (05 · Estilo §4), mirando a −Y (= +Z en three.js) y exportado en GLB con WebP.
import os
import sys

import bpy
import numpy as np
from mathutils import Vector

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else ['2']
CUAL = ARGS[0]
VISTAS = ARGS[1] if len(ARGS) > 1 else None

ALTURA = 1.5
PIEL_MORENA = '#c49272'   # piel morena suave y clara (17-nov: "#8f5b3c" quedó demasiado oscura)
CABELLO = '#1d1615'       # cabello oscuro: tono medio del pelo (con brillos, cercano a PALETA.cabello)
# Ropa con la paleta del explorador (paleta.js, 15-nov): túnica = agua, pantalón = humo, cuero = madera
TUNICA, PANTALON, CUERO = '#6eb7ca', '#cdc8bd', '#926440'

MODELOS = {
    '2': dict(fuente='male_character_2.glb', salida='personaje-2.glb',
              # alargar: cuánto baja el borde de atrás y cuánto se separa del cuello, en fracción de la altura
              largo=0.12, separar=0.08),  # más separación: la capucha está pegada a la nuca
    '3': dict(fuente='guest_male_3_-_medieval_fantasy_challenge.glb', salida='personaje-3.glb',
              largo=0.12, separar=0.02),
}
M = MODELOS[CUAL]
FUENTE = os.path.join(RAIZ, 'blender', 'fuente', M['fuente'])
SALIDA_GLB = os.path.join(RAIZ, 'public', 'models', M['salida'])
SALIDA_BLEND = os.path.join(RAIZ, 'blender', M['salida'].replace('.glb', '.blend'))


def srgb(hex_):
    return np.array([int(hex_[i:i + 2], 16) / 255 for i in (1, 3, 5)])


def pixeles(img):
    a = np.empty(img.size[0] * img.size[1] * 4, dtype=np.float32)
    img.pixels.foreach_get(a)
    return a.reshape(img.size[1], img.size[0], 4)


def guardar(img, arr):
    img.pixels.foreach_set(arr.astype(np.float32).ravel())
    img.update()
    img.pack()


def hsv(rgb):
    mx = rgb.max(-1)
    mn = rgb.min(-1)
    d = mx - mn + 1e-6
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) / 6
    return h, d / (mx + 1e-6), mx


def mascara_piel(rgb):
    # Tonos de piel: naranja-rojizo (0–45°), saturación media, no muy oscuros. Peso suave en los bordes
    h, s, v = hsv(rgb)
    h = np.where(h > 0.9, h - 1, h)
    return (np.clip(1 - np.abs(h - 0.06) / 0.08, 0, 1) * np.clip((s - 0.12) / 0.08, 0, 1)
            * np.clip((0.82 - s) / 0.1, 0, 1) * np.clip((v - 0.3) / 0.1, 0, 1))


def tonificar(arr, peso, objetivo):
    # Lleva el tono medio de la zona marcada al objetivo con una ganancia por canal: las sombras, los
    # brillos y los detalles pintados (cejas, labios, barba) conservan su relación con la piel
    rgb = arr[..., :3]
    w = peso[..., None]
    media = (rgb * w).sum((0, 1)) / max(w.sum(), 1e-6)
    ganancia = objetivo / np.maximum(media, 1e-3)
    arr[..., :3] = np.clip(rgb * (1 - w) + rgb * ganancia * w, 0, 1)
    return media


def colorear(arr, peso, objetivo):
    # Tiñe la zona marcada con un color de la paleta conservando su sombreado: cada texel toma el color
    # objetivo escalado por su luminancia relativa a la media de la zona (los pliegues y costuras se ven)
    rgb = arr[..., :3]
    lum = rgb @ np.array([0.3, 0.59, 0.11])
    w = peso
    media = (lum * w).sum() / max(w.sum(), 1e-6)
    relativo = np.clip(lum / max(media, 1e-3), 0.25, 1.8) ** 0.8
    arr[..., :3] = np.clip(rgb * (1 - w[..., None]) + objetivo * relativo[..., None] * w[..., None], 0, 1)


def imagen_de(mat, socket='Base Color'):
    for n in mat.node_tree.nodes:
        if n.type == 'TEX_IMAGE' and n.image and any(l.to_socket.name == socket for l in n.outputs[0].links):
            return n.image
    return None


# =========================== IMPORTAR Y LIMPIAR ===========================
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=FUENTE)
for o in list(bpy.data.objects):
    if o.name.startswith('Icosphere'):  # una esfera suelta que trae el modelo 2
        bpy.data.objects.remove(o)
for a in list(bpy.data.actions):  # la "T-pose" del modelo 2: la pose de reposo ya tiene los brazos abajo
    bpy.data.actions.remove(a)
for o in bpy.data.objects:
    if o.animation_data:
        o.animation_data_clear()
    if o.type == 'ARMATURE':  # la T-pose también queda en los huesos: se vuelve a la pose de reposo
        for pb in o.pose.bones:
            pb.matrix_basis.identity()
mallas = [o for o in bpy.data.objects if o.type == 'MESH']
esqueleto = next((o for o in bpy.data.objects if o.type == 'ARMATURE'), None)
bpy.context.view_layer.update()
puntos = [o.matrix_world @ v.co for o in mallas for v in o.data.vertices]
ALTO_ORIGINAL = max(p.z for p in puntos) - min(p.z for p in puntos)
U = ALTO_ORIGINAL  # las medidas del pelo se dan en fracciones de la altura
print('alto original', round(ALTO_ORIGINAL, 3))

# =========================== PIEL MORENA ===========================
objetivo_piel = srgb(PIEL_MORENA)
if CUAL == '2':
    # La piel tiene su propia textura (Wolf3D_Skin) y el cuerpo bajo la ropa un color plano
    for o in mallas:
        mat = o.data.materials[0]
        if mat.name in ('Wolf3D_Skin', 'Wolf3D_Body'):
            img = imagen_de(mat)
            arr = pixeles(img)
            if img.size[0] > 4:
                peso = np.clip(mascara_piel(arr[..., :3]) * 1.5, 0, 1)
                media = tonificar(arr, np.maximum(peso, 0.85 * (arr[..., 3] > 0)), objetivo_piel)
            else:
                media = arr[..., :3].mean((0, 1))
                arr[..., :3] = objetivo_piel
            guardar(img, arr)
            print('piel', mat.name, 'de', np.round(media, 3), 'a', PIEL_MORENA)
else:
    malla = mallas[0]
    img = imagen_de(malla.data.materials[0])
    arr = pixeles(img)
    peso = mascara_piel(arr[..., :3])
    media = tonificar(arr, peso, objetivo_piel)
    print('piel de', np.round(media, 3), 'a', PIEL_MORENA, '·', int((peso > 0.5).sum()), 'texeles')
    guardar(img, arr)


# =========================== CABELLO: CARAS DEL PELO ===========================
def caras_de_pelo():
    # Devuelve {objeto: [índices de caras]} del cabello
    if CUAL == '2':
        return {o: [p.index for p in o.data.polygons] for o in mallas if o.data.materials[0].name == 'Wolf3D_Hair'}
    # Modelo 3: el pelo es parte de la única malla. Son las caras de la cabeza (por encima del cuello) cuyo
    # texel es oscuro y no es piel
    o = mallas[0]
    me = o.data
    uv = me.uv_layers.active.data
    alto = max((o.matrix_world @ v.co).z for v in me.vertices)  # en el mundo (Z arriba), no en local (Y arriba)
    tex = pixeles(imagen_de(o.data.materials[0]))
    h, w = tex.shape[:2]
    pelo = []
    for p in me.polygons:
        c = o.matrix_world @ p.center
        if c.z < 0.86 * alto:
            continue
        u = sum(uv[i].uv.x for i in p.loop_indices) / p.loop_total
        v = sum(uv[i].uv.y for i in p.loop_indices) / p.loop_total
        rgb = tex[min(h - 1, int(v * h)), min(w - 1, int(u * w)), :3]
        if rgb.max() < 0.28 and mascara_piel(rgb[None, None])[0, 0] < 0.2:
            pelo.append(p.index)
    return {o: pelo}


PELO = caras_de_pelo()
print('caras de pelo', {o.name: len(c) for o, c in PELO.items()})

# =========================== CABELLO OSCURO ===========================
objetivo_pelo = srgb(CABELLO)
if CUAL == '2':
    # El color del pelo es una imagen plana de 2×2 (la de 1024 es su mapa de normales: no se toca)
    for o in PELO:
        img = imagen_de(o.data.materials[0])
        arr = pixeles(img)
        media = arr[..., :3].mean((0, 1))
        arr[..., :3] = objetivo_pelo
        guardar(img, arr)
        print('pelo de', np.round(media, 3), 'a', CABELLO)
else:
    # Se pintan las islas UV de las caras del pelo en la textura (rasterizando sus triángulos)
    o = mallas[0]
    me = o.data
    uv = me.uv_layers.active.data
    img = imagen_de(me.materials[0])
    arr = pixeles(img)
    h, w = arr.shape[:2]
    mascara = np.zeros((h, w), dtype=np.float32)
    yy, xx = np.mgrid[0:h, 0:w]
    for i in PELO[o]:
        p = me.polygons[i]
        tri = [(uv[l].uv.x * w, uv[l].uv.y * h) for l in p.loop_indices]
        for k in range(1, len(tri) - 1):
            (x0, y0), (x1, y1), (x2, y2) = tri[0], tri[k], tri[k + 1]
            x_min, x_max = int(max(0, min(x0, x1, x2) - 2)), int(min(w - 1, max(x0, x1, x2) + 2))
            y_min, y_max = int(max(0, min(y0, y1, y2) - 2)), int(min(h - 1, max(y0, y1, y2) + 2))
            sx, sy = xx[y_min:y_max + 1, x_min:x_max + 1] + 0.5, yy[y_min:y_max + 1, x_min:x_max + 1] + 0.5
            den = (y1 - y2) * (x0 - x2) + (x2 - x1) * (y0 - y2)
            if abs(den) < 1e-9:
                continue
            a = ((y1 - y2) * (sx - x2) + (x2 - x1) * (sy - y2)) / den
            b = ((y2 - y0) * (sx - x2) + (x0 - x2) * (sy - y2)) / den
            dentro = (a >= -0.02) & (b >= -0.02) & (1 - a - b >= -0.02)
            mascara[y_min:y_max + 1, x_min:x_max + 1][dentro] = 1
    media = tonificar(arr, mascara, objetivo_pelo)
    guardar(img, arr)
    print('pelo de', np.round(media, 3), 'a', CABELLO, '·', int(mascara.sum()), 'texeles')


# =========================== ROPA CON LA PALETA ===========================
def rasterizar(o, caras, h, w):
    # Máscara de la textura (h × w) con las islas UV de esas caras
    me = o.data
    uv = me.uv_layers.active.data
    mascara = np.zeros((h, w), dtype=np.float32)
    yy, xx = np.mgrid[0:h, 0:w]
    for i in caras:
        tri = [(uv[l].uv.x * w, uv[l].uv.y * h) for l in me.polygons[i].loop_indices]
        for k in range(1, len(tri) - 1):
            (x0, y0), (x1, y1), (x2, y2) = tri[0], tri[k], tri[k + 1]
            x_min, x_max = int(max(0, min(x0, x1, x2) - 2)), int(min(w - 1, max(x0, x1, x2) + 2))
            y_min, y_max = int(max(0, min(y0, y1, y2) - 2)), int(min(h - 1, max(y0, y1, y2) + 2))
            sx, sy = xx[y_min:y_max + 1, x_min:x_max + 1] + 0.5, yy[y_min:y_max + 1, x_min:x_max + 1] + 0.5
            den = (y1 - y2) * (x0 - x2) + (x2 - x1) * (y0 - y2)
            if abs(den) < 1e-9:
                continue
            a = ((y1 - y2) * (sx - x2) + (x2 - x1) * (sy - y2)) / den
            b = ((y2 - y0) * (sx - x2) + (x0 - x2) * (sy - y2)) / den
            dentro = (a >= -0.02) & (b >= -0.02) & (1 - a - b >= -0.02)
            mascara[y_min:y_max + 1, x_min:x_max + 1][dentro] = 1
    return mascara


def altura_de_texeles(o, caras, h, w):
    # Mapa (h × w) con la altura en el mundo de cada texel de esas caras (NaN fuera de ellas)
    me = o.data
    uv = me.uv_layers.active.data
    mapa = np.full((h, w), np.nan, dtype=np.float32)
    yy, xx = np.mgrid[0:h, 0:w]
    for i in caras:
        p = me.polygons[i]
        tri = [(uv[l].uv.x * w, uv[l].uv.y * h, (o.matrix_world @ me.vertices[me.loops[l].vertex_index].co).z) for l in p.loop_indices]
        for k in range(1, len(tri) - 1):
            (x0, y0, z0), (x1, y1, z1), (x2, y2, z2) = tri[0], tri[k], tri[k + 1]
            x_min, x_max = int(max(0, min(x0, x1, x2) - 1)), int(min(w - 1, max(x0, x1, x2) + 1))
            y_min, y_max = int(max(0, min(y0, y1, y2) - 1)), int(min(h - 1, max(y0, y1, y2) + 1))
            sx, sy = xx[y_min:y_max + 1, x_min:x_max + 1] + 0.5, yy[y_min:y_max + 1, x_min:x_max + 1] + 0.5
            den = (y1 - y2) * (x0 - x2) + (x2 - x1) * (y0 - y2)
            if abs(den) < 1e-9:
                continue
            a = ((y1 - y2) * (sx - x2) + (x2 - x1) * (sy - y2)) / den
            b = ((y2 - y0) * (sx - x2) + (x0 - x2) * (sy - y2)) / den
            dentro = (a >= -0.03) & (b >= -0.03) & (1 - a - b >= -0.03)
            zona = mapa[y_min:y_max + 1, x_min:x_max + 1]
            zona[dentro] = (a * z0 + b * z1 + (1 - a - b) * z2)[dentro]
    return mapa


if CUAL == '2':
    # Cada prenda tiene su textura: la parte de arriba (chaqueta y capucha) pasa a túnica azul, el
    # pantalón a humo y las botas a cuero. Las correas de la chaqueta están en la misma textura y se tiñen igual
    for o in mallas:
        mat = o.data.materials[0]
        color = {'Wolf3D_Outfit_Top': TUNICA, 'Wolf3D_Outfit_Bottom': PANTALON, 'Wolf3D_Outfit_Footwear': CUERO}.get(mat.name)
        if not color:
            continue
        img = imagen_de(mat)
        arr = pixeles(img)
        colorear(arr, (arr[..., 3] > 0.05).astype(np.float32), srgb(color))
        guardar(img, arr)
        print('ropa', mat.name, '→', color)
else:
    # Una sola textura: cada cara se clasifica por su altura y el tono de su texel. Oscuro y arriba de
    # las botas = túnica; oscuro y abajo = botas; claro y abajo = pantalón; claro a media altura = cinturón
    o = mallas[0]
    me = o.data
    uv = me.uv_layers.active.data
    img = imagen_de(me.materials[0])
    arr = pixeles(img)
    h, w = arr.shape[:2]
    alto = max((o.matrix_world @ v.co).z for v in me.vertices)
    pelo = set(PELO[o])
    grupos = {TUNICA: [], PANTALON: [], CUERO: []}
    cabeza = []
    for p in me.polygons:
        z = (o.matrix_world @ p.center).z / alto
        u = sum(uv[i].uv.x for i in p.loop_indices) / p.loop_total
        v = sum(uv[i].uv.y for i in p.loop_indices) / p.loop_total
        rgb = arr[min(h - 1, int(v * h)), min(w - 1, int(u * w)), :3]
        lum = float(rgb @ np.array([0.3, 0.59, 0.11]))
        if p.index in pelo or z > 0.8 or (z >= 0.4 and mascara_piel(rgb[None, None])[0, 0] > 0.3 and lum > 0.4):
            cabeza.append(p.index)  # pelo, cara, cuello y manos: no se tiñen
            continue
        if z < 0.19:
            grupos[CUERO].append(p.index)  # botas
        elif z < 0.31:
            grupos[PANTALON].append(p.index)  # entre las botas y el borde de la túnica
        elif lum >= 0.38 and z >= 0.4:
            grupos[CUERO].append(p.index)  # cinturón
        else:
            grupos[TUNICA].append(p.index)
    # La textura reutiliza zonas entre caras: los texeles que usa la cabeza no se tocan
    protegida = rasterizar(o, cabeza, h, w)
    for color, caras in grupos.items():
        colorear(arr, rasterizar(o, caras, h, w) * (1 - protegida), srgb(color))
        print('ropa', color, len(caras), 'caras')

    # Sin barba ni bigote (17-nov): en la cara, los texeles oscuros por debajo de los ojos pasan al tono de
    # piel. Cada texel sabe su altura en el mundo (interpolada en su triángulo); los ojos (verde azulado) y
    # las cejas (por encima de los ojos) se conservan
    cara = [i for i in cabeza if i not in pelo and (o.matrix_world @ me.polygons[i].center).z / alto > 0.78]
    altura = altura_de_texeles(o, cara, h, w) / alto
    rgb = arr[..., :3]
    tono, sat, val = hsv(rgb)
    ojo = (tono > 0.35) & (tono < 0.6) & (sat > 0.2) & ~np.isnan(altura)
    z_ojos = float(np.nanmin(np.where(ojo, altura, np.nan)))
    lum = rgb @ np.array([0.3, 0.59, 0.11])
    piel = (mascara_piel(rgb) > 0.5) & ~np.isnan(altura)
    tono_piel = np.median(rgb[piel], axis=0)
    del_pelo = rasterizar(o, pelo, h, w) > 0  # texeles compartidos con el pelo: siguen siendo pelo
    vello = (~np.isnan(altura)) & (altura < z_ojos - 0.008) & (lum < 0.3) & ~ojo & ~del_pelo
    arr[vello, :3] = tono_piel
    # La barba y el bigote usan los mismos texeles oscuros que el pelo: esas caras se remapean (UV) a un
    # punto de piel de la mejilla, así toman el color de la piel sin tocar el pelo
    def texel(i):
        p = me.polygons[i]
        u = sum(uv[l].uv.x for l in p.loop_indices) / p.loop_total
        v = sum(uv[l].uv.y for l in p.loop_indices) / p.loop_total
        return (u, v), arr[min(h - 1, int(v * h)), min(w - 1, int(u * w)), :3]
    z_rel = {i: (o.matrix_world @ me.polygons[i].center).z / alto for i in cara}
    piel_cara = [i for i in cara if mascara_piel(texel(i)[1][None, None])[0, 0] > 0.5]
    oscuras = [i for i in cara if z_rel[i] < z_ojos - 0.008 and float(texel(i)[1] @ np.array([0.3, 0.59, 0.11])) < 0.3
               and not (0.35 < hsv(texel(i)[1][None, None])[0][0, 0] < 0.6)]
    destino = min(piel_cara, key=lambda i: abs(z_rel[i] - (z_ojos - 0.03)))
    uv_piel = texel(destino)[0]
    for i in oscuras:
        for l in me.polygons[i].loop_indices:
            uv[l].uv = uv_piel
    print('barba y bigote:', int(vello.sum()), 'texeles y', len(oscuras), 'caras a piel · ojos a', round(z_ojos, 3))

    # La barba y el bigote también son geometría: piezas sueltas que sobresalen de la cara. Se borran las
    # piezas pequeñas (pocos vértices) que contienen esas caras; la cara misma (pieza grande) no se toca
    import bmesh
    padre = list(range(len(me.vertices)))

    def raiz(i):
        while padre[i] != i:
            padre[i] = padre[padre[i]]
            i = padre[i]
        return i

    for p in me.polygons:
        vs = list(p.vertices)
        for a in vs[1:]:
            padre[raiz(a)] = raiz(vs[0])
    tam = {}
    for v in me.vertices:
        tam[raiz(v.index)] = tam.get(raiz(v.index), 0) + 1
    piezas_vello = {raiz(me.polygons[i].vertices[0]) for i in oscuras}
    borrar = {r for r in piezas_vello if tam[r] <= 40}
    print('piezas de la barba:', {r: tam[r] for r in piezas_vello}, '→ se borran', len(borrar))
    bm = bmesh.new()
    bm.from_mesh(me)
    bm.verts.ensure_lookup_table()
    bmesh.ops.delete(bm, geom=[bm.verts[i] for i in range(len(bm.verts)) if raiz(i) in borrar], context='VERTS')
    bm.to_mesh(me)
    bm.free()
    me.update()
    PELO.update(caras_de_pelo())  # los índices cambiaron al borrar: se recalculan

    # La nuca: con el pelo largo separado del cuello, la parte de atrás de la cabeza y del cuello queda a la
    # vista desde el frente (entre la cara y el pelo). Era piel; pasa a ser pelo (UV a un texel del pelo)
    mw = o.matrix_world
    cabeza_v = [mw @ v.co for v in me.vertices if (mw @ v.co).z / alto > 0.84]
    cy = sum(p.y for p in cabeza_v) / len(cabeza_v)
    radio_y = max(abs(p.y - cy) for p in cabeza_v)
    uv = me.uv_layers.active.data
    uv_pelo = texel(PELO[o][0])[0] if False else None
    hp = me.polygons[PELO[o][len(PELO[o]) // 2]]
    uv_pelo = (sum(uv[l].uv.x for l in hp.loop_indices) / hp.loop_total, sum(uv[l].uv.y for l in hp.loop_indices) / hp.loop_total)
    nuca = []
    for p in me.polygons:
        c = mw @ p.center
        if c.z / alto < 0.76 or c.y - cy < 0.2 * radio_y:
            continue  # solo la mitad de atrás (+Y) de la cabeza y el cuello
        _, color = texel(p.index)
        if mascara_piel(color[None, None])[0, 0] > 0.3:
            nuca.append(p.index)
            for l in p.loop_indices:
                uv[l].uv = uv_pelo
    print('nuca a pelo:', len(nuca), 'caras')

    # La punta de la perilla es un vértice de la cara que baja del mentón: se sube al nivel del mentón
    inv = mw.inverted()
    cx = sum(p.x for p in cabeza_v) / len(cabeza_v)
    de_piel = {i for p in me.polygons if mascara_piel(texel(p.index)[1][None, None])[0, 0] > 0.3 for i in p.vertices}
    frente = [(mw @ v.co, v.index) for v in me.vertices
              if v.index in de_piel and 0.76 < (mw @ v.co).z / alto < 0.86 and (mw @ v.co).y < cy - 0.1 * radio_y and abs((mw @ v.co).x - cx) < 0.04 * alto]
    alturas = sorted({round(p.z, 4) for p, _ in frente})
    print('mentón:', len(frente), 'vértices · alturas', [round(a / alto, 3) for a in alturas[:4]], '· cy', round(cy, 3), 'r', round(radio_y, 3))
    if len(alturas) > 3 and alturas[1] - alturas[0] > 0.003 * alto:
        # la punta se lleva a la altura y la profundidad del resto del mentón
        vecinos = [p for p, _ in frente if round(p.z, 4) in alturas[1:4]]
        y_menton = sum(p.y for p in vecinos) / len(vecinos)
        for p, i in frente:
            if round(p.z, 4) == alturas[0]:
                me.vertices[i].co = inv @ Vector((p.x, max(p.y, y_menton), alturas[1]))
        me.update()
        print('perilla: punta subida', round((alturas[1] - alturas[0]) / alto * ALTURA * 100, 1), 'cm')
    guardar(img, arr)

# =========================== CABELLO LARGO ===========================
# El pelo se estira hacia abajo por detrás y por los lados: los vértices por debajo de la altura de las
# orejas bajan en proporción a lo hondo que están y a lo "atrás" que quedan (el flequillo no se toca), y
# se separan del cuello para caer por fuera del cuello de la ropa. El modelo mira a −Y: atrás es +Y.
def smooth(a, b, x):
    t = min(1, max(0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)


for o, caras in PELO.items():
    me = o.data
    ids = sorted({v for i in caras for v in me.polygons[i].vertices})
    mw = o.matrix_world
    inv = mw.inverted()
    pts = {i: mw @ me.vertices[i].co for i in ids}
    zs = [p.z for p in pts.values()]
    z_top, z_min = max(zs), min(zs)
    centro = sum(pts.values(), Vector()) / len(pts)
    radio = max(abs(p.y - centro.y) for p in pts.values())
    z_corte = z_top - 0.55 * (z_top - z_min)  # a la altura de las orejas
    largo, separar = M['largo'] * U, M['separar'] * U
    # Cada posición se mueve igual en todos sus vértices duplicados (costuras UV): no se abren huecos
    movidos = 0
    for i, p in pts.items():
        atras = smooth(-0.15, 0.75, (p.y - centro.y) / radio)
        hondo = max(0.0, (z_corte - p.z) / max(z_corte - z_min, 1e-6))
        if atras <= 0 or hondo <= 0:
            continue
        f = atras * hondo
        lado = Vector((p.x - centro.x, p.y - centro.y, 0))
        lado = lado.normalized() if lado.length > 1e-6 else Vector((0, 1, 0))
        nuevo = p + Vector((0, 0, -largo * f)) + lado * separar * f + Vector((0, separar * 0.6 * f, 0))
        me.vertices[i].co = inv @ nuevo
        movidos += 1
    me.update()
    print('pelo alargado', o.name, movidos, 'vértices · baja hasta', round((z_min - largo) / U * ALTURA, 3), 'm')

# =========================== QUADS ===========================
total_q = total_t = 0
for o in mallas:
    bpy.context.view_layer.objects.active = o
    for s in bpy.context.view_layer.objects.selected:
        s.select_set(False)
    o.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.tris_convert_to_quads(face_threshold=0.70, shape_threshold=0.70, uvs=True, seam=True)
    bpy.ops.object.mode_set(mode='OBJECT')
    q = sum(1 for p in o.data.polygons if len(p.vertices) == 4)
    t = sum(len(p.vertices) - 2 for p in o.data.polygons)
    total_q += q
    total_t += t
print(f'quads: {total_q} de {sum(len(o.data.polygons) for o in mallas)} caras · {total_t} triángulos en la GPU')

# =========================== ALTURA, ORIGEN Y EXPORTACIÓN ===========================
raices = [o for o in bpy.data.objects if o.parent is None]
raiz = bpy.data.objects.new('candidato_' + CUAL, None)
bpy.context.scene.collection.objects.link(raiz)
for o in raices:
    o.parent = raiz
raiz.scale = [ALTURA / ALTO_ORIGINAL] * 3
bpy.context.view_layer.update()
pts = [o.matrix_world @ v.co for o in mallas for v in o.data.vertices]
raiz.location.z = -min(p.z for p in pts)
cx = (max(p.x for p in pts) + min(p.x for p in pts)) / 2
raiz.location.x = -cx

# Animación de reposo (solo el modelo 2, que tiene esqueleto): respiración suave en bucle de 3 s
if esqueleto:
    import math
    esqueleto.animation_data_create()
    accion = bpy.data.actions.new('reposo')
    esqueleto.animation_data.action = accion
    FPS = 30
    bpy.context.scene.render.fps = FPS
    pb = esqueleto.pose.bones
    huesos = {'CC_Base_Spine02_035': (1.2, 0), 'CC_Base_Head_038': (-1.0, 1.5),
              'CC_Base_L_Upperarm_050': (0, 1.5), 'CC_Base_R_Upperarm_074': (0, -1.5)}
    for nombre in huesos:
        pb[nombre].rotation_mode = 'XYZ'
    for f in range(0, 91, 5):
        t = math.sin(f / 90 * 2 * math.pi)
        for nombre, (ax, az) in huesos.items():
            pb[nombre].rotation_euler = (math.radians(ax * t), 0, math.radians(az * t))
            pb[nombre].keyframe_insert('rotation_euler', frame=f)
    bpy.context.scene.frame_start, bpy.context.scene.frame_end = 0, 90

bpy.ops.wm.save_as_mainfile(filepath=SALIDA_BLEND)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(
    filepath=SALIDA_GLB, export_format='GLB', export_yup=True,
    export_image_format='WEBP', export_image_quality=85,
    export_animations=bool(esqueleto), export_animation_mode='ACTIONS', export_skins=bool(esqueleto),
    export_morph=False,
)
print('Exportado:', SALIDA_GLB, round(os.path.getsize(SALIDA_GLB) / 1024, 1), 'KB')

# =========================== VISTAS ===========================
if VISTAS:
    esc = bpy.context.scene
    esc.render.engine = 'BLENDER_WORKBENCH'
    esc.display.shading.light = 'STUDIO'
    esc.display.shading.color_type = 'TEXTURE'
    esc.render.resolution_x, esc.render.resolution_y = 700, 800
    for nombre, d, escala, z in (('frente', Vector((0, -1, 0)), 1.7, 0.75), ('espalda', Vector((0.6, 1, 0)), 1.7, 0.75),
                                 ('cabeza', Vector((-0.8, -1, 0)), 0.55, 1.3), ('nuca', Vector((0.9, 1, 0)), 0.65, 1.2)):
        cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
        esc.collection.objects.link(cam)
        esc.camera = cam
        cam.data.type = 'ORTHO'
        cam.data.ortho_scale = escala
        c = Vector((0, 0, z))
        cam.location = c + d.normalized() * 5
        cam.rotation_euler = (c - cam.location).to_track_quat('-Z', 'Y').to_euler()
        esc.render.filepath = os.path.join(VISTAS, f'candidato{CUAL}_{nombre}.png')
        bpy.ops.render.render(write_still=True)
