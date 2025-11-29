<script setup lang="ts">
import { computed } from 'vue'
import { useGames } from '@/composables/useGames'
import GameCard from '@/components/ui/GameCard.vue'
import { ChevronRight } from 'lucide-vue-next'

const { games } = useGames()

// Filtrar juegos indie o destacados para el top
const topIndieGames = computed(() => {
  // Por ahora, tomamos los primeros 4 juegos destacados o con descuento que estén activos
  return games.value
    .filter(game => {
      const estaActivo = game.activo !== false
      const esDestacado = game.destacado || (game.descuento && game.descuento > 0)
      return estaActivo && esDestacado
    })
    .slice(0, 4)
})
</script>

<template>
  <div class="w-full bg-base-200 py-12 md:py-16">
    <div class="container mx-auto px-4 md:px-6">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
        <!-- Lado izquierdo - Ilustración -->
        <div class="relative order-2 lg:order-1">
          <div class="relative w-full aspect-square max-w-md mx-auto lg:mx-0">
            <!-- Imagen de fondo con gradiente -->
            <div class="absolute inset-0 bg-gradient-to-br from-orange-500/20 via-red-500/20 to-purple-500/20 rounded-lg blur-2xl"></div>
            
            <!-- Contenedor de la ilustración -->
            <div class="relative w-full h-full bg-base-300 rounded-lg overflow-hidden flex items-center justify-center">
              <!-- Puedes reemplazar esto con una imagen real -->
              <div class="text-center p-8">
                <div class="text-6xl mb-4">🎮</div>
                <h3 class="text-2xl font-bold text-white mb-2">Dead Cells</h3>
                <p class="text-base-content/70">Roguelike de acción</p>
              </div>
              
              <!-- Alternativa: Si tienes una imagen -->
              <!-- <img 
                src="/path/to/dead-cells-image.jpg" 
                alt="Dead Cells"
                class="w-full h-full object-cover"
              /> -->
            </div>
          </div>
        </div>

        <!-- Lado derecho - Top juegos -->
        <div class="order-1 lg:order-2">
          <!-- Header -->
          <div class="flex items-center gap-3 mb-6">
            <h2 class="text-3xl md:text-4xl font-bold text-white">Top juegos indie</h2>
            <ChevronRight :size="24" class="text-base-content/60" />
          </div>

          <!-- Grid de juegos 2x2 -->
          <div v-if="topIndieGames.length > 0" class="grid grid-cols-2 gap-4">
            <GameCard
              v-for="game in topIndieGames"
              :key="game.id"
              :game="game"
            />
          </div>

          <!-- Mensaje si no hay juegos -->
          <div v-else class="text-center py-12">
            <p class="text-base-content/60">No hay juegos disponibles</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

