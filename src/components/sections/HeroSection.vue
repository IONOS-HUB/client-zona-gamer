<script setup lang="ts">
import { onMounted, onUnmounted, computed } from 'vue'
import { MessageCircle, Gamepad2, Star } from 'lucide-vue-next'
import { useCartStore } from '@/stores/cart'
import type { GameSummary } from '@/types/game'

interface Props {
  games: GameSummary[]
}

const props = defineProps<Props>()
const cartStore = useCartStore()

// Variables para masonry (ya no necesitamos carrusel)

// Obtener más juegos para el masonry (necesitamos más imágenes)
const featuredGames = computed(() => {
  return props.games
    .filter(game => game.activo !== false && game.foto)
    .slice(0, 12) // Más juegos para el masonry
})

// Crear columnas para masonry con diferentes alturas
const masonryColumns = computed(() => {
  const games = featuredGames.value
  if (games.length === 0) return [[], [], []]
  
  // Dividir en 3 columnas para efecto masonry
  const columns: GameSummary[][] = [[], [], []]
  games.forEach((game, index) => {
    if (game) {
      const columnIndex = index % 3
      if (columnIndex >= 0 && columnIndex < columns.length) {
        columns[columnIndex]?.push(game)
      }
    }
  })
  return columns
})

const handleWhatsApp = () => {
  const mensaje = '¡Hola! Me gustaría obtener información sobre sus juegos disponibles.'
  const numeroWhatsApp = '593992249152'
  const urlWhatsApp = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensaje)}`
  window.open(urlWhatsApp, '_blank')
}

const handleExploreCatalog = () => {
  window.location.href = '/ver-mas'
}

const handleAddToCart = (game: GameSummary | undefined) => {
  if (!game) return
  
  cartStore.addToCart(game, 1, 'Principal PS4')
}

onMounted(() => {
  // No necesitamos auto-rotate para masonry
})

onUnmounted(() => {
  // Cleanup si es necesario
})
</script>

<template>
  <section class="relative min-h-screen flex items-center overflow-hidden bg-linear-gradient(to bottom, #1a1a1a, #2a2a2a) py-20 md:py-0">
    <!-- Fondo animado gamer -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <!-- Gradientes de fondo -->
      <div class="absolute top-0 right-0 w-64 h-64 md:w-96 md:h-96 bg-error/10 rounded-full blur-3xl animate-pulse"></div>
      <div class="absolute bottom-0 left-0 w-64 h-64 md:w-96 md:h-96 bg-primary/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-linear-gradient(to right, transparent, #ef4444/5, transparent)"></div>
      
      <!-- Elementos gamer animados (ocultos en móvil) -->
      <div class="hidden md:block absolute top-20 right-20 w-32 h-32 opacity-10 animate-float">
        <svg viewBox="0 0 24 24" fill="currentColor" class="text-error">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
      </div>
      <div class="hidden md:block absolute bottom-32 right-40 w-24 h-24 opacity-10 animate-float-delayed">
        <svg viewBox="0 0 24 24" fill="currentColor" class="text-warning">
          <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
        </svg>
      </div>
      <div class="hidden md:block absolute top-40 left-20 w-20 h-20 opacity-10 animate-spin-slow">
        <svg viewBox="0 0 24 24" fill="currentColor" class="text-primary">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
        </svg>
      </div>
      
      <!-- Grid pattern -->
      <div class="absolute inset-0 opacity-5" style="background-image: linear-gradient(#ef4444 1px, transparent 1px), linear-gradient(90deg, #ef4444 1px, transparent 1px); background-size: 50px 50px;"></div>
    </div>

    <div class="container mx-auto px-4 md:px-6 relative z-10">
      <div class="grid lg:grid-cols-2 gap-8 md:gap-10 lg:gap-12 items-center">
        <!-- Lado Izquierdo: Contenido -->
        <div class="space-y-6 md:space-y-8 animate-fadeInLeft text-center lg:text-left">
         

          <!-- Título Principal -->
          <div class="space-y-3 md:space-y-4">
            <h1 class="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black leading-tight">
              <span class="text-white">Tu Tienda</span>
              <br />
              <span class="text-gradient-hero font-bold">Gamer</span>
              <br />
              <span class="text-white">De Confianza</span>
            </h1>
            <p class="text-base sm:text-lg md:text-xl text-base-content/70 max-w-xl mx-auto lg:mx-0">
              Encuentra los mejores juegos para PlayStation 4 y 5. 
              <br class="hidden sm:block" />
              Cuentas verificadas, entrega inmediata y los mejores precios del mercado.
            </p>
          </div>

          <!-- Estadísticas -->
          <div class="flex flex-wrap justify-center lg:justify-start gap-4 sm:gap-6">
            <div class="flex items-center gap-2 sm:gap-3 bg-base-100/30 backdrop-blur-sm px-4 py-3 rounded-xl">
              <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-error/20 flex items-center justify-center shrink-0">
                <Gamepad2 :size="20" class="text-error sm:w-6 sm:h-6" />
              </div>
              <div>
                <p class="text-xl sm:text-2xl font-bold text-white">{{ games.length }}+</p>
                <p class="text-xs sm:text-sm text-base-content/60">Juegos Disponibles</p>
              </div>
            </div>
            <div class="flex items-center gap-2 sm:gap-3 bg-base-100/30 backdrop-blur-sm px-4 py-3 rounded-xl">
              <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-warning/20 flex items-center justify-center shrink-0">
                <Star :size="20" class="text-warning sm:w-6 sm:h-6" />
              </div>
              <div>
                <p class="text-xl sm:text-2xl font-bold text-white">100%</p>
                <p class="text-xs sm:text-sm text-base-content/60">Verificado</p>
              </div>
            </div>
          </div>

          <!-- CTAs -->
          <div class="flex flex-col sm:flex-row gap-3 sm:gap-4 max-w-lg mx-auto lg:mx-0">
            <button 
              @click="handleWhatsApp"
              class="btn btn-success btn-md sm:btn-lg gap-2 sm:gap-3 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
            >
              <MessageCircle :size="20" class="sm:w-6 sm:h-6" />
              <span class="text-sm sm:text-base">Contactar por WhatsApp</span>
            </button>
            <button 
              @click="handleExploreCatalog"
              class="btn btn-outline btn-md sm:btn-lg gap-2 sm:gap-3 hover:btn-error transition-all duration-300"
            >
              <Gamepad2 :size="20" class="sm:w-6 sm:h-6" />
              <span class="text-sm sm:text-base">Explorar Catálogo</span>
            </button>
          </div>
        </div>

        <!-- Lado Derecho: Masonry Layout -->
        <div class="relative h-[500px] sm:h-[600px] lg:h-[700px] animate-fadeInRight mt-8 lg:mt-0 overflow-hidden" v-if="featuredGames.length > 0">
          <div class="masonry-container h-full">
            <div 
              v-for="(column, colIndex) in masonryColumns" 
              :key="colIndex"
              class="masonry-column"
            >
              <div
                v-for="(game, gameIndex) in column"
                :key="game.id"
                class="masonry-item"
                :style="{ 
                  animationDelay: `${(colIndex * 0.2) + (gameIndex * 0.15)}s`
                }"
              >
                <div class="relative w-full group cursor-pointer" @click="handleAddToCart(game)">
                  <!-- Imagen -->
                  <div class="relative w-full overflow-hidden rounded-lg sm:rounded-xl">
                    <img 
                      v-if="game?.foto"
                      :src="game.foto" 
                      :alt="game.nombre"
                      class="w-full h-auto object-contain transform group-hover:scale-105 transition-transform duration-500"
                    />
                    <!-- Overlay con gradiente -->
                    <div class="absolute inset-0 bg-linear-gradient(to top, rgba(0,0,0,0.8), transparent) opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    
                    <!-- Badge de oferta -->
                    <div 
                      v-if="game?.descuento && game.descuento > 0"
                      class="absolute top-2 right-2 z-10 bg-error text-white px-2 py-1 rounded-full font-bold text-xs shadow-lg"
                    >
                      -{{ game.descuento }}%
                    </div>
                    
                    <!-- Información en hover -->
                    <div class="absolute bottom-0 left-0 right-0 p-3 sm:p-4 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                      <h3 class="text-sm sm:text-base font-bold text-white mb-1 line-clamp-2">{{ game.nombre }}</h3>
                      <div class="flex items-center gap-1.5 flex-wrap">
                        <span class="badge badge-error badge-xs sm:badge-sm">{{ game.version }}</span>
                        <span v-if="game?.tipoPromocion && game.tipoPromocion !== 'ninguna'" class="badge badge-warning badge-xs sm:badge-sm">
                          {{ game.tipoPromocion }}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.text-gradient-hero {
  background: linear-gradient(135deg, #ef4444 0%, #f97316 50%, #eab308 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: gradient-shift 3s ease infinite;
  background-size: 200% 200%;
}

@keyframes gradient-shift {
  0%, 100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}

.animate-fadeInLeft {
  animation: fadeInLeft 0.8s ease-out;
}

.animate-fadeInRight {
  animation: fadeInRight 0.8s ease-out;
}

@keyframes fadeInLeft {
  from {
    opacity: 0;
    transform: translateX(-50px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes fadeInRight {
  from {
    opacity: 0;
    transform: translateX(50px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* Responsive animation adjustments */
@media (max-width: 640px) {
  @keyframes fadeInLeft {
    from {
      opacity: 0;
      transform: translateX(-20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes fadeInRight {
    from {
      opacity: 0;
      transform: translateX(20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
}

.line-clamp-2 {
  display: -webkit-box;
  line-clamp: 2;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Animaciones para fondo gamer */
.animate-float {
  animation: float 6s ease-in-out infinite;
}

.animate-float-delayed {
  animation: float 6s ease-in-out infinite;
  animation-delay: 2s;
}

.animate-spin-slow {
  animation: spin-slow 20s linear infinite;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0) rotate(0deg);
  }
  25% {
    transform: translateY(-20px) rotate(5deg);
  }
  50% {
    transform: translateY(0) rotate(0deg);
  }
  75% {
    transform: translateY(20px) rotate(-5deg);
  }
}

@keyframes spin-slow {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.delay-1000 {
  animation-delay: 1s;
}

/* Mejoras responsive adicionales */
@media (max-width: 640px) {
  section {
    min-height: 100vh;
    min-height: 100dvh; /* Dynamic viewport height for mobile */
  }
}

/* Aspect ratio helper */
.aspect-3\/4 {
  aspect-ratio: 3 / 4;
}

/* Touch improvements for mobile */
@media (hover: none) and (pointer: coarse) {
  button:active {
    transform: scale(0.98);
  }
}

/* Masonry Layout Styles */
.masonry-container {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
  padding: 0.5rem;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
}

.masonry-column {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.masonry-item {
  width: 100%;
  border-radius: 0.5rem;
  overflow: hidden;
  animation: fadeInUp 0.6s ease-out both;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  display: flex;
  flex-direction: column;
}

.masonry-item:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 15px -3px rgba(239, 68, 68, 0.3);
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Scrollbar styling para masonry */
.masonry-container::-webkit-scrollbar {
  width: 6px;
}

.masonry-container::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
}

.masonry-container::-webkit-scrollbar-thumb {
  background: rgba(239, 68, 68, 0.5);
  border-radius: 10px;
}

.masonry-container::-webkit-scrollbar-thumb:hover {
  background: rgba(239, 68, 68, 0.7);
}

/* Responsive masonry */
@media (max-width: 1024px) {
  .masonry-container {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem;
  }
}

@media (max-width: 640px) {
  .masonry-container {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem;
    padding: 0.25rem;
  }
  
  .masonry-item {
    border-radius: 0.375rem;
  }
}
</style>
