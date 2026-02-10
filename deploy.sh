#!/bin/bash

# Script de deploy a Vercel
echo "🚀 Iniciando deploy a Vercel..."

# Verificar que estemos en la rama main
echo "📍 Verificando rama actual..."
git status

# Agregar todos los cambios
echo "📦 Agregando cambios..."
git add .

# Commit con mensaje
echo "💬 Creando commit..."
git commit -m "Deploy: Configuración de videos multipart y bucket de Supabase"

# Push a main
echo "⬆️ Subiendo cambios..."
git push origin main

# Deploy a Vercel
echo "🚀 Deployando a Vercel..."
npx vercel --prod

echo "✅ Deploy completado!"
echo "📱 La aplicación estará disponible en tu URL de Vercel en unos minutos."