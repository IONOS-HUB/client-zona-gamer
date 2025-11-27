<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useGames } from '@/composables/useGames'
import type { GamePlatform, GameSummary, TelefonoSearchResult } from '@/types/game'
import { BarChart3, TrendingUp, Package, Filter, Search, RefreshCw, ArrowRight, Phone } from 'lucide-vue-next'
import type { HistoryState } from 'vue-router'
import DashboardCharts from './DashboardCharts.vue'

interface Props {
  readOnly?: boolean
  onGameClick?: (juego: GameSummary) => void
}

const props = withDefaults(defineProps<Props>(), {
  readOnly: false,
  onGameClick: undefined
})

const emit = defineEmits<{
  gameClick: [juego: GameSummary]
}>()

const router = useRouter()
const { games, cargarJuegos, sincronizarJuegos, buscarPorTelefono, isSyncingGames } = useGames()

// Estados de filtros
const plataformaFiltro = ref<GamePlatform>('PS4 & PS5')
const searchTerm = ref('')
const promoFiltro = ref<'todas' | 'oferta' | 'promocion' | 'ninguna'>('todas')
const stockFiltro = ref<'todas' | 'con' | 'sin'>('todas')
const sortBy = ref<'nombre' | 'costo' | 'correos' | 'stock'>('nombre')
const sortOrder = ref<'asc' | 'desc'>('asc')
const telefonoBusqueda = ref('')
const resultadosTelefono = ref<any[]>([])
const isLoadingTelefono = ref(false)

// Cargar juegos
const cargarDatos = async () => {
  await cargarJuegos('PS4 & PS5', false) // Usar cache si está disponible
}

const handleSincronizar = async (): Promise<void> => {
  try {
    await sincronizarJuegos(plataformaFiltro.value)
  } catch (error) {
    console.error('Error sincronizando:', error)
  }
}

onMounted(() => {
  cargarDatos()
})

// Filtrar juegos según criterios
const juegosFiltrados = computed(() => {
  let resultado = games.value

  // Filtro por plataforma
  if (plataformaFiltro.value !== 'PS4 & PS5') {
    resultado = resultado.filter(
      juego => juego.version === plataformaFiltro.value || juego.version === 'PS4 & PS5'
    )
  }

  // Filtro por búsqueda
  if (searchTerm.value) {
    const search = searchTerm.value.toLowerCase()
    resultado = resultado.filter(juego =>
      juego.nombre.toLowerCase().includes(search) ||
      juego.id.toLowerCase().includes(search)
    )
  }

  // Filtro por promoción
  if (promoFiltro.value !== 'todas') {
    resultado = resultado.filter(juego => {
      if (promoFiltro.value === 'oferta') {
        return juego.tipoPromocion === 'oferta' || juego.isOffert
      } else if (promoFiltro.value === 'promocion') {
        return juego.tipoPromocion === 'promocion'
      } else if (promoFiltro.value === 'ninguna') {
        return juego.tipoPromocion === 'ninguna' || (!juego.tipoPromocion && !juego.isOffert)
      }
      return true
    })
  }

  // Filtro por stock
  if (stockFiltro.value !== 'todas') {
    resultado = resultado.filter(juego => {
      const stock = juego.stockAccounts ?? 0
      if (stockFiltro.value === 'con') {
        return stock > 0
      }
      if (stockFiltro.value === 'sin') {
        return stock === 0
      }
      return true
    })
  }

  // Ordenamiento
  resultado = [...resultado].sort((a, b) => {
    let compareValue = 0
    
    switch (sortBy.value) {
      case 'nombre':
        compareValue = a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })
        break
      case 'costo':
        const precioMinA = Math.min(a.precios.ps4Principal, a.precios.ps4Secundaria, a.precios.ps5Principal, a.precios.ps5Secundaria)
        const precioMinB = Math.min(b.precios.ps4Principal, b.precios.ps4Secundaria, b.precios.ps5Principal, b.precios.ps5Secundaria)
        compareValue = precioMinA - precioMinB
        break
      case 'correos':
        compareValue = a.totalCorreos - b.totalCorreos
        break
      case 'stock':
        compareValue = (a.stockAccounts || 0) - (b.stockAccounts || 0)
        break
    }

    return sortOrder.value === 'asc' ? compareValue : -compareValue
  })

  return resultado
})

