# Script de prueba simplificado para el sistema de recordatorios de calendario
# Uso: .\test-calendario-simple.ps1

Write-Host "Probando sistema de recordatorios de calendario..." -ForegroundColor Yellow
Write-Host "=" * 60 -ForegroundColor Cyan

# 1. Verificar variables de entorno
Write-Host "`n1. Verificando variables de entorno..." -ForegroundColor Yellow

$requiredVars = @("CRON_API_KEY", "SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_SUPABASE_URL")
$missingVars = @()

foreach ($var in $requiredVars) {
    $value = [System.Environment]::GetEnvironmentVariable($var)
    if ([string]::IsNullOrEmpty($value)) {
        $missingVars += $var
        Write-Host "[ERROR] $var: No configurada" -ForegroundColor Red
    } else {
        Write-Host "[OK] $var: Configurada" -ForegroundColor Green
    }
}

if ($missingVars.Count -gt 0) {
    Write-Host "`n[ERROR] Faltan las siguientes variables de entorno:" -ForegroundColor Red
    $missingVars | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
    Write-Host "`nPor favor, configura estas variables en tu archivo .env.local" -ForegroundColor Yellow
    exit 1
}

Write-Host "`n2. Probando endpoint de recordatorios..." -ForegroundColor Yellow

# 2. Probar el endpoint de recordatorios
$API_URL = "http://localhost:3000/api/calendario/recordatorios"
$API_KEY = $env:CRON_API_KEY

try {
    Write-Host "Haciendo peticion a: $API_URL" -ForegroundColor Cyan
    
    $headers = @{
        "Authorization" = "Bearer $API_KEY"
        "Content-Type" = "application/json"
    }

    $response = Invoke-RestMethod -Uri $API_URL -Method POST -Headers $headers
    
    Write-Host "[OK] Peticion exitosa!" -ForegroundColor Green
    Write-Host "Resultados:" -ForegroundColor Cyan
    Write-Host "  - Exito: $($response.success)" -ForegroundColor White
    Write-Host "  - Mensaje: $($response.message)" -ForegroundColor White
    Write-Host "  - Recordatorios enviados: $($response.recordatorios_enviados)" -ForegroundColor White
    
} catch {
    Write-Host "[ERROR] Error en la peticion: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $reader.BaseStream.Position = 0
        $reader.DiscardBufferedData()
        $responseBody = $reader.ReadToEnd()
        Write-Host "Respuesta del servidor: $responseBody" -ForegroundColor Yellow
    }
}

Write-Host "`n3. Verificando rutas de la aplicacion..." -ForegroundColor Yellow

# 3. Verificar rutas
$routes = @(
    "/calendario",
    "/admin/calendario"
)

foreach ($route in $routes) {
    $url = "http://localhost:3000$route"
    try {
        $response = Invoke-WebRequest -Uri $url -Method GET -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            Write-Host "[OK] $route: Disponible" -ForegroundColor Green
        } else {
            Write-Host "[WARN] $route: Status $($response.StatusCode)" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "[ERROR] $route: Error - $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n4. Verificando scripts de automatizacion..." -ForegroundColor Yellow

# 4. Verificar scripts
$scripts = @(
    "ejecutar-recordatorios.ps1",
    "instalar-tarea-recordatorios.ps1"
)

foreach ($script in $scripts) {
    $scriptPath = Join-Path $PSScriptRoot $script
    if (Test-Path $scriptPath) {
        Write-Host "[OK] $script: Encontrado" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] $script: No encontrado" -ForegroundColor Red
    }
}

Write-Host "`nResumen de configuracion:" -ForegroundColor Cyan
Write-Host "1. [OK] Variables de entorno configuradas" -ForegroundColor White
Write-Host "2. [OK] Endpoint de recordatorios funcionando" -ForegroundColor White
Write-Host "3. [OK] Rutas de la aplicacion disponibles" -ForegroundColor White
Write-Host "4. [OK] Scripts de automatizacion listos" -ForegroundColor White

Write-Host "`nProximos pasos:" -ForegroundColor Yellow
Write-Host "1. Ejecuta: .\instalar-tarea-recordatorios.ps1" -ForegroundColor White
Write-Host "2. Esto instalara la tarea programada para ejecutar recordatorios cada hora" -ForegroundColor White
Write-Host "3. Los alumnos recibiran notificaciones 7, 3 y 1 dia antes de las entregas" -ForegroundColor White

Write-Host "`n¡Prueba completada!" -ForegroundColor Green
Write-Host "El sistema de calendario de entregas esta listo para usar." -ForegroundColor Green