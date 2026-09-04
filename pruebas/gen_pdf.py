# PDF mínimo pero válido, de N páginas, escrito a mano. Solo para probar el lector.
import sys

def build(n_pages, path):
    objs = []
    def add(body): objs.append(body); return len(objs)

    font = add(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
    kids, page_ids, content_ids = [], [], []
    pages_id = len(objs) + 1 + 2 * n_pages + 1  # se calcula después; se corrige abajo

    # Reservamos: por cada página, un objeto de contenido y uno de página.
    contents = []
    for i in range(1, n_pages + 1):
        # El nombre entra en el contenido: si no, dos PDF del mismo numero de
        # paginas salen byte a byte identicos y Vellum los toma por repetidos.
        marca = path.split("/")[-1].replace(".pdf", "").replace("_", " ")
        stream = (f"BT /F1 64 Tf 1 0 0 1 150 500 Tm (Pagina {i}) Tj ET\n"
                  f"BT /F1 16 Tf 1 0 0 1 120 430 Tm ({marca}) Tj ET\n"
                  f"2 w 100 380 m 500 380 l S").encode()
        contents.append(stream)

    for i in range(n_pages):
        cid = add(b"<< /Length " + str(len(contents[i])).encode() + b" >>\nstream\n" + contents[i] + b"\nendstream")
        content_ids.append(cid)
    for i in range(n_pages):
        pid = add(b"<< /Type /Page /Parent PAGESREF 0 R /MediaBox [0 0 612 792] "
                  b"/Resources << /Font << /F1 " + str(font).encode() + b" 0 R >> >> "
                  b"/Contents " + str(content_ids[i]).encode() + b" 0 R >>")
        page_ids.append(pid)
    kids = b" ".join(str(p).encode() + b" 0 R" for p in page_ids)
    pages_id = add(b"<< /Type /Pages /Kids [" + kids + b"] /Count " + str(n_pages).encode() + b" >>")
    catalog = add(b"<< /Type /Catalog /Pages " + str(pages_id).encode() + b" 0 R >>")

    objs = [o.replace(b"PAGESREF", str(pages_id).encode()) for o in objs]

    out = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for i, body in enumerate(objs, start=1):
        offsets.append(len(out))
        out += str(i).encode() + b" 0 obj\n" + body + b"\nendobj\n"
    xref = len(out)
    out += b"xref\n0 " + str(len(objs) + 1).encode() + b"\n0000000000 65535 f \n"
    for off in offsets[1:]:
        out += f"{off:010d} 00000 n \n".encode()
    out += (b"trailer\n<< /Size " + str(len(objs) + 1).encode() + b" /Root " + str(catalog).encode()
            + b" 0 R >>\nstartxref\n" + str(xref).encode() + b"\n%%EOF\n")
    open(path, "wb").write(out)
    print(f"{path}: {n_pages} páginas, {len(out)} bytes")

build(int(sys.argv[1]), sys.argv[2])
