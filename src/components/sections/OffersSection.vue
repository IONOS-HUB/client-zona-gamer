<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { useCartStore } from '@/stores/cart'
import type { GameSummary } from '@/types/game'
import { ShoppingCart, Sparkles, TrendingUp, Pause, Play } from 'lucide-vue-next'

interface Props {
  games: GameSummary[]
  title?: string
  subtitle?: string
  variant?: 'primary' | 'secondary'
  autoPlayInterval?: number
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Ofertas Especiales',
  subtitle: 'Aprovecha estos precios increíbles',
  variant: 'primary',
  autoPlayInterval: 5000 // 5 segundos por defecto
})

const cartStore = useCartStore()
const currentIndex = ref(0)
const isAutoPlaying = ref(true)
const isPaused = ref(false)
let autoPlayTimer: ReturnType<typeof setInterval> | null = null

// Touch/Swipe handling
const touchStartX = ref(0)
const touchEndX = ref(0)
const isDragging = ref(false)
const showSwipeHint = ref(true)

const displayGames = computed(() => {
  // Mostrar máximo 6 banners principales
  return props.games.slice(0, 6)
})

const hasGames = computed(() => props.games.length > 0)

const sectionClasses = computed(() => {
  return props.variant === 'primary' 
    ? 'bg-gradient-to-br from-error/10 via-base-200/50 to-warning/10'
    : 'bg-gradient-to-br from-success/10 via-base-200/50 to-info/10'
})

const badgeClasses = computed(() => {
  return props.variant === 'primary'
    ? 'badge-error'
    : 'badge-success'
})

const addToCart = (game: GameSummary) => {
  cartStore.addToCart(game, 1)
}

const nextSlide = () => {
  if (currentIndex.value < displayGames.value.length - 1) {
    currentIndex.value++
  } else {
    currentIndex.value = 0
  }
}

const prevSlide = () => {
  if (currentIndex.value > 0) {
    currentIndex.value--
  } else {
    currentIndex.value = displayGames.value.length - 1
  }
}

const goToSlide = (index: number) => {
  currentIndex.value = index
  resetAutoPlay()
}

const toggleAutoPlay = () => {
  isPaused.value = !isPaused.value
  if (isPaused.value) {
    stopAutoPlay()
  } else {
    startAutoPlay()
  }
}

const startAutoPlay = () => {
  if (displayGames.value.length <= 1) return
  
  stopAutoPlay()
  autoPlayTimer = setInterval(() => {
    nextSlide()
  }, props.autoPlayInterval)
}

const stopAutoPlay = () => {
  if (autoPlayTimer) {
    clearInterval(autoPlayTimer)
    autoPlayTimer = null
  }
}

const resetAutoPlay = () => {
  if (!isPaused.value) {
    startAutoPlay()
  }
}

const handleMouseEnter = () => {
  if (isAutoPlaying.value && !isPaused.value) {
    stopAutoPlay()
  }
}

const handleMouseLeave = () => {
  if (isAutoPlaying.value && !isPaused.value) {
    startAutoPlay()
  }
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('es-EC', {
    style: 'currency',
    currency: 'USD'
  }).format(price)
}

// Touch/Swipe handlers
const handleTouchStart = (e: TouchEvent) => {
  if (!e.touches[0]) return
  touchStartX.value = e.touches[0].clientX
  isDragging.value = true
  showSwipeHint.value = false
  if (!isPaused.value) {
    stopAutoPlay()
  }
}

const handleTouchMove = (e: TouchEvent) => {
  if (!isDragging.value || !e.touches[0]) return
  touchEndX.value = e.touches[0].clientX
}

const handleTouchEnd = () => {
  if (!isDragging.value) return
  
  const difference = touchStartX.value - touchEndX.value
  const threshold = 50 // Mínimo de 50px para considerar un swipe
  
  if (Math.abs(difference) > threshold) {
    if (difference > 0) {
      // Swipe left - siguiente
      nextSlide()
    } else {
      // Swipe right - anterior
      prevSlide()
    }
  }
  
  isDragging.value = false
  if (!isPaused.value) {
    startAutoPlay()
  }
}

