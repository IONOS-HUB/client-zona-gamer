<script setup lang="ts">
import { ref, onMounted, computed, watch, onBeforeUnmount } from 'vue'
import { useGames } from '@/composables/useGames'
import { useCombos } from '@/composables/useCombos'
import { useCartStore } from '@/stores/cart'
import { generarStructuredData, eliminarStructuredData } from '@/composables/useSEO'
import type { GamePlatform } from '@/types/game'
import AppNavbar from '@/components/ui/AppNavbar.vue'
import CartModal from '@/components/ui/CartModal.vue'
import OffersSection from '@/components/sections/OffersSection.vue'
import PromotionsSection from '@/components/sections/PromotionsSection.vue'
import TrendingGamesSection from '@/components/sections/TrendingGamesSection.vue'
import SearchResultsSection from '@/components/sections/SearchResultsSection.vue'
import AllGamesSection from '@/components/sections/AllGamesSection.vue'
import PlatformGamesSection from '@/components/sections/PlatformGamesSection.vue'
import ComboSection from '@/components/sections/ComboSection.vue'
import FeaturesBanner from '@/components/sections/FeaturesBanner.vue'
import ReviewsSection from '@/components/sections/ReviewsSection.vue'
import FAQSection from '@/components/sections/FAQSection.vue'
import ContactLocationSection from '@/components/sections/ContactLocationSection.vue'
import AppFooter from '@/components/ui/AppFooter.vue'

const { games, isLoadingGames, cargarJuegos } = useGames()
const { combos, isLoadingCombos, cargarCombos } = useCombos()
const cartStore = useCartStore()

const plataformaSeleccionada = ref<GamePlatform>('PS4 & PS5')
const filtroPlataforma = ref<GamePlatform>('PS4 & PS5') // Filtro visual en el navbar
const searchTerm = ref('')
const cartOpen = ref(false)

// Estados de paginación
const itemsPerPage = 12
const currentPageAll = ref(1)
const currentPageSearch = ref(1)

// Juegos en OFERTA (para sección superior destacada)
const juegosEnOferta = computed(() => {
  return juegosFiltradosPorPlataforma.value.filter(juego => 
    juego.tipoPromocion === 'oferta' || juego.isOffert
  )
})

// Juegos en PROMOCIÓN (destacados especiales)
const juegosEnPromocion = computed(() => {
  return juegosFiltradosPorPlataforma.value.filter(juego => 
    juego.tipoPromocion === 'promocion'
  )
})

// Juegos destacados (legacy - con descuentos o marcados como destacados)
const juegosDestacados = computed(() => {
  return juegosFiltradosPorPlataforma.value.filter(juego => 
    juego.destacado || (juego.descuento && juego.descuento > 0)
  )
})

// Todas las ofertas y promociones combinadas (para sección inferior)
const todasLasOfertas = computed(() => {
  return juegosFiltradosPorPlataforma.value.filter(juego => 
    juego.tipoPromocion === 'oferta' || 
    juego.tipoPromocion === 'promocion' ||
    juego.isOffert
  )
})

// Juegos filtrados por búsqueda
const juegosFiltrados = computed(() => {
  if (!searchTerm.value) return juegosFiltradosPorPlataforma.value
  
  const termino = searchTerm.value.toLowerCase()
  return juegosFiltradosPorPlataforma.value.filter(juego => 
    juego.nombre.toLowerCase().includes(termino)
  )
})

// Juegos filtrados por plataforma seleccionada
const juegosFiltradosPorPlataforma = computed(() => {
  // Primero filtrar solo juegos activos
  const juegosActivos = games.value.filter(juego => juego.activo !== false)
  
  // Si es "PS4 & PS5", mostrar todos los activos
  if (filtroPlataforma.value === 'PS4 & PS5') {
    return juegosActivos
  }
  
  // Filtrar por la plataforma específica
  return juegosActivos.filter(juego => 
    juego.version === filtroPlataforma.value || juego.version === 'PS4 & PS5'
  )
})

// Juegos por categorías (siempre desde la base completa de juegos)
const juegosPS5 = computed(() => {
  return juegosFiltradosPorPlataforma.value.filter(juego => 
    juego.version === 'PS5' || juego.version === 'PS4 & PS5'
  )
})

const juegosPS4 = computed(() => {
  return juegosFiltradosPorPlataforma.value.filter(juego => 
    juego.version === 'PS4' || juego.version === 'PS4 & PS5'
  )
})

