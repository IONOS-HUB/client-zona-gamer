<script setup lang="ts">
import { computed } from 'vue'
import type { GameSummary } from '@/types/game'
import GameCard from '@/components/ui/GameCard.vue'

interface Props {
  games: GameSummary[]
  title?: string
  subtitle?: string
  variant?: 'primary' | 'secondary'
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Ofertas Especiales',
  subtitle: 'Aprovecha estos precios increíbles',
  variant: 'primary'
})

const displayGames = computed(() => {
  // Mostrar máximo 8 juegos en ofertas
  return props.games.slice(0, 8)
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
</script>

<template>
  <section v-if="hasGames" class="mb-16 animate-fadeInUp">
    <div :class="['rounded-3xl p-8 border border-white/10 backdrop-blur-sm', sectionClasses]">
      <!-- Header de la sección -->
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div class="flex-1">
          <div class="flex items-center gap-3 mb-2">
            <span :class="['badge badge-lg font-bold', badgeClasses]">
              {{ games.length }} {{ games.length === 1 ? 'Oferta' : 'Ofertas' }}
            </span>
          </div>
          <h2 class="text-4xl md:text-5xl font-black text-gradient-animated mb-2">
            {{ title }}
          </h2>
          <p class="text-lg text-base-content/70 font-medium">
            {{ subtitle }}
          </p>
        </div>
        
        <!-- Decoración -->
        <div class="hidden lg:flex items-center gap-3">
          <div class="relative">
            <div class="absolute inset-0 bg-error/20 blur-xl rounded-full"></div>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 text-error relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>

      <!-- Grid de juegos -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <GameCard 
          v-for="game in displayGames" 
          :key="game.id"
          :game="game"
          class="hover:scale-105 transition-transform duration-300"
        />
      </div>

      <!-- Mensaje si hay más ofertas -->
      <div v-if="games.length > 8" class="mt-8 text-center">
        <div class="inline-flex items-center gap-2 bg-base-300/50 px-6 py-3 rounded-full border border-white/10">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span class="text-sm font-medium">
            ¡Y {{ games.length - 8 }} ofertas más disponibles!
          </span>
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
</style>

