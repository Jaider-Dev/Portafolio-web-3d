# Kits de naturaleza (17-nov-2026): separa en piezas sueltas los paquetes descargados (CREDITS.md),
# las pinta con la paleta, las pasa a quads y exporta un .blend y un .glb por kit.
#
# Uso (un kit por ejecución; cada .blend queda como proyecto independiente para seguir a mano):
#   blender --background --factory-startup --python blender/kit_naturaleza.py -- arboles
#   … -- detalles | rocas | fogata
#
# Salidas: blender/naturaleza/<kit>.blend y public/models/naturaleza/<kit>.glb
# (la fogata va a blender/fogata.blend y public/models/fogata.glb, que ya usa el campamento).
#
# Convenciones para la escena (src/scene/naturaleza/kit.js):
#   · Árboles y detalles: origen en la base, alto real en metros, color por vértice (atributo Color).
#   · Rocas: origen en el centro y caja normalizada a ±1 en cada eje (como el dodecaedro de radio 1
#     que reemplazan), sin color propio (lo pone el código) y con UV de caja para la textura de roca.
#   · Fogata: materiales con nombre (madera, piedra, brasa) que el código colorea con la paleta.
#   · Quads: el .blend guarda quads (tris_convert_to_quads, como pide el curso); el glTF siempre
#     guarda triángulos, porque es lo único que dibuja la GPU.
import math
import os
import sys

import bmesh
import bpy
from mathutils import Matrix, Vector, kdtree

KIT = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else 'arboles'
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FUENTE = os.path.join(RAIZ, 'blender', 'fuente')
DIR_GLB = os.path.join(RAIZ, 'public', 'models', 'naturaleza')
DIR_BLEND = os.path.join(RAIZ, 'blender', 'naturaleza')

# Paleta del proyecto (src/scene/paleta.js). Los tonos intermedios son mezclas de dos colores de ella
PALETA = {
    'meseta': '#839d30', 'vegetacion': '#3f5c2e', 'roca': '#847e6c', 'piedra': '#a89f81',
    'madera': '#926440', 'lona': '#e38531', 'fuego': '#f4af36', 'humo': '#cdc8bd', 'sombra': '#2a2620',
}


def lineal(hex_):
    def canal(c):
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    return Vector([canal(int(hex_[i:i + 2], 16) / 255) for i in (1, 3, 5)])


def mezcla(a, b, t):
    return lineal(PALETA[a]).lerp(lineal(PALETA[b]), t)


def tono(a, k=1.0):
    return lineal(PALETA[a]) * k


HOJA_MEDIA = mezcla('vegetacion', 'meseta', 0.45)
COLORES = {
    # paquete de bishion
    'arbre_p01': tono('vegetacion'), 'arbre_p02': HOJA_MEDIA, 'arbre_p03': tono('meseta'),
    'arbre_tronc_p': tono('madera'), 'Bois_grand_arbre': tono('madera', 0.7),
    'feuille_grand_arbre': tono('vegetacion'), 'herbes': tono('meseta'),
    'roso_feauille': mezcla('vegetacion', 'meseta', 0.3),
    'champi_rouge_chapeau': tono('lona'), 'champi_rouge_sous_chapeau': tono('sombra'),
    'champi_rouge_tige': tono('humo'), 'champi_marron_chapeau': tono('madera'), 'champi_marro_tige': tono('humo'),
    # paquete de Carlos_SR
    'Material.001': HOJA_MEDIA, 'Material.006': tono('vegetacion'), 'Material.009': tono('meseta'),
    'Material.002': tono('madera', 0.75),
}

bpy.ops.wm.read_factory_settings(use_empty=True)
escena = bpy.context.scene
os.makedirs(DIR_GLB, exist_ok=True)
os.makedirs(DIR_BLEND, exist_ok=True)


# ---------------------------------------------------------------- importar
def importar(archivo):
    """Importa un GLB y devuelve copias en coordenadas de mundo, sin padres, con el material de origen
    de cada malla en o['material'] y el nombre de su grupo (el vacío padre) en o['grupo']."""
    antes = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(FUENTE, archivo))
    nuevos = [o for o in bpy.data.objects if o not in antes]
    copias = []
    for o in nuevos:
        if o.type != 'MESH':
            continue
        me = o.data.copy()
        me.transform(o.matrix_world)
        copia = bpy.data.objects.new(o.name, me)
        escena.collection.objects.link(copia)
        copia['material'] = me.materials[0].name if me.materials else ''
        copia['grupo'] = o.parent.name.rsplit('_', 1)[0] if o.parent else ''
        copias.append(copia)
    for o in nuevos:
        bpy.data.objects.remove(o)
    return copias


