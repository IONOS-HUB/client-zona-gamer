<script setup lang="ts">
import { computed } from 'vue'
import { Gamepad2 } from 'lucide-vue-next'
import GameCard from '@/components/ui/GameCard.vue'
import Pagination from '@/components/ui/Pagination.vue'
import type { GameSummary } from '@/types/game'

interface Props {
  games: GameSummary[]
  currentPage: number
  itemsPerPage: number
}

interface Emits {
  (e: 'page-change', page: number): void
  (e: 'next'): void
  (e: 'prev'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const paginatedGames = computed(() => {
  const start = (props.currentPage - 1) * props.itemsPerPage
  const end = start + props.itemsPerPage
  return props.games.slice(start, end)
})

const totalPages = computed(() => {
  return Math.ceil(props.games.length / props.itemsPerPage)
})
</script>

<template>
  <div id="catalogo-completo" class="relative z-10">
    <!-- No hay juegos -->
    <div v-if="games.length === 0" class="text-center py-20 animate-fadeInUp">
      <div class="flex justify-center mb-6 relative">
        <Gamepad2 :size="120" class="text-error/20 animate-float" :stroke-width="1.5" />
        <div class="absolute inset-0 blur-2xl bg-error/10"></div>
      </div>
      <h2 class="text-3xl font-black text-gradient mb-3">No se encontraron juegos</h2>
      <p class="text-base-content/60 text-lg mb-6">Intenta con otra búsqueda o plataforma</p>
      <button class="btn btn-error gap-2 shadow-glow">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Restablecer Filtros
      </button>
    </div>

    <!-- Grid de Juegos -->
    <div v-else>
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4 mb-8">
        <GameCard
          v-for="juego in paginatedGames"
          :key="juego.id"
          :game="juego"
        />
      </div>
      
      <!-- Paginación -->
      <Pagination 
        :current-page="currentPage"
        :total-pages="totalPages"
        @page-change="(page) => emit('page-change', page)"
        @next="emit('next')"
        @prev="emit('prev')"
      />
    </div>
  </div>
</template>

