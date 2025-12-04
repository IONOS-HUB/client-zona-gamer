<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowRight } from 'lucide-vue-next'
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
const router = useRouter()

const paginatedGames = computed(() => {
  const start = (props.currentPage - 1) * props.itemsPerPage
  const end = start + props.itemsPerPage
  return props.games.slice(start, end)
})

const totalPages = computed(() => {
  return Math.ceil(props.games.length / props.itemsPerPage)
})

const handleVerTodos = () => {
  router.push({ 
    name: 'VerMas', 
    query: { 
      tipo: 'juegos'
    } 
  })
}
</script>

<template>
  <div>
    <!-- Header del catálogo -->
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 animate-fadeInUp">
      <div>
        <h2 class="text-4xl font-black text-gradient mb-2">Catálogo Completo</h2>
        <p class="text-base-content/60">Explora nuestro catálogo completo de {{ games.length }} juegos</p>
      </div>
      <div class="flex items-center gap-4">

        <button 
          @click="handleVerTodos"
          class="btn btn-error btn-outline gap-2"
        >
          <span>Ver Catálogo Completo</span>
          <ArrowRight :size="20" />
        </button>
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

<style scoped>
.text-gradient {
  background: linear-gradient(90deg, #ff6b6b, #feca57);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
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

.glass-effect {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}
</style>
