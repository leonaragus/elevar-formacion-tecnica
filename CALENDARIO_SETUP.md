# Calendario de Entregas - Sistema de Notificaciones Automáticas

## Configuración

Este sistema envía notificaciones automáticas a los alumnos sobre fechas de entrega próximas.

## Características

- **Recordatorios automáticos**: 7 días, 3 días y 1 día antes de la fecha de entrega
- **Notificaciones push**: Se integra con el sistema de notificaciones push existente
- **Gestión admin**: Interface para crear, editar y eliminar fechas de entrega
- **Vista alumno**: Calendario personalizado con filtros y estados

## Endpoints API

### Admin
- `GET /api/admin/calendario` - Listar todas las fechas de entrega
- `POST /api/admin/calendario` - Crear nueva fecha de entrega
- `PUT /api/admin/calendario` - Actualizar fecha de entrega
- `DELETE /api/admin/calendario?id={id}` - Eliminar fecha de entrega

### Alumno
- `GET /api/calendario` - Obtener fechas de entrega del alumno
- `POST /api/calendario` - Entregar trabajo/prueba

### Sistema
- `POST /api/calendario/recordatorios` - Ejecutar envío de recordatorios (requiere API key)

## Configuración de Cron Job

Para ejecutar los recordatorios automáticamente, configura un cron job que llame al endpoint:

```bash
# Ejecutar cada hora
0 * * * * curl -X POST https://tu-dominio.com/api/calendario/recordatorios \
  -H "Authorization: Bearer TU_CRON_API_KEY"
```

## Variables de Entorno

Añade estas variables a tu `.env.local`:

```
# API key para cron jobs
CRON_API_KEY=tu_clave_secreta_aqui

# Service role key de Supabase (para el servidor de recordatorios)
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui
```

## Estructura de Base de Datos

### Tablas principales:
- `calendario_entregas` - Fechas de entrega
- `entregas_alumnos` - Entregas realizadas por alumnos
- `recordatorios_entregas` - Recordatorios programados

## Uso

1. **Admin**: Ve a `/admin/calendario` para gestionar fechas
2. **Alumno**: Ve a `/calendario` para ver tus entregas
3. **Automatización**: Configura el cron job para recordatorios