// Estadísticas generales
const estadisticas = computed(() => {
  const filtered = juegosFiltrados.value
  
  const totalJuegos = filtered.length
  const juegosPS4 = filtered.filter(j => j.version === 'PS4' || j.version === 'PS4 & PS5').length
  const juegosPS5 = filtered.filter(j => j.version === 'PS5' || j.version === 'PS4 & PS5').length
  const juegosEnOferta = filtered.filter(j => j.tipoPromocion === 'oferta' || j.isOffert).length
  const juegosEnPromocion = filtered.filter(j => j.tipoPromocion === 'promocion').length
  const totalCorreos = filtered.reduce((sum, j) => sum + j.totalCorreos, 0)
  const totalStock = filtered.reduce((sum, j) => sum + (j.stockAccounts || 0), 0)
  const getPrecioMinimo = (j: GameSummary): number => {
    return Math.min(j.precios.ps4Principal, j.precios.ps4Secundaria, j.precios.ps5Principal, j.precios.ps5Secundaria)
  }
  
  const costoPromedio = filtered.length > 0 
    ? filtered.reduce((sum, j) => sum + getPrecioMinimo(j), 0) / filtered.length 
    : 0
  const costoMinimo = filtered.length > 0 
    ? Math.min(...filtered.map(j => getPrecioMinimo(j))) 
    : 0
  const costoMaximo = filtered.length > 0 
    ? Math.max(...filtered.map(j => getPrecioMinimo(j))) 
    : 0

  return {
    totalJuegos,
    juegosPS4,
    juegosPS5,
    juegosEnOferta,
    juegosEnPromocion,
    totalCorreos,
    totalStock,
    costoPromedio,
    costoMinimo,
    costoMaximo
  }
})

const limpiarFiltros = (): void => {
  plataformaFiltro.value = 'PS4 & PS5'
  searchTerm.value = ''
  promoFiltro.value = 'todas'
  stockFiltro.value = 'todas'
  sortBy.value = 'nombre'
  sortOrder.value = 'asc'
  telefonoBusqueda.value = ''
  resultadosTelefono.value = []
}

const buscarTelefono = async (): Promise<void> => {
  if (!telefonoBusqueda.value || telefonoBusqueda.value.trim().length < 3) {
    resultadosTelefono.value = []
    return
  }

  isLoadingTelefono.value = true
  try {
    resultadosTelefono.value = await buscarPorTelefono(telefonoBusqueda.value.trim(), plataformaFiltro.value)
  } catch (error) {
    console.error('Error buscando teléfono:', error)
  } finally {
    isLoadingTelefono.value = false
  }
}

const formatearPrecio = (precio: number): string => {
  return new Intl.NumberFormat('es-EC', {
    style: 'currency',
    currency: 'USD'
  }).format(precio)
}

