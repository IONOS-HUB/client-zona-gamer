<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useGames } from '@/composables/useGames'
import { useCartStore } from '@/stores/cart'
import type { GamePlatform, GameSummary } from '@/types/game'
import { Flame, Gamepad2, Facebook, Instagram, Send } from 'lucide-vue-next'
import AppNavbar from '@/components/ui/AppNavbar.vue'
import GameCard from '@/components/ui/GameCard.vue'
import CartModal from '@/components/ui/CartModal.vue'
import FeaturesBanner from '@/components/sections/FeaturesBanner.vue'
import ReviewsSection from '@/components/sections/ReviewsSection.vue'
import FAQSection from '@/components/sections/FAQSection.vue'
import ComboSection from '@/components/sections/ComboSection.vue'
import ContactLocationSection from '@/components/sections/ContactLocationSection.vue'

const { games, isLoadingGames, cargarJuegos } = useGames()
const cartStore = useCartStore()


const plataformaSeleccionada = ref<GamePlatform>('PS4 & PS5')
const searchTerm = ref('')
const cartOpen = ref(false)

// Estados de paginación
const itemsPerPage = 12 // Juegos por página
const currentPageAll = ref(1) // Página actual para "Todos los Juegos"
const currentPagePS4 = ref(1) // Página actual para PS4
const currentPagePS5 = ref(1) // Página actual para PS5
const currentPageSearch = ref(1) // Página actual para búsqueda

// Estados de expansión de secciones
const showAllPS4 = ref(false) // Si mostrar todos los juegos PS4
const showAllPS5 = ref(false) // Si mostrar todos los juegos PS5

// Juegos destacados (con descuentos o marcados como destacados)
const juegosDestacados = computed(() => {
  return games.value.filter(juego => 
    juego.destacado || (juego.descuento && juego.descuento > 0)
  )
})

// Juegos filtrados por búsqueda
const juegosFiltrados = computed(() => {
  if (!searchTerm.value) return games.value
  
  const termino = searchTerm.value.toLowerCase()
  return games.value.filter(juego => 
    juego.nombre.toLowerCase().includes(termino)
  )
})

// Juegos paginados para búsqueda
const juegosFiltradosPaginados = computed(() => {
  const start = (currentPageSearch.value - 1) * itemsPerPage
  const end = start + itemsPerPage
  return juegosFiltrados.value.slice(start, end)
})

const totalPagesSearch = computed(() => {
  return Math.ceil(juegosFiltrados.value.length / itemsPerPage)
})

// Juegos paginados para "Todos los Juegos"
const juegosPaginados = computed(() => {
  const start = (currentPageAll.value - 1) * itemsPerPage
  const end = start + itemsPerPage
  return games.value.slice(start, end)
})

const totalPagesAll = computed(() => {
  return Math.ceil(games.value.length / itemsPerPage)
})

// Juegos PS4 paginados
const juegosPS4Paginados = computed(() => {
  const start = (currentPagePS4.value - 1) * itemsPerPage
  const end = start + itemsPerPage
  return juegosPS4.value.slice(start, end)
})

const totalPagesPS4 = computed(() => {
  return Math.ceil(juegosPS4.value.length / itemsPerPage)
})

// Juegos PS5 paginados
const juegosPS5Paginados = computed(() => {
  const start = (currentPagePS5.value - 1) * itemsPerPage
  const end = start + itemsPerPage
  return juegosPS5.value.slice(start, end)
})

const totalPagesPS5 = computed(() => {
  return Math.ceil(juegosPS5.value.length / itemsPerPage)
})

// Juegos por categorías
const juegosPS5 = computed(() => {
  return games.value.filter(juego => 
    juego.version === 'PS5' || juego.version === 'PS4 & PS5'
  )
})

const juegosPS4 = computed(() => {
  return games.value.filter(juego => 
    juego.version === 'PS4' || juego.version === 'PS4 & PS5'
  )
})

const handlePlataformaChange = async (platform: GamePlatform): Promise<void> => {
  plataformaSeleccionada.value = platform
  await cargarJuegos(platform)
}

const handleSearch = (query: string): void => {
  searchTerm.value = query
}

const handleOpenCart = (): void => {
  cartOpen.value = true
}

const handleCloseCart = (): void => {
  cartOpen.value = false
}

