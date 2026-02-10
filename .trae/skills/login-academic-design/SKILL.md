---
name: "login-academic-design"
description: "Proporciona ideas y diseños para interfaces de login académicas con elementos educativos. Invocar cuando se necesite mejorar la pantalla de login con temas académicos o educativos."
---

# Diseño de Login Académico

Este skill ofrece ideas y conceptos de diseño para interfaces de login con temática académica y educativa.

## Elementos de Diseño Recomendados

### 🎨 Paletas de Colores Académicas
- **Azul académico**: `#1a56db` (profesional, confiable)
- **Verde conocimiento**: `#10b981` (crecimiento, aprendizaje)  
- **Morado sabiduría**: `#8b5cf6` (creatividad, innovación)
- **Beige pergamino**: `#f5f5dc` (fondo clásico, elegante)

### 🖼️ Imágenes y Ilustraciones

#### Opción 1: Ilustraciones de Línea Fina (Crayon)
- **Libros abiertos** con páginas ondeantes
- **Plumas estilográficas** escribiendo
- **Gafas de estudio** sobre libros apilados
- **Manos escribiendo** en cuadernos
- **Plantas de interior** en macetas minimalistas

#### Opción 2: Elementos Académicos Sútiles
- **Patrones geométricos** inspirados en pizarras
- **Fórmulas matemáticas** discretas como textura
- **Mapas antiguos** con bordes desgastados
- **Instrumentos científicos** (microscopios, compases)

#### Opción 3: Abstracto Educativo
- **Trazos de acuarela** que simulan manchas de tinta
- **Gráficos de crecimiento** (líneas que suben)
- **Puntos de conexión** que forman redes de conocimiento

### 📐 Diseños de Layout

#### Diseño 1: Panel Lateral Académico
```
+--------------------------------+
|  [Ilustración académica]       |  |  [Formulario Login]     |
|  Libros, plumas, elementos     |  |  Usuario: ___________   |
|  educativos en estilo crayon    |  |  Contraseña: _________  |
|                                |  |  [Botón Ingresar]       |
+--------------------------------+
```

#### Diseño 2: Header Ilustrado
```
+--------------------------------+
|  [Header con ilustración fina]  |
|  Líneas de libros/plumas       |
+--------------------------------+
|                                |
|  [Formulario Login centrado]   |
|                                |
+--------------------------------+
```

#### Diseño 3: Fondo Texturizado
```
+--------------------------------+
|  [Fondo: papel antiguo/textura]|
|  [Formulario en tarjeta blanca] |
|  con sombra sutil              |
+--------------------------------+
```

### 🎯 Elementos Interactivos
- **Botones** con iconos de graduación o libros
- **Placeholders** con emojis educativos (📚, 🎓, ✏️)
- **Animaciones sutiles** de escritura o páginas turning
- **Loading indicators** con spinner de engranajes educativos

### 📱 Ejemplos de Implementación

#### CSS para Fondo Académico
```css
.login-container {
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  background-image: 
    url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-3c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm54 54c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM10 60c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3z' fill='%23cbd5e1' fill-opacity='0.1' fill-rule='evenodd'/%3E%3C/svg%3E");
}
```

#### SVG para Ilustración de Línea Fina
```svg
<svg width="200" height="150" viewBox="0 0 200 150">
  <!-- Libro abierto -->
  <path d="M40,50 L80,50 L80,100 L40,100 Z" fill="none" stroke="#374151" stroke-width="1.5"/>
  <path d="M80,50 L120,50 L120,100 L80,100 Z" fill="none" stroke="#374151" stroke-width="1.5"/>
  <line x1="60" y1="60" x2="100" y2="60" stroke="#6b7280" stroke-width="1"/>
  <line x1="60" y1="70" x2="100" y2="70" stroke="#6b7280" stroke-width="1"/>
  
  <!-- Pluma -->
  <path d="M140,40 L150,30 L160,40 L155,45 Z" fill="#ef4444" stroke="#dc2626" stroke-width="1"/>
  <line x1="150" y1="30" x2="150" y2="80" stroke="#000" stroke-width="1.5"/>
  
  <!-- Gafas -->
  <circle cx="180" cy="60" r="8" fill="none" stroke="#4b5563" stroke-width="1.5"/>
  <circle cx="160" cy="60" r="8" fill="none" stroke="#4b5563" stroke-width="1.5"/>
  <path d="M172,60 L168,60" stroke="#4b5563" stroke-width="1.5"/>
</svg>
```

### 🚀 Cuando Usar Este Skill
- Al diseñar nuevas pantallas de login
- Al refactorizar interfaces existentes  
- Cuando se busca inspiración académica
- Al crear temas educativos para aplicaciones

### 📚 Recursos Recomendados
- **Undraw.co** - Ilustraciones educativas gratis
- **Freepik** - Vectores académicos
- **Heroicons** - Iconos educativos
- **Google Fonts**: Playfair Display, Inter, Merriweather