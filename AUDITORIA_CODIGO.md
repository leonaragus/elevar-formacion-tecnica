# Auditoría de Código y Plan de Acción

Este documento detalla los hallazgos de la auditoría de código completa de la aplicación Elevar. El objetivo es identificar problemas, inconsistencias, riesgos y proponer soluciones para mejorar la estabilidad, rendimiento y mantenibilidad del proyecto.

El análisis se divide en las siguientes secciones:

1.  **Hallazgos Críticos:** Problemas que causan inestabilidad mayor, errores funcionales o riesgos de seguridad.
2.  **Hallazgos de Arquitectura y Buenas Prácticas:** Puntos donde el código se desvía de los patrones recomendados, llevando a complejidad innecesaria y dificultad de mantenimiento.
3.  **Hallazgos Menores y Sugerencias:** Pequeñas mejoras de calidad de código, UI o experiencia de usuario.

---

## Hallazgos Críticos

### 1. (Arquitectura Rota) El Frontend se Salta la API para Consultar la BD Directamente

*   **Archivo:** `src/app/admin/dashboard/page.tsx`
*   **Descripción:** El componente principal del dashboard de administración contiene lógica para conectarse directamente a la base de datos y ejecutar múltiples consultas SQL. Un comentario en el código (`// Fetch directly from DB instead of API to avoid network/URL issues`) confirma que esto se hizo intencionadamente para evitar los problemas de inestabilidad de la capa de API.
*   **Riesgo:** **CRÍTICO.** Esto representa un colapso total de la arquitectura de la aplicación. Conduce a una duplicación masiva de la lógica de negocio, acopla fuertemente el frontend a la estructura de la base de datos y anula el propósito de tener una capa de API. Cualquier cambio en la lógica de datos debe hacerse en múltiples lugares, lo que garantiza la aparición de inconsistencias y bugs. Fue la consecuencia directa de no haber resuelto la causa raíz de los errores de API (Hallazgo Crítico #2).
*   **Solución Propuesta:** Refactorización completa. Una vez que la capa de API sea estabilizada y optimizada (ver Hallazgos de Arquitectura), este componente debe ser reescrito para consumir exclusivamente esos endpoints de API. Toda la lógica de consulta directa a la base de datos debe ser eliminada.

### 2. (Rendimiento) Múltiples Consultas Ineficientes (N+1) en el Dashboard

*   **Archivo:** `src/app/admin/dashboard/page.tsx`
*   **Descripción:** Para construir la página, el componente ejecuta una cascada de consultas ineficientes: 4 consultas para obtener estadísticas, 2 para obtener listas de pendientes de dos tablas distintas (`cursos_alumnos` e `intereses`), y luego múltiples consultas adicionales para "enriquecer" los resultados con nombres de usuario y cursos. 
*   **Riesgo:** **CRÍTICO.** Este es el responsable directo de la lentitud y el alto consumo de recursos del panel de administración. El rendimiento se degrada exponencialmente con el aumento de datos.
*   **Solución Propuesta:** Eliminar por completo esta lógica y reemplazarla con llamadas a los endpoints de API optimizados. La API, a su vez, debe usar funciones de base de datos (RPC) para realizar las agregaciones y uniones de datos de forma eficiente en una sola consulta.

### 3. (Resuelto) El Middleware Devolvía HTML a Solicitudes de API

*   **Archivo:** `src/middleware.ts`
*   **Descripción:** El middleware respondía con redirecciones HTML a llamadas de API que esperaban JSON, causando un error de parsing (`Unexpected token '<'`).
*   **Riesgo:** **Crítico.** Causante principal de la inestabilidad original que motivó los erróneos workarounds.
*   **Solución Aplicada:** Se modificó el `middleware` para que devuelva respuestas JSON con códigos de estado apropiados para las rutas de API.

---

## Hallazgos de Arquitectura y Buenas Prácticas

### 1. Ineficiencia Grave en la Petición GET de Cursos (Problema N+1)

*   **Archivo:** `src/app/api/admin/cursos/route.ts`
*   **Descripción:** La API obtiene tablas enteras y las procesa en JavaScript en lugar de delegar agregaciones a la base de datos. 
*   **Riesgo:** **Alto.** Causa directa de la lentitud de la API.
*   **Solución Propuesta:** Reescribir la consulta para delegar el trabajo de agregación a la base de datos mediante funciones (RPC).

### 2. La Ruta GET de Cursos Viola el Principio de Responsabilidad Única

*   **Archivo:** `src/app/api/admin/cursos/route.ts`
*   **Descripción:** Un mismo endpoint devuelve dos conjuntos de datos distintos (cursos y pendientes).
*   **Riesgo:** **Bajo.** Diseño de API poco limpio.
*   **Solución Propuesta:** Dividir en dos endpoints: `GET /api/admin/cursos` y `GET /api/admin/inscripciones`.

### 3. Complejidad Excesiva en Cliente Admin por Saneamiento de Variables de Entorno

*   **Archivo:** `src/lib/supabase/admin.ts`
*   **Descripción:** Código excesivo para limpiar y validar variables de entorno, síntoma de problemas de configuración manual.
*   **Riesgo:** **Alto.** Causa probable de la inestabilidad original.
*   **Solución Propuesta:** Simplificar radicalmente el código y documentar el proceso de configuración.

...(El resto de hallazgos de arquitectura y menores se mantienen igual)

