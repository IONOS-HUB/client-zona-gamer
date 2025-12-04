<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { GameSummary } from '@/types/game'
import {ChevronLeft, ChevronRight, ArrowRight } from 'lucide-vue-next'
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

const router = useRouter()
const currentIndex = ref(0)
const maxItems = 5

const hasGames = computed(() => props.games.length > 0)

// Mostrar solo los primeros 10 juegos
const displayedGames = computed(() => props.games.slice(0, maxItems))
const hasMoreGames = computed(() => props.games.length > maxItems)

// Cantidad de items a mostrar en el carrusel
const itemsPerView = computed(() => {
  if (typeof window !== 'undefined') {
    if (window.innerWidth >= 1536) return 6 // 2xl
    if (window.innerWidth >= 1280) return 5 // xl
    if (window.innerWidth >= 1024) return 4 // lg
    if (window.innerWidth >= 768) return 3 // md
    if (window.innerWidth >= 640) return 2 // sm
  }
  return 2 // default
})

const maxIndex = computed(() => Math.max(0, displayedGames.value.length - itemsPerView.value))

const canGoLeft = computed(() => currentIndex.value > 0)
const canGoRight = computed(() => currentIndex.value < maxIndex.value)

const scrollLeft = () => {
  if (canGoLeft.value) {
    currentIndex.value = Math.max(0, currentIndex.value - 1)
  }
}

const scrollRight = () => {
  if (canGoRight.value) {
    currentIndex.value = Math.min(maxIndex.value, currentIndex.value + 1)
  }
}

const handleVerMas = () => {
  router.push({ 
    name: 'VerMas', 
    query: { 
      tipo: 'promociones',
      categoria: props.title 
    } 
  })
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

      <!-- Carrusel Container -->
      <div class="relative overflow-hidden">
        <!-- Controles de navegación -->
        <div v-if="displayedGames.length > itemsPerView" class="absolute top-1/2 -translate-y-1/2 left-2 right-2 flex justify-between items-center pointer-events-none z-10">
          <button 
            @click="scrollLeft"
            :disabled="!canGoLeft"
            :class="[
              'btn btn-circle bg-base-100/90 hover:bg-base-100 border-white/20 shadow-xl pointer-events-auto transition-all duration-300',
              canGoLeft ? 'opacity-100' : 'opacity-30'
            ]"
          >
            <ChevronLeft :size="24" />
          </button>
          <button 
            @click="scrollRight"
            :disabled="!canGoRight"
            :class="[
              'btn btn-circle bg-base-100/90 hover:bg-base-100 border-white/20 shadow-xl pointer-events-auto transition-all duration-300',
              canGoRight ? 'opacity-100' : 'opacity-30'
            ]"
          >
            <ChevronRight :size="24" />
          </button>
        </div>

        <!-- Carrusel de juegos -->
        <div class="overflow-hidden">
          <div 
            class="flex transition-transform duration-500 ease-out gap-4"
            :style="{ transform: `translateX(-${currentIndex * (100 / itemsPerView)}%)` }"
          >
            <div
              v-for="game in displayedGames"
              :key="game.id"
              class="flex-shrink-0"
              :style="{ width: `calc(${100 / itemsPerView}% - ${(itemsPerView - 1) * 16 / itemsPerView}px)` }"
            >
              <GameCard
                :game="game"
                :show-add-to-cart="true"
              />
            </div>
          </div>
        </div>

        <!-- Indicadores de puntos -->
        <div v-if="maxIndex > 0" class="flex justify-center gap-2 mt-6">
          <button
            v-for="i in (maxIndex + 1)"
            :key="i"
            @click="currentIndex = i - 1"
            :class="[
              'h-2 rounded-full transition-all duration-300',
              currentIndex === i - 1 ? 'w-8 bg-warning' : 'w-2 bg-base-content/30 hover:bg-base-content/50'
            ]"
          />
        </div>
      </div>

      <!-- Botón Ver Más (si hay más de 5 juegos) -->
      <div v-if="hasMoreGames" class="mt-10 flex justify-center">
        <button 
          @click="handleVerMas"
          class="btn btn-error btn-outline gap-2"
        >
          <span>Ver Todas las Promociones</span>
          <ArrowRight :size="24" />
        </button>
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
