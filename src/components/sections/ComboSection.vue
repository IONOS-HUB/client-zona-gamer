<script setup lang="ts">
  import { computed, watch, ref, onMounted, onBeforeUnmount } from 'vue'
  import { useRouter } from 'vue-router'
  import { useCombos } from '@/composables/useCombos'
  import { useCartStore } from '@/stores/cart'
  import type { ComboSummary } from '@/types/combo'
  import type { GameSummary } from '@/types/game'
  import { Package, ChevronLeft, ChevronRight, ArrowRight, Sparkles } from 'lucide-vue-next'
  
  const { combos, isLoadingCombos } = useCombos()
  const cartStore = useCartStore()
  const router = useRouter()
  const currentIndex = ref(0)
  const maxItems = 5
  
  // Índices de juegos para cada combo (carrusel automático tipo escalera)
  const gameIndices = ref<Map<string, number>>(new Map())
  const gamesToShow = 5 // Cantidad de juegos a mostrar a la vez - aumentado para mostrar más info
  let autoScrollInterval: ReturnType<typeof setInterval> | null = null
  
  // Mostrar solo los combos activos
  // No filtrar por correos ya que usuarios no autenticados no tienen acceso a esa información
  const combosDisponibles = computed(() => {
    return combos.value.filter(combo => {
      // Filtrar por activo (por defecto true si no está definido)
      const estaActivo = combo.activo !== false
      
      // Validar que tiene los campos mínimos requeridos
      const tieneNombre = combo.nombre && combo.nombre.trim().length > 0
      const tienePrecio = combo.precio !== undefined || combo.costo !== undefined
      const tieneVersion = combo.version && combo.version.trim().length > 0
      
      return estaActivo && tieneNombre && tienePrecio && tieneVersion
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
  
  // Obtener índice actual de un combo
  const getCurrentGameIndex = (comboId: string): number => {
    return gameIndices.value.get(comboId) || 0
  }
  
  // Obtener juegos visibles para un combo (carrusel tipo escalera)
  const getVisibleGames = (combo: ComboSummary) => {
    if (!combo.juegos || combo.juegos.length === 0) return []
    
    const comboId = combo.id
    const currentIndex = getCurrentGameIndex(comboId)
    const totalGames = combo.juegos.length
    
    // Si hay menos juegos que los que queremos mostrar, mostrar todos
    if (totalGames <= gamesToShow) {
      return combo.juegos
    }
    
    // Crear array circular de juegos visibles
    const visibleGames = []
    for (let i = 0; i < gamesToShow; i++) {
      const index = (currentIndex + i) % totalGames
      visibleGames.push(combo.juegos[index])
    }
    
    return visibleGames
  }
  
  // Avanzar automáticamente los juegos (carrusel tipo escalera)
  const autoScrollGames = () => {
    displayedCombos.value.forEach(combo => {
      if (combo.juegos && combo.juegos.length > gamesToShow) {
        const comboId = combo.id
        const currentIndex = gameIndices.value.get(comboId) || 0
        const nextIndex = (currentIndex + 1) % combo.juegos.length
        gameIndices.value.set(comboId, nextIndex)
      }
    })
  }
  
  // Inicializar índices de juegos
  watch(displayedCombos, (newCombos) => {
    newCombos.forEach(combo => {
      if (!gameIndices.value.has(combo.id)) {
        gameIndices.value.set(combo.id, 0)
      }
    })
  }, { immediate: true })
  
  // Iniciar carrusel automático
  onMounted(() => {
    // Cambiar juegos cada 3 segundos
    autoScrollInterval = setInterval(autoScrollGames, 3000)
  })
  
  // Limpiar intervalo al desmontar
  onBeforeUnmount(() => {
    if (autoScrollInterval) {
      clearInterval(autoScrollInterval)
      autoScrollInterval = null
    }
  })
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
              class="shrink-0"
              :style="{ width: `calc(${100 / itemsPerView}% - ${(itemsPerView - 1) * 24 / itemsPerView}px)` }"
            >
              <!-- Card refactorizado: Imagen arriba, Info abajo -->
              <div class="card bg-base-100 shadow-xl hover:shadow-2xl border border-white/10 overflow-hidden group transition-all duration-300 hover:scale-[1.02] flex flex-col">
                <!-- Imagen del combo - ARRIBA -->
                <div class="relative w-full aspect-[4/5] overflow-hidden bg-base-200">
                  <img 
                    v-if="combo.foto" 
                    :src="combo.foto" 
                    :alt="combo.nombre"
                    class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div v-else class="w-full h-full flex items-center justify-center bg-linear-to-br from-error/20 via-purple-600/20 to-amber-500/20">
                    <Package :size="80" class="text-white/30" />
                  </div>
                  
                  <!-- Badge de descuento (si tiene promoción) -->
                  <div 
                    v-if="combo.tipoPromocion === 'oferta' || combo.tipoPromocion === 'promocion' || combo.isOffert"
                    class="absolute top-3 right-3 bg-error text-white font-black px-3 py-1.5 rounded-lg shadow-xl text-sm animate-pulse"
                  >
                    -{{ calcularDescuento(combo) }}% OFF
                  </div>
                </div>

                <!-- Información del combo - ABAJO -->
                <div class="card-body p-4 md:p-5 flex flex-col gap-3 bg-linear-to-b from-base-100 to-base-200">
                  <!-- Detalles (Plataforma, Disponibilidad) -->
                  <div class="flex items-center justify-between gap-2">
                    <div class="flex items-center gap-1.5 text-xs bg-base-300 px-2.5 py-1 rounded-lg font-semibold">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                      </svg>
                      <span>{{ combo.version }}</span>
                    </div>
                    <div 
                      v-if="combo.totalCorreos && combo.totalCorreos > 0"
                      class="flex items-center gap-1 text-xs bg-success/20 text-success px-2.5 py-1 rounded-lg border border-success/30 font-semibold"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{{ combo.totalCorreos }}</span>
                    </div>
                    <div 
                      v-else
                      class="flex items-center gap-1 text-xs bg-success/20 text-success px-2.5 py-1 rounded-lg border border-success/30 font-semibold"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Disponible</span>
                    </div>
                  </div>

                  <!-- Nombre del combo -->
                  <h3 class="text-lg md:text-xl font-black text-base-content line-clamp-2">
                    {{ combo.nombre }}
                  </h3>
                  
                  <!-- Juegos incluidos -->
                  <div class="bg-base-300 rounded-lg p-3">
                    <h4 class="font-black text-xs mb-2 flex items-center gap-2 text-base-content">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      <span>{{ combo.juegos?.length || 0 }} Juego{{ (combo.juegos?.length || 0) !== 1 ? 's' : '' }} Incluido{{ (combo.juegos?.length || 0) !== 1 ? 's' : '' }}</span>
                    </h4>
                    
                    <div v-if="combo.juegos && combo.juegos.length > 0" class="space-y-1.5 max-h-[140px] overflow-y-auto custom-scrollbar pr-1">
                      <div
                        v-for="(juego, index) in getVisibleGames(combo)"
                        :key="`${combo.id}-${juego?.nombre || index}-${getCurrentGameIndex(combo.id)}-${index}`"
                        v-show="juego"
                        class="flex items-center gap-2 text-xs bg-base-200 px-2.5 py-1.5 rounded-md shrink-0"
                      >
                        <div class="shrink-0 w-1.5 h-1.5 rounded-full bg-error"></div>
                        <span class="flex-1 line-clamp-1 font-medium text-base-content">{{ juego?.nombre || '' }}</span>
                      </div>
                      <div v-if="combo.juegos && combo.juegos.length > gamesToShow" class="text-xs text-base-content/60 text-center mt-1 italic shrink-0">
                        {{ combo.juegos.length - gamesToShow }} más...
                      </div>
                    </div>
                    
                    <div v-else class="text-center py-2 text-xs text-base-content/50 shrink-0">
                      Sin juegos especificados
                    </div>
                  </div>

                  <!-- Precio -->
                  <div class="bg-base-300 rounded-lg p-3">
                    <div class="flex items-center justify-between">
                      <div>
                        <p class="text-xs text-base-content/60 mb-0.5">Precio del Combo</p>
                        <p class="text-2xl md:text-3xl font-black text-error">
                          {{ formatearPrecio(getPrecioCombo(combo)) }}
                        </p>
                      </div>
                      <div v-if="calcularDescuento(combo) > 0" class="badge badge-success gap-1.5 py-3 px-3 text-sm shadow-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                        <span class="font-black">-{{ calcularDescuento(combo) }}%</span>
                      </div>
                    </div>
                  </div>

                  <!-- Botón agregar -->
                  <button
                    @click="agregarComboAlCarrito(combo)"
                    :class="[
                      'btn w-full gap-2 transition-all duration-300 shadow-lg text-sm font-black',
                      cartStore.isInCart(combo.id) 
                        ? 'btn-success text-white hover:scale-105' 
                        : 'btn-error hover:scale-105'
                    ]"
                  >
                    <Package :size="18" />
                    <span v-if="cartStore.isInCart(combo.id)">
                      ✓ En Carrito ({{ cartStore.getItemQuantity(combo.id) }})
                    </span>
                    <span v-else>
                      Agregar al Carrito
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
          <!-- Debug info detallada -->
          <div class="mt-4 text-sm text-base-content/40 space-y-2">
            <p><strong>Total de combos cargados:</strong> {{ combos.length }}</p>
            <p><strong>Combos activos (disponibles):</strong> {{ combosDisponibles.length }}</p>
            <p><strong>Combos a mostrar (displayedCombos):</strong> {{ displayedCombos.length }}</p>
            <div v-if="combos.length > 0" class="mt-4 p-4 bg-base-300 rounded-lg text-left max-w-2xl mx-auto">
              <p class="font-bold mb-2">Detalles de combos cargados:</p>
              <pre class="text-xs">{{ JSON.stringify(combos.map(c => ({ 
                id: c.id, 
                nombre: c.nombre, 
                activo: c.activo,
                totalCorreos: c.totalCorreos 
              })), null, 2) }}</pre>
            </div>
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

.custom-scrollbar-light {
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.3) transparent;
}

.custom-scrollbar-light::-webkit-scrollbar {
  width: 4px;
}

.custom-scrollbar-light::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar-light::-webkit-scrollbar-thumb {
  background-color: rgba(255, 255, 255, 0.3);
  border-radius: 20px;
}

.custom-scrollbar-light::-webkit-scrollbar-thumb:hover {
  background-color: rgba(255, 255, 255, 0.5);
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

.animate-slide-up {
  animation: slideUp 0.5s ease-out forwards;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
  