def pintar(o, color=None):
    """Color por vértice (dominio esquina) según el material de origen de la malla."""
    me = o.data
    c = color if color is not None else COLORES[o['material']]
    attr = me.color_attributes.get('Color') or me.color_attributes.new('Color', 'FLOAT_COLOR', 'CORNER')
    attr.data.foreach_set('color', [*c, 1.0] * len(me.loops))
    me.color_attributes.active_color = attr


def soldar(o, distancia):
    bm = bmesh.new()
    bm.from_mesh(o.data)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=distancia)
    bm.to_mesh(o.data)
    bm.free()


def seleccionar(objs, activo=None):
    for s in escena.objects:
        s.select_set(False)
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = activo or objs[0]


def unir(objs, nombre):
    seleccionar(objs)
    if len(objs) > 1:
        bpy.ops.object.join()
    o = bpy.context.view_layer.objects.active
    o.name = o.data.name = nombre
    return o


def separar_sueltas(o):
    seleccionar([o])
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.separate(type='LOOSE')
    bpy.ops.object.mode_set(mode='OBJECT')
    partes = list(bpy.context.view_layer.objects.selected)
    for p in partes:
        p['material'] = o['material'] if 'material' in o else ''
    return partes


def caja(o):
    vs = [v.co for v in o.data.vertices]
    mn = Vector([min(v[i] for v in vs) for i in range(3)])
    mx = Vector([max(v[i] for v in vs) for i in range(3)])
    return mn, mx


# ---------------------------------------------------------------- terminar una pieza
def terminar(o, modo, valor=1.0, rocas=False):
    """modo 'alto': escala uniforme a `valor` m de alto, origen en la base.
    modo 'caja': caja normalizada a ±1 en cada eje, origen en el centro (rocas)."""
    mn, mx = caja(o)
    if modo == 'alto':
        s = valor / (mx.z - mn.z)
        base = Vector(((mn.x + mx.x) / 2, (mn.y + mx.y) / 2, mn.z))
        o.data.transform(Matrix.Scale(s, 4) @ Matrix.Translation(-base))
    else:
        centro = (mn + mx) / 2
        d = mx - mn
        o.data.transform(Matrix.Diagonal((2 / d.x, 2 / d.y, 2 / d.z, 1)) @ Matrix.Translation(-centro))
    o.location = (0, 0, 0)
    soldar(o, 1e-4)
    for capa in list(o.data.uv_layers):
        o.data.uv_layers.remove(capa)
    # Quads: une pares de triángulos casi coplanarios sin mezclar colores
    seleccionar([o])
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.tris_convert_to_quads(face_threshold=math.radians(40), shape_threshold=math.radians(40), vcols=True)
    bpy.ops.object.mode_set(mode='OBJECT')
    for p in o.data.polygons:
        p.use_smooth = False
    if rocas:
        # UV de caja: cada cara se proyecta en el plano de su eje dominante (como uvPorCaja en el código)
        for capa in list(o.data.color_attributes):
            o.data.color_attributes.remove(capa)
        uv = o.data.uv_layers.new(name='UVMap')
        for p in o.data.polygons:
            n = p.normal
            ax = max(range(3), key=lambda i: abs(n[i]))
            for li in p.loop_indices:
                co = o.data.vertices[o.data.loops[li].vertex_index].co
                u, w = [(co.y, co.z), (co.x, co.z), (co.x, co.y)][ax]
                uv.data[li].uv = (u * 0.5 + 0.5, w * 0.5 + 0.5)
    o.data.materials.clear()
    return o


def material_kit(nombre, color_por_vertice):
    m = bpy.data.materials.new(nombre)
    m.use_nodes = True
    bsdf = m.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Roughness'].default_value = 1.0
    if color_por_vertice:
        attr = m.node_tree.nodes.new('ShaderNodeVertexColor')
        attr.layer_name = 'Color'
        m.node_tree.links.new(attr.outputs['Color'], bsdf.inputs['Base Color'])
    else:
        bsdf.inputs['Base Color'].default_value = (*lineal(PALETA['roca']), 1)
    return m


