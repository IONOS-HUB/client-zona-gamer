<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Gamepad2, ArrowRight } from 'lucide-vue-next'
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
const router = useRouter()

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

const handleVerTodos = () => {
  router.push({ 
    name: 'VerMas', 
    query: { 
      tipo: 'juegos',
      plataforma: props.platformName
    } 
  })
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
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
      <div class="flex items-center gap-4">
        <div class="relative">
          <Gamepad2 :size="48" class="text-error animate-float" :stroke-width="2" />
          <div class="absolute inset-0 blur-xl bg-error/30"></div>
        </div>
        <div class="flex-1">
          <h2 class="text-4xl font-black text-gradient-animated mb-1">{{ platformTitle }}</h2>
          <p class="text-base-content/70 text-lg">{{ platformDescription }}</p>
        </div>
      </div>
      <button 
        v-if="!showAll && games.length > 6"
        @click="handleViewMore"
        class="btn btn-error btn-outline gap-2"
      >
        Ver Más
        <ArrowRight :size="20" />
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
      <div v-if="showAll && totalPages > 1" class="mb-8">
        <Pagination 
          :current-page="currentPage"
          :total-pages="totalPages"
          @page-change="handlePageChange"
          @next="handleNextPage"
          @prev="handlePrevPage"
        />
      </div>

      <!-- Botón para ir a vista con filtros -->
      <div v-if="games.length > 6" class="flex justify-center mt-10">
        <button 
          @click="handleVerTodos"
          class="btn btn-error btn-outline gap-2"
        >
          <span>Ver Todos los Juegos {{ platformName }}</span>
          <ArrowRight :size="24" />
        </button>
      </div>
    </div>
    
    <div v-else class="text-center py-12">
      <p class="text-base-content/60">No hay juegos {{ platformName }} disponibles en este momento</p>
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
