# Componentes del Proyecto

Esta carpeta contiene todos los componentes Vue del proyecto, organizados en subcarpetas según su función.

## Estructura de Carpetas

```
components/
├── sections/          # Secciones de página (componentes de layout)
│   ├── ComboSection.vue
│   ├── ContactLocationSection.vue
│   ├── FAQSection.vue
│   ├── FeaturesBanner.vue
│   ├── HeroSection.vue
│   ├── ReviewsSection.vue
│   └── TopIndieGames.vue
│
├── ui/                # Componentes de interfaz reutilizables
│   ├── AppNavbar.vue
│   ├── CartModal.vue
│   └── GameCard.vue
│
├── icons/             # Iconos personalizados
│   ├── vue-examples/  # Iconos de ejemplo de Vue/Vite
│   └── README.md
│
├── examples/          # Componentes de ejemplo (no utilizados)
│   └── HelloWorld.vue
│
└── README.md          # Este archivo
```

## Categorías

### 📄 `sections/`
Componentes que representan secciones completas de la página principal. Estos componentes suelen ser más grandes y específicos del layout de la página.

**Componentes:**
- `ComboSection.vue` - Sección de combos especiales
- `ContactLocationSection.vue` - Sección de contacto y ubicación
- `FAQSection.vue` - Sección de preguntas frecuentes
- `FeaturesBanner.vue` - Banner de características
- `HeroSection.vue` - Sección hero/banner principal
- `ReviewsSection.vue` - Sección de reseñas
- `TopIndieGames.vue` - Sección de juegos indie destacados

### 🎨 `ui/`
Componentes de interfaz de usuario reutilizables que se pueden usar en múltiples lugares del proyecto.

**Componentes:**
- `AppNavbar.vue` - Barra de navegación principal
- `CartModal.vue` - Modal del carrito de compras
- `GameCard.vue` - Tarjeta de juego (reutilizable)

### 🎯 `icons/`
Iconos personalizados del proyecto. Ver [icons/README.md](./icons/README.md) para más detalles.

### 📚 `examples/`
Componentes de ejemplo que no se utilizan en producción. Se mantienen como referencia.

## Convenciones de Nomenclatura

- **Componentes de sección**: Terminan en `Section` (ej: `FAQSection.vue`)
- **Componentes UI**: Nombres descriptivos sin sufijo (ej: `GameCard.vue`, `AppNavbar.vue`)
- **PascalCase**: Todos los nombres de componentes usan PascalCase

## Importación de Componentes

### Desde `sections/`
```vue
<script setup lang="ts">
import FAQSection from '@/components/sections/FAQSection.vue'
</script>
```

### Desde `ui/`
```vue
<script setup lang="ts">
import GameCard from '@/components/ui/GameCard.vue'
</script>
```

## Agregar Nuevos Componentes

1. **Sección de página**: Agregar en `sections/`
2. **Componente reutilizable**: Agregar en `ui/`
3. **Icono personalizado**: Agregar en `icons/` (o subcarpeta apropiada)
4. **Ejemplo/Prueba**: Agregar en `examples/`

## Notas

- Los componentes en `examples/` no se importan en producción
- `TopIndieGames.vue` está en `sections/` pero actualmente no se utiliza
- Todos los componentes siguen el estilo `<script setup>` de Vue 3

