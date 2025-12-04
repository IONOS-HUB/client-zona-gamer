<script setup lang="ts">
import { computed, watch, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useCombos } from '@/composables/useCombos'
import { useCartStore } from '@/stores/cart'
import type { ComboSummary } from '@/types/combo'
import type { GameSummary } from '@/types/game'
import { Package, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-vue-next'

const { combos, isLoadingCombos } = useCombos()
const cartStore = useCartStore()
const router = useRouter()
const currentIndex = ref(0)
const maxItems = 5

// Mostrar solo los combos activos y que tengan correos
const combosDisponibles = computed(() => {
  return combos.value.filter(combo => {
    // Filtrar por activo (por defecto true si no está definido)
    const estaActivo = combo.activo !== false
    // Filtrar por correos disponibles
    const tieneCorreos = (combo.totalCorreos ?? 0) > 0
    return estaActivo && tieneCorreos
  })
})

// Mostrar solo los primeros 10 combos
const displayedCombos = computed(() => combosDisponibles.value.slice(0, maxItems))
const hasMoreCombos = computed(() => combosDisponibles.value.length > maxItems)

// Cantidad de items a mostrar en el carrusel
const itemsPerView = computed(() => {
  if (typeof window !== 'undefined') {
    if (window.innerWidth >= 1280) return 3 // xl
    if (window.innerWidth >= 768) return 2 // md
  }
  return 1 // default mobile
})

const maxIndex = computed(() => Math.max(0, displayedCombos.value.length - itemsPerView.value))

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

// Debug: log para ver qué combos se están cargando
watch(combos, (newCombos) => {
  console.log('🔍 Combos cargados en ComboSection:', newCombos.length)
  console.log('📦 Detalles de combos:', newCombos.map(c => ({ 
    id: c.id, 
    nombre: c.nombre, 
    correos: c.totalCorreos, 
    stock: c.stockAccounts,
    activo: c.activo
  })))
}, { immediate: true })


// Obtener el precio del combo
const getPrecioCombo = (combo: ComboSummary): number => {
  return combo.precio || combo.costo || 0
}

// Calcular descuento si está en promoción
const calcularDescuento = (combo: ComboSummary): number => {
  // Si hay descuento configurado, usarlo
  if (combo.descuento) return combo.descuento
  // Si está en oferta, mostrar un descuento por defecto
  if (combo.tipoPromocion === 'oferta' || combo.isOffert) return 15
  if (combo.tipoPromocion === 'promocion') return 10
  return 0
}

const formatearPrecio = (precio: number): string => {
  return new Intl.NumberFormat('es-US', {
    style: 'currency',
    currency: 'USD'
  }).format(precio)
}

// Agregar combo al carrito (tratándolo como un juego)
const agregarComboAlCarrito = (combo: ComboSummary): void => {
  const precioCombo = getPrecioCombo(combo)
  
  // Convertir el combo a formato GameSummary para el carrito
  // Para combos, todos los precios son iguales (precio único)
  const comboAsGame: GameSummary = {
    id: combo.id,
    nombre: combo.nombre,
    foto: combo.foto,
    version: combo.version,
    // Para combos, todos los precios son iguales al precio único
    precios: {
      ps4Principal: precioCombo,
      ps4Secundaria: precioCombo,
      ps5Principal: precioCombo,
      ps5Secundaria: precioCombo
    },
    tipoPromocion: combo.tipoPromocion || 'ninguna',
    isOffert: combo.isOffert || false,
    descuento: calcularDescuento(combo),
    stockAccounts: combo.stockAccounts || 0,
    totalCorreos: combo.totalCorreos,
    correos: combo.correos || [],
    // Campos adicionales para compatibilidad
    costo: precioCombo,
    activo: combo.activo !== false
  }
  
  // Para combos, usamos Principal PS4 como tipo por defecto, pero el precio es el mismo para todos
  cartStore.addToCart(comboAsGame, 1, 'Principal PS4')
}

const handleVerMas = () => {
  router.push({ 
    name: 'VerMas', 
    query: { 
      tipo: 'combos' 
    } 
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

      <!-- Loading -->
      <div v-if="isLoadingCombos" class="flex justify-center items-center py-20">
        <span class="loading loading-spinner loading-lg text-error"></span>
      </div>

      <!-- Carrusel de Combos -->
      <div v-else-if="displayedCombos.length > 0" class="relative overflow-hidden">
        <!-- Controles de navegación -->
        <div v-if="displayedCombos.length > itemsPerView" class="absolute top-1/2 -translate-y-1/2 left-2 right-2 flex justify-between items-center pointer-events-none z-10">
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

        <!-- Carrusel -->
        <div class="overflow-hidden">
          <div 
            class="flex transition-transform duration-500 ease-out gap-6"
            :style="{ transform: `translateX(-${currentIndex * (100 / itemsPerView)}%)` }"
          >
            <div
              v-for="combo in displayedCombos"
              :key="combo.id"
              class="flex-shrink-0"
              :style="{ width: `calc(${100 / itemsPerView}% - ${(itemsPerView - 1) * 24 / itemsPerView}px)` }"
            >
              <div class="card bg-base-100 shadow-xl hover:shadow-2xl border border-white/10 overflow-hidden group transition-all duration-300 hover:scale-[1.02] h-full flex flex-col">
                <!-- Imagen del combo -->
                <figure class="relative h-48 bg-gradient-to-br from-error/20 via-primary/20 to-warning/20 overflow-hidden">
                  <img 
                    v-if="combo.foto" 
                    :src="combo.foto" 
                    :alt="combo.nombre"
                    class="w-full h-full object-cover opacity-50 group-hover:opacity-70 transition-opacity duration-300"
                  />
                  <div v-else class="w-full h-full flex items-center justify-center">
                    <Package :size="64" class="text-base-content/30" />
                  </div>
                  
                  <!-- Badge de descuento (si tiene promoción) -->
                  <div 
                    v-if="combo.tipoPromocion === 'oferta' || combo.tipoPromocion === 'promocion' || combo.isOffert"
                    class="absolute top-4 left-4 bg-error text-white font-black px-4 py-2 rounded-lg shadow-lg text-lg"
                  >
                    -{{ calcularDescuento(combo) }}%
                  </div>
                  
                  
                  <!-- Overlay con gradiente -->
                  <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
                </figure>

                <!-- Contenido del combo -->
                <div class="card-body p-6 flex-grow flex flex-col">
                  <h3 class="card-title text-xl font-bold mb-3 line-clamp-2">
                    {{ combo.nombre }}
                  </h3>

                  <!-- Información del combo -->
                  <div class="space-y-2 mb-4">
                    <div class="flex items-center gap-2 text-sm text-base-content/70">
                      <Package :size="16" />
                      <span>{{ combo.version }}</span>
                    </div>
                    <div class="flex items-center gap-2 text-sm text-base-content/70">
                      <span>📧 {{ combo.totalCorreos }} correo{{ combo.totalCorreos > 1 ? 's' : '' }} disponible{{ combo.totalCorreos > 1 ? 's' : '' }}</span>
                    </div>
                  </div>

                  <!-- Juegos incluidos -->
                  <div class="mb-4 pt-4 border-t border-white/10 flex-grow">
                    <div class="mb-3">
                      <h4 class="font-bold text-sm text-base-content/80 mb-2 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        Juegos Incluidos ({{ combo.juegos?.length || 0 }})
                      </h4>
                    </div>
                    
                    <div v-if="combo.juegos && combo.juegos.length > 0" class="space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar">
                      <div
                        v-for="(juego, index) in combo.juegos"
                        :key="index"
                        class="flex items-center gap-2 bg-base-200 px-3 py-2 rounded-lg text-sm"
                      >
                        <div class="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-error"></div>
                        <span class="flex-1 line-clamp-1">{{ juego.nombre }}</span>
                        <span 
                          v-if="juego.tipo === 'catalogo'" 
                          class="badge badge-xs badge-primary opacity-60"
                        >
                          Catálogo
                        </span>
                      </div>
                    </div>
                    
                    <div v-else class="text-center py-4 text-sm text-base-content/50">
                      No hay juegos especificados
                    </div>
                    
                    <!-- Precio del combo -->
                    <div class="mt-4 pt-4 border-t border-white/10">
                      <div class="flex items-center justify-between">
                        <div>
                          <p class="text-xs text-base-content/60">Precio del Combo</p>
                          <p class="text-2xl font-black text-error">
                            {{ formatearPrecio(getPrecioCombo(combo)) }}
                          </p>
                        </div>
                        <div v-if="calcularDescuento(combo) > 0" class="badge badge-success badge-lg">
                          -{{ calcularDescuento(combo) }}%
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Botón agregar -->
                  <button
                    @click="agregarComboAlCarrito(combo)"
                    class="btn btn-error btn-outline w-full gap-2 mt-auto"
                  >
                    <Package :size="20" />
                    <span v-if="cartStore.isInCart(combo.id)">
                      ✓ En el Carrito ({{ cartStore.getItemQuantity(combo.id) }})
                    </span>
                    <span v-else>
                      Agregar Combo al Carrito
                    </span>
                  </button>
                </div>
              </div>
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
              currentIndex === i - 1 ? 'w-8 bg-error' : 'w-2 bg-base-content/30 hover:bg-base-content/50'
            ]"
          />
        </div>

        <!-- Botón Ver Más (si hay más de 5 combos) -->
        <div v-if="hasMoreCombos" class="mt-10 flex justify-center">
          <button 
            @click="handleVerMas"
            class="btn btn-error btn-outline gap-2"
          >
            <span>Ver Todos los Combos</span>
            <ArrowRight :size="24" />
          </button>
        </div>
      </div>

      <!-- Mensaje si no hay combos -->
      <div v-else class="text-center py-20 animate-fadeInUp">
        <div class="flex justify-center mb-6 relative">
          <Package :size="120" class="text-error/20 animate-float" :stroke-width="1.5" />
          <div class="absolute inset-0 blur-2xl bg-error/10"></div>
        </div>
        <h3 class="text-3xl font-black text-gradient mb-3">No hay combos disponibles</h3>
        <p class="text-base-content/60 text-lg mb-4">Los combos aparecerán cuando estén disponibles en la tienda</p>
        <!-- Debug info -->
        <div class="mt-4 text-sm text-base-content/40">
          <p>Total de combos cargados: {{ combos.length }}</p>
          <p>Combos con correos: {{ combosDisponibles.length }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.line-clamp-1 {
  display: -webkit-box;
  line-clamp: 1;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.line-clamp-2 {
  display: -webkit-box;
  line-clamp: 2;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.custom-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: rgba(239, 68, 68, 0.5) transparent;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(239, 68, 68, 0.5);
  border-radius: 20px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: rgba(239, 68, 68, 0.7);
}

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
</style>
