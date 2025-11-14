<script setup lang="ts">
import { computed } from 'vue'
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
  <div>
    <!-- Header del catálogo -->
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 animate-fadeInUp">
      <div>
        <h2 class="text-4xl font-black text-gradient mb-2">Todos los Juegos</h2>
        <p class="text-base-content/60">Explora nuestro catálogo completo de {{ games.length }} juegos</p>
      </div>
      <div class="stats shadow-glow glass-effect border border-white/10">
        <div class="stat py-4 px-8">
          <div class="stat-title text-xs font-semibold">Total de Juegos</div>
          <div class="stat-value text-error text-3xl font-black">{{ games.length }}</div>
          <div class="stat-desc text-xs">Disponibles ahora</div>
        </div>
      </div>
    </div>

    <!-- Grid de Todos los Juegos -->
    <div id="catalogo-completo">
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4 mb-8">
        <GameCard
          v-for="juego in paginatedGames"
          :key="juego.id"
          :game="juego"
        />
      </div>
      
      <!-- Paginación -->
      <div class="mb-16">
        <Pagination 
          :current-page="currentPage"
          :total-pages="totalPages"
          @page-change="(page) => emit('page-change', page)"
          @next="emit('next')"
          @prev="emit('prev')"
        />
      </div>
    </div>
  </div>
</template>

