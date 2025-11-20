# Feature: Reportes con Filtros de Fecha y Gráficos

## 🎨 Descripción General

Mejoras al sistema de reportes agregando filtros de fecha flexibles y visualizaciones gráficas interactivas para un mejor análisis de la actividad de generación de mensajes WhatsApp.

## ✨ Nuevas Características

### 1. Filtros de Fecha

#### Filtros Rápidos (Botones)
Acceso rápido a rangos de fechas predefinidos:

- **Hoy** 📅 - Mensajes generados hoy
- **Últimos 7 días** 📅 - Última semana
- **Últimos 30 días** 📅 - Último mes
- **Últimos 3 meses** 📅 - Últimos 90 días

#### Filtros Personalizados
Selección manual de rangos de fecha:

- **Fecha Inicio** - Desde cuándo buscar
- **Fecha Fin** - Hasta cuándo buscar
- Permite análisis de cualquier período específico

### 2. Visualizaciones Gráficas

#### 📈 Gráfico de Línea: Mensajes por Día
- Muestra la tendencia de mensajes generados día a día
- Permite identificar picos de actividad
- Útil para ver patrones de uso

#### 👥 Gráfico de Barras: Top 5 Usuarios
- Ranking de los 5 usuarios más activos
- Muestra cantidad de mensajes por usuario
- Colores diferentes por usuario

#### 🎮 Gráfico Circular: PS4 vs PS5
- Distribución porcentual de mensajes
- Comparación visual entre plataformas
- Identifica preferencias de plataforma

#### 👤 Gráfico Circular: Admin vs Empleado
- Distribución por rol de usuario
- Comparación de actividad entre roles
- Útil para balance de carga

### 3. Toggle de Gráficos

Botón para mostrar/ocultar los gráficos:
- **"Mostrar Gráficos"** - Despliega las visualizaciones
- **"Ocultar Gráficos"** - Oculta para ver solo la tabla
- Estado se mantiene durante la sesión

## 🎯 Casos de Uso

### Caso 1: Análisis Semanal

```
1. Admin entra a Reportes
2. Click en "Últimos 7 días"
3. Ve gráfico de tendencia diaria
4. Identifica días con más actividad
5. Ajusta personal según demanda
```

### Caso 2: Revisión Mensual

```
1. Click en "Últimos 30 días"
2. Ve Top 5 usuarios activos
3. Identifica empleados más productivos
4. Analiza distribución PS4/PS5
5. Toma decisiones sobre inventario
```

### Caso 3: Período Personalizado

```
1. Selecciona fecha inicio: 01/01/2024
2. Selecciona fecha fin: 15/01/2024
3. Click en "Aplicar"
4. Ve datos solo de ese período
5. Exporta información (próximamente)
```

### Caso 4: Comparación de Empleados

```
1. Selecciona "Últimos 30 días"
2. Ve gráfico "Top 5 Usuarios"
3. Identifica diferencias de productividad
4. Filtra por empleado específico
5. Revisa detalles en tabla
```

## 📊 Gráficos Incluidos

### 1. Mensajes por Día (Línea)

```
Características:
- Eje X: Fechas
- Eje Y: Cantidad de mensajes
- Color: Azul
- Tooltip: Muestra cantidad al pasar mouse
- Responsive: Se adapta al tamaño de pantalla
```

### 2. Top Usuarios (Barras)

```
Características:
- Eje X: Nombres de usuarios
- Eje Y: Cantidad de mensajes
- Colores: 5 colores diferentes
- Muestra máximo 5 usuarios
- Ordenado descendente
```

### 3. PS4 vs PS5 (Dona)

```
Características:
- Segmentos: PS4 (azul) y PS5 (morado)
- Porcentajes automáticos
- Leyenda inferior
- Tooltip con cantidad
```

### 4. Admin vs Empleado (Dona)

```
Características:
- Segmentos: Admin (verde) y Empleado (naranja)
- Porcentajes automáticos
- Leyenda inferior
- Tooltip con cantidad
```

## 🎨 Interfaz Actualizada