def resumen(piezas):
    total_q = total_t = 0
    for o in piezas:
        q = sum(1 for p in o.data.polygons if len(p.vertices) == 4)
        t = sum(len(p.vertices) - 2 for p in o.data.polygons)
        total_q += q
        total_t += t
        print(f'  {o.name:<16} {len(o.data.polygons):>5} caras · {q:>4} quads · {t:>5} triángulos · '
              f'{tuple(round(x, 2) for x in (caja(o)[1] - caja(o)[0]))}')
    caras = sum(len(o.data.polygons) for o in piezas)
    print(f'TOTAL {len(piezas)} piezas · {caras} caras ({round(100 * total_q / caras)} % quads) · {total_t} triángulos')


def exportar(piezas, nombre, dir_blend=DIR_BLEND, ruta_glb=None):
    # En el .blend las piezas de un kit quedan en fila para verlas (el código solo usa su geometría).
    # Una pieza sola (la fogata) se queda en el origen: el campamento la usa con su posición
    x = 0.0
    for o in (piezas if len(piezas) > 1 else []):
        mn, mx = caja(o)
        o.location.x = x - mn.x
        x += (mx.x - mn.x) + 0.8
    for o in [o for o in escena.objects if o not in piezas]:
        bpy.data.objects.remove(o)
    for m in [m for m in bpy.data.meshes if m.users == 0]:
        bpy.data.meshes.remove(m)
    for m in [m for m in bpy.data.materials if m.users == 0]:
        bpy.data.materials.remove(m)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(dir_blend, nombre + '.blend'))
    ruta_glb = ruta_glb or os.path.join(DIR_GLB, nombre + '.glb')
    seleccionar(piezas)
    bpy.ops.export_scene.gltf(filepath=ruta_glb, export_format='GLB', export_yup=True, use_selection=True,
                              export_apply=True, export_animations=False, export_morph=False,
                              # Sin normales: la escena usa flatShading (normal por cara calculada en la GPU)
                              # y así cada vértice se comparte entre sus caras: el archivo pesa mucho menos
                              export_normals=False)
    print('Exportado:', ruta_glb, round(os.path.getsize(ruta_glb) / 1024, 1), 'KB')


def por_grupo(mallas):
    grupos = {}
    for o in mallas:
        grupos.setdefault(o['grupo'], []).append(o)
    return grupos


