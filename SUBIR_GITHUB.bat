@echo off
echo ====================================
echo    SUBIR A GITHUB (Simple)
echo ====================================

echo 1. Probando conexion...
pause

git remote -v

echo.
echo 2. Subiendo... (Si pide clave, ponla)
echo.
git push -f -u origin main

echo.
echo ====================================
echo    TERMINADO - REVISA ARRIBA
echo ====================================
pause
