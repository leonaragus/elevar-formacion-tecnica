# Guía de Configuración para Vercel

## 🚀 Deploy Completado

La aplicación ha sido desplegada exitosamente en Vercel.

### 📍 URLs Importantes (Nuevo Deploy):
- **Aplicación Principal**: https://supabase-next14-hzd2ira5s-academia-elevars-projects.vercel.app
- **Panel de Control**: https://supabase-next14-hzd2ira5s-academia-elevars-projects.vercel.app/admin
- **Test de Notificaciones**: https://supabase-next14-hzd2ira5s-academia-elevars-projects.vercel.app/test-calendario-notificaciones

### 📍 URLs Anteriores (Deploy Anterior):
- **Aplicación Principal**: https://supabase-next14-dl74na6am-academia-elevars-projects.vercel.app
- **Panel de Control**: https://supabase-next14-dl74na6am-academia-elevars-projects.vercel.app/admin
- **Test de Notificaciones**: https://supabase-next14-dl74na6am-academia-elevars-projects.vercel.app/test-calendario-notificaciones

## 📹 Funcionalidades de Videos Multipart Implementadas

✅ **Videos Multipart**: Los videos de 90MB se dividen automáticamente en 2 partes de 50MB cada una para superar el límite de Supabase free tier

✅ **Reproductor Unificado**: El reproductor une automáticamente las 2 partes y las reproduce como un solo video

✅ **Descarga de Videos**: Botón de descarga que une las 2 partes antes de descargar

✅ **Interfaz de Admin**: Panel de administración para subir y gestionar videos multipart

✅ **Migraciones SQL**: Scripts de migración para configurar el bucket y las tablas necesarias

## 📋 Migraciones de Supabase Pendientes

Las siguientes migraciones deben aplicarse en el proyecto de Supabase para que la funcionalidad de videos multipart funcione correctamente:

### 1. Crear Bucket de Storage
**Archivo:** `supabase/migrations/20240212_bucket_clases_grabadas.sql`
```sql
-- Crear bucket para clases grabadas
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('clases-grabadas', 'clases-grabadas', true, 52428800, ARRAY['video/mp4', 'video/webm', 'video/ogg']);
```

### 2. Crear Tabla de Clases Grabadas
**Archivo:** `supabase/migrations/20240212_clases_grabadas.sql`
```sql
-- Crear tabla de clases grabadas
CREATE TABLE public.clases_grabadas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    curso_id UUID REFERENCES public.cursos(id) ON DELETE CASCADE,
    titulo TEXT NOT NULL,
    descripcion TEXT,
    video_url TEXT,
    video_url_parte2 TEXT, -- Segunda parte del video (para multipart)
    duracion_minutos INTEGER,
    fecha_clase DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3. Actualizar Políticas RLS para Multipart
**Archivo:** `supabase/migrations/20240212_clases_grabadas_rls_multipart.sql`
```sql
-- Políticas RLS actualizadas para incluir video_url_parte2
-- Estas políticas permiten a los usuarios ver las clases grabadas de sus cursos
```

## 🔧 Pasos para Aplicar Migraciones

1. **Instalar Supabase CLI** (si no está instalado):
```bash
npm install -g supabase
```

2. **Iniciar sesión en Supabase**:
```bash
supabase login
```

3. **Enlazar proyecto**:
```bash
supabase link --project-ref rgmauuzwzsoaytsulgwg
```

4. **Aplicar migraciones**:
```bash
supabase db push
```

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