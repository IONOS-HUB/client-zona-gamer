<script setup lang="ts">
import { ref, computed } from 'vue'
import { Gamepad2 } from 'lucide-vue-next'
import GameCard from '@/components/ui/GameCard.vue'
import Pagination from '@/components/ui/Pagination.vue'
import type { GameSummary } from '@/types/game'

interface Props {
  games: GameSummary[]
  platformName: string
  platformTitle: string
  platformDescription: string
  itemsPerPage?: number
}

interface Emits {
  (e: 'view-more'): void
}

const props = withDefaults(defineProps<Props>(), {
  itemsPerPage: 12
})

const emit = defineEmits<Emits>()

const showAll = ref(false)
const currentPage = ref(1)

const paginatedGames = computed(() => {
  const start = (currentPage.value - 1) * props.itemsPerPage
  const end = start + props.itemsPerPage
  return props.games.slice(start, end)
})

const totalPages = computed(() => {
  return Math.ceil(props.games.length / props.itemsPerPage)
})

const handleViewMore = () => {
  showAll.value = true
  currentPage.value = 1
  emit('view-more')
}

const handlePageChange = (page: number) => {
  currentPage.value = page
}

const handleNextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
  }
}

const handlePrevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--
  }
}
</script>

<template>
  <div class="mb-16 animate-fadeInUp">
    <div class="flex items-center gap-4 mb-8">
      <div class="relative">
        <Gamepad2 :size="48" class="text-error animate-float" :stroke-width="2" />
        <div class="absolute inset-0 blur-xl bg-error/30"></div>
      </div>
      <div class="flex-1">
        <h2 class="text-4xl font-black text-gradient-animated mb-1">{{ platformTitle }}</h2>
        <p class="text-base-content/70 text-lg">{{ platformDescription }}</p>
      </div>
      <button 
        v-if="!showAll && games.length > 6"
        @click="handleViewMore"
        class="btn btn-outline btn-error gap-2 hover:scale-105 transition-transform"
      >
        Ver Más
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </button>
    </div>
    
    <div v-if="games.length > 0">
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4 mb-8">
        <GameCard
          v-for="game in showAll ? paginatedGames : games.slice(0, 6)"
          :key="game.id"
          :game="game"
        />
      </div>
      
      <!-- Paginación (solo cuando está expandido) -->
      <div v-if="showAll">
        <Pagination 
          :current-page="currentPage"
          :total-pages="totalPages"
          @page-change="handlePageChange"
          @next="handleNextPage"
          @prev="handlePrevPage"
        />
      </div>
    </div>
    
    <div v-else class="text-center py-12">
      <p class="text-base-content/60">No hay juegos {{ platformName }} disponibles en este momento</p>
    </div>
  </div>
</template>

