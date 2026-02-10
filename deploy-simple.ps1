# Deploy a Vercel - Script simplificado
Write-Host "🚀 Iniciando deploy a Vercel..." -ForegroundColor Green

# Instalar Vercel CLI si no existe
Write-Host "📦 Verificando Vercel CLI..." -ForegroundColor Yellow
npm install -g vercel

# Deploy con variables de entorno
Write-Host "📝 Ejecutando deploy..." -ForegroundColor Cyan

vercel --prod --yes `
  --env NEXT_PUBLIC_SUPABASE_URL="https://rgmauuzwzsoaytsulgwg.supabase.co" `
  --env NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnbWF1dXp3enNvYXl0c3VsZ3dnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MTYxOTUsImV4cCI6MjA4NTA5MjE5NX0.4uASiQ4dpPvU0ylcKzv9wd0XVoSREnjwKGwtQbvhV3Q" `
  --env SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnbWF1dXp3enNvYXl0c3VsZ3dnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTUxNjE5NSwiZXhwIjoyMDg1MDkyMTk1fQ.JsjmpLw9YjV4fePuwnmBM8ARM84PFJck_Nfr4yjvICA" `
  --env ADMIN_TOKEN="admin-test-token-12345" `
  --env NEXT_PUBLIC_VAPID_PUBLIC_KEY="BHy9d1h8CN1k4F1uq_ekLiBn7Xg6SKnwA4W08ZdcGYLQPJ4K0Sm_RQBLjVwMWWF1ihkM7HF_E_6zTknhtViBtBo" `
  --env VAPID_PRIVATE_KEY="tKWeLoHbM_ZyInYcsgTJV_9ulU1owGNtR3tSsCtXjhU" `
  --env VAPID_SUBJECT="mailto:admin@tuinstituto.com"

Write-Host "✅ Deploy completado!" -ForegroundColor Green