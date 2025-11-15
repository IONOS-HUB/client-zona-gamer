<script setup lang="ts">
import { Flame } from 'lucide-vue-next'
import GameCard from '@/components/ui/GameCard.vue'
import type { GameSummary } from '@/types/game'

interface Props {
  games: GameSummary[]
}

defineProps<Props>()
</script>

<template>
  <div v-if="games.length > 0" class="mb-16 relative z-10">
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
        v-for="game in games.slice(0, 12)"
        :key="game.id"
        :game="game"
      />
    </div>
  </div>
</template>

