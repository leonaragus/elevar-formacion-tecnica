# Script para ejecutar recordatorios de calendario
# Uso: .jecutar-recordatorios.ps1

$API_URL = "http://localhost:3000/api/calendario/recordatorios"
$API_KEY = $env:CRON_API_KEY

if (-not $API_KEY) {
    Write-Host "❌ Error: CRON_API_KEY no está configurada en las variables de entorno" -ForegroundColor Red
    Write-Host "Por favor, configura la variable CRON_API_KEY en tu archivo .env.local" -ForegroundColor Yellow
    exit 1
}

Write-Host "🚀 Ejecutando recordatorios de calendario..." -ForegroundColor Green

try {
    $headers = @{
        "Authorization" = "Bearer $API_KEY"
        "Content-Type" = "application/json"
    }

    $response = Invoke-RestMethod -Uri $API_URL -Method POST -Headers $headers
    
    if ($response.success) {
        Write-Host "✅ Recordatorios ejecutados exitosamente" -ForegroundColor Green
        Write-Host "📊 Recordatorios enviados: $($response.recordatorios_enviados)" -ForegroundColor Cyan
    } else {
        Write-Host "❌ Error en la respuesta: $($response.error)" -ForegroundColor Red
        exit 1
    }

} catch {
    Write-Host "❌ Error ejecutando recordatorios: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $reader.BaseStream.Position = 0
        $reader.DiscardBufferedData()
        $responseBody = $reader.ReadToEnd()
        Write-Host "📄 Respuesta del servidor: $responseBody" -ForegroundColor Yellow
    }
    
    exit 1
}

Write-Host "🎉 Script completado" -ForegroundColor Green