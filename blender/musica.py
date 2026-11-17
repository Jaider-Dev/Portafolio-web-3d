# Prepara la música de fondo para la web (17-nov-2026): la recomprime a MP3 de 128 kbps con el mezclador
# de audio de Blender (el original, de 256 kbps, queda en blender/fuente/; ver CREDITS.md).
# Uso: blender --background --factory-startup --python blender/musica.py
import os

import bpy

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FUENTE = os.path.join(RAIZ, 'blender', 'fuente', 'leberch-flute-587281.mp3')
SALIDA = os.path.join(RAIZ, 'public', 'audio', 'musica.mp3')

escena = bpy.context.scene
escena.render.fps = 30
editor = escena.sequence_editor_create()
coleccion = editor.strips if hasattr(editor, 'strips') else editor.sequences
pista = coleccion.new_sound('musica', FUENTE, 1, 1)
escena.frame_start = 1
escena.frame_end = pista.frame_final_end - 1
bpy.ops.sound.mixdown(filepath=SALIDA, container='MP3', codec='MP3', bitrate=128, format='S16', mixrate=44100)
print('Música:', SALIDA, round(os.path.getsize(SALIDA) / 1024), 'KB ·', round((escena.frame_end) / 30, 1), 's')
