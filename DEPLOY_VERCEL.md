# Guía de Configuración para Vercel

## 🚀 Deploy Completado

La aplicación ha sido desplegada exitosamente en Vercel.

### 📍 URLs Importantes:
- **Aplicación Principal**: https://supabase-next14-dl74na6am-academia-elevars-projects.vercel.app
- **Panel de Control**: https://supabase-next14-dl74na6am-academia-elevars-projects.vercel.app/admin
- **Test de Notificaciones**: https://supabase-next14-dl74na6am-academia-elevars-projects.vercel.app/test-calendario-notificaciones

## ⚙️ Configuración de Variables de Entorno

Para que todo funcione correctamente, necesitas configurar estas variables de entorno en el dashboard de Vercel:

### Variables Requeridas:

1. **Supabase Configuration:**
   - `NEXT_PUBLIC_SUPABASE_URL`: Tu URL de Supabase
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Tu clave anónima de Supabase
   - `SUPABASE_SERVICE_ROLE_KEY`: Tu clave de servicio de Supabase

2. **Authentication:**
   - `ADMIN_TOKEN`: Token secreto para funciones de administrador

3. **Push Notifications (VAPID):**
   - `NEXT_PUBLIC_VAPID_PUBLIC_KEY`: Clave pública VAPID
   - `VAPID_PRIVATE_KEY`: Clave privada VAPID
   - `VAPID_SUBJECT`: Formato mailto:tu-email@ejemplo.com

4. **Cron Jobs:**
   - `CRON_API_KEY`: Clave secreta para ejecutar tareas programadas

## 🧪 Pruebas Recomendadas

1. **Test de Notificaciones Push**:
   - Visita: `/test-calendario-notificaciones`
   - Selecciona un curso, alumno y entrega
   - Prueba envío individual y masivo

2. **Calendario Admin**:
   - Visita: `/admin/calendario`
   - Crea/editar/elimina fechas de entrega

3. **Vista Alumno**:
   - Visita: `/calendario`
   - Verifica que se muestran las fechas correctamente

## 📋 Pasos Siguientes

1. Configura las variables de entorno en Vercel
2. Prueba las notificaciones push
3. Configura tareas programadas para recordatorios automáticos
4. Verifica que los alumnos reciban las notificaciones

## 🔧 Solución de Problemas

Si las notificaciones no funcionan:
1. Verifica que las claves VAPID sean correctas
2. Asegúrate de que el Service Worker esté registrado
3. Comprueba los permisos de notificación en el navegador
4. Revisa la consola del navegador para errores