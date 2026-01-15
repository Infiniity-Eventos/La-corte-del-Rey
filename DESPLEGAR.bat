@echo off
echo ==========================================
echo       SUBIENDO PROYECTO A GITHUB
echo ==========================================
echo.
echo Guardando registro en LOG_DEPLOY.txt ...

(
echo INICIO DEL PROCESO: %DATE% %TIME%
echo ------------------------------------------

echo 1. Verificando repositorio remoto...
git remote -v

echo.
echo 2. Subiendo cambios (esto pedir auth)...
git push -f -u origin main

echo.
echo ------------------------------------------
echo FIN DEL PROCESO: %DATE% %TIME%
) > LOG_DEPLOY.txt 2>&1

echo.
echo ==========================================
echo    PROCESO COMPLETADO
echo ==========================================
echo Por favor, avisa a tu asistente para que lea el archivo LOG_DEPLOY.txt
echo.
pause
