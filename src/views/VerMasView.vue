<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGames } from '@/composables/useGames'
import { useCombos } from '@/composables/useCombos'
import { useCurrency } from '@/composables/useCurrency'
import type { GameSummary, GamePlatform } from '@/types/game'
import type { ComboSummary } from '@/types/combo'
import { Filter, SlidersHorizontal, ArrowUpDown, X } from 'lucide-vue-next'
import AppNavbar from '@/components/ui/AppNavbar.vue'
import AppFooter from '@/components/ui/AppFooter.vue'
import GameCard from '@/components/ui/GameCard.vue'
import ComboCard from '@/components/ui/ComboCard.vue'
import ComboInfoModal from '@/components/ui/ComboInfoModal.vue'
import Pagination from '@/components/ui/Pagination.vue'

const route = useRoute()
const router = useRouter()
const { games, cargarJuegos, isLoadingGames } = useGames()
const { combos, cargarCombos, isLoadingCombos } = useCombos()
const { selectedCurrency, formatPrice, getLowestPrice } = useCurrency()

// Filtros
const selectedTipo = ref<string>('todos')
const selectedPlataforma = ref<GamePlatform>('PS4 & PS5')
const selectedOrden = ref<string>('relevancia')
const precioMin = ref<number>(0)
const precioMax = ref<number>(100)
const searchQuery = ref<string>('')
const showFilters = ref(false)

// Rangos de precio según la moneda
const rangoPrecios = computed(() => {
  if (selectedCurrency.value === 'COP') {
    return {
      min: 0,
      max: 10000000,      // 10 millones de pesos colombianos
      step: 10000,        // Incrementos de 10,000 para facilidad de uso
      defaultMax: 10000000
    }
  }
  return {
    min: 0,
    max: 100,
    step: 1,
    defaultMax: 100
  }
})

// Ajustar precioMax cuando cambia la moneda
watch(selectedCurrency, (newCurrency) => {
  if (newCurrency === 'COP') {
    // Cambiar a pesos colombianos
    precioMin.value = 0
    precioMax.value = 10000000  // 10 millones
  } else {
    // Cambiar a dólares
    precioMin.value = 0
    precioMax.value = 100
  }
})

// Paginación
const currentPage = ref(1)
const itemsPerPage = 12

// Tipos de contenido
type ContentItem = (GameSummary | ComboSummary) & { tipo: 'juego' | 'combo' }

// --- Filtros combinables en la URL (/ver-mas/ps4+ofertas) ---
const PLATAFORMA_SLUGS: Record<string, GamePlatform> = { ps4: 'PS4', ps5: 'PS5' }
const PLATAFORMA_SLUGS_REVERSE: Partial<Record<GamePlatform, string>> = { PS4: 'ps4', PS5: 'ps5' }
const TIPO_SLUGS = ['juegos', 'combos', 'ofertas', 'promociones']
const ORDEN_SLUGS = ['precio-asc', 'precio-desc', 'nombre-asc', 'nombre-desc']

const parseFiltrosSlug = (slug: string | undefined): { tipo?: string; plataforma?: GamePlatform; orden?: string } => {
  if (!slug) return {}
  const resultado: { tipo?: string; plataforma?: GamePlatform; orden?: string } = {}
  slug.split('+').forEach(token => {
    if (token in PLATAFORMA_SLUGS) {
      resultado.plataforma = PLATAFORMA_SLUGS[token]
    } else if (TIPO_SLUGS.includes(token)) {
      resultado.tipo = token
    } else if (ORDEN_SLUGS.includes(token)) {
      resultado.orden = token
    }
  })
  return resultado
}

const buildFiltrosSlug = (tipo: string, plataforma: GamePlatform, orden: string): string => {
  const partes: string[] = []
  const plataformaSlug = PLATAFORMA_SLUGS_REVERSE[plataforma]
  if (plataformaSlug) partes.push(plataformaSlug)
  if (tipo !== 'todos') partes.push(tipo)
  if (orden !== 'relevancia') partes.push(orden)
  return partes.join('+')
}

// Simple debounce para no reescribir la URL en cada tecla/tick del slider
const debounce = <T extends (...args: unknown[]) => void>(fn: T, delayMs: number): T => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined
  return ((...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delayMs)
  }) as T
}

// URL → filtros (carga inicial, back/forward del navegador, links compartidos)
const applyFiltersFromRoute = (): void => {
  const slug = route.params.filtros as string | undefined
  const parsed = parseFiltrosSlug(slug)

  selectedTipo.value = parsed.tipo ?? (route.query.tipo as string) ?? 'todos'
  selectedPlataforma.value = parsed.plataforma ?? (route.query.plataforma as GamePlatform) ?? 'PS4 & PS5'
  selectedOrden.value = parsed.orden ?? (route.query.orden as string) ?? 'relevancia'
  searchQuery.value = (route.query.q as string) ?? ''

  const min = route.query.min ? Number(route.query.min) : undefined
  const max = route.query.max ? Number(route.query.max) : undefined
  precioMin.value = min ?? rangoPrecios.value.min
  precioMax.value = max ?? rangoPrecios.value.defaultMax
}

