#!/bin/bash
# Script de deploy a Vercel

echo "🚀 Preparando deploy a Vercel..."

# Verificar que estemos en la rama main
echo "📋 Verificando rama actual..."
git branch --show-current

# Verificar estado del repositorio
echo "📊 Estado del repositorio:"
git status

# Hacer commit de cambios pendientes si los hay
echo "💾 Guardando cambios..."
git add .
git commit -m "feat: agregar sistema de calendario y notificaciones push" || echo "No hay cambios para commitear"

# Push a GitHub
echo "📤 Haciendo push a GitHub..."
git push origin main

# Deploy a Vercel
echo "🌐 Iniciando deploy en Vercel..."
npx vercel --prod

echo "✅ Deploy completado!"
echo "📍 La aplicación estará disponible en tu URL de Vercel"
echo "🧪 Puedes probar las notificaciones en: https://tu-app.vercel.app/test-calendario-notificaciones"