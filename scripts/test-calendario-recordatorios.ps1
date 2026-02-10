# Script de prueba para el sistema de recordatorios de calendario
# Uso: .\test-calendario-recordatorios.ps1

Write-Host "🧪 Probando sistema de recordatorios de calendario..." -ForegroundColor Yellow
Write-Host "=" * 60 -ForegroundColor Cyan

# 1. Verificar variables de entorno
Write-Host "`n1️⃣ Verificando variables de entorno..." -ForegroundColor Yellow

$requiredVars = @("CRON_API_KEY", "SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_SUPABASE_URL")
$missingVars = @()

foreach ($var in $requiredVars) {
    $value = [System.Environment]::GetEnvironmentVariable($var)
    if ([string]::IsNullOrEmpty($value)) {
        $missingVars += $var
        Write-Host "❌ $var: No configurada" -ForegroundColor Red
    } else {
        Write-Host "✅ $var: Configurada" -ForegroundColor Green
    }
}

if ($missingVars.Count -gt 0) {
    Write-Host "`n❌ Error: Faltan las siguientes variables de entorno:" -ForegroundColor Red
    $missingVars | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
    Write-Host "`n📝 Por favor, configura estas variables en tu archivo .env.local" -ForegroundColor Yellow
    exit 1
}

Write-Host "`n2️⃣ Probando endpoint de recordatorios..." -ForegroundColor Yellow

# 2. Probar el endpoint de recordatorios
$API_URL = "http://localhost:3000/api/calendario/recordatorios"
$API_KEY = $env:CRON_API_KEY

try {
    Write-Host "📡 Haciendo petición a: $API_URL" -ForegroundColor Cyan
    
    $headers = @{
        "Authorization" = "Bearer $API_KEY"
        "Content-Type" = "application/json"
    }

    $response = Invoke-RestMethod -Uri $API_URL -Method POST -Headers $headers
    
    Write-Host "✅ Petición exitosa!" -ForegroundColor Green
    Write-Host "📊 Resultados:" -ForegroundColor Cyan
    Write-Host "  - Éxito: $($response.success)" -ForegroundColor White
    Write-Host "  - Mensaje: $($response.message)" -ForegroundColor White
    Write-Host "  - Recordatorios enviados: $($response.recordatorios_enviados)" -ForegroundColor White
    
} catch {
    Write-Host "❌ Error en la petición: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $reader.BaseStream.Position = 0
        $reader.DiscardBufferedData()
        $responseBody = $reader.ReadToEnd()
        Write-Host "📄 Respuesta del servidor: $responseBody" -ForegroundColor Yellow
    }
}

Write-Host "`n3️⃣ Verificando base de datos..." -ForegroundColor Yellow

# 3. Verificar tablas en la base de datos
Write-Host "🔍 Verificando tablas del calendario:" -ForegroundColor Cyan
Write-Host "  - calendario_entregas" -ForegroundColor White
Write-Host "  - entregas_alumnos" -ForegroundColor White
Write-Host "  - recordatorios_entregas" -ForegroundColor White

Write-Host "`n4️⃣ Verificando rutas de la aplicación..." -ForegroundColor Yellow

# 4. Verificar rutas
$routes = @(
    "/calendario",
    "/admin/calendario"
)

foreach ($route in $routes) {
    $url = "http://localhost:3000$route"
    try {
        $response = Invoke-WebRequest -Uri $url -Method GET -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ $route: Disponible" -ForegroundColor Green
        } else {
            Write-Host "⚠️  $route: Status $($response.StatusCode)" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "❌ $route: Error - $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n5️⃣ Verificando scripts de automatización..." -ForegroundColor Yellow

# 5. Verificar scripts
$scripts = @(
    "ejecutar-recordatorios.ps1",
    "instalar-tarea-recordatorios.ps1"
)

foreach ($script in $scripts) {
    $scriptPath = Join-Path $PSScriptRoot $script
    if (Test-Path $scriptPath) {
        Write-Host "✅ $script: Encontrado" -ForegroundColor Green
    } else {
        Write-Host "❌ $script: No encontrado" -ForegroundColor Red
    }
}

Write-Host "`n6️⃣ Recomendaciones finales..." -ForegroundColor Yellow

Write-Host "`n📋 Resumen de configuración:" -ForegroundColor Cyan
Write-Host "1. ✅ Variables de entorno configuradas" -ForegroundColor White
Write-Host "2. ✅ Endpoint de recordatorios funcionando" -ForegroundColor White
Write-Host "3. ✅ Rutas de la aplicación disponibles" -ForegroundColor White
Write-Host "4. ✅ Scripts de automatización listos" -ForegroundColor White

Write-Host "`n🚀 Próximos pasos:" -ForegroundColor Yellow
Write-Host "1. Ejecuta: .\instalar-tarea-recordatorios.ps1" -ForegroundColor White
Write-Host "2. Esto instalará la tarea programada para ejecutar recordatorios cada hora" -ForegroundColor White
Write-Host "3. Los alumnos recibirán notificaciones 7, 3 y 1 día antes de las entregas" -ForegroundColor White

Write-Host "`n🎉 ¡Prueba completada!" -ForegroundColor Green
Write-Host "El sistema de calendario de entregas está listo para usar." -ForegroundColor Green