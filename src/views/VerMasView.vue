<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGames } from '@/composables/useGames'
import { useCombos } from '@/composables/useCombos'
import type { GameSummary, GamePlatform } from '@/types/game'
import type { ComboSummary } from '@/types/combo'
import { Filter, SlidersHorizontal, ArrowUpDown, X } from 'lucide-vue-next'
import AppNavbar from '@/components/ui/AppNavbar.vue'
import AppFooter from '@/components/ui/AppFooter.vue'
import GameCard from '@/components/ui/GameCard.vue'
import Pagination from '@/components/ui/Pagination.vue'

const route = useRoute()
const router = useRouter()
const { games, cargarJuegos, isLoadingGames } = useGames()
const { combos, cargarCombos, isLoadingCombos } = useCombos()

// Filtros
const selectedTipo = ref<string>('todos')
const selectedPlataforma = ref<GamePlatform>('PS4 & PS5')
const selectedOrden = ref<string>('relevancia')
const precioMin = ref<number>(0)
const precioMax = ref<number>(100)
const searchQuery = ref<string>('')
const showFilters = ref(false)

// Paginación
const currentPage = ref(1)
const itemsPerPage = 12

// Tipos de contenido
type ContentItem = (GameSummary | ComboSummary) & { tipo: 'juego' | 'combo' }

// Cargar tipo desde query params
onMounted(async () => {
  const tipo = route.query.tipo as string
  const categoria = route.query.categoria as string
  const plataforma = route.query.plataforma as string
  const orden = route.query.orden as string
  const busqueda = route.query.q as string
  
  if (tipo) {
    selectedTipo.value = tipo
  }
  
  if (plataforma) {
    selectedPlataforma.value = plataforma as GamePlatform
  }
  
  if (orden) {
    selectedOrden.value = orden
  }
  
  if (busqueda) {
    searchQuery.value = busqueda
  }
  
  if (categoria) {
    // Puedes usar la categoría para mostrar un título específico
  }
  
  // Cargar datos
  await Promise.all([
    cargarJuegos('PS4 & PS5'),
    cargarCombos('PS4 & PS5', true)
  ])
})

// Filtrar juegos activos
const juegosActivos = computed(() => {
  return games.value.filter(juego => juego.activo !== false)
})

// Filtrar combos activos
const combosActivos = computed(() => {
  return combos.value.filter(combo => combo.activo !== false && (combo.totalCorreos ?? 0) > 0)
})

// Combinar juegos y combos según el tipo seleccionado
const todosLosItems = computed<ContentItem[]>(() => {
  let items: ContentItem[] = []
  
  if (selectedTipo.value === 'todos' || selectedTipo.value === 'juegos' || selectedTipo.value === 'ofertas' || selectedTipo.value === 'promociones') {
    items = [...items, ...juegosActivos.value.map(j => ({ ...j, tipo: 'juego' as const }))]
  }
  
  if (selectedTipo.value === 'todos' || selectedTipo.value === 'combos') {
    items = [...items, ...combosActivos.value.map(c => ({ ...c, tipo: 'combo' as const }))]
  }
  
  return items
})

// Aplicar filtros
const itemsFiltrados = computed(() => {
  let items = [...todosLosItems.value]
  
  // Filtrar por tipo específico
  if (selectedTipo.value === 'ofertas') {
    items = items.filter(item => {
      if ('tipoPromocion' in item) {
        return item.tipoPromocion === 'oferta' || item.isOffert
      }
      return false
    })
  } else if (selectedTipo.value === 'promociones') {
    items = items.filter(item => {
      if ('tipoPromocion' in item) {
        return item.tipoPromocion === 'promocion'
      }
      return false
    })
  }
  
  // Filtrar por plataforma
  if (selectedPlataforma.value !== 'PS4 & PS5') {
    items = items.filter(item => 
      item.version === selectedPlataforma.value || item.version === 'PS4 & PS5'
    )
  }
  
  // Filtrar por búsqueda
  if (searchQuery.value) {
    const termino = searchQuery.value.toLowerCase()
    items = items.filter(item => 
      item.nombre.toLowerCase().includes(termino)
    )
  }
  
  // Filtrar por precio
  items = items.filter(item => {
    let precio = 0
    if (item.tipo === 'juego' && 'precios' in item) {
      // Usar el precio más bajo disponible
      precio = Math.min(
        item.precios.ps4Principal,
        item.precios.ps4Secundaria,
        item.precios.ps5Principal,
        item.precios.ps5Secundaria
      )
    } else if (item.tipo === 'combo') {
      const combo = item as ComboSummary
      precio = (combo.precio || combo.costo) ?? 0
    }
    
    // Aplicar descuento si existe
    if ('descuento' in item && item.descuento && item.descuento > 0) {
      precio = precio * (1 - item.descuento / 100)
    }
    
    return precio >= precioMin.value && precio <= precioMax.value
  })
  
  return items
})