const handleCheckout = (): void => {
  if (cartStore.isEmpty) return
  
  // Generar mensaje para WhatsApp
  let mensaje = '¡Hola! Me gustaría realizar el siguiente pedido:%0A%0A'
  
  cartStore.items.forEach((item, index) => {
    mensaje += `${index + 1}. ${item.nombre}%0A`
    mensaje += `   Plataforma: ${item.version}%0A`
    mensaje += `   Cantidad: ${item.quantity}%0A`
    mensaje += `   Precio: $${item.costo.toFixed(2)} c/u%0A`
    mensaje += `   Subtotal: $${(item.costo * item.quantity).toFixed(2)}%0A%0A`
  })
  
  mensaje += `*TOTAL: $${cartStore.totalPrice.toFixed(2)}*%0A%0A`
  mensaje += 'Espero su confirmación. ¡Gracias!'
  
  // Número de WhatsApp (formato internacional sin +)
  const numeroWhatsApp = '593992249152'
  
  // Abrir WhatsApp en nueva pestaña
  const urlWhatsApp = `https://wa.me/${numeroWhatsApp}?text=${mensaje}`
  window.open(urlWhatsApp, '_blank')
  
  // Cerrar el modal del carrito
  handleCloseCart()
}

const handleViewAll = (): void => {
  // Scroll a la sección del catálogo completo
  const catalogoSection = document.getElementById('catalogo-completo')
  if (catalogoSection) {
    catalogoSection.scrollIntoView({ behavior: 'smooth' })
  }
}

