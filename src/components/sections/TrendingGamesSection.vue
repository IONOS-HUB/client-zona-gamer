<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { Flame, ArrowRight } from 'lucide-vue-next'
import GameCard from '@/components/ui/GameCard.vue'
import type { GameSummary } from '@/types/game'

interface Props {
  games: GameSummary[]
}

const props = defineProps<Props>()
const router = useRouter()

const displayedGames = computed(() => props.games.slice(0, 12))
const hasMoreGames = computed(() => props.games.length > 12)

const handleVerMas = () => {
  router.push({ 
    name: 'VerMas', 
    query: { 
      tipo: 'juegos',
      orden: 'relevancia'
    } 
  })
}
</script>

<template>
  <div v-if="games.length > 0" class="mb-16 relative z-10">
    <!-- Header mejorado -->
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 animate-fadeInUp">
      <div class="flex items-center gap-4">
        <div class="relative">
          <Flame :size="48" class="text-error animate-float" :stroke-width="2" />
          <div class="absolute inset-0 blur-xl bg-error/30"></div>
        </div>
        <div class="flex-1">
          <h2 class="text-4xl font-black text-gradient-animated mb-1">En Tendencias</h2>
          <p class="text-base-content/70 text-lg">Los juegos más populares y vendidos ahora mismo</p>
        </div>
      </div>
    </div>
    
    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4 mb-8">
      <GameCard
        v-for="game in displayedGames"
        :key="game.id"
        :game="game"
      />
    </div>

    <!-- Botón Ver Más -->
    <div v-if="hasMoreGames" class="flex justify-center mt-10">
      <button 
        @click="handleVerMas"
        class="btn btn-error btn-outline gap-2"
      >
        <span>Ver Todos los Juegos</span>
        <ArrowRight :size="24" />
      </button>
    </div>
  </div>
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

@keyframes float {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

.animate-float {
  animation: float 3s ease-in-out infinite;
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