# ---------------------------------------------------------------- kits
def kit_arboles():
    piezas = []
    mat = material_kit('naturaleza', True)
    # 1) Paquete de bishion: cada árbol es un grupo (tronco + copas)
    grupos = por_grupo(importar('arboles_piedras_pasto_y_hongos_low_poly.glb'))
    # Solo el árbol grande del paquete: los pequeños (esbelto, copa, doble) se quitaron el 17-nov
    for grupo, nombre, alto in (('Mball.016', 'arbol-paraguas', 7.0),):
        for o in grupos[grupo]:
            pintar(o)
        piezas.append(terminar(unir(grupos[grupo], nombre), 'alto', alto))
    for resto in [o for o in escena.objects if o not in piezas]:
        bpy.data.objects.remove(resto)

    # 2) Paquete de Carlos_SR: viene unido por material; se separa en piezas sueltas y cada copa se
    #    asigna al tronco más cercano (por vértice, así las copas en la punta de las ramas también)
    mallas = [o for o in importar('lowpoly_trees.glb') if o['material'] in ('Material.001', 'Material.002', 'Material.006', 'Material.009')]
    troncos, copas = [], []
    for o in mallas:
        pintar(o)
        mn, mx = caja(o)
        soldar(o, (mx - mn).length * 1e-5)
        partes = separar_sueltas(o)
        (troncos if o['material'] == 'Material.002' else copas).extend(partes)
    arbol = kdtree.KDTree(sum(len(t.data.vertices) for t in troncos))
    duenos = []
    for t in troncos:
        for v in t.data.vertices:
            arbol.insert(v.co, len(duenos))
            duenos.append(t)
    arbol.balance()
    por_tronco = {t.name: [] for t in troncos}
    for c in copas:
        mn, mx = caja(c)
        # Se prueba desde el centro de la copa y desde su punto más bajo (donde se apoya en la rama):
        # gana el tronco que quede más cerca desde cualquiera de los dos
        base = Vector(((mn.x + mx.x) / 2, (mn.y + mx.y) / 2, mn.z))
        _, i, d = min((arbol.find(p) for p in ((mn + mx) / 2, base)), key=lambda r: r[2])
        por_tronco[duenos[i].name].append(c)
    cuenta = {}
    repetidos = set()  # el paquete trae copias exactas del mismo árbol: se queda una de cada
    for t in sorted(troncos, key=lambda t: caja(t)[0].x):
        hojas = por_tronco[t.name]
        n = len(t.data.vertices)
        tamanos = [len(c.data.vertices) for c in hojas]
        if n == 24 and all(v in (32, 41) for v in tamanos):
            tipo = 'pino'          # pisos de ramas en anillo
        elif n == 24 and max(tamanos) <= 25:
            tipo = 'alamo'         # columna de bolas
            # una bola suelta del árbol vecino queda lejos del eje: fuera
            tmn, tmx = caja(t)
            eje = Vector(((tmn.x + tmx.x) / 2, (tmn.y + tmx.y) / 2))
            alto_arbol = max(caja(c)[1].z for c in hojas) - tmn.z
            for c in list(hojas):
                cmn, cmx = caja(c)
                if (Vector(((cmn.x + cmx.x) / 2, (cmn.y + cmx.y) / 2)) - eje).length > 0.15 * alto_arbol:
                    hojas.remove(c)
                    bpy.data.objects.remove(c)
        elif n == 24:
            tipo = 'abeto'         # cono de copas apiladas
        elif max(tamanos) <= 25:
            tipo = 'roble'         # ramas con bolas
        elif n >= 150:
            tipo = 'retorcido'     # tronco torcido con copas planas
        else:
            tipo = 'frondoso'      # copa ancha de nubes
        # El paquete repite cada árbol en otro verde: se quedan esas variantes, pero no las copias exactas
        firma = (tipo, n, tuple(sorted(tamanos)), hojas[0]['material'])
        if firma in repetidos:
            for o in (t, *hojas):
                bpy.data.objects.remove(o)
            continue
        repetidos.add(firma)
        cuenta[tipo] = cuenta.get(tipo, 0) + 1
        alto = {'pino': 7.5, 'abeto': 6.5, 'alamo': 6.0, 'roble': 6.5, 'frondoso': 7.0, 'retorcido': 7.0}[tipo]
        piezas.append(terminar(unir([t, *hojas], f'{tipo}-{cuenta[tipo]}'), 'alto', alto))
    for o in piezas:
        o.data.materials.append(mat)
    resumen(piezas)
    exportar(piezas, 'arboles')


def kit_detalles():
    piezas = []
    mat = material_kit('naturaleza', True)
    grupos = por_grupo(importar('arboles_piedras_pasto_y_hongos_low_poly.glb'))
    lista = [
        # (los arbustos se quitaron el 17-nov: parecían árboles pequeños)
        (['Cube.061'], 'pastizal', 0.8),
        (['Cylinder.044'], 'pasto-1', 0.45), (['Cylinder.014'], 'pasto-2', 0.4), (['Cylinder.012'], 'pasto-3', 0.35),
        (['Cylinder.027'], 'hongos-1', 0.22), (['Cylinder.026', 'Cylinder.025', 'Cylinder.024'], 'hongos-2', 0.3),
        (['Cylinder.023', 'Cylinder.021'], 'hongos-3', 0.26), (['Cylinder.020', 'Cylinder.019', 'Cylinder.017'], 'hongos-4', 0.3),
    ]
    for nombres, nombre, alto in lista:
        objs = [o for g in nombres for o in grupos[g]]
        for o in objs:
            pintar(o)
        o = terminar(unir(objs, nombre), 'alto', alto)
        o.data.materials.append(mat)
        piezas.append(o)
    resumen(piezas)
    exportar(piezas, 'detalles')


