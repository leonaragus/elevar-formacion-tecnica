# 🚀 Deploy a Vercel

## Opción 1: Deploy desde la terminal (Recomendado)

### Paso 1: Instalar Vercel CLI
```bash
npm install -g vercel
```

### Paso 2: Ejecutar deploy
```bash
# Deploy con variables de entorno desde tu archivo .env.local
vercel --prod --yes \
  --env NEXT_PUBLIC_SUPABASE_URL=https://rgmauuzwzsoaytsulgwg.supabase.co \
  --env NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnbWF1dXp3enNvYXl0c3VsZ3dnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MTYxOTUsImV4cCI6MjA4NTA5MjE5NX0.4uASiQ4dpPvU0ylcKzv9wd0XVoSREnjwKGwtQbvhV3Q \
  --env SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnbWF1dXp3enNvYXl0c3VsZ3dnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTUxNjE5NSwiZXhwIjoyMDg1MDkyMTk1fQ.JsjmpLw9YjV4fePuwnmBM8ARM84PFJck_Nfr4yjvICA \
  --env ADMIN_TOKEN=admin-test-token-12345 \
  --env NEXT_PUBLIC_VAPID_PUBLIC_KEY=BHy9d1h8CN1k4F1uq_ekLiBn7Xg6SKnwA4W08ZdcGYLQPJ4K0Sm_RQBLjVwMWWF1ihkM7HF_E_6zTknhtViBtBo \
  --env VAPID_PRIVATE_KEY=tKWeLoHbM_ZyInYcsgTJV_9ulU1owGNtR3tSsCtXjhU \
  --env VAPID_SUBJECT=mailto:admin@tuinstituto.com
```

## Opción 2: Deploy desde GitHub

### Paso 1: Subir a GitHub
```bash
git add .
git commit -m "feat: agregar sistema de notificaciones push"
git push origin main
```

### Paso 2: Conectar con Vercel
1. Ve a [vercel.com](https://vercel.com)
2. Importa tu repositorio de GitHub
3. Configura las variables de entorno (usa las mismas que están arriba)
4. Deploy automáticamente

## Opción 3: Usar el script de deploy
```bash
# En Windows (PowerShell)
./deploy-vercel.ps1

# En macOS/Linux
chmod +x deploy-vercel.sh
./deploy-vercel.sh
```

## 📋 Variables de entorno necesarias

| Variable | Valor actual | Descripción |
|----------|--------------|-------------|
| NEXT_PUBLIC_SUPABASE_URL | https://rgmauuzwzsoaytsulgwg.supabase.co | URL de tu proyecto Supabase |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... | Clave pública de Supabase |
| SUPABASE_SERVICE_ROLE_KEY | eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... | Clave de servicio para operaciones admin |
| ADMIN_TOKEN | admin-test-token-12345 | Token para API de administrador |
| NEXT_PUBLIC_VAPID_PUBLIC_KEY | BHy9d1h8CN1k4F1uq_ekLiBn7Xg6SKnwA4W08ZdcGYL... | Clave pública para notificaciones push |
| VAPID_PRIVATE_KEY | tKWeLoHbM_ZyInYcsgTJV_9ulU1owGNtR3tSsCtXjhU | Clave privada para notificaciones push |
| VAPID_SUBJECT | mailto:admin@tuinstituto.com | Email del administrador |

## 🧪 Para probar las notificaciones push

Una vez deployado, puedes probar en:
- **Página de pruebas**: `https://tu-app.vercel.app/push-test`
- **Interfaz de alumno**: `https://tu-app.vercel.app/cursos`

## 🔧 Comandos útiles

```bash
# Ver logs en tiempo real
vercel logs

# Ver información del deploy
vercel inspect

# Actualizar variables de entorno
vercel env add NEXT_PUBLIC_SUPABASE_URL production

# Forzar redeploy
vercel --force
```

## 🚨 Notas importantes

1. **HTTPS**: Las notificaciones push solo funcionan en HTTPS, Vercel lo proporciona automáticamente
2. **Service Worker**: El archivo `sw.js` se servirá automáticamente desde `/sw.js`
3. **Variables de entorno**: Asegúrate de configurarlas en el dashboard de Vercel también
4. **Dominio**: Vercel te dará un dominio `.vercel.app` automáticamente

## 📞 Soporte

Si tienes problemas con el deploy:
1. Verifica que el build local funcione: `npm run build`
2. Revisa los logs en el dashboard de Vercel
3. Asegúrate de que todas las variables de entorno estén configuradas