<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { ShoppingCart, Star, ChevronLeft, ChevronRight } from 'lucide-vue-next'

interface FeaturedGame {
  id: string
  nombre: string
  precio: number
  precioOriginal?: number
  descuento?: number
  plataforma: string
  imagen: string
  rating: number
  totalReviews: number
}

const currentSlide = ref(0)
let autoplayInterval: number | null = null

const featuredGames: FeaturedGame[] = [
  {
    id: 'cyberpunk-2077',
    nombre: 'Cyberpunk 2077',
    precio: 25.99,
    precioOriginal: 39.99,
    descuento: 35,
    plataforma: 'PS5',
    imagen: '/Images/cyberpunk2077.jpg',
    rating: 4.0,
    totalReviews: 5421
  },
  {
    id: 'elden-ring',
    nombre: 'Elden Ring',
    precio: 44.99,
    precioOriginal: 59.99,
    descuento: 25,
    plataforma: 'PS5',
    imagen: '/Images/eldenring.webp',
    rating: 4.8,
    totalReviews: 4723
  },
  {
    id: 'minecraft',
    nombre: 'Minecraft',
    precio: 26.99,
    plataforma: 'PS4 & PS5',
    imagen: '/Images/minecraft.webp',
    rating: 4.5,
    totalReviews: 8932
  }
]

const nextSlide = (): void => {
  currentSlide.value = (currentSlide.value + 1) % featuredGames.length
}

const prevSlide = (): void => {
  currentSlide.value = currentSlide.value === 0 ? featuredGames.length - 1 : currentSlide.value - 1
}

const goToSlide = (index: number): void => {
  currentSlide.value = index
}

const formatearPrecio = (precio: number): string => {
  return new Intl.NumberFormat('es-US', {
    style: 'currency',
    currency: 'USD'
  }).format(precio)
}

const startAutoplay = (): void => {
  autoplayInterval = window.setInterval(() => {
    nextSlide()
  }, 5000) // Cambia cada 5 segundos
}

const stopAutoplay = (): void => {
  if (autoplayInterval) {
    clearInterval(autoplayInterval)
    autoplayInterval = null
  }
}

onMounted(() => {
  startAutoplay()
})

onUnmounted(() => {
  stopAutoplay()
})
</script>

<template>
  <div class="relative w-full bg-base-200 py-8">
    <!-- Carrusel contenedor - Con ancho limitado y centrado -->
    <div class="container mx-auto px-4 md:px-6">
      <div class="relative h-[500px] md:h-[600px] lg:h-[650px] overflow-hidden rounded-lg">
        <!-- Slides -->
        <div 
          v-for="(game, index) in featuredGames" 
          :key="game.id"
          class="absolute inset-0 transition-opacity duration-700"
          :class="currentSlide === index ? 'opacity-100 z-10' : 'opacity-0 z-0'"
        >
          <!-- Background Image - Centrada, sin distorsión, manteniendo proporción -->
          <div class="absolute inset-0 flex items-center justify-center bg-base-300">
            <img 
              :src="game.imagen" 
              :alt="game.nombre"
              class="max-w-full max-h-full w-auto h-auto object-contain"
              style="image-rendering: -webkit-optimize-contrast; image-rendering: crisp-edges;"
              loading="eager"
            />
            <!-- Overlay sutil solo en el lado izquierdo - Menos saturado -->
            <div class="absolute inset-0 bg-gradient-to-r from-black/50 via-black/30 to-transparent pointer-events-none"></div>
          </div>

          <!-- Contenido sobre el background - Lado izquierdo -->
          <div class="relative z-20 h-full flex items-center">
            <div class="w-full px-6 md:px-12 lg:px-16">
              <div class="max-w-xl space-y-5">
                <!-- Plataforma -->
                <div>
                  <span class="text-sm font-bold text-error uppercase tracking-wider">
                    {{ game.plataforma }}
                  </span>
                </div>

                <!-- Título -->
                <h2 class="text-5xl md:text-6xl lg:text-7xl font-black text-white leading-tight">
                  {{ game.nombre }}
                </h2>

                <!-- Rating -->
                <div class="flex items-center gap-3">
                  <div class="flex items-center gap-1">
                    <Star 
                      v-for="i in 5" 
                      :key="i"
                      :size="18"
                      :class="i <= Math.floor(game.rating) ? 'text-warning fill-warning' : 'text-white/30'"
                    />
                  </div>
                  <span class="text-white/90 text-sm">
                    {{ game.rating }} ({{ game.totalReviews.toLocaleString() }} reseñas)
                  </span>
                </div>

                <!-- Precio y Badge de descuento -->
                <div class="flex items-center gap-4">
                  <div v-if="game.descuento" class="bg-orange-500 text-white font-bold px-4 py-2 rounded">
                    -{{ game.descuento }}%
                  </div>
                  <div class="text-4xl md:text-5xl font-black text-error">
                    {{ formatearPrecio(game.precio) }}
                  </div>
                  <div v-if="game.precioOriginal" class="text-xl text-white/50 line-through">
                    {{ formatearPrecio(game.precioOriginal) }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Botones de navegación - Más discretos -->
        <button 
          @click="prevSlide"
          @mouseenter="stopAutoplay"
          @mouseleave="startAutoplay"
          class="absolute left-6 top-1/2 -translate-y-1/2 z-30 btn btn-circle bg-black/30 hover:bg-black/50 border border-white/20 text-white backdrop-blur-sm transition-all duration-300"
        >
          <ChevronLeft :size="20" />
        </button>

        <button 
          @click="nextSlide"
          @mouseenter="stopAutoplay"
          @mouseleave="startAutoplay"
          class="absolute right-6 top-1/2 -translate-y-1/2 z-30 btn btn-circle bg-black/30 hover:bg-black/50 border border-white/20 text-white backdrop-blur-sm transition-all duration-300"
        >
          <ChevronRight :size="20" />
        </button>

        <!-- Indicadores - Más discretos en la parte inferior -->
        <div class="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex gap-2">
          <button
            v-for="(game, index) in featuredGames"
            :key="`indicator-${game.id}`"
            @click="goToSlide(index)"
            @mouseenter="stopAutoplay"
            @mouseleave="startAutoplay"
            :class="[
              'h-2 rounded-full transition-all duration-300',
              currentSlide === index 
                ? 'bg-error w-8' 
                : 'bg-white/40 hover:bg-white/60 w-2'
            ]"
          ></button>
        </div>
      </div>
    </div>
  </div>
</template>