```
┌──────────────────────────────────────────────────────┐
│ 📄 Reportes de Mensajes WhatsApp                    │
│                                          [Actualizar]│
├──────────────────────────────────────────────────────┤
│                                                      │
│ [Hoy] [7 días] [30 días] [3 meses]  [Ocultar Gráf.]│
│                                                      │
│ ┌─────────────────────────────────────────────────┐│
│ │ 📈 Mensajes por Día    │ 👥 Top 5 Usuarios      ││
│ │ [Gráfico de línea]     │ [Gráfico de barras]    ││
│ └─────────────────────────────────────────────────┘│
│ ┌─────────────────────────────────────────────────┐│
│ │ 🎮 PS4 vs PS5          │ 👤 Admin vs Empleado   ││
│ │ [Gráfico circular]     │ [Gráfico circular]     ││
│ └─────────────────────────────────────────────────┘│
│                                                      │
│ 🔍 Filtros Detallados                               │
│ [Fecha Inicio] [Fecha Fin] [Usuario]               │
│ [Rol] [Buscar] [Aplicar] [Limpiar]                 │
│                                                      │
│ Tabla de Reportes...                                │
└──────────────────────────────────────────────────────┘
```

## 🔧 Tecnologías Utilizadas

### Chart.js + Vue-ChartJS

```json
{
  "chart.js": "^4.x",
  "vue-chartjs": "^5.x"
}
```

**¿Por qué Chart.js?**
- ✅ Librería ligera y rápida
- ✅ Gráficos responsivos
- ✅ Fácil integración con Vue
- ✅ Altamente personalizable
- ✅ Excelente documentación

## 📁 Archivos Nuevos/Modificados

### Nuevo Componente:

**`src/components/admin/ReportesCharts.vue`**
- Componente de gráficos
- 4 tipos de visualizaciones
- Props: `reportes` (array de Reporte)
- Calcula datos automáticamente
- Estilos responsive
- Manejo de estado vacío

### Archivos Modificados:

**`src/views/admin/AdminDashboard.vue`**
- Importa ReportesCharts
- Agrega filtros de fecha
- Botones de filtros rápidos
- Toggle mostrar/ocultar gráficos
- Variables reactivas para fechas
- Función `aplicarFiltroRapido(dias)`
- Función `limpiarFiltrosReportes()` actualizada

**`src/composables/useReportes.ts`**
- Acepta `fechaInicio` en filtros
- Acepta `fechaFin` en filtros
- Filtra por rango de fechas

**`src/composables/useWhatsAppMessages.ts`**
- Acepta `nombreUsuario` como nullable
- Maneja undefined correctamente

## 🎯 Funciones Principales

### aplicarFiltroRapido(dias)

```typescript
const aplicarFiltroRapido = (dias: number): void => {
  const hoy = new Date()
  const inicio = new Date()
  inicio.setDate(hoy.getDate() - dias)
  
  fechaInicio.value = inicio.toISOString().split('T')[0]
  fechaFin.value = hoy.toISOString().split('T')[0]
  cargarReportesConFiltros()
}
```

**Uso:**
- `aplicarFiltroRapido(1)` - Hoy
- `aplicarFiltroRapido(7)` - Última semana
- `aplicarFiltroRapido(30)` - Último mes
- `aplicarFiltroRapido(90)` - 3 meses

### cargarReportesConFiltros()

```typescript
const cargarReportesConFiltros = async (): Promise<void> => {
  const filtros = {
    uid: filtroUsuarioReporte.value || undefined,
    rol: filtroRolReporte.value || undefined,
    busqueda: busquedaReporte.value || undefined,
    fechaInicio: fechaInicio.value ? new Date(fechaInicio.value) : undefined,
    fechaFin: fechaFin.value ? new Date(fechaFin.value + 'T23:59:59') : undefined
  }
  await cargarReportes(filtros, limiteReportes.value)
}
```

## 📊 Cálculo de Datos para Gráficos

### Mensajes por Día

```typescript
const mensajesPorDia = computed(() => {
  const conteo = new Map<string, number>()
  
  reportes.forEach(reporte => {
    const fecha = new Date(reporte.fechaGeneracion)
    const key = fecha.toLocaleDateString('es-ES')
    conteo.set(key, (conteo.get(key) || 0) + 1)
  })
  
  return {
    labels: Array.from(conteo.keys()),
    datasets: [{
      label: 'Mensajes Generados',
      data: Array.from(conteo.values())
    }]
  }
})
```

### Top 5 Usuarios

```typescript
const topUsuarios = computed(() => {
  const conteo = new Map<string, { nombre: string; cantidad: number }>()
  
  reportes.forEach(reporte => {
    // Contar por usuario...
  })
  
  return Array.from(conteo.values())
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, 5)
})
```

## 🎨 Personalización de Colores