const handlePlataformaChange = async (platform: GamePlatform): Promise<void> => {
  // Actualizar el filtro visual
  filtroPlataforma.value = platform
  
  // Siempre cargar desde PS4 & PS5 (donde están todos los juegos)
  // y filtrar por el campo version del juego
  if (plataformaSeleccionada.value !== 'PS4 & PS5') {
    plataformaSeleccionada.value = 'PS4 & PS5'
    await cargarJuegos('PS4 & PS5')
  }
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
    const precioUnitario = cartStore.getItemPrice(item)
    mensaje += `${index + 1}. ${item.nombre}%0A`
    mensaje += `   Plataforma: ${item.version}%0A`
    mensaje += `   Tipo de cuenta: ${item.selectedAccountType}%0A`
    mensaje += `   Cantidad: ${item.quantity}%0A`
    mensaje += `   Precio: $${precioUnitario.toFixed(2)} c/u%0A`
    mensaje += `   Subtotal: $${(precioUnitario * item.quantity).toFixed(2)}%0A%0A`
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

// Manejadores de paginación para "Todos los Juegos"
const handleAllGamesPageChange = (page: number): void => {
  currentPageAll.value = page
}

const handleAllGamesNext = (): void => {
  currentPageAll.value++
}

const handleAllGamesPrev = (): void => {
  currentPageAll.value--
}

// Manejadores de paginación para búsqueda
const handleSearchPageChange = (page: number): void => {
  currentPageSearch.value = page
}

const handleSearchNext = (): void => {
  currentPageSearch.value++
}

const handleSearchPrev = (): void => {
  currentPageSearch.value--
}

// Manejadores para "Ver Más" de cada plataforma
const handleViewMorePS4 = (): void => {
  setTimeout(() => {
    const ps4Section = document.getElementById('seccion-ps4')
    if (ps4Section) {
      ps4Section.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, 100)
}

const handleViewMorePS5 = (): void => {
  setTimeout(() => {
    const ps5Section = document.getElementById('seccion-ps5')
    if (ps5Section) {
      ps5Section.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, 100)
}

// Resetear página de búsqueda cuando cambia el término
watch(searchTerm, () => {
  currentPageSearch.value = 1
})

onMounted(async () => {
  // Siempre cargar desde PS4 & PS5
  try {
    await Promise.all([
      cargarJuegos('PS4 & PS5'),
      cargarCombos('PS4 & PS5', true) // Forzar refresh para asegurar que se carguen
    ])
    console.log('✅ Juegos y combos cargados en HomeView')
  } catch (error) {
    console.error('❌ Error cargando juegos/combos en HomeView:', error)
  }
  
  // Agregar structured data para la página de inicio
  generarStructuredData('BreadcrumbList', {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [{
      "@type": "ListItem",
      "position": 1,
      "name": "Inicio",
      "item": "https://zonagamer.com/"
    }]
  })
})

onBeforeUnmount(() => {
  // Limpiar structured data al salir
  eliminarStructuredData('BreadcrumbList')
})
</script>

<template>
  <div class="min-h-screen bg-linear-gradient(to bottom, #1a1a1a, #2a2a2a, #3a3a3a, #4a4a4a, #5a5a5a, #6a6a6a, #7a7a7a, #8a8a8a, #9a9a9a, #aaaaaa, #bababa, #cacaca) overflow-x-hidden">
    <!-- Navbar -->
    <AppNavbar 
      @open-cart="handleOpenCart" 
      @search="handleSearch"
      @platform-change="handlePlataformaChange"
    />

    <!-- Contenido Principal -->
    <div class="container mx-auto px-4 md:px-6 py-12 relative overflow-x-hidden">
      <!-- Efectos de fondo decorativos -->
      <div class="absolute top-1/4 left-0 w-64 h-64 bg-error/5 rounded-full blur-3xl pointer-events-none"></div>
      <div class="absolute bottom-1/4 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>

      <!-- Loading mejorado -->
      <div v-if="isLoadingGames || isLoadingCombos" class="flex justify-center items-center min-h-[400px]">
        <div class="text-center space-y-6 animate-fadeInUp">
          <div class="relative">
            <span class="loading loading-spinner loading-lg text-error"></span>
            <div class="absolute inset-0 loading loading-spinner loading-lg text-error opacity-50 scale-150"></div>
          </div>
          <div>
            <p class="text-2xl font-bold text-gradient-animated mb-2">Cargando contenido...</p>
            <p class="text-sm text-base-content/60">Preparando la mejor experiencia</p>
          </div>
        </div>
      </div>

      <template v-else>
        <!-- Indicador de filtros activos -->
        <div v-if="searchTerm || filtroPlataforma !== 'PS4 & PS5'" class="mb-8 animate-fadeInUp">
          <div class="flex flex-wrap items-center gap-3">
            <span class="text-sm text-base-content/70 font-medium">Filtros activos:</span>
            
            <!-- Filtro de búsqueda -->
            <div v-if="searchTerm" class="badge badge-error gap-2 py-3 px-4">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span>Búsqueda: "{{ searchTerm }}"</span>
              <button @click="searchTerm = ''" class="hover:text-white transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <!-- Filtro de plataforma -->
            <div v-if="filtroPlataforma !== 'PS4 & PS5'" class="badge badge-primary gap-2 py-3 px-4">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Plataforma: {{ filtroPlataforma }}</span>
              <button @click="handlePlataformaChange('PS4 & PS5')" class="hover:text-white transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <!-- Botón para limpiar todos los filtros -->
            <button 
              v-if="searchTerm || filtroPlataforma !== 'PS4 & PS5'"
              @click="() => { searchTerm = ''; handlePlataformaChange('PS4 & PS5') }"
              class="btn btn-ghost btn-sm gap-2 hover:bg-error/20 hover:text-error"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Limpiar todos
            </button>
            
            <!-- Contador de resultados -->
            <div class="ml-auto badge badge-ghost py-3 px-4">
              <span class="font-bold">{{ juegosFiltrados.length }}</span>
              <span class="ml-1">{{ juegosFiltrados.length === 1 ? 'juego encontrado' : 'juegos encontrados' }}</span>
            </div>
          </div>
        </div>

        <!-- Resultados de búsqueda (solo cuando hay búsqueda) -->
        <SearchResultsSection 
          v-if="searchTerm"
          :games="juegosFiltrados"
          :current-page="currentPageSearch"
          :items-per-page="itemsPerPage"
          @page-change="handleSearchPageChange"
          @next="handleSearchNext"
          @prev="handleSearchPrev"
        />

        <!-- Secciones adicionales (solo sin búsqueda) -->
        <template v-if="!searchTerm">
          <!-- SECCIÓN 1: OFERTAS ESPECIALES (Parte Superior) -->
          <OffersSection 
            v-if="juegosEnOferta.length > 0"
            :games="juegosEnOferta"
            title="Ofertas Especiales"
            subtitle="¡Aprovecha estos precios increíbles antes de que terminen!"
            variant="primary"
          />

          <!-- SECCIÓN 2: PROMOCIONES DESTACADAS -->
          <PromotionsSection 
            v-if="juegosEnPromocion.length > 0"
            :games="juegosEnPromocion"
            title="Promociones Destacadas"
            subtitle="Los mejores juegos seleccionados para ti"
          />

          <!-- Sección de Ofertas/En Tendencias (Legacy - solo si hay juegos destacados antiguos) -->
          <TrendingGamesSection 
            v-if="juegosDestacados.length > 0"
            :games="juegosDestacados" 
          />

          <!-- Sección de Combos (solo cuando se muestran todas las plataformas) -->
          <ComboSection v-if="filtroPlataforma === 'PS4 & PS5'" />

          <!-- Banner de Características (solo cuando se muestran todas las plataformas) -->
          <FeaturesBanner v-if="filtroPlataforma === 'PS4 & PS5'" />

          <!-- Todos los Juegos -->
          <AllGamesSection
            :games="juegosFiltradosPorPlataforma"
            :current-page="currentPageAll"
            :items-per-page="itemsPerPage"
            @page-change="handleAllGamesPageChange"
            @next="handleAllGamesNext"
            @prev="handleAllGamesPrev"
          />

          <!-- Secciones por plataforma (solo cuando se muestran todas las plataformas) -->
          <template v-if="filtroPlataforma === 'PS4 & PS5'">
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
            <div id="seccion-ps4">
              <PlatformGamesSection
                :games="juegosPS4"
                platform-name="PS4"
                platform-title="PlayStation 4"
                platform-description="Títulos destacados para tu PS4"
                :items-per-page="itemsPerPage"
                @view-more="handleViewMorePS4"
              />
            </div>

            <!-- Separador decorativo -->
            <div class="relative my-16 animate-fadeInUp">
              <div class="absolute inset-0 flex items-center">
                <div class="w-full border-t border-white/10"></div>
              </div>
            </div>

            <!-- Juegos PS5 -->
            <div id="seccion-ps5">
              <PlatformGamesSection
                :games="juegosPS5"
                platform-name="PS5"
                platform-title="PlayStation 5"
                platform-description="Títulos destacados para tu PS5"
                :items-per-page="itemsPerPage"
                @view-more="handleViewMorePS5"
              />
            </div>
          </template>

          <!-- Separador decorativo especial para ofertas finales -->
          <div v-if="todasLasOfertas.length > 0" class="relative my-20 animate-fadeInUp">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t-2 border-error/20"></div>
            </div>
            <div class="relative flex justify-center">
              <span class="px-8 py-3 bg-linear-gradient(to right, #ff0000, #ffa500, #ffff00, #00ff00, #0000ff, #8a2be2, #ff00ff) text-base font-bold glass-effect rounded-full border-2 border-error/30 shadow-lg">
                No Te Pierdas Estas Ofertas
              </span>
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

    <!-- Footer -->
    <AppFooter />

    <!-- Modal del Carrito -->
    <CartModal 
      :open="cartOpen" 
      @close="handleCloseCart"
      @checkout="handleCheckout"
    />
  </div>
</template>

