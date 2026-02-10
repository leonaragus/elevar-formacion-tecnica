# Script de deploy a Vercel para Windows
Write-Host "🚀 Preparando deploy a Vercel..." -ForegroundColor Green

# Verificar que estemos en la rama actual
Write-Host "📋 Verificando rama actual..." -ForegroundColor Yellow
git branch --show-current

# Verificar estado del repositorio
Write-Host "📊 Estado del repositorio:" -ForegroundColor Yellow
git status

# Hacer commit de cambios pendientes si los hay
Write-Host "💾 Guardando cambios..." -ForegroundColor Yellow
git add .
git commit -m "feat: agregar sistema de calendario y notificaciones push" 
if ($LASTEXITCODE -ne 0) {
    Write-Host "No hay cambios para commitear o hubo un error" -ForegroundColor Orange
}

# Push a GitHub
Write-Host "📤 Haciendo push a GitHub..." -ForegroundColor Yellow
git push origin main

# Deploy a Vercel
Write-Host "🌐 Iniciando deploy en Vercel..." -ForegroundColor Yellow
npx vercel --prod

Write-Host "✅ Deploy completado!" -ForegroundColor Green
Write-Host "📍 La aplicación estará disponible en tu URL de Vercel" -ForegroundColor Cyan
Write-Host "🧪 Puedes probar las notificaciones en: https://tu-app.vercel.app/test-calendario-notificaciones" -ForegroundColor Cyan