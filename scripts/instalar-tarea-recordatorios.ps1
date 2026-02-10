# Script para instalar la tarea programada de recordatorios de calendario
# Uso: .\instalar-tarea-recordatorios.ps1

Write-Host "📅 Instalando tarea programada para recordatorios de calendario..." -ForegroundColor Yellow

# Verificar si el script de PowerShell existe
$scriptPath = Join-Path $PSScriptRoot "ejecutar-recordatorios.ps1"
if (-not (Test-Path $scriptPath)) {
    Write-Host "❌ Error: No se encontró el script ejecutar-recordatorios.ps1" -ForegroundColor Red
    exit 1
}

# Verificar si el archivo XML de tarea existe
$taskXmlPath = Join-Path $PSScriptRoot "recordatorios-calendario-task.xml"
if (-not (Test-Path $taskXmlPath)) {
    Write-Host "❌ Error: No se encontró el archivo recordatorios-calendario-task.xml" -ForegroundColor Red
    exit 1
}

# Actualizar la ruta en el archivo XML
$taskXml = Get-Content $taskXmlPath -Raw
$taskXml = $taskXml -replace 'C:\\ruta\\a\\tu\\proyecto\\supabase-next14', $PSScriptRoot\..\..\n$taskXml | Set-Content $taskXmlPath

Write-Host "📁 Rutas actualizadas en el archivo XML" -ForegroundColor Green

# Nombre de la tarea
$taskName = "ElevarCalendarioRecordatorios"

# Verificar si la tarea ya existe
$existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existingTask) {
    Write-Host "⚠️  La tarea ya existe. ¿Deseas sobrescribirla? (S/N)" -ForegroundColor Yellow
    $response = Read-Host
    if ($response -eq "S" -or $response -eq "s") {
        Write-Host "🗑️  Eliminando tarea existente..." -ForegroundColor Yellow
        Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
    } else {
        Write-Host "❌ Instalación cancelada" -ForegroundColor Red
        exit 0
    }
}

# Crear la acción
$action = New-ScheduledTaskAction -Execute "PowerShell.exe" `
    -Argument "-ExecutionPolicy Bypass -File `"$scriptPath`"" `
    -WorkingDirectory (Split-Path $scriptPath -Parent)

# Crear el trigger (cada hora)
$trigger = New-ScheduledTaskTrigger -Daily -At "09:00" -RepetitionInterval (New-TimeSpan -Hours 1) -RepetitionDuration (New-TimeSpan -Days 365)

# Crear la configuración
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 10)

# Crear la tarea
Register-ScheduledTask `
    -TaskName $taskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Description "Ejecutar recordatorios de calendario de entregas cada hora" `
    -RunLevel Highest `
    -Force

Write-Host "✅ Tarea programada instalada exitosamente!" -ForegroundColor Green
Write-Host "📋 Nombre de la tarea: $taskName" -ForegroundColor Cyan
Write-Host "⏰ Frecuencia: Cada hora a partir de las 09:00" -ForegroundColor Cyan
Write-Host "📁 Script: $scriptPath" -ForegroundColor Cyan

Write-Host "`n📖 Instrucciones:" -ForegroundColor Yellow
Write-Host "1. Asegúrate de tener configurada la variable CRON_API_KEY en tu archivo .env.local" -ForegroundColor White
Write-Host "2. La tarea se ejecutará automáticamente cada hora" -ForegroundColor White
Write-Host "3. Puedes ejecutar la tarea manualmente desde el Programador de Tareas de Windows" -ForegroundColor White
Write-Host "4. Los logs se mostrarán en el visor de eventos de Windows" -ForegroundColor White

Write-Host "`n🧪 ¿Deseas ejecutar la tarea ahora para probarla? (S/N)" -ForegroundColor Yellow
$testResponse = Read-Host
if ($testResponse -eq "S" -or $testResponse -eq "s") {
    Write-Host "🚀 Ejecutando tarea de prueba..." -ForegroundColor Green
    Start-ScheduledTask -TaskName $taskName
    
    Write-Host "⏳ Esperando 10 segundos para ver resultados..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10
    
    # Verificar el estado
    $taskInfo = Get-ScheduledTask -TaskName $taskName
    $taskHistory = Get-ScheduledTaskInfo -TaskName $taskName
    
    Write-Host "📊 Estado de la tarea: $($taskInfo.State)" -ForegroundColor Cyan
    Write-Host "📅 Última ejecución: $($taskHistory.LastRunTime)" -ForegroundColor Cyan
    Write-Host "📈 Próxima ejecución: $($taskHistory.NextRunTime)" -ForegroundColor Cyan
    
    if ($taskInfo.State -eq "Ready") {
        Write-Host "✅ La tarea está lista y funcionando correctamente" -ForegroundColor Green
    } else {
        Write-Host "⚠️  La tarea tiene problemas. Revisa el visor de eventos" -ForegroundColor Red
    }
}

Write-Host "`n🎉 Instalación completada!" -ForegroundColor Green