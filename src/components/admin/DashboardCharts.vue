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
  totalJuegos: number
  totalCorreos: number
  juegosPS4: number
  juegosPS5: number
  juegosPS4PS5: number
  stockTotal: number
}

const props = defineProps<Props>()

// Distribución por plataforma
const plataformasData = computed(() => {
  return {
    labels: ['PS4 & PS5', 'Solo PS4', 'Solo PS5'],
    datasets: [{
      data: [props.juegosPS4PS5, props.juegosPS4, props.juegosPS5],
      backgroundColor: [
        'rgba(139, 92, 246, 0.7)',
        'rgba(59, 130, 246, 0.7)',
        'rgba(236, 72, 153, 0.7)'
      ],
      borderColor: [
        'rgba(139, 92, 246, 1)',
        'rgba(59, 130, 246, 1)',
        'rgba(236, 72, 153, 1)'
      ],
      borderWidth: 2
    }]
  }
})

// Datos de inventario
const inventarioData = computed(() => {
  return {
    labels: ['Total Juegos', 'Total Correos', 'Stock Disponible'],
    datasets: [{
      label: 'Inventario',
      data: [props.totalJuegos, props.totalCorreos, props.stockTotal],
      backgroundColor: [
        'rgba(34, 197, 94, 0.7)',
        'rgba(59, 130, 246, 0.7)',
        'rgba(251, 146, 60, 0.7)'
      ],
      borderColor: [
        'rgba(34, 197, 94, 1)',
        'rgba(59, 130, 246, 1)',
        'rgba(251, 146, 60, 1)'
      ],
      borderWidth: 2
    }]
  }
})

// Opciones de gráficos
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
    },
    tooltip: {
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      padding: 12,
      titleFont: {
        size: 14
      },
      bodyFont: {
        size: 13
      }
    }
  }
}

const barOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false
    },
    tooltip: {
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      padding: 12
    }
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        color: 'rgb(156, 163, 175)',
        font: {
          size: 11
        }
      },
      grid: {
        color: 'rgba(156, 163, 175, 0.1)'
      }
    },
    x: {
      ticks: {
        color: 'rgb(156, 163, 175)',
        font: {
          size: 11
        }
      },
      grid: {
        display: false
      }
    }
  }
}
</script>

<template>
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <!-- Gráfico de Distribución por Plataforma -->
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <h3 class="card-title text-base mb-4">
          <span class="text-2xl">🎮</span>
          Distribución por Plataforma
        </h3>
        <div class="h-64 flex items-center justify-center">
          <div class="w-64">
            <Doughnut 
              v-if="totalJuegos > 0"
              :data="plataformasData" 
              :options="doughnutOptions" 
            />
            <div v-else class="text-center text-base-content/50">
              No hay datos para mostrar
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Gráfico de Inventario -->
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <h3 class="card-title text-base mb-4">
          <span class="text-2xl">📊</span>
          Resumen de Inventario
        </h3>
        <div class="h-64">
          <Bar 
            v-if="totalJuegos > 0"
            :data="inventarioData" 
            :options="barOptions" 
          />
          <div v-else class="flex items-center justify-center h-full text-base-content/50">
            No hay datos para mostrar
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

