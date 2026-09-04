"""Un RAR5 mínimo, con los ficheros guardados tal cual (método «store»).

No existe forma libre de crear un RAR —ni WinRAR ni 7-Zip lo permiten desde
aquí—, así que para poder probar de verdad que la app abre un `.cbr` hay que
fabricar uno. Solo escribe lo imprescindible del formato: firma, cabecera de
archivo, una cabecera por fichero con sus datos detrás, y el final.
"""
import struct, zlib


def vint(n):
    """Entero de longitud variable: siete bits por byte, el octavo continúa."""
    out = bytearray()
    while True:
        b = n & 0x7F
        n >>= 7
        out.append(b | (0x80 if n else 0))
        if not n:
            return bytes(out)


def bloque(tipo, flags, cuerpo, datos=b''):
    """Un bloque con su tamaño y su CRC delante, como manda el formato."""
    cabeza = vint(tipo) + vint(flags)
    if flags & 0x0002:
        cabeza += vint(len(datos))
    cabeza += cuerpo
    # El tamaño no se cuenta a sí mismo ni al CRC.
    conTamano = vint(len(cabeza)) + cabeza
    crc = zlib.crc32(conTamano) & 0xFFFFFFFF
    return struct.pack('<I', crc) + conTamano + datos


def escribir(ruta, ficheros):
    out = bytearray(b'Rar!\x1a\x07\x01\x00')          # firma de RAR 5.0
    out += bloque(1, 0, vint(0))                       # cabecera del archivo
    for nombre, datos in ficheros:
        nb = nombre.encode('utf-8')
        cuerpo = (
            vint(0x0004)                               # lleva CRC del contenido
            + vint(len(datos))                         # tamaño sin comprimir
            + vint(0x20)                               # atributos
            + struct.pack('<I', zlib.crc32(datos) & 0xFFFFFFFF)
            + vint(0)                                  # versión 0, método «store»
            + vint(0)                                  # sistema: Windows
            + vint(len(nb))
            + nb
        )
        out += bloque(2, 0x0002, cuerpo, datos)
    out += bloque(5, 0, vint(0))                       # fin del archivo
    open(ruta, 'wb').write(bytes(out))
    return len(out)
