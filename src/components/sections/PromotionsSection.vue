<script setup lang="ts">
import { computed } from 'vue'
import { useCartStore } from '@/stores/cart'
import type { GameSummary } from '@/types/game'
import { ShoppingCart, Star, Zap } from 'lucide-vue-next'

interface Props {
  games: GameSummary[]
  title?: string
  subtitle?: string
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Promociones Destacadas',
  subtitle: 'Los mejores juegos en promoción'
})

const cartStore = useCartStore()

const displayGames = computed(() => {
  // Mostrar máximo 4 banners principales para promociones
  return props.games.slice(0, 4)
})

const hasGames = computed(() => props.games.length > 0)

const addToCart = (game: GameSummary) => {
  cartStore.addToCart(game, 1)
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('es-EC', {
    style: 'currency',
    currency: 'USD'
  }).format(price)
}
</script>

<template>
  <section v-if="hasGames" class="mb-16 animate-fadeInUp">
    <div class="rounded-3xl p-6 md:p-8 bg-gradient-to-br from-warning/10 via-base-200/50 to-primary/10 border border-white/10 backdrop-blur-sm">
      <!-- Header de la sección -->
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div class="flex-1">
          <div class="flex items-center gap-3 mb-2">
            <span class="badge badge-lg badge-warning font-bold">
              {{ games.length }} {{ games.length === 1 ? 'Promoción' : 'Promociones' }}
            </span>
          </div>
          <h2 class="text-3xl md:text-5xl font-black text-gradient-promo mb-2">
            {{ title }}
          </h2>
          <p class="text-base md:text-lg text-base-content/70 font-medium">
            {{ subtitle }}
          </p>
        </div>
        
        <!-- Decoración -->
        <div class="hidden lg:flex items-center gap-3">
          <div class="relative">
            <div class="absolute inset-0 bg-warning/20 blur-xl rounded-full"></div>
            <Star :size="64" class="text-warning relative z-10 fill-warning" />
          </div>
        </div>
      </div>

      <!-- Grid de Banners 2x2 para Promociones -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <div
          v-for="game in displayGames"
          :key="game.id"
          class="group relative overflow-hidden rounded-2xl cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl"
        >
          <!-- Banner horizontal -->
          <div class="relative h-[280px] md:h-[320px] overflow-hidden">
            <!-- Imagen de fondo -->
            <div 
              class="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
              :style="{ 
                backgroundImage: game.foto ? `url(${game.foto})` : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
              }"
            ></div>
            
            <!-- Overlay gradiente -->
            <div class="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent"></div>
            
            <!-- Badge de promoción -->
            <div class="absolute top-4 right-4">
              <div class="badge badge-warning badge-lg gap-2 font-bold shadow-lg">
                <Zap :size="16" class="fill-current" />
                PROMOCIÓN
              </div>
            </div>
            
            <!-- Contenido del banner -->
            <div class="absolute inset-0 flex flex-col justify-end p-6">
              <!-- Plataforma y stock -->
              <div class="flex flex-wrap gap-2 mb-3">
                <span class="badge badge-primary badge-sm">
                  {{ game.version }}
                </span>
                <span v-if="game.stockAccounts && game.stockAccounts > 0" class="badge badge-success badge-sm">
                  {{ game.stockAccounts }} disponible{{ game.stockAccounts > 1 ? 's' : '' }}
                </span>
              </div>
              
              <!-- Título -->
              <h3 class="text-2xl md:text-3xl font-black text-white mb-3 drop-shadow-lg line-clamp-2 group-hover:text-warning transition-colors">
                {{ game.nombre }}
              </h3>
              
              <!-- Precio y botón -->
              <div class="flex items-center justify-between gap-4">
                <div class="flex items-center gap-2">
                  <div class="bg-warning/20 backdrop-blur-md px-4 py-2 rounded-lg border border-warning/30">
                    <p class="text-2xl font-black text-white">
                      {{ formatPrice(game.costo) }}
                    </p>
                  </div>
                </div>
                
                <button
                  @click.stop="addToCart(game)"
                  class="btn btn-warning btn-sm md:btn-md gap-2 shadow-lg hover:scale-110 transition-transform"
                >
                  <ShoppingCart :size="18" />
                  <span class="hidden md:inline">Agregar</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Promociones adicionales en formato compacto -->
      <div v-if="games.length > 4" class="mt-8">
        <div class="divider">
          <span class="text-sm font-semibold">Más Promociones</span>
        </div>
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          <div
            v-for="game in games.slice(4, 12)"
            :key="game.id"
            class="group relative overflow-hidden rounded-xl cursor-pointer hover:scale-105 transition-all duration-300 hover:shadow-xl"
            @click="addToCart(game)"
          >
            <!-- Card compacta -->
            <div class="aspect-[3/4] relative overflow-hidden">
              <img
                v-if="game.foto"
                :src="game.foto"
                :alt="game.nombre"
                class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
              />
              <div v-else class="w-full h-full bg-gradient-to-br from-warning to-primary"></div>
              
              <!-- Overlay con info -->
              <div class="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                <div class="absolute inset-0 flex flex-col justify-end p-3">
                  <p class="text-xs md:text-sm font-bold text-white line-clamp-2 mb-2">{{ game.nombre }}</p>
                  <div class="flex items-center justify-between">
                    <p class="text-lg md:text-xl font-black text-warning">{{ formatPrice(game.costo) }}</p>
                    <div class="btn btn-xs btn-warning btn-circle">
                      <ShoppingCart :size="14" />
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Badge flotante -->
              <div class="absolute top-2 right-2 badge badge-warning badge-xs font-bold">
                HOT
              </div>
            </div>
          </div>
        </div>
        
        <!-- Mensaje si hay aún más promociones -->
        <div v-if="games.length > 12" class="mt-6 text-center">
          <div class="inline-flex items-center gap-2 bg-base-300/50 px-6 py-3 rounded-full border border-white/10">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-info" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span class="text-sm font-medium">
              ¡Y {{ games.length - 12 }} promociones más disponibles!
            </span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.text-gradient-promo {
  background: linear-gradient(90deg, #feca57, #48dbfb, #feca57);
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

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>