// Ordenar items
const itemsOrdenados = computed(() => {
  const items = [...itemsFiltrados.value]
  
  switch (selectedOrden.value) {
    case 'precio-asc':
      return items.sort((a, b) => {
        const precioA = getPrecioItem(a)
        const precioB = getPrecioItem(b)
        return precioA - precioB
      })
    case 'precio-desc':
      return items.sort((a, b) => {
        const precioA = getPrecioItem(a)
        const precioB = getPrecioItem(b)
        return precioB - precioA
      })
    case 'nombre-asc':
      return items.sort((a, b) => a.nombre.localeCompare(b.nombre))
    case 'nombre-desc':
      return items.sort((a, b) => b.nombre.localeCompare(a.nombre))
    default:
      // Relevancia: mostrar primero los que tienen promoción
      return items.sort((a, b) => {
        const aPromo = ('tipoPromocion' in a && (a.tipoPromocion === 'oferta' || a.tipoPromocion === 'promocion' || a.isOffert)) ? 1 : 0
        const bPromo = ('tipoPromocion' in b && (b.tipoPromocion === 'oferta' || b.tipoPromocion === 'promocion' || b.isOffert)) ? 1 : 0
        return bPromo - aPromo
      })
  }
})

// Paginación
const totalPages = computed(() => Math.ceil(itemsOrdenados.value.length / itemsPerPage))

const itemsPaginados = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  const end = start + itemsPerPage
  return itemsOrdenados.value.slice(start, end)
})

// Helpers
const getPrecioItem = (item: ContentItem): number => {
  let precio = 0
  if (item.tipo === 'juego' && 'precios' in item) {
    precio = Math.min(
      item.precios.ps4Principal,
      item.precios.ps4Secundaria,
      item.precios.ps5Principal,
      item.precios.ps5Secundaria
    )
  } else if (item.tipo === 'combo') {
    const combo = item as ComboSummary
    precio = (combo.precio || combo.costo) ?? 0
  }
  
  // Aplicar descuento si existe
  if ('descuento' in item && item.descuento && item.descuento > 0) {
    precio = precio * (1 - item.descuento / 100)
  }
  
  return precio
}

const getTituloSeccion = computed(() => {
  switch (selectedTipo.value) {
    case 'ofertas':
      return 'Todas las Ofertas'
    case 'promociones':
      return 'Todas las Promociones'
    case 'combos':
      return 'Todos los Combos'
    case 'juegos':
      return 'Todos los Juegos'
    default:
      return 'Todo el Catálogo'
  }
})

const limpiarFiltros = () => {
  selectedTipo.value = 'todos'
  selectedPlataforma.value = 'PS4 & PS5'
  selectedOrden.value = 'relevancia'
  precioMin.value = 0
  precioMax.value = 100
  searchQuery.value = ''
  currentPage.value = 1
}

const handleSearch = (query: string) => {
  searchQuery.value = query
  currentPage.value = 1
}

const handlePlatformChange = (platform: GamePlatform) => {
  selectedPlataforma.value = platform
  currentPage.value = 1
}

