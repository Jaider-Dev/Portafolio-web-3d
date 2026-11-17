# Renderiza una vista previa rápida de un GLB exportado (comprobar forma, orientación y caras).
# Uso: blender --background --factory-startup --python blender/vista_previa.py -- public/models/tienda.glb salida.png
import math
import sys

import bpy
from mathutils import Vector

glb, png = sys.argv[sys.argv.index('--') + 1:][:2]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=glb)  # al importar, +Y arriba vuelve a ser Z arriba

escena = bpy.context.scene
escena.render.engine = 'BLENDER_WORKBENCH'
escena.display.shading.light = 'STUDIO'
escena.display.shading.color_type = 'MATERIAL'
escena.display.shading.show_cavity = True
escena.render.resolution_x, escena.render.resolution_y = 900, 600
escena.render.filepath = png

# Cámara en diagonal desde la entrada (−Y en Blender = +Z en Three.js), a 1,6 m de altura
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
escena.collection.objects.link(cam)
escena.camera = cam
cam.location = Vector((4.2, -6.2, 2.6))
direccion = Vector((0, 0, 0.9)) - cam.location
cam.rotation_euler = direccion.to_track_quat('-Z', 'Y').to_euler()
cam.data.lens = 35
bpy.ops.render.render(write_still=True)
print('Vista previa:', png, math.degrees(cam.rotation_euler.z))