// Mouse drag handlers (para desktop)
const handleMouseDown = (e: MouseEvent) => {
  touchStartX.value = e.clientX
  isDragging.value = true
  showSwipeHint.value = false
  if (!isPaused.value) {
    stopAutoPlay()
  }
}

const handleMouseMove = (e: MouseEvent) => {
  if (!isDragging.value) return
  touchEndX.value = e.clientX
}

const handleMouseUp = () => {
  if (!isDragging.value) return
  
  const difference = touchStartX.value - touchEndX.value
  const threshold = 50
  
  if (Math.abs(difference) > threshold) {
    if (difference > 0) {
      nextSlide()
    } else {
      prevSlide()
    }
  }
  
  isDragging.value = false
  if (!isPaused.value) {
    startAutoPlay()
  }
}

const handleMouseLeaveWhileDragging = () => {
  if (isDragging.value) {
    isDragging.value = false
    if (!isPaused.value) {
      startAutoPlay()
    }
  }
}

onMounted(() => {
  if (isAutoPlaying.value && displayGames.value.length > 1) {
    startAutoPlay()
  }
  
  // Ocultar hint después de 5 segundos
  setTimeout(() => {
    showSwipeHint.value = false
  }, 5000)
})

onBeforeUnmount(() => {
  stopAutoPlay()
})
</script>

