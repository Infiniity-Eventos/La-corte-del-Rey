#!/bin/bash
# Comprueba, byte a byte, que lo que sirve GitHub es lo que se compila aquí.
#
# El paquete lleva dentro la fecha de compilación, así que su contenido —y por
# tanto su hash, y el de todo lo que lo importa— cambia en cada compilación
# aunque el código sea idéntico. Por eso aquí se lee la fecha de lo publicado y
# se recompila con ella: si el código es el mismo, sale byte a byte lo mismo.
set -u
BASE=${BASE:-https://infiniity-eventos.github.io/La-corte-del-Rey}
COMMIT=$(git rev-parse --short=7 HEAD)

servido=$(curl -s "$BASE/" | grep -o 'index-[A-Za-z0-9_-]*\.js' | head -1)
[ -n "$servido" ] || { echo "no se pudo leer la página publicada"; exit 1; }

cuerpo=$(curl -s "$BASE/assets/$servido")
echo "$cuerpo" | grep -q "\"$COMMIT\"" || {
  echo "commit local $COMMIT · lo publicado declara otro. Aún no ha subido."; exit 1; }
fecha=$(echo "$cuerpo" | grep -o '"[0-9]\{4\}-[0-9-]*T[0-9:.]*Z"' | head -1 | tr -d '"')
echo "commit: $COMMIT · compilado: $fecha"

COMPILADO="$fecha" VITE_BASE=/La-corte-del-Rey/ npm run build >/dev/null 2>&1

iguales=0; distintos=0; faltan=0
for f in $(cd dist && find . -type f | sed 's|^\./||'); do
  tmp=$(mktemp)
  if curl -sf "$BASE/$f" -o "$tmp"; then
    if cmp -s "$tmp" "dist/$f"; then iguales=$((iguales+1))
    else distintos=$((distintos+1)); echo "  distinto: $f"; fi
  else
    faltan=$((faltan+1)); echo "  no está: $f"
  fi
  rm -f "$tmp"
done
echo "idénticos: $iguales · distintos: $distintos · ausentes: $faltan"
[ "$distintos" = 0 ] && [ "$faltan" = 0 ]
