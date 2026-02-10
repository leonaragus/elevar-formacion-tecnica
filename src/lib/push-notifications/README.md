# Sistema de Notificaciones Push por Curso

## Configuración y Prueba del Sistema

### 1. Variables de Entorno Requeridas

Agrega estas variables a tu archivo `.env.local`:

```bash
# Claves VAPID para Web Push (genera tus propias claves)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_vapid_public_key_here
VAPID_PRIVATE_KEY=your_vapid_private_key_here

# Email para VAPID (cambia a tu email)
VAPID_SUBJECT=mailto:admin@tuinstituto.com
```

#### Generar Claves VAPID:
```bash
npx web-push generate-vapid-keys
```

### 2. Instalar Dependencias

```bash
npm install web-push
```

### 3. Ejecutar Migración de Base de Datos

```bash
# Aplicar la migración de Supabase
supabase migration up
```

### 4. Estructura del Sistema

#### Tablas de Base de Datos:
- `push_subscriptions`: Almacena suscripciones de usuarios por curso
- `notification_history`: Registro de notificaciones enviadas

#### APIs Creadas:
- `POST /api/notifications/subscribe`: Suscribirse a notificaciones de un curso
- `POST /api/notifications/unsubscribe`: Desuscribirse de notificaciones
- `POST /api/notifications/send`: Enviar notificaciones a suscriptores
- `GET /api/notifications/send`: Obtener historial de notificaciones

#### Componentes Frontend:
- `PushNotificationToggle`: Botón para activar/desactivar notificaciones por curso
- `NotificationHistory`: Historial de notificaciones enviadas

### 5. Integración con Mensajes de Admin

El sistema está integrado con el endpoint existente `/api/admin/mensajes`. Cuando un admin envía un mensaje con un `curso_id`, automáticamente se envían notificaciones push a los suscriptores de ese curso.

### 6. Uso en Componentes

#### Agregar Botón de Notificaciones a CursoCard:
```tsx
import PushNotificationToggle from "@/components/PushNotificationToggle";

// En tu componente CursoCard
<PushNotificationToggle 
  cursoId={curso.id} 
  cursoTitle={curso.titulo}
  className="mt-3"
/>
```

#### Mostrar Historial de Notificaciones:
```tsx
import NotificationHistory from "@/components/NotificationHistory";

// En la página del curso
<NotificationHistory 
  cursoId={cursoId}
  limit={10}
  className="mt-6"
/>
```

### 7. Flujo de Trabajo

1. **Usuario se suscribe**: Click en botón → Solicita permiso → Se registra en BD
2. **Admin envía mensaje**: Se crea mensaje → Se envían notificaciones push
3. **Usuario recibe notificación**: Aparece en dispositivo → Click abre curso
4. **Historial**: Se registra cada notificación enviada

### 8. Pruebas Recomendadas

1. **Suscripción**:
   - Verificar que el botón aparece en cursos
   - Probar activar/desactivar notificaciones
   - Confirmar que se guarda en base de datos

2. **Envío de Notificaciones**:
   - Enviar mensaje desde admin con curso específico
   - Verificar que llega a suscriptores del curso
   - Confirmar que no llega a no-suscriptores

3. **Service Worker**:
   - Verificar que se registra correctamente
   - Probar recepción de notificaciones con app cerrada
   - Confirmar navegación al hacer click

4. **Historial**:
   - Verificar que se registra cada notificación
   - Probar filtrado por curso y usuario
   - Confirmar formato de fechas

### 9. Seguridad

- Solo usuarios autenticados pueden suscribirse
- Solo usuarios inscritos en el curso pueden recibir notificaciones
- Las suscripciones se validan con el servidor push
- Se eliminan suscripciones inválidas automáticamente

### 10. Solución de Problemas Comunes

**Notificaciones no llegan**:
- Verificar claves VAPID en variables de entorno
- Confirmar que el service worker está registrado
- Revisar logs del navegador
- Verificar permisos de notificación

**Error al suscribirse**:
- Confirmar que el usuario está autenticado
- Verificar que está inscrito en el curso
- Revisar consola del navegador
- Verificar conectividad con Supabase

**Service Worker no funciona**:
- Asegurar que está en HTTPS (requerido para push)
- Verificar que el archivo sw.js está accesible
- Revisar errores en la consola del service worker

### 11. Optimizaciones Futuras Sugeridas

- Agregar preferencias de notificación (sonido, vibración)
- Implementar notificaciones programadas
- Agregar estadísticas de apertura
- Implementar notificaciones segmentadas por rol
- Agregar plantillas de notificación predefinidas