const handlePageChange = (page: number) => {
  currentPage.value = page
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const handleNext = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

const handlePrev = () => {
  if (currentPage.value > 1) {
    currentPage.value--
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

// Convertir item a GameSummary para GameCard
const itemToGame = (item: ContentItem): GameSummary => {
  if (item.tipo === 'juego') {
    return item as GameSummary
  } else {
    // Convertir combo a formato de juego
    const combo = item as ComboSummary
    const precioCombo = (combo.precio || combo.costo) ?? 0
    return {
      id: combo.id,
      nombre: combo.nombre,
      foto: combo.foto,
      version: combo.version,
      precios: {
        ps4Principal: precioCombo,
        ps4Secundaria: precioCombo,
        ps5Principal: precioCombo,
        ps5Secundaria: precioCombo
      },
      tipoPromocion: combo.tipoPromocion || 'ninguna',
      isOffert: combo.isOffert || false,
      descuento: combo.descuento || 0,
      stockAccounts: combo.stockAccounts || 0,
      totalCorreos: combo.totalCorreos,
      correos: combo.correos || [],
      costo: precioCombo,
      activo: combo.activo !== false
    }
  }
}

// Resetear página cuando cambian los filtros
watch([selectedTipo, selectedPlataforma, selectedOrden, precioMin, precioMax], () => {
  currentPage.value = 1
})
</script>

<template>
  <div class="min-h-screen bg-base-300">
    <!-- Navbar -->
    <AppNavbar 
      @search="handleSearch"
      @platform-change="handlePlatformChange"
    />

    <!-- Contenido Principal -->
    <div class="container mx-auto px-4 md:px-6 pt-28 pb-8">
      <div class="flex flex-col lg:grid lg:grid-cols-[320px_1fr] gap-6">
        <!-- Sidebar de filtros -->
        <aside 
          :class="[
            'bg-base-200 rounded-2xl border border-white/10 lg:w-80',
            'lg:sticky lg:top-28 lg:self-start lg:h-fit lg:max-h-[calc(100vh-8rem)] lg:z-40',
            showFilters ? 'block' : 'hidden lg:block'
          ]"
        >
          <!-- Título de la sección (fijo en el sidebar) -->
          <div class="p-6 pb-4 border-b border-white/10">
            <h1 class="text-3xl font-black text-white mb-2">
              {{ getTituloSeccion }}
            </h1>
            <p class="text-base-content/70 text-sm">
              {{ itemsOrdenados.length }} {{ itemsOrdenados.length === 1 ? 'resultado' : 'resultados' }}
            </p>
          </div>

          <!-- Área con scroll de filtros -->
          <div class="p-6 space-y-6 lg:max-h-[calc(100vh-20rem)] lg:overflow-y-auto custom-scrollbar">
            <div class="flex items-center justify-between">
              <h2 class="text-xl font-bold flex items-center gap-2">
                <SlidersHorizontal :size="20" />
                Filtros
              </h2>
              <button 
                @click="limpiarFiltros"
                class="btn btn-ghost btn-sm gap-2 text-error"
              >
                <X :size="16" />
                Limpiar
              </button>
            </div>

          <!-- Tipo de contenido -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-bold">Tipo de Contenido</span>
            </label>
            <select v-model="selectedTipo" class="select select-bordered w-full">
              <option value="todos">Todos</option>
              <option value="juegos">Solo Juegos</option>
              <option value="combos">Solo Combos</option>
              <option value="ofertas">Ofertas</option>
              <option value="promociones">Promociones</option>
            </select>
          </div>

          <!-- Plataforma -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-bold">Plataforma</span>
            </label>
            <select v-model="selectedPlataforma" class="select select-bordered w-full">
              <option value="PS4 & PS5">Todas</option>
              <option value="PS4">PS4</option>
              <option value="PS5">PS5</option>
            </select>
          </div>

          <!-- Ordenar por -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-bold flex items-center gap-2">
                <ArrowUpDown :size="16" />
                Ordenar Por
              </span>
            </label>
            <select v-model="selectedOrden" class="select select-bordered w-full">
              <option value="relevancia">Relevancia</option>
              <option value="precio-asc">Precio: Menor a Mayor</option>
              <option value="precio-desc">Precio: Mayor a Menor</option>
              <option value="nombre-asc">Nombre: A - Z</option>
              <option value="nombre-desc">Nombre: Z - A</option>
            </select>
          </div>

          <!-- Rango de precio -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-bold">Rango de Precio</span>
            </label>
            <div class="space-y-4">
              <div>
                <label class="label">
                  <span class="label-text-alt">Mínimo: ${{ precioMin }}</span>
                </label>
                <input 
                  v-model.number="precioMin" 
                  type="range" 
                  min="0" 
                  max="100" 
                  class="range range-error range-sm"
                />
              </div>
              <div>
                <label class="label">
                  <span class="label-text-alt">Máximo: ${{ precioMax }}</span>
                </label>
                <input 
                  v-model.number="precioMax" 
                  type="range" 
                  min="0" 
                  max="100" 
                  class="range range-error range-sm"
                />
              </div>
            </div>
          </div>

            <!-- Resumen de filtros activos -->
            <div class="bg-base-300 rounded-lg p-4 space-y-2">
              <h3 class="font-bold text-sm text-base-content/70">Filtros Activos:</h3>
              <div class="flex flex-wrap gap-2">
                <div v-if="selectedTipo !== 'todos'" class="badge badge-error gap-1">
                  {{ selectedTipo }}
                </div>
                <div v-if="selectedPlataforma !== 'PS4 & PS5'" class="badge badge-primary gap-1">
                  {{ selectedPlataforma }}
                </div>
                <div v-if="selectedOrden !== 'relevancia'" class="badge badge-success gap-1">
                  {{ selectedOrden }}
                </div>
                <div v-if="precioMin > 0 || precioMax < 100" class="badge badge-warning gap-1">
                  ${{ precioMin }} - ${{ precioMax }}
                </div>
              </div>
            </div>
          </div>
        </aside>

        <!-- Grid de resultados -->
        <div class="w-full">
          <!-- Header (solo móvil) -->
          <div class="lg:hidden flex flex-col gap-4 mb-8">
            <div>
              <h1 class="text-4xl md:text-5xl font-black text-white mb-2">
                {{ getTituloSeccion }}
              </h1>
              <p class="text-base-content/70 text-lg">
                {{ itemsOrdenados.length }} {{ itemsOrdenados.length === 1 ? 'resultado' : 'resultados' }} encontrados
              </p>
            </div>
            
            <!-- Botón toggle filtros (móvil) -->
            <button 
              @click="showFilters = !showFilters"
              class="btn btn-outline gap-2 w-full"
            >
              <Filter :size="20" />
              <span>{{ showFilters ? 'Ocultar' : 'Mostrar' }} Filtros</span>
            </button>
          </div>

          <!-- Loading -->
          <div v-if="isLoadingGames || isLoadingCombos" class="flex justify-center items-center py-20">
            <span class="loading loading-spinner loading-lg text-error"></span>
          </div>

          <!-- Sin resultados -->
          <div v-else-if="itemsPaginados.length === 0" class="text-center py-20">
            <div class="text-6xl mb-4">🔍</div>
            <h3 class="text-2xl font-bold mb-2">No se encontraron resultados</h3>
            <p class="text-base-content/60 mb-6">Intenta ajustar los filtros o busca algo diferente</p>
            <button @click="limpiarFiltros" class="btn btn-error">
              Limpiar Filtros
            </button>
          </div>

          <!-- Grid de juegos -->
          <div v-else>
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
              <GameCard
                v-for="item in itemsPaginados"
                :key="item.id"
                :game="itemToGame(item)"
                :show-add-to-cart="true"
              />
            </div>

            <!-- Paginación -->
            <Pagination
              v-if="totalPages > 1"
              :current-page="currentPage"
              :total-pages="totalPages"
              @page-change="handlePageChange"
              @next="handleNext"
              @prev="handlePrev"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="relative z-50">
      <AppFooter />
    </div>
  </div>
</template>

<style scoped>
.animate-fadeInUp {
  animation: fadeInUp 0.6s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Scrollbar personalizado para el sidebar */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(220, 38, 38, 0.5);
  border-radius: 10px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(220, 38, 38, 0.7);
}
</style>