// Filtros → URL (normaliza a la forma compartible con slug + query)
const syncRouteFromFilters = (): void => {
  const slug = buildFiltrosSlug(selectedTipo.value, selectedPlataforma.value, selectedOrden.value)
  const query: Record<string, string> = {}
  if (searchQuery.value) query.q = searchQuery.value
  if (precioMin.value > rangoPrecios.value.min) query.min = String(precioMin.value)
  if (precioMax.value < rangoPrecios.value.defaultMax) query.max = String(precioMax.value)

  const filtrosActuales = (route.params.filtros as string | undefined) ?? ''
  const queryActual = route.query
  const mismoSlug = filtrosActuales === slug
  const mismoQuery = (queryActual.q ?? '') === (query.q ?? '') &&
    (queryActual.min ?? '') === (query.min ?? '') &&
    (queryActual.max ?? '') === (query.max ?? '')

  if (mismoSlug && mismoQuery) return

  router.replace({
    name: 'VerMas',
    params: { filtros: slug || undefined },
    query
  }).catch(() => {})
}

// Parseo inicial (antes de registrar los watchers de filtros→URL, para no
// disparar una navegación redundante en el primer render)
applyFiltersFromRoute()

watch([selectedTipo, selectedPlataforma, selectedOrden], syncRouteFromFilters)
watch([searchQuery, precioMin, precioMax], debounce(syncRouteFromFilters, 400))
// Back/forward del navegador y navegaciones externas a esta misma ruta
watch(() => route.fullPath, applyFiltersFromRoute)

// Normaliza la URL inicial a la forma con slug (ej. links legacy con
// ?tipo=juegos pasan a /ver-mas/juegos); no-op si ya está en esa forma
syncRouteFromFilters()

onMounted(async () => {
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
  return combos.value.filter(combo => {
    // Filtrar por activo (por defecto true si no está definido)
    const estaActivo = combo.activo !== false
    
    // Validar que tiene los campos mínimos requeridos
    const tieneNombre = combo.nombre && combo.nombre.trim().length > 0
    const tienePrecio = combo.precio !== undefined || combo.costo !== undefined
    const tieneVersion = combo.version && combo.version.trim().length > 0
    
    return estaActivo && tieneNombre && tienePrecio && tieneVersion
  })
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
  
  // Filtrar por precio (según la moneda actual)
  items = items.filter(item => {
    let precio = 0
    if (item.tipo === 'juego' && 'precios' in item) {
      // Usar el precio más bajo según la moneda actual
      precio = getLowestPrice(item.precios)
    } else if (item.tipo === 'combo') {
      const combo = item as ComboSummary
      // Si tiene precios diferenciados, usar el más bajo según la moneda
      precio = combo.precios 
        ? getLowestPrice(combo.precios)
        : (combo.precio || combo.costo) ?? 0
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
    // Usar el precio más bajo según la moneda actual
    precio = getLowestPrice(item.precios)
  } else if (item.tipo === 'combo') {
    const combo = item as ComboSummary
    // Si tiene precios diferenciados, usar el más bajo según la moneda
    precio = combo.precios 
      ? getLowestPrice(combo.precios)
      : (combo.precio || combo.costo) ?? 0
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
  precioMax.value = rangoPrecios.value.defaultMax
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

// Convertir item a GameSummary para GameCard (solo para juegos)
const itemToGame = (item: ContentItem): GameSummary => {
  return item as GameSummary
}

// Modal de información del combo
const showComboInfoModal = ref(false)
const selectedCombo = ref<ComboSummary | null>(null)

const handleShowComboInfo = (combo: ComboSummary): void => {
  selectedCombo.value = combo
  showComboInfoModal.value = true
}

const handleCloseComboInfo = (): void => {
  showComboInfoModal.value = false
  selectedCombo.value = null
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
                  <span class="label-text-alt">Mínimo: {{ formatPrice(precioMin) }}</span>
                </label>
                <input 
                  v-model.number="precioMin" 
                  type="range" 
                  :min="rangoPrecios.min" 
                  :max="rangoPrecios.max" 
                  :step="rangoPrecios.step"
                  class="range range-error range-sm"
                />
              </div>
              <div>
                <label class="label">
                  <span class="label-text-alt">Máximo: {{ formatPrice(precioMax) }}</span>
                </label>
                <input 
                  v-model.number="precioMax" 
                  type="range" 
                  :min="rangoPrecios.min" 
                  :max="rangoPrecios.max"
                  :step="rangoPrecios.step"
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
                <div v-if="precioMin > rangoPrecios.min || precioMax < rangoPrecios.defaultMax" class="badge badge-warning gap-1">
                  {{ formatPrice(precioMin) }} - {{ formatPrice(precioMax) }}
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

          <!-- Grid de juegos y combos -->
          <div v-else>
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
              <template v-for="item in itemsPaginados" :key="item.id">
                <GameCard
                  v-if="item.tipo === 'juego'"
                  :game="itemToGame(item)"
                  :show-add-to-cart="true"
                />
                <ComboCard
                  v-else-if="item.tipo === 'combo'"
                  :combo="item as ComboSummary"
                  :show-add-to-cart="true"
                  @show-info="handleShowComboInfo"
                />
              </template>
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

    <!-- Modal de información del combo -->
    <ComboInfoModal
      :combo="selectedCombo"
      :show="showComboInfoModal"
      @close="handleCloseComboInfo"
    />
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