def kit_rocas():
    piezas = []
    mat = material_kit('roca', False)
    grupos = por_grupo(importar('arboles_piedras_pasto_y_hongos_low_poly.glb'))
    rocas = ['Cube.038', 'Cube.034', 'Cube.032', 'Cube.029', 'Cube.023', 'Cube.022', 'Cube.021', 'Icosphere.012',
             'Cube.019', 'Cube.018', 'Icosphere.010', 'Cube.017', 'Icosphere.008', 'Cube.009', 'Icosphere.005',
             'Icosphere.004', 'Cube.024']
    for i, g in enumerate(rocas, 1):
        piezas.append(terminar(unir(grupos[g], f'roca-{i}'), 'caja', rocas=True))
    for i, g in enumerate(['Cylinder.033', 'Cylinder.032', 'Cylinder.031', 'Cylinder.030', 'Cylinder.029', 'Cylinder.028'], 1):
        piezas.append(terminar(unir(grupos[g], f'losa-{i}'), 'caja', rocas=True))
    piezas.append(terminar(unir(grupos['Cube'], 'dolmen'), 'alto', 2.6))
    # Peñas grandes del paquete de Carlos_SR (unidas por material: se separan)
    for resto in [o for o in escena.objects if o not in piezas]:
        bpy.data.objects.remove(resto)
    penas = [o for o in importar('lowpoly_trees.glb') if o['material'] == 'Material.004']
    for o in penas:
        mn, mx = caja(o)
        soldar(o, (mx - mn).length * 1e-5)
        for i, p in enumerate(sorted(separar_sueltas(o), key=lambda p: caja(p)[0].x), 1):
            piezas.append(terminar(unir([p], f'pena-{i}'), 'caja', rocas=True))
    for o in piezas:
        o.data.materials.append(mat)
    resumen(piezas)
    exportar(piezas, 'rocas')


def kit_fogata():
    """Fogata del campamento: leños del paquete de Akxme_17 (sin su llama fija: la llama animada es
    FuegoVivo en el código), anillo de piedras del paquete de bishion y un lecho de brasas."""
    def material(nombre, hex_):
        m = bpy.data.materials.new(nombre)
        m.use_nodes = True
        m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (*lineal(hex_), 1)
        m.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 1.0
        return m

    partes = []
    lenos = [o for o in importar('fogata.glb') if o['material'] == 'Material.009']
    lenos = terminar(unir(lenos, 'lenos'), 'alto', 0.42)
    mn, mx = caja(lenos)
    k = 1.15 / max(mx.x - mn.x, mx.y - mn.y)  # que quepan en el anillo (≈ 1,15 m)
    lenos.data.transform(Matrix.Scale(k, 4))
    lenos.data.materials.append(material('madera', PALETA['madera']))
    partes.append(lenos)
    for resto in [o for o in escena.objects if o not in partes]:
        bpy.data.objects.remove(resto)

    grupos = por_grupo(importar('arboles_piedras_pasto_y_hongos_low_poly.glb'))
    modelos = [grupos[g][0] for g in ('Cube.019', 'Cube.024', 'Icosphere.009', 'Cube.023')]
    piedra = material('piedra', PALETA['piedra'])
    piedras = []
    for i in range(12):
        me = modelos[i % len(modelos)].data.copy()
        p = bpy.data.objects.new(f'piedra-{i}', me)
        escena.collection.objects.link(p)
        p['material'] = ''
        p['grupo'] = ''
        terminar(p, 'caja')
        a = i / 12 * math.tau
        r = 0.66
        me.transform(Matrix.Translation((math.cos(a) * r, math.sin(a) * r, 0.1)) @ Matrix.Rotation(i * 1.7, 4, 'Z')
                     @ Matrix.Diagonal((0.13 + 0.02 * (i % 3), 0.11, 0.08 + 0.02 * (i % 2), 1)))
        piedras.append(p)
    anillo = unir(piedras, 'anillo')
    anillo.data.materials.append(piedra)
    partes.append(anillo)
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=0.34)
    brasa = bpy.context.view_layer.objects.active
    brasa.name = brasa.data.name = 'brasas'
    brasa.data.transform(Matrix.Translation((0, 0, 0.02)) @ Matrix.Diagonal((1, 1, 0.3, 1)))
    brasa['material'] = ''
    seleccionar([brasa])
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.tris_convert_to_quads()
    bpy.ops.object.mode_set(mode='OBJECT')
    brasa.data.materials.append(material('brasa', PALETA['fuego']))
    partes.append(brasa)
    fogata = unir(partes, 'fogata')
    for p in fogata.data.polygons:
        p.use_smooth = False
    resumen([fogata])
    fogata.location = (0, 0, 0)
    exportar([fogata], 'fogata', dir_blend=os.path.join(RAIZ, 'blender'),
             ruta_glb=os.path.join(RAIZ, 'public', 'models', 'fogata.glb'))


{'arboles': kit_arboles, 'detalles': kit_detalles, 'rocas': kit_rocas, 'fogata': kit_fogata}[KIT]()
