@echo off
REM Script de prueba simple para el sistema de recordatorios de calendario

echo Probando sistema de recordatorios de calendario...
echo ============================================================

echo.
echo 1. Verificando variables de entorno...
echo.

REM Verificar si las variables están configuradas
if "%CRON_API_KEY%"=="" (
    echo [ERROR] CRON_API_KEY no configurada
) else (
    echo [OK] CRON_API_KEY configurada
)

if "%SUPABASE_SERVICE_ROLE_KEY%"=="" (
    echo [ERROR] SUPABASE_SERVICE_ROLE_KEY no configurada
) else (
    echo [OK] SUPABASE_SERVICE_ROLE_KEY configurada
)

if "%NEXT_PUBLIC_SUPABASE_URL%"=="" (
    echo [ERROR] NEXT_PUBLIC_SUPABASE_URL no configurada
) else (
    echo [OK] NEXT_PUBLIC_SUPABASE_URL configurada
)

echo.
echo 2. Verificando archivos del sistema...
echo.

REM Verificar si existen los archivos principales
if exist "src\app\admin\calendario\page.tsx" (
    echo [OK] Interfaz de admin encontrada
) else (
    echo [ERROR] Interfaz de admin no encontrada
)

if exist "src\app\calendario\page.tsx" (
    echo [OK] Interfaz de alumno encontrada
) else (
    echo [ERROR] Interfaz de alumno no encontrada
)

if exist "src\app\api\calendario\recordatorios\route.ts" (
    echo [OK] API de recordatorios encontrada
) else (
    echo [ERROR] API de recordatorios no encontrada
)

if exist "src\lib\calendario\recordatorios.ts" (
    echo [OK] Servicio de recordatorios encontrado
) else (
    echo [ERROR] Servicio de recordatorios no encontrado
)

echo.
echo 3. Verificando rutas de la aplicacion...
echo.

REM Hacer un simple curl para verificar si el servidor está corriendo
echo Probando conexion con el servidor...
curl -s -o nul -w "%%{http_code}" http://localhost:3000 > temp_status.txt
set /p STATUS=<temp_status.txt
del temp_status.txt

if "%STATUS%"=="200" (
    echo [OK] Servidor web funcionando
) else (
    echo [ERROR] Servidor web no responde (status: %STATUS%)
    echo Asegurate de ejecutar: npm run dev
)

echo.
echo 4. Resumen de la instalacion...
echo.
echo Se han creado los siguientes componentes:
echo - Tablas en la base de datos (calendario_entregas, entregas_alumnos, recordatorios_entregas)
echo - Interfaz de administrador para gestionar fechas de entrega
echo - Vista de calendario para alumnos
echo - Sistema de notificaciones automaticas
echo - Scripts de automatizacion
echo - Documentacion completa
echo.
echo Proximos pasos:
echo 1. Asegurate de que el servidor este corriendo: npm run dev
echo 2. Visita http://localhost:3000/admin/calendario para crear fechas de entrega
echo 3. Visita http://localhost:3000/calendario para ver el calendario como alumno
echo 4. Configura un cron job o tarea programada para ejecutar recordatorios
echo.
echo Para ejecutar recordatorios manualmente:
echo curl -X POST http://localhost:3000/api/calendario/recordatorios -H "Authorization: Bearer %CRON_API_KEY%"
echo.
echo [FIN] Sistema de calendario configurado!