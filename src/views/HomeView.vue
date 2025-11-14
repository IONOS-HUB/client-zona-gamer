<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useGames } from '@/composables/useGames'
import { useCartStore } from '@/stores/cart'
import type { GamePlatform } from '@/types/game'
import AppNavbar from '@/components/ui/AppNavbar.vue'
import CartModal from '@/components/ui/CartModal.vue'
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
const cartStore = useCartStore()

const plataformaSeleccionada = ref<GamePlatform>('PS4 & PS5')
const searchTerm = ref('')
const cartOpen = ref(false)

// Estados de paginación
const itemsPerPage = 12
const currentPageAll = ref(1)
const currentPageSearch = ref(1)

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

onMounted(() => {
  cargarJuegos(plataformaSeleccionada.value)
})
</script>

<template>
  <div class="min-h-screen bg-linear-gradient(to bottom, #1a1a1a, #2a2a2a, #3a3a3a, #4a4a4a, #5a5a5a, #6a6a6a, #7a7a7a, #8a8a8a, #9a9a9a, #aaaaaa, #bababa, #cacaca)">
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
        <TrendingGamesSection :games="juegosDestacados" />

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
          <!-- Sección de Combos -->
          <ComboSection />

          <!-- Banner de Características -->
          <FeaturesBanner />

          <!-- Todos los Juegos -->
          <AllGamesSection
            :games="games"
            :current-page="currentPageAll"
            :items-per-page="itemsPerPage"
            @page-change="handleAllGamesPageChange"
            @next="handleAllGamesNext"
            @prev="handleAllGamesPrev"
          />

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
