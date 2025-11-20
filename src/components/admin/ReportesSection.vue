<script setup lang="ts">
import { ref, computed } from 'vue'
import { useReportes } from '@/composables/useReportes'
import ReportesCharts from './ReportesCharts.vue'
import { FileText, RefreshCw, Calendar } from 'lucide-vue-next'

const {
  reportes,
  isLoadingReportes,
  cargarReportes,
  obtenerEstadisticas
} = useReportes()

// Estados para filtros
const filtroUsuarioReporte = ref<string>('')
const filtroRolReporte = ref<'admin' | 'employee' | ''>('')
const busquedaReporte = ref('')
const limiteReportes = ref(100)
const fechaInicio = ref('')
const fechaFin = ref('')
const mostrarGraficos = ref(true)

// Computed para reportes filtrados
const reportesFiltrados = computed(() => {
  let resultado = reportes.value
  
  // Filtrar por usuario
  if (filtroUsuarioReporte.value) {
    resultado = resultado.filter(r => r.uid === filtroUsuarioReporte.value)
  }
  
  // Filtrar por rol
  if (filtroRolReporte.value) {
    resultado = resultado.filter(r => r.rol === filtroRolReporte.value)
  }
  
  // Filtrar por búsqueda
  if (busquedaReporte.value && busquedaReporte.value.trim()) {
    const busqueda = busquedaReporte.value.toLowerCase().trim()
    resultado = resultado.filter(r =>
      r.juegoNombre.toLowerCase().includes(busqueda) ||
      r.correoUtilizado.toLowerCase().includes(busqueda) ||
      (r.nombreUsuario && r.nombreUsuario.toLowerCase().includes(busqueda)) ||
      r.email.toLowerCase().includes(busqueda)
    )
  }
  
  // Filtrar por fecha inicio
  if (fechaInicio.value) {
    const fechaInicioDate = new Date(fechaInicio.value)
    fechaInicioDate.setHours(0, 0, 0, 0)
    resultado = resultado.filter(r => {
      const fechaReporte = new Date(r.fechaGeneracion)
      fechaReporte.setHours(0, 0, 0, 0)
      return fechaReporte >= fechaInicioDate
    })
  }
  
  // Filtrar por fecha fin
  if (fechaFin.value) {
    const fechaFinDate = new Date(fechaFin.value)
    fechaFinDate.setHours(23, 59, 59, 999)
    resultado = resultado.filter(r => {
      const fechaReporte = new Date(r.fechaGeneracion)
      return fechaReporte <= fechaFinDate
    })
  }
  
  return resultado
})

const estadisticasReportes = computed(() => {
  return obtenerEstadisticas()
})

// Computed para contar filtros activos
const filtrosActivos = computed(() => {
  let count = 0
  if (filtroUsuarioReporte.value) count++
  if (filtroRolReporte.value) count++
  if (busquedaReporte.value) count++
  if (fechaInicio.value) count++
  if (fechaFin.value) count++
  return count
})

const usuariosUnicos = computed(() => {
  const usuarios = new Map<string, { email: string; nombre: string; uid: string }>()
  reportes.value.forEach(r => {
    if (!usuarios.has(r.uid)) {
      usuarios.set(r.uid, {
        uid: r.uid,
        email: r.email,
        nombre: r.nombreUsuario || r.email
      })
    }
  })
  return Array.from(usuarios.values())
})

const cargarReportesConFiltros = async (): Promise<void> => {
  await cargarReportes({}, limiteReportes.value)
  
  console.log('📊 Reportes cargados:', reportes.value.length)
  console.log('🔍 Filtros activos:', filtrosActivos.value)
  console.log('📋 Reportes filtrados:', reportesFiltrados.value.length)
}

const limpiarFiltrosReportes = (): void => {
  filtroUsuarioReporte.value = ''
  filtroRolReporte.value = ''
  busquedaReporte.value = ''
  fechaInicio.value = ''
  fechaFin.value = ''
}