```typescript
const colors = {
  primary: 'rgba(59, 130, 246, 0.7)',    // Azul
  secondary: 'rgba(139, 92, 246, 0.7)',  // Morado
  success: 'rgba(34, 197, 94, 0.7)',     // Verde
  warning: 'rgba(251, 146, 60, 0.7)',    // Naranja
  danger: 'rgba(239, 68, 68, 0.7)',      // Rojo
  pink: 'rgba(236, 72, 153, 0.7)'        // Rosa
}
```

## 📱 Responsive Design

Los gráficos se adaptan automáticamente:

- **Desktop**: 2 gráficos por fila
- **Tablet**: 2 gráficos por fila
- **Mobile**: 1 gráfico por fila
- Altura fija: 256px (h-64 en Tailwind)

## 🚀 Mejoras Futuras

- [ ] Exportar gráficos como imagen PNG
- [ ] Exportar datos a Excel con gráficos
- [ ] Gráfico de comparación temporal
- [ ] Filtro por juego específico
- [ ] Gráfico de juegos más solicitados
- [ ] Análisis predictivo
- [ ] Dashboard en tiempo real
- [ ] Alertas automáticas
- [ ] Comparación entre períodos

## 📈 Métricas Disponibles

### Estadísticas Generales:
- Total de reportes
- Promedio diario
- Pico máximo (día con más mensajes)
- Usuario más activo
- Plataforma más usada

### Por Período:
- Mensajes por día
- Mensajes por usuario
- Mensajes por plataforma
- Mensajes por rol

### Comparativas:
- PS4 vs PS5
- Admin vs Empleado
- Usuario vs Usuario
- Día vs Día

## ✅ Ventajas del Sistema

1. **Visual** - Identifica tendencias rápidamente
2. **Flexible** - Filtra por cualquier período
3. **Interactivo** - Tooltips informativos
4. **Responsive** - Funciona en móviles
5. **Rápido** - Cálculos optimizados
6. **Claro** - Colores distintivos
7. **Completo** - 4 tipos de visualizaciones

## 🎓 Cómo Interpretar los Gráficos

### Gráfico de Línea (Tendencia)
- **Subida** = Más actividad
- **Bajada** = Menos actividad
- **Picos** = Días especiales
- **Valles** = Días lentos

### Gráfico de Barras (Comparación)
- Barra más alta = Usuario más activo
- Comparar alturas = Diferencias
- 5 usuarios = Top performers

### Gráficos Circulares (Distribución)
- Segmento más grande = Preferencia
- Porcentajes = Proporción exacta
- Colores = Diferenciación visual

## 🔒 Permisos

- ✅ Solo administradores
- ❌ Empleados no ven reportes
- ❌ Clientes sin acceso

## 💡 Tips de Uso

1. **Usa filtros rápidos** para análisis diarios
2. **Revisa tendencias** en el gráfico de línea
3. **Identifica usuarios** en top 5
4. **Compara plataformas** para inventario
5. **Filtra por fecha** para períodos específicos
6. **Oculta gráficos** si solo necesitas la tabla
7. **Combina filtros** para análisis detallado

## 📝 Ejemplo Completo

```
Análisis de Actividad Semanal:

1. Admin entra a Reportes
2. Click en "Últimos 7 días"
3. Ve gráfico de línea:
   - Lunes: 5 mensajes
   - Martes: 8 mensajes
   - Miércoles: 12 mensajes (pico)
   - Jueves: 7 mensajes
   - Viernes: 10 mensajes
   - Sábado: 3 mensajes
   - Domingo: 2 mensajes

4. Ve Top 5 Usuarios:
   - Empleado A: 15 mensajes
   - Empleado B: 12 mensajes
   - Admin: 10 mensajes
   - Empleado C: 8 mensajes
   - Empleado D: 2 mensajes

5. Ve PS4 vs PS5:
   - PS4: 65% (31 mensajes)
   - PS5: 35% (16 mensajes)

6. Conclusiones:
   - Miércoles es el día más activo
   - Empleado A es el más productivo
   - PS4 tiene más demanda
   - Fin de semana actividad baja

7. Acciones:
   - Reforzar personal miércoles
   - Reconocer a Empleado A
   - Aumentar stock PS4
   - Promociones fin de semana
```

## ✨ Conclusión

El sistema de reportes con gráficos proporciona una manera visual, intuitiva y poderosa de analizar la actividad de generación de mensajes WhatsApp, permitiendo tomar decisiones informadas basadas en datos reales.

