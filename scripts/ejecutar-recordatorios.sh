#!/bin/bash

# Script para ejecutar recordatorios de calendario
# Uso: ./ejecutar-recordatorios.sh

API_URL="http://localhost:3000/api/calendario/recordatorios"
API_KEY="${CRON_API_KEY}"

if [ -z "$API_KEY" ]; then
    echo "❌ Error: CRON_API_KEY no está configurada en las variables de entorno"
    echo "Por favor, configura la variable CRON_API_KEY en tu archivo .env.local"
    exit 1
fi

echo "🚀 Ejecutando recordatorios de calendario..."

# Hacer la petición POST
RESPONSE=$(curl -s -X POST "$API_URL" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -w "\n%{http_code}")

# Extraer el código de estado HTTP
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" -eq 200 ]; then
    echo "✅ Recordatorios ejecutados exitosamente"
    
    # Intentar parsear la respuesta JSON (si está disponible jq)
    if command -v jq >/dev/null 2>&1; then
        RECORDATORIOS_ENVIADOS=$(echo "$BODY" | jq -r '.recordatorios_enviados // 0')
        echo "📊 Recordatorios enviados: $RECORDATORIOS_ENVIADOS"
    else
        echo "📄 Respuesta: $BODY"
    fi
else
    echo "❌ Error HTTP $HTTP_CODE"
    echo "📄 Respuesta del servidor: $BODY"
    exit 1
fi

echo "🎉 Script completado"