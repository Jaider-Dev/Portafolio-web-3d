# Texturas PBR del proyecto (HU-12, HT-10 · sesión 3), generadas en Blender (17-nov-2026). Uso:
#   "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" --background --factory-startup --python blender/texturas_pbr.py
#
# Escribe en public/textures/ (WebP, 512 px, sin costuras: el ruido se hace con la FFT, que es periódica):
#   roca_detalle, roca_normal, roca_rugosidad · suelo_detalle, suelo_normal
# Los mapas de "detalle" son grises claros (media ≈ 0,9): en three.js se multiplican por el color del
# material o de los vértices, así que el color sigue saliendo de la paleta (paleta.js) y la textura solo
# aporta variación de tono. El mapa de normales da el relieve y el de rugosidad, el brillo irregular.
import os

import bpy
import numpy as np

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SALIDA = os.path.join(RAIZ, 'public', 'textures')
os.makedirs(SALIDA, exist_ok=True)
N = 512
rng = np.random.default_rng(17)


def fbm(beta, corte=0):
    # Ruido 1/f^beta: más beta, formas más grandes y suaves. Periódico en los dos ejes
    f = np.fft.fftfreq(N)
    fx, fy = np.meshgrid(f, f)
    radio = np.sqrt(fx ** 2 + fy ** 2)
    radio[0, 0] = 1
    espectro = np.fft.fft2(rng.standard_normal((N, N))) / radio ** beta
    if corte:
        espectro[radio < corte] = 0
    h = np.real(np.fft.ifft2(espectro))
    return (h - h.min()) / (h.max() - h.min())


def normales(h, fuerza):
    # Mapa de normales (espacio tangente, convención OpenGL: verde hacia arriba, la de three.js)
    dx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) * fuerza
    dy = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) * fuerza
    n = np.stack([-dx, -dy, np.ones_like(h)], -1)
    n /= np.linalg.norm(n, axis=-1, keepdims=True)
    return n * 0.5 + 0.5


def guardar(nombre, rgb, color=True):
    img = bpy.data.images.new(nombre, N, N, alpha=False)
    img.colorspace_settings.name = 'sRGB' if color else 'Non-Color'
    rgba = np.concatenate([rgb, np.ones((N, N, 1))], -1).astype(np.float32)
    img.pixels.foreach_set(rgba.ravel())
    img.filepath_raw = os.path.join(SALIDA, nombre + '.webp')
    img.file_format = 'WEBP'
    bpy.context.scene.render.image_settings.quality = 88
    img.save()
    print(nombre, round(os.path.getsize(img.filepath_raw) / 1024, 1), 'KB')


gris = lambda v: np.repeat(v[..., None], 3, -1)

# Roca: masas grandes + grietas (crestas de un segundo ruido) + grano fino
grande = fbm(2.0)
grietas = 1 - np.abs(fbm(1.6) * 2 - 1)  # crestas finas donde el ruido cruza la mitad
grietas = grietas ** 6
grano = fbm(0.9)
altura = 0.6 * grande + 0.25 * grano - 0.35 * grietas
altura = (altura - altura.min()) / (altura.max() - altura.min())
guardar('roca_detalle', gris(0.72 + 0.28 * altura))
guardar('roca_normal', normales(altura, 6.0), color=False)
guardar('roca_rugosidad', gris(0.78 + 0.22 * (1 - altura)), color=False)

# Suelo (hierba y tierra): manchas medianas y motas finas
manchas = fbm(1.5)
motas = fbm(0.5, corte=0.05)
suelo = 0.65 * manchas + 0.35 * motas
suelo = (suelo - suelo.min()) / (suelo.max() - suelo.min())
guardar('suelo_detalle', gris(0.8 + 0.2 * suelo))
guardar('suelo_normal', normales(suelo, 3.0), color=False)
