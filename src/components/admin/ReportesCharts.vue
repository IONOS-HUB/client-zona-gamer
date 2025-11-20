<script setup lang="ts">
import { computed } from 'vue'
import { Bar, Doughnut, Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'
import type { Reporte } from '@/types/reporte'

// Registrar componentes de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
)

interface Props {
  reportes: Reporte[]
}

const props = defineProps<Props>()

// Gráfico de mensajes por día
const mensajesPorDia = computed(() => {
  const conteo = new Map<string, number>()
  
  props.reportes.forEach(reporte => {
    const fecha = new Date(reporte.fechaGeneracion)
    const key = fecha.toLocaleDateString('es-ES')
    conteo.set(key, (conteo.get(key) || 0) + 1)
  })
  
  // Ordenar por fecha
  const sorted = Array.from(conteo.entries())
    .sort((a, b) => {
      const dateA = new Date(a[0].split('/').reverse().join('-'))
      const dateB = new Date(b[0].split('/').reverse().join('-'))
      return dateA.getTime() - dateB.getTime()
    })
  
  return {
    labels: sorted.map(([fecha]) => fecha),
    datasets: [{
      label: 'Mensajes Generados',
      data: sorted.map(([, cantidad]) => cantidad),
      backgroundColor: 'rgba(59, 130, 246, 0.5)',
      borderColor: 'rgba(59, 130, 246, 1)',
      borderWidth: 2,
      tension: 0.4
    }]
  }
})

// Gráfico PS4 vs PS5
const mensajesPorPlataforma = computed(() => {
  const ps4 = props.reportes.filter(r => r.plataformaMensaje === 'PS4').length
  const ps5 = props.reportes.filter(r => r.plataformaMensaje === 'PS5').length
  
  return {
    labels: ['PS4', 'PS5'],
    datasets: [{
      data: [ps4, ps5],
      backgroundColor: [
        'rgba(59, 130, 246, 0.7)',
        'rgba(139, 92, 246, 0.7)'
      ],
      borderColor: [
        'rgba(59, 130, 246, 1)',
        'rgba(139, 92, 246, 1)'
      ],
      borderWidth: 2
    }]
  }
})

// Gráfico Admin vs Empleado
const mensajesPorRol = computed(() => {
  const admin = props.reportes.filter(r => r.rol === 'admin').length
  const employee = props.reportes.filter(r => r.rol === 'employee').length
  
  return {
    labels: ['Administradores', 'Empleados'],
    datasets: [{
      data: [admin, employee],
      backgroundColor: [
        'rgba(34, 197, 94, 0.7)',
        'rgba(251, 146, 60, 0.7)'
      ],
      borderColor: [
        'rgba(34, 197, 94, 1)',
        'rgba(251, 146, 60, 1)'
      ],
      borderWidth: 2
    }]
  }
})

// Top 5 usuarios más activos
const topUsuarios = computed(() => {
  const conteo = new Map<string, { nombre: string; cantidad: number }>()
  
  props.reportes.forEach(reporte => {
    const key = reporte.uid
    const existing = conteo.get(key)
    if (existing) {
      existing.cantidad++
    } else {
      conteo.set(key, {
        nombre: reporte.nombreUsuario || reporte.email,
        cantidad: 1
      })
    }
  })
  
  const sorted = Array.from(conteo.values())
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, 5)
  
  return {
    labels: sorted.map(u => u.nombre),
    datasets: [{
      label: 'Mensajes Generados',
      data: sorted.map(u => u.cantidad),
      backgroundColor: [
        'rgba(59, 130, 246, 0.7)',
        'rgba(139, 92, 246, 0.7)',
        'rgba(236, 72, 153, 0.7)',
        'rgba(251, 146, 60, 0.7)',
        'rgba(34, 197, 94, 0.7)'
      ],
      borderColor: [
        'rgba(59, 130, 246, 1)',
        'rgba(139, 92, 246, 1)',
        'rgba(236, 72, 153, 1)',
        'rgba(251, 146, 60, 1)',
        'rgba(34, 197, 94, 1)'
      ],
      borderWidth: 2
    }]
  }
})

// Opciones comunes para los gráficos
const lineChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      labels: {
        color: 'rgb(156, 163, 175)'
      }
    },
    title: {
      display: false
    }
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        color: 'rgb(156, 163, 175)',
        stepSize: 1
      },
      grid: {
        color: 'rgba(156, 163, 175, 0.1)'
      }
    },
    x: {
      ticks: {
        color: 'rgb(156, 163, 175)'
      },
      grid: {
        color: 'rgba(156, 163, 175, 0.1)'
      }
    }
  }
}

const barChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false
    }
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        color: 'rgb(156, 163, 175)',
        stepSize: 1
      },
      grid: {
        color: 'rgba(156, 163, 175, 0.1)'
      }
    },
    x: {
      ticks: {
        color: 'rgb(156, 163, 175)'
      },
      grid: {
        color: 'rgba(156, 163, 175, 0.1)'
      }
    }
  }
}

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: {
        color: 'rgb(156, 163, 175)',
        padding: 15,
        font: {
          size: 12
        }
      }
    }
  }
}
</script>

<template>
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <!-- Gráfico de Línea: Mensajes por Día -->
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <h3 class="card-title text-lg mb-4">📈 Mensajes por Día</h3>
        <div class="h-64">
          <Line 
            v-if="mensajesPorDia.labels.length > 0"
            :data="mensajesPorDia" 
            :options="lineChartOptions" 
          />
          <div v-else class="flex items-center justify-center h-full text-base-content/50">
            No hay datos para mostrar
          </div>
        </div>
      </div>
    </div>

    <!-- Gráfico de Barras: Top Usuarios -->
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <h3 class="card-title text-lg mb-4">👥 Top 5 Usuarios Más Activos</h3>
        <div class="h-64">
          <Bar 
            v-if="topUsuarios.labels.length > 0"
            :data="topUsuarios" 
            :options="barChartOptions" 
          />
          <div v-else class="flex items-center justify-center h-full text-base-content/50">
            No hay datos para mostrar
          </div>
        </div>
      </div>
    </div>

    <!-- Gráfico Circular: PS4 vs PS5 -->
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <h3 class="card-title text-lg mb-4">🎮 Distribución por Plataforma</h3>
        <div class="h-64 flex items-center justify-center">
          <div class="w-48">
            <Doughnut 
              v-if="mensajesPorPlataforma.datasets[0]?.data?.some(d => d > 0)"
              :data="mensajesPorPlataforma" 
              :options="doughnutOptions" 
            />
            <div v-else class="text-center text-base-content/50">
              No hay datos para mostrar
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Gráfico Circular: Admin vs Empleado -->
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <h3 class="card-title text-lg mb-4">👤 Distribución por Rol</h3>
        <div class="h-64 flex items-center justify-center">
          <div class="w-48">
            <Doughnut 
              v-if="mensajesPorRol.datasets[0]?.data?.some(d => d > 0)"
              :data="mensajesPorRol" 
              :options="doughnutOptions" 
            />
            <div v-else class="text-center text-base-content/50">
              No hay datos para mostrar
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

