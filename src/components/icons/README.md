# Iconos del Proyecto

Esta carpeta contiene los componentes de iconos personalizados del proyecto.

## Estructura

```
icons/
├── vue-examples/          # Iconos de ejemplo de Vue/Vite (no utilizados actualmente)
│   ├── IconCommunity.vue
│   ├── IconDocumentation.vue
│   ├── IconEcosystem.vue
│   ├── IconSupport.vue
│   └── IconTooling.vue
└── README.md             # Este archivo
```

## Uso de Iconos en el Proyecto

El proyecto utiliza principalmente **Lucide Icons** (`lucide-vue-next`) para los iconos. Estos se importan directamente en los componentes:

```vue
<script setup lang="ts">
import { ShoppingCart, Gamepad2, Flame } from 'lucide-vue-next'
</script>
```

## Iconos Personalizados

Si necesitas crear iconos personalizados específicos del proyecto, puedes agregarlos directamente en esta carpeta o crear subcarpetas adicionales según la categoría:

- `custom/` - Para iconos personalizados del proyecto
- `brand/` - Para iconos de marca/logos
- `ui/` - Para iconos de interfaz de usuario

## Nota

Los iconos en `vue-examples/` son ejemplos de Vue/Vite y no se están utilizando actualmente en el proyecto. Se mantienen organizados por si se necesitan en el futuro.

