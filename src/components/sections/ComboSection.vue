<script setup lang="ts">
import { computed } from 'vue'
import { useGames } from '@/composables/useGames'
import { useCartStore } from '@/stores/cart'
import GameCard from '@/components/ui/GameCard.vue'
import { Package, Sparkles } from 'lucide-vue-next'

const { games } = useGames()
const cartStore = useCartStore()

// Simular combos (puedes conectarlo a datos reales más adelante)
interface Combo {
  id: string
  nombre: string
  juegos: string[] // IDs de los juegos
  precioTotal: number
  descuento: number
  imagen?: string
}

// Por ahora, creamos combos basados en juegos destacados
const combos = computed<Combo[]>(() => {
  const destacados = games.value.filter(game => game.destacado || (game.descuento && game.descuento > 0))
  
  if (destacados.length < 2) return []
  
  // Crear combos de 2-3 juegos
  const combosList: Combo[] = []
  
  for (let i = 0; i < Math.min(3, Math.floor(destacados.length / 2)); i++) {
    const juego1 = destacados[i * 2]
    const juego2 = destacados[i * 2 + 1]
    const juego3 = destacados[i * 2 + 2] || null
    
    const juegosIds = juego3 
      ? [juego1.id, juego2.id, juego3.id]
      : [juego1.id, juego2.id]
    
    const precioTotal = juego3
      ? juego1.costo + juego2.costo + juego3.costo
      : juego1.costo + juego2.costo
    
    const descuento = 15 + (i * 5) // 15%, 20%, 25%
    const precioConDescuento = precioTotal * (1 - descuento / 100)
    
    combosList.push({
      id: `combo-${i + 1}`,
      nombre: juego3 
        ? `Combo ${juego1.nombre.substring(0, 10)} + ${juego2.nombre.substring(0, 10)} + ${juego3.nombre.substring(0, 10)}`
        : `Combo ${juego1.nombre.substring(0, 15)} + ${juego2.nombre.substring(0, 15)}`,
      juegos: juegosIds,
      precioTotal: precioConDescuento,
      descuento: descuento,
      imagen: juego1.foto
    })
  }
  
  return combosList
})

const formatearPrecio = (precio: number): string => {
  return new Intl.NumberFormat('es-US', {
    style: 'currency',
    currency: 'USD'
  }).format(precio)
}

const getJuegosDelCombo = (combo: Combo) => {
  return games.value.filter(game => combo.juegos.includes(game.id))
}

const agregarComboAlCarrito = (combo: Combo): void => {
  const juegos = getJuegosDelCombo(combo)
  juegos.forEach(juego => {
    cartStore.addToCart(juego, 1)
  })
}
</script>

<template>
  <div class="w-full bg-base-200 py-12 md:py-16">
    <div class="container mx-auto px-4 md:px-6">
      <!-- Header -->
      <div class="flex items-center gap-4 mb-8 animate-fadeInUp">
        <div class="relative">
          <Package :size="48" class="text-error animate-float" :stroke-width="2" />
          <div class="absolute inset-0 blur-xl bg-error/30"></div>
        </div>
        <div class="flex-1">
          <h2 class="text-4xl font-black text-gradient-animated mb-1">Combos Especiales</h2>
          <p class="text-base-content/70 text-lg">Ahorra más comprando paquetes de juegos</p>
        </div>
        <div class="flex items-center gap-2">
          <Sparkles :size="24" class="text-warning animate-pulse" />
        </div>
      </div>

      <!-- Grid de Combos -->
      <div v-if="combos.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="combo in combos"
          :key="combo.id"
          class="card bg-base-100 shadow-xl hover:shadow-2xl border border-white/10 overflow-hidden group transition-all duration-300 hover:scale-105"
        >
          <!-- Imagen del combo -->
          <figure class="relative h-48 bg-gradient-to-br from-error/20 via-primary/20 to-warning/20 overflow-hidden">
            <img 
              v-if="combo.imagen" 
              :src="combo.imagen" 
              alt="Combo"
              class="w-full h-full object-cover opacity-50 group-hover:opacity-70 transition-opacity duration-300"
            />
            <div v-else class="w-full h-full flex items-center justify-center">
              <Package :size="64" class="text-base-content/30" />
            </div>
            
            <!-- Badge de descuento -->
            <div class="absolute top-4 left-4 bg-error text-white font-black px-4 py-2 rounded-lg shadow-lg text-lg">
              -{{ combo.descuento }}%
            </div>
            
            <!-- Overlay con gradiente -->
            <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
          </figure>

          <!-- Contenido del combo -->
          <div class="card-body p-6">
            <h3 class="card-title text-xl font-bold mb-3 line-clamp-2">
              {{ combo.nombre }}
            </h3>

            <!-- Lista de juegos -->
            <div class="space-y-2 mb-4">
              <div
                v-for="juegoId in combo.juegos"
                :key="juegoId"
                class="flex items-center gap-2 text-sm"
              >
                <div class="w-2 h-2 rounded-full bg-error"></div>
                <span class="text-base-content/80">
                  {{ games.value.find(g => g.id === juegoId)?.nombre || 'Juego' }}
                </span>
              </div>
            </div>

            <!-- Precio -->
            <div class="flex items-center justify-between mb-4 pt-4 border-t border-white/10">
              <div>
                <p class="text-xs text-base-content/60 line-through">
                  {{ formatearPrecio(combo.precioTotal / (1 - combo.descuento / 100)) }}
                </p>
                <p class="text-2xl font-black text-error">
                  {{ formatearPrecio(combo.precioTotal) }}
                </p>
              </div>
              <div class="badge badge-success badge-lg">
                Ahorra {{ formatearPrecio((combo.precioTotal / (1 - combo.descuento / 100)) - combo.precioTotal) }}
              </div>
            </div>

            <!-- Botón agregar -->
            <button
              @click="agregarComboAlCarrito(combo)"
              class="btn btn-error w-full text-white font-bold gap-2 shadow-glow hover:shadow-glow"
            >
              <Package :size="20" />
              Agregar Combo al Carrito
            </button>
          </div>
        </div>
      </div>

      <!-- Mensaje si no hay combos -->
      <div v-else class="text-center py-20 animate-fadeInUp">
        <div class="flex justify-center mb-6 relative">
          <Package :size="120" class="text-error/20 animate-float" :stroke-width="1.5" />
          <div class="absolute inset-0 blur-2xl bg-error/10"></div>
        </div>
        <h3 class="text-3xl font-black text-gradient mb-3">No hay combos disponibles</h3>
        <p class="text-base-content/60 text-lg">Los combos aparecerán cuando haya suficientes juegos destacados</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  line-clamp: 2;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>