const aplicarFiltroRapido = (dias: number): void => {
  const hoy = new Date()
  const inicio = new Date()
  inicio.setDate(hoy.getDate() - dias)
  
  fechaInicio.value = inicio.toISOString().split('T')[0] as string
  fechaFin.value = hoy.toISOString().split('T')[0] as string
}

const formatearFechaReporte = (fecha: Date): string => {
  return new Intl.DateTimeFormat('es-ES', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(fecha)
}

// Cargar reportes al montar
cargarReportesConFiltros()

defineExpose({
  cargarReportesConFiltros
})
</script>

<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <div>
        <h1 class="text-3xl font-bold flex items-center gap-3">
          <FileText :size="32" class="text-primary" />
          Reportes de Mensajes WhatsApp
        </h1>
        <p class="text-base-content/60 mt-1">Historial de mensajes generados por usuarios</p>
      </div>
      <button @click="cargarReportesConFiltros" class="btn btn-primary gap-2" :disabled="isLoadingReportes">
        <RefreshCw :size="18" :class="{ 'animate-spin': isLoadingReportes }" />
        Actualizar
      </button>
    </div>

    <!-- Estadísticas -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div class="stat bg-base-100 rounded-lg shadow">
        <div class="stat-title">Total Reportes</div>
        <div class="stat-value text-primary">{{ estadisticasReportes.totalReportes }}</div>
      </div>
      <div class="stat bg-base-100 rounded-lg shadow">
        <div class="stat-title">Mensajes PS4</div>
        <div class="stat-value text-info">{{ estadisticasReportes.porPlataforma.PS4 || 0 }}</div>
      </div>
      <div class="stat bg-base-100 rounded-lg shadow">
        <div class="stat-title">Mensajes PS5</div>
        <div class="stat-value text-secondary">{{ estadisticasReportes.porPlataforma.PS5 || 0 }}</div>
      </div>
      <div class="stat bg-base-100 rounded-lg shadow">
        <div class="stat-title">Por Admins</div>
        <div class="stat-value text-success">{{ estadisticasReportes.porRol.admin || 0 }}</div>
      </div>
    </div>

    <!-- Filtros Rápidos -->
    <div class="flex gap-2 mb-4 flex-wrap">
      <button @click="aplicarFiltroRapido(1)" class="btn btn-sm btn-outline">
        <Calendar :size="16" />
        Hoy
      </button>
      <button @click="aplicarFiltroRapido(7)" class="btn btn-sm btn-outline">
        <Calendar :size="16" />
        Últimos 7 días
      </button>
      <button @click="aplicarFiltroRapido(30)" class="btn btn-sm btn-outline">
        <Calendar :size="16" />
        Últimos 30 días
      </button>
      <button @click="aplicarFiltroRapido(90)" class="btn btn-sm btn-outline">
        <Calendar :size="16" />
        Últimos 3 meses
      </button>
      <div class="ml-auto">
        <button @click="mostrarGraficos = !mostrarGraficos" class="btn btn-sm btn-outline gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          {{ mostrarGraficos ? 'Ocultar' : 'Mostrar' }} Gráficos
        </button>
      </div>
    </div>

    <!-- Gráficos -->
    <div v-if="mostrarGraficos && reportesFiltrados.length > 0" class="mb-6">
      <ReportesCharts :reportes="reportesFiltrados" />
    </div>

    <!-- Filtros Detallados -->
    <div class="card bg-base-100 shadow-xl mb-6">
      <div class="card-body">
        <div class="flex justify-between items-center mb-4">
          <h3 class="card-title text-lg">
            🔍 Filtros Detallados
            <span v-if="filtrosActivos > 0" class="badge badge-primary ml-2">
              {{ filtrosActivos }} activo{{ filtrosActivos > 1 ? 's' : '' }}
            </span>
          </h3>
          <div class="text-sm text-base-content/60">
            Filtros dinámicos - Se actualizan automáticamente
          </div>
        </div>
        
        <!-- Primera fila -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <div class="form-control">
            <label class="label">
              <span class="label-text font-semibold">📅 Fecha Inicio</span>
            </label>
            <input
              v-model="fechaInicio"
              type="date"
              class="input input-bordered"
            />
          </div>
          <div class="form-control">
            <label class="label">
              <span class="label-text font-semibold">📅 Fecha Fin</span>
            </label>
            <input
              v-model="fechaFin"
              type="date"
              class="input input-bordered"
            />
          </div>
          <div class="form-control">
            <label class="label">
              <span class="label-text font-semibold">👤 Usuario</span>
            </label>
            <select v-model="filtroUsuarioReporte" class="select select-bordered">
              <option value="">Todos los usuarios</option>
              <option v-for="usuario in usuariosUnicos" :key="usuario.uid" :value="usuario.uid">
                {{ usuario.nombre }}
              </option>
            </select>
          </div>
        </div>

        <!-- Segunda fila -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div class="form-control">
            <label class="label">
              <span class="label-text font-semibold">🎭 Rol</span>
            </label>
            <select v-model="filtroRolReporte" class="select select-bordered">
              <option value="">Todos los roles</option>
              <option value="admin">Admin</option>
              <option value="employee">Empleado</option>
            </select>
          </div>
          <div class="form-control">
            <label class="label">
              <span class="label-text font-semibold">
                🔎 Buscar
                <span v-if="busquedaReporte && busquedaReporte.length > 0" class="badge badge-sm badge-primary ml-2">
                  Filtrando
                </span>
              </span>
            </label>
            <input
              v-model="busquedaReporte"
              type="text"
              placeholder="Juego, correo, usuario..."
              class="input input-bordered"
            />
          </div>
          <div class="form-control">
            <label class="label">
              <span class="label-text opacity-0">Acciones</span>
            </label>
            <button @click="limpiarFiltrosReportes" class="btn btn-ghost btn-block">
              <RefreshCw :size="16" />
              Limpiar Filtros
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Tabla de Reportes -->
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <div v-if="isLoadingReportes" class="flex justify-center p-8">
          <span class="loading loading-spinner loading-lg"></span>
        </div>

        <div v-else-if="reportesFiltrados.length === 0" class="text-center p-8">
          <FileText :size="48" class="mx-auto text-base-content/30 mb-4" />
          <p class="text-base-content/60">No hay reportes disponibles</p>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="table table-zebra">
            <thead>
              <tr>
                <th>#</th>
                <th>Fecha</th>
                <th>Usuario</th>
                <th>Rol</th>
                <th>Juego</th>
                <th>Correo</th>
                <th>Plataforma</th>
                <th>Códigos Usados</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(reporte, index) in reportesFiltrados" :key="reporte.id">
                <td>{{ index + 1 }}</td>
                <td class="text-sm">{{ formatearFechaReporte(reporte.fechaGeneracion) }}</td>
                <td>
                  <div class="font-medium">{{ reporte.nombreUsuario }}</div>
                  <div class="text-xs opacity-60">{{ reporte.email }}</div>
                </td>
                <td>
                  <span :class="['badge badge-sm', reporte.rol === 'admin' ? 'badge-primary' : 'badge-secondary']">
                    {{ reporte.rol === 'admin' ? 'Admin' : 'Empleado' }}
                  </span>
                </td>
                <td>
                  <div class="font-medium">{{ reporte.juegoNombre }}</div>
                  <div class="text-xs opacity-60">{{ reporte.plataforma }}</div>
                </td>
                <td class="font-mono text-xs">{{ reporte.correoUtilizado }}</td>
                <td>
                  <span :class="['badge', reporte.plataformaMensaje === 'PS4' ? 'badge-info' : 'badge-secondary']">
                    {{ reporte.plataformaMensaje }}
                  </span>
                </td>
                <td>
                  <div class="flex flex-col gap-1">
                    <span class="badge badge-outline badge-sm">{{ reporte.codigosUsados.codigo1 }}</span>
                    <span class="badge badge-outline badge-sm">{{ reporte.codigosUsados.codigo2 }}</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="reportesFiltrados.length > 0" class="mt-4 text-sm text-base-content/60 text-center">
          Mostrando {{ reportesFiltrados.length }} reporte(s)
        </div>
      </div>
    </div>
  </div>
</template>

