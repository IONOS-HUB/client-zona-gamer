<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useGames } from '@/composables/useGames'
import type { GamePlatform, GameSummary, TelefonoSearchResult } from '@/types/game'
import { BarChart3, TrendingUp, Package, Filter, Search, RefreshCw, ArrowRight, Phone } from 'lucide-vue-next'
import type { HistoryState } from 'vue-router'

interface Props {
  readOnly?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  readOnly: false
})

const router = useRouter()
const { games, cargarJuegos, buscarPorTelefono } = useGames()

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
  await cargarJuegos('PS4 & PS5')
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
        compareValue = a.costo - b.costo
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
  const costoPromedio = filtered.length > 0 
    ? filtered.reduce((sum, j) => sum + j.costo, 0) / filtered.length 
    : 0
  const costoMinimo = filtered.length > 0 
    ? Math.min(...filtered.map(j => j.costo)) 
    : 0
  const costoMaximo = filtered.length > 0 
    ? Math.max(...filtered.map(j => j.costo)) 
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
  // Navegamos a /games pasando el juego completo como state
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
      <button 
        @click="cargarDatos" 
        class="btn btn-circle btn-ghost"
      >
        <RefreshCw :size="20" />
      </button>
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

    <!-- Filtros Avanzados -->
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <div class="flex justify-between items-center mb-4">
          <h3 class="card-title text-xl flex items-center gap-2">
            <Filter :size="24" />
            Filtros y Búsqueda
          </h3>
          <button @click="limpiarFiltros" class="btn btn-sm btn-ghost gap-2">
            <RefreshCw :size="16" />
            Limpiar
          </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <!-- Búsqueda por Nombre -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-semibold">Buscar Juego</span>
            </label>
            <div class="relative">
              <input 
                v-model="searchTerm" 
                type="text" 
                placeholder="Nombre del juego..." 
                class="input input-bordered w-full pl-10"
                autocomplete="off"
                data-form-type="other"
                data-lpignore="true"
                data-1p-ignore="true"
              />
              <Search :size="20" class="absolute left-3 top-3 text-base-content/40" />
            </div>
          </div>

          <!-- Búsqueda por Teléfono -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-semibold">Buscar por Teléfono</span>
            </label>
            <div class="relative">
              <input 
                v-model="telefonoBusqueda" 
                type="text" 
                placeholder="+593 99 358 6097..." 
                class="input input-bordered w-full pl-10"
                @keyup.enter="buscarTelefono"
                autocomplete="off"
              />
              <Phone :size="20" class="absolute left-3 top-3 text-base-content/40" />
            </div>
            <button 
              v-if="telefonoBusqueda && telefonoBusqueda.trim().length >= 3"
              @click="buscarTelefono" 
              class="btn btn-sm btn-primary btn-block mt-2"
              :disabled="isLoadingTelefono"
            >
              {{ isLoadingTelefono ? 'Buscando...' : 'Buscar' }}
            </button>
          </div>

          <!-- Filtro Plataforma -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-semibold">Plataforma</span>
            </label>
            <select v-model="plataformaFiltro" class="select select-bordered">
              <option value="PS4 & PS5">Todas</option>
              <option value="PS4">PS4</option>
              <option value="PS5">PS5</option>
            </select>
          </div>

          <!-- Filtro Promoción -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-semibold">Promoción</span>
            </label>
            <select v-model="promoFiltro" class="select select-bordered">
              <option value="todas">Todas</option>
              <option value="oferta">En Oferta</option>
              <option value="promocion">En Promoción</option>
              <option value="ninguna">Sin Promoción</option>
            </select>
          </div>

          <!-- Ordenar Por -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-semibold">Ordenar Por</span>
            </label>
            <div class="join w-full">
              <select v-model="sortBy" class="select select-bordered join-item flex-1">
                <option value="nombre">Nombre (A-Z)</option>
                <option value="costo">Precio</option>
                <option value="correos">Cuentas</option>
                <option value="stock">Stock</option>
              </select>
              <button 
                @click="toggleSortOrder" 
                class="btn btn-square join-item"
                :class="sortOrder === 'asc' ? 'btn-primary' : 'btn-secondary'"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path 
                    v-if="sortOrder === 'asc'"
                    stroke-linecap="round" 
                    stroke-linejoin="round" 
                    stroke-width="2" 
                    d="M5 15l7-7 7 7" 
                  />
                  <path 
                    v-else
                    stroke-linecap="round" 
                    stroke-linejoin="round" 
                    stroke-width="2" 
                    d="M19 9l-7 7-7-7" 
                  />
                </svg>
              </button>
            </div>
          </div>

          <!-- Filtro Stock -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-semibold">Stock</span>
            </label>
            <select v-model="stockFiltro" class="select select-bordered">
              <option value="todas">Todos</option>
              <option value="con">Con stock</option>
              <option value="sin">Sin stock</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- Resultados de Búsqueda por Teléfono -->
    <div v-if="resultadosTelefono.length > 0" class="card bg-base-100 shadow-xl mb-6">
      <div class="card-body">
        <div class="flex justify-between items-center mb-4">
          <h3 class="card-title text-xl flex items-center gap-2">
            <Phone :size="24" />
            Resultados de Búsqueda por Teléfono ({{ resultadosTelefono.length }})
          </h3>
          <button @click="telefonoBusqueda = ''; resultadosTelefono = []" class="btn btn-sm btn-ghost">
            ✕ Cerrar
          </button>
        </div>
        <div class="space-y-3">
          <div v-for="(resultado, index) in resultadosTelefono" :key="index" class="card bg-base-200 shadow">
            <div class="card-body p-4">
              <div class="flex justify-between items-start">
                <div>
                  <h4 class="font-semibold">{{ resultado.cuenta.nombre }}</h4>
                  <p class="text-sm text-base-content/60">
                    <Phone :size="14" class="inline mr-1" />
                    {{ resultado.cuenta.telefono }}
                  </p>
                  <p class="text-xs mt-1">
                    <span class="badge badge-sm">{{ resultado.juego.nombre }}</span>
                    <span class="badge badge-sm badge-outline ml-1">{{ resultado.correo.correo }}</span>
                  </p>
                </div>
                <div class="badge badge-lg" :class="{
                  'badge-primary': resultado.cuenta.tipo.includes('Principal'),
                  'badge-secondary': resultado.cuenta.tipo.includes('Secundaria')
                }">
                  {{ resultado.cuenta.tipo }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tabla de Juegos Filtrados -->
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <div class="flex justify-between items-center mb-4">
          <h3 class="card-title text-xl">
            Juegos Filtrados ({{ juegosFiltrados.length }})
          </h3>
        </div>

        <div class="overflow-x-auto">
            <table class="table table-zebra">
            <thead>
              <tr>
                <th>Foto</th>
                <th>Nombre</th>
                <th>Versión</th>
                <th>Precio</th>
                <th>Cuentas</th>
                <th>Stock</th>
                <th>Promoción</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr 
                v-for="juego in juegosFiltrados" 
                :key="juego.id"
                class="hover:bg-base-200 cursor-pointer transition-colors"
                @click="verDetallesJuego(juego)"
              >
                <td>
                  <div class="avatar">
                    <div class="w-12 h-12 rounded">
                      <img 
                        v-if="juego.foto" 
                        :src="juego.foto" 
                        :alt="juego.nombre"
                        class="object-cover"
                      />
                      <div v-else class="w-full h-full bg-base-300 flex items-center justify-center">
                        <Package :size="20" class="text-base-content/40" />
                      </div>
                    </div>
                  </div>
                </td>
                <td class="font-semibold">{{ juego.nombre }}</td>
                <td>
                  <span 
                    class="badge badge-sm"
                    :class="{
                      'badge-primary': juego.version === 'PS4 & PS5',
                      'badge-info': juego.version === 'PS4',
                      'badge-secondary': juego.version === 'PS5'
                    }"
                  >
                    {{ juego.version }}
                  </span>
                </td>
                <td class="font-bold text-success">{{ formatearPrecio(juego.costo) }}</td>
                <td>
                  <span class="badge badge-ghost">{{ juego.totalCorreos }}</span>
                </td>
                <td>
                  <span 
                    class="badge"
                    :class="(juego.stockAccounts || 0) > 0 ? 'badge-primary' : 'badge-ghost'"
                  >
                    {{ juego.stockAccounts || 0 }}
                  </span>
                </td>
                <td>
                  <span 
                    v-if="juego.tipoPromocion === 'oferta' || juego.isOffert"
                    class="badge badge-error"
                  >
                    Oferta
                  </span>
                  <span 
                    v-else-if="juego.tipoPromocion === 'promocion'"
                    class="badge badge-warning"
                  >
                    Promoción
                  </span>
                  <span 
                    v-else
                    class="badge badge-ghost"
                  >
                    Normal
                  </span>
                </td>
                <td>
                  <button 
                    @click.stop="verDetallesJuego(juego)"
                    class="btn btn-sm btn-ghost gap-2 hover:btn-primary"
                  >
                    Ver detalles
                    <ArrowRight :size="16" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.radial-progress {
  font-weight: bold;
}
</style>