// Funciones para manejar "Ver Más" de cada plataforma
const handleViewMorePS4 = (): void => {
  showAllPS4.value = true
  currentPagePS4.value = 1
  // Scroll suave a la sección PS4
  setTimeout(() => {
    const ps4Section = document.getElementById('seccion-ps4')
    if (ps4Section) {
      ps4Section.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, 100)
}

const handleViewMorePS5 = (): void => {
  showAllPS5.value = true
  currentPagePS5.value = 1
  // Scroll suave a la sección PS5
  setTimeout(() => {
    const ps5Section = document.getElementById('seccion-ps5')
    if (ps5Section) {
      ps5Section.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, 100)
}

// Funciones de paginación (sin scroll automático)
const goToPage = (page: number, type: 'all' | 'ps4' | 'ps5' | 'search'): void => {
  switch (type) {
    case 'all':
      currentPageAll.value = page
      break
    case 'ps4':
      currentPagePS4.value = page
      break
    case 'ps5':
      currentPagePS5.value = page
      break
    case 'search':
      currentPageSearch.value = page
      break
  }
}

const nextPage = (type: 'all' | 'ps4' | 'ps5' | 'search'): void => {
  switch (type) {
    case 'all':
      if (currentPageAll.value < totalPagesAll.value) {
        currentPageAll.value++
      }
      break
    case 'ps4':
      if (currentPagePS4.value < totalPagesPS4.value) {
        currentPagePS4.value++
      }
      break
    case 'ps5':
      if (currentPagePS5.value < totalPagesPS5.value) {
        currentPagePS5.value++
      }
      break
    case 'search':
      if (currentPageSearch.value < totalPagesSearch.value) {
        currentPageSearch.value++
      }
      break
  }
}

const prevPage = (type: 'all' | 'ps4' | 'ps5' | 'search'): void => {
  switch (type) {
    case 'all':
      if (currentPageAll.value > 1) {
        currentPageAll.value--
      }
      break
    case 'ps4':
      if (currentPagePS4.value > 1) {
        currentPagePS4.value--
      }
      break
    case 'ps5':
      if (currentPagePS5.value > 1) {
        currentPagePS5.value--
      }
      break
    case 'search':
      if (currentPageSearch.value > 1) {
        currentPageSearch.value--
      }
      break
  }
}

// Función para generar números de página a mostrar
const getPageNumbers = (current: number, total: number): number[] => {
  const pages: number[] = []
  const maxPages = 5 // Máximo de números de página a mostrar
  
  if (total <= maxPages) {
    for (let i = 1; i <= total; i++) {
      pages.push(i)
    }
  } else {
    if (current <= 3) {
      for (let i = 1; i <= 5; i++) {
        pages.push(i)
      }
    } else if (current >= total - 2) {
      for (let i = total - 4; i <= total; i++) {
        pages.push(i)
      }
    } else {
      for (let i = current - 2; i <= current + 2; i++) {
        pages.push(i)
      }
    }
  }
  
  return pages
}

// Resetear página de búsqueda cuando cambia el término
watch(searchTerm, () => {
  currentPageSearch.value = 1
})

onMounted(() => {
  // Cargar juegos desde Firebase
  cargarJuegos(plataformaSeleccionada.value)
})
</script>

<template>
  <div class="min-h-screen bg-gradient-to-b from-base-200 via-base-300 to-base-200">
    <!-- Navbar -->
    <AppNavbar 
      @open-cart="handleOpenCart" 
      @search="handleSearch"
      @platform-change="handlePlataformaChange"
    />

    <!-- Contenido Principal -->
    <div class="container mx-auto px-4 md:px-6 py-12 relative">
      <!-- Efectos de fondo decorativos -->
      <div class="absolute top-1/4 left-0 w-64 h-64 bg-error/5 rounded-full blur-3xl pointer-events-none"></div>
      <div class="absolute bottom-1/4 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>

      <!-- Loading mejorado -->
      <div v-if="isLoadingGames" class="flex justify-center items-center min-h-[400px]">
        <div class="text-center space-y-6 animate-fadeInUp">
          <div class="relative">
            <span class="loading loading-spinner loading-lg text-error"></span>
            <div class="absolute inset-0 loading loading-spinner loading-lg text-error opacity-50 scale-150"></div>
          </div>
          <div>
            <p class="text-2xl font-bold text-gradient-animated mb-2">Cargando juegos...</p>
            <p class="text-sm text-base-content/60">Preparando la mejor experiencia</p>
          </div>
        </div>
      </div>

      <template v-else>
        <!-- Sección de Ofertas/En Tendencias -->
        <div v-if="juegosDestacados.length > 0" class="mb-16 relative z-10">
          <!-- Header mejorado -->
          <div class="flex items-center gap-4 mb-8 animate-fadeInUp">
            <div class="relative">
              <Flame :size="48" class="text-error animate-float" :stroke-width="2" />
              <div class="absolute inset-0 blur-xl bg-error/30"></div>
            </div>
            <div class="flex-1">
              <h2 class="text-4xl font-black text-gradient-animated mb-1">En Tendencias</h2>
              <p class="text-base-content/70 text-lg">Los juegos más populares y vendidos ahora mismo</p>
            </div>
            <button class="btn btn-outline btn-error gap-2 hover:scale-105 transition-transform">
              Ver Todo
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
          </div>
          
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
            <GameCard
              v-for="game in juegosDestacados.slice(0, 12)"
              :key="game.id"
              :game="game"
            />
          </div>
        </div>

        <!-- Catálogo Completo (solo cuando hay búsqueda) -->
        <div v-if="searchTerm" id="catalogo-completo" class="relative z-10">
          <!-- No hay juegos -->
          <div v-if="juegosFiltrados.length === 0" class="text-center py-20 animate-fadeInUp">
            <div class="flex justify-center mb-6 relative">
              <Gamepad2 :size="120" class="text-error/20 animate-float" :stroke-width="1.5" />
              <div class="absolute inset-0 blur-2xl bg-error/10"></div>
            </div>
            <h2 class="text-3xl font-black text-gradient mb-3">No se encontraron juegos</h2>
            <p class="text-base-content/60 text-lg mb-6">Intenta con otra búsqueda o plataforma</p>
            <button class="btn btn-error gap-2 shadow-glow">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Restablecer Filtros
            </button>
          </div>

          <!-- Grid de Juegos -->
          <div v-else>
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4 mb-8">
              <GameCard
                v-for="juego in juegosFiltradosPaginados"
                :key="juego.id"
                :game="juego"
              />
            </div>
            
            <!-- Paginación para búsqueda -->
            <div v-if="totalPagesSearch > 1" class="flex justify-center items-center gap-2 mt-8">
              <button 
                @click="prevPage('search')"
                :disabled="currentPageSearch === 1"
                class="btn btn-sm btn-outline btn-error"
                :class="{ 'btn-disabled': currentPageSearch === 1 }"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              <div class="flex gap-1">
                <button
                  v-for="page in getPageNumbers(currentPageSearch, totalPagesSearch)"
                  :key="page"
                  @click="goToPage(page, 'search')"
                  class="btn btn-sm"
                  :class="page === currentPageSearch ? 'btn-error' : 'btn-outline btn-error'"
                >
                  {{ page }}
                </button>
              </div>
              
              <button 
                @click="nextPage('search')"
                :disabled="currentPageSearch === totalPagesSearch"
                class="btn btn-sm btn-outline btn-error"
                :class="{ 'btn-disabled': currentPageSearch === totalPagesSearch }"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
              
              <span class="text-sm text-base-content/60 ml-4">
                Página {{ currentPageSearch }} de {{ totalPagesSearch }}
              </span>
            </div>
          </div>
        </div>

        <!-- Secciones adicionales por plataforma -->
        <template v-if="!searchTerm">
          <!-- Sección de Combos -->
          <ComboSection />

          <!-- Banner de Características -->
          <FeaturesBanner />

          <!-- Header del catálogo -->
          <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 animate-fadeInUp">
            <div>
              <h2 class="text-4xl font-black text-gradient mb-2">Todos los Juegos</h2>
              <p class="text-base-content/60">Explora nuestro catálogo completo de {{ games.length }} juegos</p>
            </div>
            <div class="stats shadow-glow glass-effect border border-white/10">
              <div class="stat py-4 px-8">
                <div class="stat-title text-xs font-semibold">Total de Juegos</div>
                <div class="stat-value text-error text-3xl font-black">{{ games.length }}</div>
                <div class="stat-desc text-xs">Disponibles ahora</div>
              </div>
            </div>
          </div>

          <!-- Grid de Todos los Juegos -->
          <div id="catalogo-completo">
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4 mb-8">
              <GameCard
                v-for="juego in juegosPaginados"
                :key="juego.id"
                :game="juego"
              />
            </div>
            
            <!-- Paginación para Todos los Juegos -->
            <div v-if="totalPagesAll > 1" class="flex justify-center items-center gap-2 mb-16">
              <button 
                @click="prevPage('all')"
                :disabled="currentPageAll === 1"
                class="btn btn-sm btn-outline btn-error"
                :class="{ 'btn-disabled': currentPageAll === 1 }"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              <div class="flex gap-1">
                <button
                  v-for="page in getPageNumbers(currentPageAll, totalPagesAll)"
                  :key="page"
                  @click="goToPage(page, 'all')"
                  class="btn btn-sm"
                  :class="page === currentPageAll ? 'btn-error' : 'btn-outline btn-error'"
                >
                  {{ page }}
                </button>
              </div>
              
              <button 
                @click="nextPage('all')"
                :disabled="currentPageAll === totalPagesAll"
                class="btn btn-sm btn-outline btn-error"
                :class="{ 'btn-disabled': currentPageAll === totalPagesAll }"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
              
              <span class="text-sm text-base-content/60 ml-4">
                Página {{ currentPageAll }} de {{ totalPagesAll }}
              </span>
            </div>
          </div>

          <!-- Separador decorativo -->
          <div class="relative my-16 animate-fadeInUp">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t border-white/10"></div>
            </div>
            <div class="relative flex justify-center">
              <span class="px-6 py-2 bg-base-200 text-sm font-semibold glass-effect rounded-full border border-white/10">
                Por Plataforma
              </span>
            </div>
          </div>

          <!-- Juegos PS4 -->
          <div id="seccion-ps4" class="mb-16 animate-fadeInUp">
            <div class="flex items-center gap-4 mb-8">
              <div class="relative">
                <Gamepad2 :size="48" class="text-error animate-float" :stroke-width="2" />
                <div class="absolute inset-0 blur-xl bg-error/30"></div>
              </div>
              <div class="flex-1">
                <h2 class="text-4xl font-black text-gradient-animated mb-1">PlayStation 4</h2>
                <p class="text-base-content/70 text-lg">Títulos destacados para tu PS4</p>
              </div>
              <button 
                v-if="!showAllPS4"
                @click="handleViewMorePS4"
                class="btn btn-outline btn-error gap-2 hover:scale-105 transition-transform"
              >
                Ver Más
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            </div>
            <div v-if="juegosPS4.length > 0">
              <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4 mb-8">
                <GameCard
                  v-for="game in showAllPS4 ? juegosPS4Paginados : juegosPS4.slice(0, 6)"
                  :key="game.id"
                  :game="game"
                />
              </div>
              
              <!-- Paginación para PS4 (solo cuando está expandido) -->
              <div v-if="showAllPS4 && totalPagesPS4 > 1" class="flex justify-center items-center gap-2 mb-8">
                <button 
                  @click="prevPage('ps4')"
                  :disabled="currentPagePS4 === 1"
                  class="btn btn-sm btn-outline btn-error"
                  :class="{ 'btn-disabled': currentPagePS4 === 1 }"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                
                <div class="flex gap-1">
                  <button
                    v-for="page in getPageNumbers(currentPagePS4, totalPagesPS4)"
                    :key="page"
                    @click="goToPage(page, 'ps4')"
                    class="btn btn-sm"
                    :class="page === currentPagePS4 ? 'btn-error' : 'btn-outline btn-error'"
                  >
                    {{ page }}
                  </button>
                </div>
                
                <button 
                  @click="nextPage('ps4')"
                  :disabled="currentPagePS4 === totalPagesPS4"
                  class="btn btn-sm btn-outline btn-error"
                  :class="{ 'btn-disabled': currentPagePS4 === totalPagesPS4 }"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                
                <span class="text-sm text-base-content/60 ml-4">
                  Página {{ currentPagePS4 }} de {{ totalPagesPS4 }}
                </span>
              </div>
            </div>
            <div v-else class="text-center py-12">
              <p class="text-base-content/60">No hay juegos PS4 disponibles en este momento</p>
            </div>
          </div>

          <!-- Separador decorativo -->
          <div class="relative my-16 animate-fadeInUp">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t border-white/10"></div>
            </div>
          </div>

          <!-- Juegos PS5 -->
          <div id="seccion-ps5" class="mb-16 animate-fadeInUp">
            <div class="flex items-center gap-4 mb-8">
              <div class="relative">
                <Gamepad2 :size="48" class="text-error animate-float" :stroke-width="2" />
                <div class="absolute inset-0 blur-xl bg-error/30"></div>
              </div>
              <div class="flex-1">
                <h2 class="text-4xl font-black text-gradient-animated mb-1">PlayStation 5</h2>
                <p class="text-base-content/70 text-lg">Títulos destacados para tu PS5</p>
              </div>
              <button 
                v-if="!showAllPS5"
                @click="handleViewMorePS5"
                class="btn btn-outline btn-error gap-2 hover:scale-105 transition-transform"
              >
                Ver Más
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            </div>
            <div v-if="juegosPS5.length > 0">
              <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4 mb-8">
                <GameCard
                  v-for="game in showAllPS5 ? juegosPS5Paginados : juegosPS5.slice(0, 6)"
                  :key="game.id"
                  :game="game"
                />
              </div>
              
              <!-- Paginación para PS5 (solo cuando está expandido) -->
              <div v-if="showAllPS5 && totalPagesPS5 > 1" class="flex justify-center items-center gap-2 mb-8">
                <button 
                  @click="prevPage('ps5')"
                  :disabled="currentPagePS5 === 1"
                  class="btn btn-sm btn-outline btn-error"
                  :class="{ 'btn-disabled': currentPagePS5 === 1 }"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                
                <div class="flex gap-1">
                  <button
                    v-for="page in getPageNumbers(currentPagePS5, totalPagesPS5)"
                    :key="page"
                    @click="goToPage(page, 'ps5')"
                    class="btn btn-sm"
                    :class="page === currentPagePS5 ? 'btn-error' : 'btn-outline btn-error'"
                  >
                    {{ page }}
                  </button>
                </div>
                
                <button 
                  @click="nextPage('ps5')"
                  :disabled="currentPagePS5 === totalPagesPS5"
                  class="btn btn-sm btn-outline btn-error"
                  :class="{ 'btn-disabled': currentPagePS5 === totalPagesPS5 }"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                
                <span class="text-sm text-base-content/60 ml-4">
                  Página {{ currentPagePS5 }} de {{ totalPagesPS5 }}
                </span>
              </div>
            </div>
            <div v-else class="text-center py-12">
              <p class="text-base-content/60">No hay juegos PS5 disponibles en este momento</p>
            </div>
          </div>
        </template>
      </template>
    </div>

    <!-- Sección de Reseñas -->
    <ReviewsSection />

    <!-- Preguntas Frecuentes -->
    <FAQSection />

    <!-- Contacto y Ubicación -->
    <ContactLocationSection />

    <!-- Footer con background personalizado -->
    <footer class="relative bg-gradient-to-b from-base-300 to-base-200 text-base-content mt-20 overflow-hidden">
      <!-- Efectos decorativos -->
      <div class="absolute top-0 left-0 w-full h-1 bg-gradient-error"></div>
      <div class="absolute top-0 left-1/4 w-64 h-64 bg-error/5 rounded-full blur-3xl"></div>
      <div class="absolute bottom-0 right-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl"></div>
      
      <div class="container mx-auto px-10 py-16 relative z-10">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-12">
          <!-- Logo y descripción -->
          <div class="flex flex-col gap-4 animate-fadeInUp">
            <div class="relative group">
              <Gamepad2 :size="56" class="text-error group-hover:scale-110 transition-transform duration-300" :stroke-width="2" />
              <div class="absolute inset-0 blur-xl bg-error/30 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </div>
            <div>
              <p class="font-black text-2xl text-gradient mb-2">Zona Gamers</p>
              <p class="text-sm text-base-content/70">
                Tu tienda de juegos digitales de confianza en Ecuador
              </p>
            </div>
          </div>

          <!-- Información -->
          <div class="animate-fadeInUp delay-100">
            <h6 class="footer-title opacity-80 mb-4 font-bold text-lg">INFORMACIÓN</h6>
            <div class="flex flex-col gap-3">
              <a class="link link-hover text-sm hover:text-error hover:translate-x-2 transition-all duration-300">→ Sobre Nosotros</a>
              <a class="link link-hover text-sm hover:text-error hover:translate-x-2 transition-all duration-300">→ Cómo Comprar</a>
              <a class="link link-hover text-sm hover:text-error hover:translate-x-2 transition-all duration-300">→ Preguntas Frecuentes</a>
              <a class="link link-hover text-sm hover:text-error hover:translate-x-2 transition-all duration-300">→ Formas de Pago</a>
            </div>
          </div>

          <!-- Soporte -->
          <div class="animate-fadeInUp delay-200">
            <h6 class="footer-title opacity-80 mb-4 font-bold text-lg">SOPORTE</h6>
            <div class="flex flex-col gap-3">
              <a class="link link-hover text-sm hover:text-error hover:translate-x-2 transition-all duration-300">→ Contacto</a>
              <a class="link link-hover text-sm hover:text-error hover:translate-x-2 transition-all duration-300">→ Términos y Condiciones</a>
              <a class="link link-hover text-sm hover:text-error hover:translate-x-2 transition-all duration-300">→ Política de Privacidad</a>
              <a class="link link-hover text-sm hover:text-error hover:translate-x-2 transition-all duration-300">→ Garantías</a>
            </div>
          </div>

          <!-- Síguenos -->
          <div class="animate-fadeInUp delay-300">
            <h6 class="footer-title opacity-80 mb-4 font-bold text-lg">SÍGUENOS</h6>
            <div class="flex gap-4 mb-6">
              <a 
                href="#" 
                class="btn btn-circle btn-ghost hover:bg-error/20 hover:text-error hover:shadow-glow hover:scale-110 transition-all duration-300"
                aria-label="Facebook"
              >
                <Facebook :size="24" />
              </a>
              <a 
                href="#" 
                class="btn btn-circle btn-ghost hover:bg-error/20 hover:text-error hover:shadow-glow hover:scale-110 transition-all duration-300"
                aria-label="Instagram"
              >
                <Instagram :size="24" />
              </a>
              <a 
                href="#" 
                class="btn btn-circle btn-ghost hover:bg-error/20 hover:text-error hover:shadow-glow hover:scale-110 transition-all duration-300"
                aria-label="WhatsApp"
              >
                <Send :size="24" />
              </a>
            </div>
            <div class="glass-effect p-4 rounded-lg border border-white/10">
              <p class="text-xs text-base-content/70 mb-2 font-semibold">Atención al cliente 24/7</p>
              <p class="text-sm font-bold text-gradient-animated">WhatsApp: +593 99 999 9999</p>
            </div>
          </div>
        </div>
      </div>
    </footer>

    <!-- Copyright mejorado -->
    <div class="bg-base-100 text-base-content text-center py-6 border-t border-white/10">
      <p class="text-sm font-semibold">
        © 2024 <span class="text-gradient">Zona Gamers Ecuador</span> - Todos los derechos reservados
      </p>
      <p class="text-xs text-base-content/60 mt-2">
        Hecho con ❤️ para los gamers ecuatorianos
      </p>
    </div>

    <!-- Modal del Carrito -->
    <CartModal 
      :open="cartOpen" 
      @close="handleCloseCart"
      @checkout="handleCheckout"
    />
  </div>
</template>

