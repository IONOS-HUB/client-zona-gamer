<script setup lang="ts">
import { computed } from 'vue'
import type { GameSummary } from '@/types/game'
import GameCard from '@/components/ui/GameCard.vue'

interface Props {
  games: GameSummary[]
  title?: string
  subtitle?: string
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Promociones Destacadas',
  subtitle: 'Los mejores juegos en promoción'
})

const displayGames = computed(() => {
  // Mostrar máximo 8 juegos
  return props.games.slice(0, 8)
})

const hasGames = computed(() => props.games.length > 0)
</script>

<template>
  <section v-if="hasGames" class="mb-16 animate-fadeInUp">
    <div class="rounded-3xl p-8 bg-gradient-to-br from-warning/10 via-base-200/50 to-primary/10 border border-white/10 backdrop-blur-sm">
      <!-- Header de la sección -->
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div class="flex-1">
          <div class="flex items-center gap-3 mb-2">
            <span class="badge badge-lg badge-warning font-bold">
              {{ games.length }} {{ games.length === 1 ? 'Promoción' : 'Promociones' }}
            </span>
          </div>
          <h2 class="text-4xl md:text-5xl font-black text-gradient-promo mb-2">
            {{ title }}
          </h2>
          <p class="text-lg text-base-content/70 font-medium">
            {{ subtitle }}
          </p>
        </div>
        
        <!-- Decoración -->
        <div class="hidden lg:flex items-center gap-3">
          <div class="relative">
            <div class="absolute inset-0 bg-warning/20 blur-xl rounded-full"></div>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 text-warning relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
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

      <!-- Mensaje si hay más promociones -->
      <div v-if="games.length > 8" class="mt-8 text-center">
        <div class="inline-flex items-center gap-2 bg-base-300/50 px-6 py-3 rounded-full border border-white/10">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-info" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span class="text-sm font-medium">
            ¡Y {{ games.length - 8 }} promociones más disponibles!
          </span>
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
</style>

