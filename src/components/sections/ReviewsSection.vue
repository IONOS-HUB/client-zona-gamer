<script setup lang="ts">
import { Star } from 'lucide-vue-next'

interface Review {
  id: string
  gameName: string
  reviewText: string
  rating: number
  avatar: string
  timeAgo: string
  helpful?: number
}

const reviews: Review[] = [
  {
    id: '1',
    gameName: 'Zona Gamers Ecuador',
    reviewText: 'Excelente servicio, muy rápido y confiable. Compré varios juegos y todos funcionaron perfectamente. La atención al cliente es increíble.',
    rating: 5,
    avatar: '👤',
    timeAgo: 'hace 2 días'
  },
  {
    id: '2',
    gameName: 'Zona Gamers Ecuador',
    reviewText: 'La mejor tienda de juegos digitales en Ecuador. Precios súper competitivos y entrega inmediata. 100% recomendado.',
    rating: 5,
    avatar: '🎮',
    timeAgo: 'hace 5 días',
    helpful: 124
  },
  {
    id: '3',
    gameName: 'Zona Gamers Ecuador',
    reviewText: 'Compré mi PS5 y varios juegos aquí. El servicio es excelente, muy profesionales y siempre disponibles para resolver dudas.',
    rating: 5,
    avatar: '🛡️',
    timeAgo: 'hace 1 semana'
  },
  {
    id: '4',
    gameName: 'Zona Gamers Ecuador',
    reviewText: 'Increíble experiencia de compra. Los juegos llegaron al instante y funcionaron perfectamente. Definitivamente volveré a comprar.',
    rating: 5,
    avatar: '⚡',
    timeAgo: 'hace 1 semana',
    helpful: 89
  },
  {
    id: '5',
    gameName: 'Zona Gamers Ecuador',
    reviewText: 'Muy buena atención, precios justos y entrega rápida. La ubicación en Ibarra es perfecta y el personal muy amable.',
    rating: 5,
    avatar: '🗡️',
    timeAgo: 'hace 2 semanas',
    helpful: 67
  },
  {
    id: '6',
    gameName: 'Zona Gamers Ecuador',
    reviewText: 'La mejor opción para comprar juegos en Ecuador. Siempre tienen las mejores ofertas y el servicio es impecable.',
    rating: 5,
    avatar: '🤖',
    timeAgo: 'hace 2 semanas',
    helpful: 156
  },
  {
    id: '7',
    gameName: 'Zona Gamers Ecuador',
    reviewText: 'Compré varios juegos para mi PS4 y todos funcionaron perfecto. El proceso es muy fácil y rápido. Totalmente recomendado.',
    rating: 5,
    avatar: '🎯',
    timeAgo: 'hace 3 semanas'
  },
  {
    id: '8',
    gameName: 'Zona Gamers Ecuador',
    reviewText: 'Excelente tienda, muy confiable. Los precios son los mejores que he encontrado y siempre tienen stock disponible.',
    rating: 5,
    avatar: '🔥',
    timeAgo: 'hace 3 semanas',
    helpful: 203
  }
]
</script>

<template>
  <div class="w-full bg-base-300 py-12 md:py-16">
    <!-- Banner Promocional -->
    <div class="container mx-auto px-4 md:px-6 mb-12">
      <div class="bg-base-200 rounded-lg p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 md:gap-8">
        <!-- Avatar/Imagen -->
        <div class="flex-shrink-0">
          <div class="w-24 h-24 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-blue-600 to-yellow-500 flex items-center justify-center text-4xl md:text-5xl">
            👤
          </div>
        </div>

        <!-- Contenido -->
        <div class="flex-1 text-center md:text-left">
          <!-- Estrellas -->
          <div class="flex justify-center md:justify-start gap-1 mb-3">
            <Star 
              v-for="i in 5" 
              :key="i"
              :size="24"
              class="text-yellow-500 fill-yellow-500"
            />
          </div>

          <!-- Texto promocional -->
          <p class="text-white text-sm md:text-base mb-4 leading-relaxed">
            Zona Gamers es una plataforma increíble para comprar tus juegos de PC, PlayStation, Xbox y Switch más baratos. ¡Con entrega inmediata 24/7, juega al instante al precio más bajo!
          </p>

          <!-- Botón de reseñas -->
          <button class="btn btn-error btn-outline">
            1,561,197 reseñas de usuarios
          </button>
        </div>
      </div>
    </div>

    <!-- Sección de Reseñas -->
    <div class="container mx-auto px-4 md:px-6">
      <h2 class="text-2xl md:text-3xl font-bold text-white mb-6">Reseñas de usuarios</h2>
      
      <!-- Scroll horizontal de reseñas -->
      <div class="overflow-x-auto pb-4">
        <div class="flex gap-4 min-w-max">
          <div
            v-for="review in reviews"
            :key="review.id"
            class="bg-base-200 rounded-lg p-4 min-w-[300px] md:min-w-[350px] flex-shrink-0 shadow-lg hover:shadow-xl transition-shadow duration-300"
          >
            <!-- Header de la reseña -->
            <div class="flex items-start gap-3 mb-3">
              <!-- Avatar -->
              <div class="w-12 h-12 rounded-full bg-base-300 flex items-center justify-center text-2xl flex-shrink-0">
                {{ review.avatar }}
              </div>

              <!-- Información -->
              <div class="flex-1 min-w-0">
                <!-- Estrellas -->
                <div class="flex gap-0.5 mb-1">
                  <Star 
                    v-for="i in review.rating" 
                    :key="i"
                    :size="14"
                    class="text-yellow-500 fill-yellow-500"
                  />
                </div>
                <!-- Título del juego -->
                <h3 class="text-sm font-semibold text-white truncate">
                  {{ review.gameName }}
                </h3>
              </div>
            </div>

            <!-- Texto de la reseña -->
            <p class="text-sm text-base-content/80 mb-3 line-clamp-3">
              {{ review.reviewText }}
            </p>

            <!-- Footer -->
            <div class="flex items-center justify-between text-xs text-base-content/60">
              <span>{{ review.timeAgo }}</span>
              <span v-if="review.helpful" class="text-orange-500 font-semibold">
                +{{ review.helpful }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.line-clamp-3 {
  display: -webkit-box;
  line-clamp: 3;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Scrollbar personalizado */
.overflow-x-auto::-webkit-scrollbar {
  height: 8px;
}

.overflow-x-auto::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}

.overflow-x-auto::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 4px;
}

.overflow-x-auto::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.5);
}
</style>

