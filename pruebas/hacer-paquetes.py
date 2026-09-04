"""
Los archivos de prueba que no son un PDF suelto: cómics en CBZ y zips con
colecciones dentro.

Los PNG se escriben a mano —cabecera, datos y CRC— para no depender de ninguna
librería de imágenes. Son rectángulos de un color, que es todo lo que hace falta
para comprobar que una página se dibuja y que salen en el orden correcto.

    python3 pruebas/hacer-paquetes.py /tmp
"""
import io, os, struct, subprocess, zlib, zipfile, sys

# Dónde dejar los archivos de prueba. Por defecto, la misma carpeta que usa
# `SC` en las pruebas de navegador.
aqui = os.path.dirname(os.path.abspath(__file__))
d = sys.argv[1] if len(sys.argv) > 1 else '/tmp'

def png(w, h, rgb):
    raw = b''.join(b'\x00' + bytes(rgb) * w for _ in range(h))
    def trozo(t, dd):
        c = t + dd
        return struct.pack('>I', len(dd)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)
    ihdr = struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0)
    return b'\x89PNG\r\n\x1a\n' + trozo(b'IHDR', ihdr) + trozo(b'IDAT', zlib.compress(raw)) + trozo(b'IEND', b'')

# Un cómic: tres páginas, y la segunda apaisada. Los nombres son 1, 2 y 10 a
# propósito: ordenados como texto, el 10 se cuela en medio.
with zipfile.ZipFile(os.path.join(d, 'Tomo_solo.cbz'), 'w', zipfile.ZIP_DEFLATED) as z:
    z.writestr('1.png', png(40, 60, (200, 40, 40)))
    z.writestr('2.png', png(90, 40, (40, 200, 40)))
    z.writestr('10.png', png(40, 60, (40, 40, 200)))
    z.writestr('ComicInfo.xml', b'<ComicInfo/>')

# Una colección: tres tomos dentro de una carpeta con el nombre de la obra.
for n in (1, 2, 3):
    subprocess.run([sys.executable, os.path.join(aqui, 'gen_pdf.py'), '2', os.path.join(d, 'Numero_%02d.pdf' % n)], check=True, capture_output=True)
with zipfile.ZipFile(os.path.join(d, 'Coleccion Batman.zip'), 'w', zipfile.ZIP_DEFLATED) as z:
    for n in (1, 2, 3):
        z.write(os.path.join(d, 'Numero_%02d.pdf' % n), 'Batman Absolute/%02d.pdf' % n)
    z.writestr('Batman Absolute/leeme.txt', b'descargado de algun sitio')
    z.writestr('__MACOSX/Batman Absolute/._01.pdf', b'basura')

# Sin carpeta común y con los dos formatos mezclados.
subprocess.run([sys.executable, os.path.join(aqui, 'gen_pdf.py'), '3', os.path.join(d, 'Suelto_uno.pdf')], check=True, capture_output=True)
with zipfile.ZipFile(os.path.join(d, 'Mezcla.zip'), 'w', zipfile.ZIP_DEFLATED) as z:
    z.write(os.path.join(d, 'Suelto_uno.pdf'), 'uno.pdf')
    # Un cómic distinto del de arriba: si fueran el mismo, entraría como
    # repetido y la prueba estaría midiendo otra cosa.
    otro = io.BytesIO()
    with zipfile.ZipFile(otro, 'w', zipfile.ZIP_DEFLATED) as c:
        c.writestr('1.png', png(50, 70, (10, 90, 160)))
        c.writestr('2.png', png(50, 70, (160, 90, 10)))
    z.writestr('dos.cbz', otro.getvalue())

# Como llegan las colecciones de verdad: .cbr y .cbz mezclados, y con uno de
# los .cbr que en realidad es un zip con la extensión de antes.
def comic(colores):
    b = io.BytesIO()
    with zipfile.ZipFile(b, 'w', zipfile.ZIP_DEFLATED) as c:
        for i, col in enumerate(colores, start=1):
            c.writestr('%02d.png' % i, png(50, 70, col))
    return b.getvalue()

with zipfile.ZipFile(os.path.join(d, 'Mixto.zip'), 'w', zipfile.ZIP_STORED) as z:
    z.writestr('Rick y Morty/v01 (2015).cbr', b'Rar!\x1a\x07\x00' + os.urandom(500))
    z.writestr('Rick y Morty/v02 (2016).cbr', comic([(10, 90, 160), (160, 90, 10)]))
    z.writestr('Rick y Morty/v03 (2017).cbz', comic([(20, 140, 60), (140, 60, 20), (60, 20, 140)]))

# Uno que no trae nada que sirva.
with zipfile.ZipFile(os.path.join(d, 'Vacio.zip'), 'w') as z:
    z.writestr('leeme.txt', b'aqui no hay libros')

# Y uno con un CBR dentro, que es RAR y no se puede abrir.
with zipfile.ZipFile(os.path.join(d, 'Solo_rar.zip'), 'w') as z:
    z.writestr('tomo.cbr', b'Rar!\x1a\x07\x00 lo que sea')

print('hechos en', d)