<template>
  <section v-if="hasGames" class="mb-16 animate-fadeInUp">
    <div :class="['rounded-3xl p-6 md:p-8 border border-white/10 backdrop-blur-sm', sectionClasses]">
      <!-- Header de la sección -->
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div class="flex-1">
          <div class="flex items-center gap-3 mb-2">
            <span :class="['badge badge-lg font-bold', badgeClasses]">
              {{ games.length }} {{ games.length === 1 ? 'Oferta' : 'Ofertas' }}
            </span>
          </div>
          <h2 class="text-3xl md:text-5xl font-black text-gradient-animated mb-2">
            {{ title }}
          </h2>
          <p class="text-base md:text-lg text-base-content/70 font-medium">
            {{ subtitle }}
          </p>
        </div>
        
        <!-- Decoración -->
        <div class="hidden lg:flex items-center gap-3">
          <div class="relative">
            <div class="absolute inset-0 bg-error/20 blur-xl rounded-full"></div>
            <Sparkles :size="64" class="text-error relative z-10" />
          </div>
        </div>
      </div>

      <!-- Carrusel de Banners Tipo Steam -->
      <div 
        class="relative"
        @mouseenter="handleMouseEnter"
        @mouseleave="handleMouseLeave"
      >
        <!-- Banner Principal -->
        <div 
          :class="[
            'overflow-hidden rounded-2xl transition-all duration-200',
            isDragging ? 'cursor-grabbing scale-[0.98]' : 'cursor-grab'
          ]"
          @touchstart="handleTouchStart"
          @touchmove="handleTouchMove"
          @touchend="handleTouchEnd"
          @mousedown="handleMouseDown"
          @mousemove="handleMouseMove"
          @mouseup="handleMouseUp"
          @mouseleave="handleMouseLeaveWhileDragging"
        >
          <div 
            :class="[
              'flex select-none',
              isDragging ? 'transition-none' : 'transition-transform duration-700 ease-in-out'
            ]"
            :style="{ transform: `translateX(-${currentIndex * 100}%)` }"
          >
            <div
              v-for="game in displayGames"
              :key="game.id"
              class="min-w-full relative group"
            >
              <!-- Banner con imagen de fondo -->
              <div class="relative h-[400px] md:h-[500px] overflow-hidden">
                <!-- Imagen de fondo -->
                <div 
                  class="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                  :style="{ 
                    backgroundImage: game.foto ? `url(${game.foto})` : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                  }"
                ></div>
                
                <!-- Overlay gradiente -->
                <div class="absolute inset-0 bg-linear-gradient(to right, rgba(0, 0, 0, 0.9), rgba(0, 0, 0, 0.6))"></div>
                
                <!-- Contenido del banner -->
                <div class="relative h-full flex items-end p-6 md:p-12">
                  <div class="max-w-2xl">
                    <!-- Badges -->
                    <div class="flex flex-wrap gap-2 mb-4">
                      <span class="badge badge-error badge-lg font-bold animate-pulse">
                        <TrendingUp :size="16" class="mr-1" />
                        OFERTA ESPECIAL
                      </span>
                      <span class="badge badge-primary badge-lg">
                        {{ game.version }}
                      </span>
                      <span v-if="game.stockAccounts && game.stockAccounts > 0" class="badge badge-success badge-lg">
                        {{ game.stockAccounts }} en Stock
                      </span>
                    </div>
                    
                    <!-- Título -->
                    <h3 class="text-4xl md:text-6xl font-black text-white mb-4 drop-shadow-2xl transform transition-all duration-300 group-hover:scale-105">
                      {{ game.nombre }}
                    </h3>
                    
                    <!-- Precio -->
                    <div class="flex items-center gap-4 mb-6">
                      <div class="bg-error/20 backdrop-blur-md px-6 py-3 rounded-xl border border-error/30 hover:bg-error/30 transition-colors">
                        <p class="text-sm text-error font-medium mb-1">PRECIO ESPECIAL</p>
                        <p class="text-4xl font-black text-white">
                          {{ formatPrice(game.costo) }}
                        </p>
                      </div>
                    </div>
                    
                    <!-- Botón de acción -->
                    <button
                      @click="addToCart(game)"
                      class="btn btn-error btn-lg gap-2 shadow-2xl hover:scale-105 hover:shadow-error/50 transition-all duration-300"
                    >
                      <ShoppingCart :size="20" />
                      Agregar al Carrito
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Hint de deslizar (solo se muestra al inicio) -->
        <transition
          enter-active-class="transition-opacity duration-500"
          leave-active-class="transition-opacity duration-500"
          enter-from-class="opacity-0"
          leave-to-class="opacity-0"
        >
          <div 
            v-if="showSwipeHint && displayGames.length > 1" 
            class="absolute bottom-24 left-1/2 -translate-x-1/2 z-10 pointer-events-none"
          >
            <div class="bg-black/80 backdrop-blur-md px-6 py-3 rounded-full border border-white/20 shadow-2xl">
              <div class="flex items-center gap-3 text-white">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16l-4-4m0 0l4-4m-4 4h18" />
                </svg>
                <span class="text-sm font-medium">Desliza para ver más ofertas</span>
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
            </div>
          </div>
        </transition>

        <!-- Controles inferiores: indicadores y play/pause -->
        <div v-if="displayGames.length > 1" class="flex flex-col md:flex-row justify-between items-center gap-4 md:gap-0 mt-6 px-2 md:px-4">
          <!-- Indicadores -->
          <div class="flex items-center gap-2 order-2 md:order-1">
            <button
              v-for="(game, index) in displayGames"
              :key="index"
              @click="goToSlide(index)"
              :class="[
                'transition-all duration-300 rounded-full',
                currentIndex === index 
                  ? 'h-3 w-10 bg-error shadow-lg shadow-error/50 hover:shadow-error/70' 
                  : 'h-2 w-2 bg-base-content/30 hover:bg-base-content/60 hover:h-3 hover:w-6'
              ]"
              :aria-label="`Ir a oferta ${index + 1}`"
            ></button>
          </div>

          <!-- Contador y control de reproducción -->
          <div class="flex items-center gap-3 order-1 md:order-2">
            <!-- Contador de slides -->
            <div class="badge badge-ghost gap-2 py-3 px-4 font-mono text-base">
              <span class="text-xl font-bold text-error">{{ currentIndex + 1 }}</span>
              <span class="text-sm opacity-60">/</span>
              <span class="text-base opacity-70">{{ displayGames.length }}</span>
            </div>

            <!-- Botón Play/Pause -->
            <button
              @click="toggleAutoPlay"
              :class="[
                'btn btn-circle btn-md border-2 backdrop-blur-xl hover:scale-110 active:scale-95 transition-all duration-300 group shadow-lg',
                isPaused 
                  ? 'bg-success/20 hover:bg-success border-success/40 hover:border-success'
                  : 'bg-error/20 hover:bg-error border-error/40 hover:border-error'
              ]"
              :aria-label="isPaused ? 'Reproducir automáticamente' : 'Pausar reproducción automática'"
              :title="isPaused ? 'Reproducir' : 'Pausar'"
            >
              <Pause v-if="!isPaused" :size="20" class="text-error group-hover:text-white transition-colors" />
              <Play v-else :size="20" class="text-success group-hover:text-white transition-colors" />
            </button>
          </div>
        </div>
      </div>

      <!-- Miniaturas de ofertas adicionales -->
      <div v-if="games.length > 6" class="mt-8">
        <div class="divider">
          <span class="text-sm font-semibold">Más Ofertas Disponibles</span>
        </div>
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div
            v-for="game in games.slice(6, 12)"
            :key="game.id"
            class="group relative overflow-hidden rounded-lg cursor-pointer hover:scale-105 transition-transform"
            @click="addToCart(game)"
          >
            <!-- Imagen miniatura -->
            <div class="aspect-video relative overflow-hidden">
              <img
                v-if="game.foto"
                :src="game.foto"
                :alt="game.nombre"
                class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
              />
              <div v-else class="w-full h-full bg-linear-gradient(to bottom, rgba(0, 0, 0, 0.9), rgba(0, 0, 0, 0.4))"></div>
              
              <!-- Overlay con precio -->
              <div class="absolute inset-0 bg-linear-gradient(to top, rgba(0, 0, 0, 0.9), rgba(0, 0, 0, 0.4)) opacity-0 group-hover:opacity-100 transition-opacity">
                <div class="absolute bottom-0 left-0 right-0 p-2">
                  <p class="text-xs font-bold text-white truncate mb-1">{{ game.nombre }}</p>
                  <p class="text-sm font-black text-error">{{ formatPrice(game.costo) }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Mensaje si hay aún más ofertas -->
        <div v-if="games.length > 12" class="mt-6 text-center">
          <div class="inline-flex items-center gap-2 bg-base-300/50 px-6 py-3 rounded-full border border-white/10">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span class="text-sm font-medium">
              ¡Y {{ games.length - 12 }} ofertas más disponibles!
            </span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.text-gradient-animated {
  background: linear-gradient(90deg, #ff6b6b, #feca57, #ff6b6b);
  background-size: 200% auto;
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: gradient-shift 3s ease infinite;
}

@keyframes gradient-shift {
  0%, 100% {
    background-position: 0% center;
  }
  50% {
    background-position: 100% center;
  }
}

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

.glass-effect {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.glass-effect:hover {
  background: rgba(255, 255, 255, 0.15);
}

/* Mejoras para los controles del carrusel */
@media (max-width: 768px) {
  .btn-circle.btn-lg {
    width: 3rem;
    height: 3rem;
  }
}

/* Animación para el badge del contador */
@keyframes pulse-soft {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.8;
  }
}

.badge-ghost {
  animation: pulse-soft 2s ease-in-out infinite;
}

/* Mejora de visibilidad de botones en dispositivos táctiles */
@media (hover: none) and (pointer: coarse) {
  .absolute.btn-circle {
    opacity: 0.95;
  }
}
</style>