const formatearFecha = (fecha: Date | string): string => {
  const date = typeof fecha === 'string' ? new Date(fecha) : fecha
  return new Intl.DateTimeFormat('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).format(date)
}

const toggleSortOrder = (): void => {
  sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
}

const verDetallesJuego = (juego: GameSummary): void => {
  // Si hay un callback personalizado, usarlo (para AdminDashboard)
  if (props.onGameClick) {
    props.onGameClick(juego)
    return
  }
  
  // Si hay un listener de evento, emitirlo
  emit('gameClick', juego)
  
  // Si no hay callback ni listener, navegar a /games (comportamiento por defecto)
  // Solo navegar si no se pasó ningún callback ni se emitió evento
  router.push({
    path: '/games',
    state: {
      openGame: juego as unknown as HistoryState
    }
  })
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header con Botón de Recarga -->
    <div class="flex justify-between items-center">
      <div>
        <h2 class="text-3xl font-bold flex items-center gap-3">
          <BarChart3 :size="32" class="text-primary" />
          Estadísticas del Catálogo
        </h2>
        <p class="text-base-content/60 mt-1">
          {{ readOnly ? 'Vista de solo lectura' : 'Vista completa con filtros avanzados' }}
        </p>
      </div>
      <div class="flex gap-2">
        <button 
          @click="cargarDatos" 
          class="btn btn-circle btn-ghost"
          title="Recargar desde cache"
        >
          <RefreshCw :size="20" />
        </button>
        <button 
          @click="handleSincronizar" 
          class="btn btn-outline btn-primary gap-2"
          :disabled="isSyncingGames"
          title="Sincronizar con la base de datos"
        >
          <RefreshCw :size="18" :class="{ 'animate-spin': isSyncingGames }" />
          {{ isSyncingGames ? 'Sincronizando...' : 'Sincronizar' }}
        </button>
      </div>
    </div>

    <!-- Cards de Estadísticas Principales -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      <!-- Total de Juegos -->
      <div class="stat bg-linear-to-br from-primary/20 to-primary/5 rounded-2xl border border-primary/20 shadow-lg">
        <div class="stat-figure text-primary">
          <Package :size="32" />
        </div>
        <div class="stat-title text-base-content/70">Total de Juegos</div>
        <div class="stat-value text-primary">{{ estadisticas.totalJuegos }}</div>
        <div class="stat-desc text-base-content/60">En el catálogo actual</div>
      </div>

      <!-- Juegos en Oferta -->
      <div class="stat bg-linear-gradient-to-br from-error/20 to-error/5 rounded-2xl border border-error/20 shadow-lg">
        <div class="stat-figure text-error">
          <TrendingUp :size="32" />
        </div>
        <div class="stat-title text-base-content/70">En Oferta</div>
        <div class="stat-value text-error">{{ estadisticas.juegosEnOferta }}</div>
        <div class="stat-desc text-base-content/60">
          {{ estadisticas.juegosEnPromocion }} en promoción
        </div>
      </div>

      <!-- Costo Promedio -->
      <div class="stat bg-linear-gradient-to-br from-success/20 to-success/5 rounded-2xl border border-success/20 shadow-lg">
        <div class="stat-figure text-success">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div class="stat-title text-base-content/70">Precio Promedio</div>
        <div class="stat-value text-success text-2xl">{{ formatearPrecio(estadisticas.costoPromedio) }}</div>
        <div class="stat-desc text-base-content/60">
          Min: {{ formatearPrecio(estadisticas.costoMinimo) }} | Max: {{ formatearPrecio(estadisticas.costoMaximo) }}
        </div>
      </div>

      <!-- Total de Cuentas -->
      <div class="stat bg-linear-gradient-to-br from-warning/20 to-warning/5 rounded-2xl border border-warning/20 shadow-lg">
        <div class="stat-figure text-warning">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <div class="stat-title text-base-content/70">Total de Cuentas</div>
        <div class="stat-value text-warning">{{ estadisticas.totalCorreos }}</div>
        <div class="stat-desc text-base-content/60">Correos disponibles</div>
      </div>

      <!-- Cuentas con Stock -->
      <div class="stat bg-linear-to-br from-info/20 to-info/5 rounded-2xl border border-info/20 shadow-lg">
        <div class="stat-figure text-info">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v2a2 2 0 002 2h2a2 2 0 002-2v-2m-6 0H5a2 2 0 01-2-2V7a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-4m-6 0h6" />
          </svg>
        </div>
        <div class="stat-title text-base-content/70">Cuentas con Stock</div>
        <div class="stat-value text-info">{{ estadisticas.totalStock }}</div>
        <div class="stat-desc text-base-content/60">Marcadas como disponibles</div>
      </div>
    </div>

    <!-- Estadísticas por Plataforma -->
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <h3 class="card-title text-xl mb-4">Distribución por Plataforma</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- PS4 -->
          <div class="flex items-center justify-between p-4 bg-linear-to-r from-blue-500/10 to-transparent rounded-lg">
            <div>
              <p class="text-sm text-base-content/60">PlayStation 4</p>
              <p class="text-3xl font-bold text-blue-500">{{ estadisticas.juegosPS4 }}</p>
            </div>
            <div class="radial-progress text-blue-500" 
              :style="`--value:${estadisticas.totalJuegos > 0 ? (estadisticas.juegosPS4 / estadisticas.totalJuegos * 100) : 0}; --size:5rem; --thickness: 0.5rem;`">
              {{ estadisticas.totalJuegos > 0 ? Math.round(estadisticas.juegosPS4 / estadisticas.totalJuegos * 100) : 0 }}%
            </div>
          </div>

          <!-- PS5 -->
          <div class="flex items-center justify-between p-4 bg-linear-to-r from-purple-500/10 to-transparent rounded-lg">
            <div>
              <p class="text-sm text-base-content/60">PlayStation 5</p>
              <p class="text-3xl font-bold text-purple-500">{{ estadisticas.juegosPS5 }}</p>
            </div>
            <div class="radial-progress text-purple-500" 
              :style="`--value:${estadisticas.totalJuegos > 0 ? (estadisticas.juegosPS5 / estadisticas.totalJuegos * 100) : 0}; --size:5rem; --thickness: 0.5rem;`">
              {{ estadisticas.totalJuegos > 0 ? Math.round(estadisticas.juegosPS5 / estadisticas.totalJuegos * 100) : 0 }}%
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Gráficos Visuales -->
    <DashboardCharts 
      :totalJuegos="estadisticas.totalJuegos"
      :totalCorreos="estadisticas.totalCorreos"
      :juegosPS4="estadisticas.juegosPS4"
      :juegosPS5="estadisticas.juegosPS5"
      :juegosPS4PS5="games.filter(j => j.version === 'PS4 & PS5').length"
      :stockTotal="estadisticas.totalStock"
    />

  </div>
</template>

<style scoped>
.radial-progress {
  font-weight: bold;
}
</style>

