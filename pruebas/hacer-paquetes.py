"""
Los archivos de prueba que no son un PDF suelto: cómics en CBZ y CBR, y zips
con colecciones dentro.

Los PNG se escriben a mano —cabecera, datos y CRC— para no depender de ninguna
librería de imágenes. Son rectángulos de un color, que es todo lo que hace falta
para comprobar que una página se dibuja y que salen en el orden correcto.

Los CBR se fabrican con `rar5.py`, también a mano: no hay forma libre de crear
un RAR, y sin uno no se puede probar de verdad que la app los abra.

    python3 pruebas/hacer-paquetes.py /tmp
"""
import io
import os
import struct
import subprocess
import sys
import zlib
import zipfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import rar5

# Dónde dejar los archivos de prueba. Por defecto, la misma carpeta que usa
# `SC` en las pruebas de navegador.
aqui = os.path.dirname(os.path.abspath(__file__))
d = sys.argv[1] if len(sys.argv) > 1 else '/tmp'


def png(w, h, rgb):
    """Un rectángulo de un color, escrito byte a byte."""
    raw = b''.join(b'\x00' + bytes(rgb) * w for _ in range(h))
    def trozo(t, dd):
        c = t + dd
        return struct.pack('>I', len(dd)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)
    ihdr = struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0)
    return b'\x89PNG\r\n\x1a\n' + trozo(b'IHDR', ihdr) + trozo(b'IDAT', zlib.compress(raw)) + trozo(b'IEND', b'')


def comic(colores):
    """Un CBZ con una página por color."""
    b = io.BytesIO()
    with zipfile.ZipFile(b, 'w', zipfile.ZIP_DEFLATED) as c:
        for i, col in enumerate(colores, start=1):
            c.writestr('%02d.png' % i, png(50, 70, col))
    return b.getvalue()


def comicRar(colores):
    """Lo mismo pero en RAR, que es lo que hay dentro de un `.cbr` de verdad.

    Cada uno lleva colores distintos a propósito: dos iguales entrarían como
    repetidos —que también es correcto— y la prueba estaría midiendo otra cosa.
    """
    ruta = os.path.join(d, '.tmp.cbr')
    rar5.escribir(ruta, [('%02d.png' % i, png(50, 70, c)) for i, c in enumerate(colores, start=1)])
    datos = open(ruta, 'rb').read()
    os.remove(ruta)
    return datos


def pdf(paginas, nombre):
    subprocess.run([sys.executable, os.path.join(aqui, 'gen_pdf.py'), str(paginas), os.path.join(d, nombre)],
                   check=True, capture_output=True)


# Un cómic: tres páginas, y la segunda apaisada. Los nombres son 1, 2 y 10 a
# propósito: ordenados como texto, el 10 se cuela en medio.
with zipfile.ZipFile(os.path.join(d, 'Tomo_solo.cbz'), 'w', zipfile.ZIP_DEFLATED) as z:
    z.writestr('1.png', png(40, 60, (200, 40, 40)))
    z.writestr('2.png', png(90, 40, (40, 200, 40)))
    z.writestr('10.png', png(40, 60, (40, 40, 200)))
    z.writestr('ComicInfo.xml', b'<ComicInfo/>')

# El mismo cómic pero en RAR de verdad, no un zip con el nombre cambiado.
rar5.escribir(os.path.join(d, 'Tomo_rar.cbr'), [
    ('1.png', png(40, 60, (200, 40, 40))),
    ('2.png', png(90, 40, (40, 200, 40))),
    ('10.png', png(40, 60, (40, 40, 200))),
    ('ComicInfo.xml', b'<ComicInfo/>'),
])

# Una colección: tres tomos dentro de una carpeta con el nombre de la obra.
for n in (1, 2, 3):
    pdf(2, 'Numero_%02d.pdf' % n)
with zipfile.ZipFile(os.path.join(d, 'Coleccion Batman.zip'), 'w', zipfile.ZIP_DEFLATED) as z:
    for n in (1, 2, 3):
        z.write(os.path.join(d, 'Numero_%02d.pdf' % n), 'Batman Absolute/%02d.pdf' % n)
    z.writestr('Batman Absolute/leeme.txt', b'descargado de algun sitio')
    z.writestr('__MACOSX/Batman Absolute/._01.pdf', b'basura')

# Sin carpeta común y con los dos formatos mezclados.
pdf(3, 'Suelto_uno.pdf')
with zipfile.ZipFile(os.path.join(d, 'Mezcla.zip'), 'w', zipfile.ZIP_DEFLATED) as z:
    z.write(os.path.join(d, 'Suelto_uno.pdf'), 'uno.pdf')
    z.writestr('dos.cbz', comic([(10, 90, 160), (160, 90, 10)]))

# Un RAR de verdad junto a un CBZ, que es como llegan las colecciones.
with zipfile.ZipFile(os.path.join(d, 'Con_rar.zip'), 'w', zipfile.ZIP_STORED) as z:
    z.writestr('Serie X/v01 (2015).cbr', comicRar([(90, 10, 10), (10, 90, 10)]))
    z.writestr('Serie X/v02 (2016).cbz', comic([(20, 140, 60), (140, 60, 20)]))

# Y los tres casos juntos: un RAR de verdad, un `.cbr` que en realidad es un zip
# con la extensión de antes, y un CBZ normal.
with zipfile.ZipFile(os.path.join(d, 'Mixto.zip'), 'w', zipfile.ZIP_STORED) as z:
    z.writestr('Rick y Morty/v01 (2015).cbr', comicRar([(200, 200, 10), (10, 200, 200), (200, 10, 200)]))
    z.writestr('Rick y Morty/v02 (2016).cbr', comic([(80, 30, 120), (120, 30, 80)]))
    z.writestr('Rick y Morty/v03 (2017).cbz', comic([(20, 140, 60), (140, 60, 20), (60, 20, 140)]))

# Uno que no trae nada que sirva.
with zipfile.ZipFile(os.path.join(d, 'Vacio.zip'), 'w') as z:
    z.writestr('leeme.txt', b'aqui no hay libros')

# Y uno con un CBR que no es ni RAR ni zip: basura con esa extensión.
with zipfile.ZipFile(os.path.join(d, 'Solo_rar.zip'), 'w') as z:
    z.writestr('tomo.cbr', b'Rar!\x1a\x07\x00 esto no lleva nada dentro')

print('hechos en', d)
