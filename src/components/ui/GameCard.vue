<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { GameSummary, AccountType } from '@/types/game'
import { useCartStore } from '@/stores/cart'

interface Props {
  game: GameSummary
  showAddToCart?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showAddToCart: true
})

const cartStore = useCartStore()
const quantity = ref(1)
const selectedAccountType = ref<AccountType>('Principal PS4')

const formatearPrecio = (precio: number): string => {
  return new Intl.NumberFormat('es-US', {
    style: 'currency',
    currency: 'USD'
  }).format(precio)
}

// Obtener el precio según el tipo de cuenta seleccionado
const precioActual = computed(() => {
  let precio = 0
  switch (selectedAccountType.value) {
    case 'Principal PS4':
      precio = props.game.precios.ps4Principal
      break
    case 'Secundaria PS4':
      precio = props.game.precios.ps4Secundaria
      break
    case 'Principal PS5':
      precio = props.game.precios.ps5Principal
      break
    case 'Secundaria PS5':
      precio = props.game.precios.ps5Secundaria
      break
  }
  return precio
})

const precioConDescuento = computed(() => {
  if (props.game.descuento && props.game.descuento > 0) {
    return precioActual.value * (1 - props.game.descuento / 100)
  }
  return precioActual.value
})

// Determinar qué tipos de cuenta están disponibles según la versión del juego
const availableAccountTypes = computed<AccountType[]>(() => {
  const types: AccountType[] = []
  if (props.game.version === 'PS4' || props.game.version === 'PS4 & PS5') {
    types.push('Principal PS4', 'Secundaria PS4')
  }
  if (props.game.version === 'PS5' || props.game.version === 'PS4 & PS5') {
    types.push('Principal PS5', 'Secundaria PS5')
  }
  return types.length > 0 ? types : ['Principal PS4', 'Secundaria PS4', 'Principal PS5', 'Secundaria PS5']
})

// Asegurar que el tipo seleccionado esté disponible
watch(() => props.game.version, () => {
  if (availableAccountTypes.value.length > 0 && !availableAccountTypes.value.includes(selectedAccountType.value)) {
    selectedAccountType.value = availableAccountTypes.value[0] || 'Principal PS4'
  }
}, { immediate: true })

const isInCart = computed(() => cartStore.isInCart(props.game.id, selectedAccountType.value))
const currentQuantity = computed(() => cartStore.getItemQuantity(props.game.id, selectedAccountType.value))

// Resetear quantity a 1 cuando el juego sale del carrito
watch(isInCart, (newValue, oldValue) => {
  // Solo resetear cuando sale del carrito (de true a false)
  if (oldValue === true && newValue === false) {
    quantity.value = 1
  }
})

// Incrementar cantidad en el selector (no modifica el carrito directamente)
const incrementQuantity = (): void => {
  // Sin límite máximo
  quantity.value++
}

// Decrementar cantidad en el selector (no modifica el carrito directamente)
const decrementQuantity = (): void => {
  if (quantity.value > 1) {
    quantity.value--
  }
}

// Computed para el texto del botón
const buttonText = computed(() => {
  if (isInCart.value) {
    return quantity.value > 1 ? `Agregar ${quantity.value} más` : 'Agregar 1 más'
  } else {
    return quantity.value > 1 ? `Agregar ${quantity.value}` : 'Agregar'
  }
})

const handleAddToCart = (): void => {
  if (isInCart.value) {
    // Si ya está en el carrito, agregar la cantidad seleccionada adicional
    const nuevaCantidadTotal = currentQuantity.value + quantity.value
    cartStore.updateQuantity(props.game.id, nuevaCantidadTotal, selectedAccountType.value)
  } else {
    // Si no está en el carrito, agregar con la cantidad seleccionada y tipo de cuenta
    cartStore.addToCart(props.game, quantity.value, selectedAccountType.value)
  }
  // Resetear a 1 después de agregar
  quantity.value = 1
}

// Generar estrellas para rating
const stars = computed(() => {
  const rating = props.game.rating || 0
  return Array.from({ length: 5 }, (_, i) => ({
    filled: i < Math.floor(rating),
    half: i === Math.floor(rating) && rating % 1 >= 0.5
  }))
})
</script>

<template>
  <div 
    class="card bg-base-100 shadow-lg hover:shadow-xl relative overflow-hidden group border border-white/5 transition-all duration-300 flex flex-col h-full aspect-2/3"
  >
    <!-- Contenedor de imagen - Ocupa el 100% del espacio disponible -->
    <div class="relative flex-1 bg-base-300 overflow-hidden">
      <img 
        v-if="game.foto" 
        :src="game.foto" 
        :alt="game.nombre"
        class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        loading="lazy"
      />
      <div v-else class="w-full h-full flex items-center justify-center">
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          class="h-12 w-12 opacity-20" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            stroke-linecap="round" 
            stroke-linejoin="round" 
            stroke-width="2" 
            d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" 
          />
        </svg>
      </div>

      <!-- Ribbon de OFERTA - Esquina superior derecha -->
      <div 
        v-if="game.tipoPromocion === 'oferta' || game.isOffert"
        class="ribbon ribbon-oferta"
      >
        <span>OFERTA</span>
      </div>

      <!-- Ribbon de PROMOCIÓN - Esquina superior derecha -->
      <div 
        v-else-if="game.tipoPromocion === 'promocion'"
        class="ribbon ribbon-promocion"
      >
        <span>PROMO</span>
      </div>

      <!-- Badge de descuento - Sobre la imagen en esquina inferior izquierda -->
      <div 
        v-if="game.descuento && game.descuento > 0" 
        class="absolute bottom-2 left-2 z-20 bg-orange-500 text-white font-bold px-2 py-1 text-xs rounded"
      >
        -{{ game.descuento }}%
      </div>

      <!-- Badge DESTACADO - Sobre la imagen (solo si no hay ribbon) -->
      <div 
        v-if="game.destacado && game.tipoPromocion !== 'oferta' && !game.isOffert && game.tipoPromocion !== 'promocion'" 
        class="absolute top-2 right-2 z-20 badge badge-warning text-white font-bold px-1.5 py-0.5 text-[10px] leading-none"
      >
        ⭐
      </div>
    </div>

    <!-- Barra de información - Debajo de la imagen -->
    <div class="bg-base-200 px-3 py-2 space-y-2">
      <!-- Título y plataforma -->
      <div class="flex-1 min-w-0">
        <h2 class="text-xs font-semibold text-white truncate">
          {{ game.nombre }}
        </h2>
        <p class="text-[10px] text-base-content/70 truncate">
          - {{ game.version }}
        </p>
      </div>

      <!-- Indicador de carrito -->
      <div v-if="isInCart" class="flex items-center gap-1 text-[10px] text-success font-bold mb-1">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
        <span>{{ currentQuantity }} en carrito</span>
      </div>

      <!-- Selector de tipo de cuenta -->
      <div v-if="showAddToCart && availableAccountTypes.length > 1" class="form-control">
        <select 
          v-model="selectedAccountType" 
          class="select select-bordered select-xs text-[10px]"
        >
          <option 
            v-for="type in availableAccountTypes" 
            :key="type" 
            :value="type"
          >
            {{ type }}
          </option>
        </select>
      </div>

      <!-- Precio y cantidad -->
      <div class="flex items-center justify-between gap-2">
        <!-- Precio -->
        <div class="flex items-center gap-1 shrink-0">
          <div class="text-sm font-bold text-white">
            {{ formatearPrecio(precioConDescuento) }}
          </div>
          <div v-if="game.descuento && game.descuento > 0" class="text-[10px] text-base-content/50 line-through">
            {{ formatearPrecio(precioActual) }}
          </div>
        </div>

        <!-- Selector de cantidad - Siempre visible si showAddToCart -->
        <div v-if="showAddToCart" class="flex items-center gap-1 bg-base-300 rounded-full px-1">
          <button 
            @click="decrementQuantity"
            class="btn btn-xs btn-circle h-5 w-5 min-h-0 p-0 hover:bg-error hover:text-white transition-all"
            :disabled="quantity <= 1"
            title="Disminuir cantidad"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
            </svg>
          </button>
          <span class="text-xs font-bold px-2 min-w-[24px] text-center">
            {{ isInCart ? `+${quantity}` : quantity }}
          </span>
          <button 
            @click="incrementQuantity"
            class="btn btn-xs btn-circle h-5 w-5 min-h-0 p-0 hover:bg-success hover:text-white transition-all"
            title="Aumentar cantidad"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Botón agregar -->
      <button 
        v-if="showAddToCart"
        @click="handleAddToCart"
        :class="[
          'btn btn-xs w-full text-white font-medium h-7 min-h-7',
          isInCart 
            ? 'bg-success hover:bg-success' 
            : 'btn-error'
        ]"
        :title="isInCart ? `Agregar ${quantity} más al carrito (total: ${currentQuantity + quantity})` : `Agregar ${quantity} al carrito`"
      >
        <svg v-if="!isInCart" xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        <span>{{ buttonText }}</span>
      </button>
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

/* Ribbon - Estilo de esquina doblada */
.ribbon {
  position: absolute;
  top: -6px;
  right: -6px;
  z-index: 30;
  overflow: hidden;
  width: 90px;
  height: 90px;
  text-align: right;
}

.ribbon span {
  font-size: 10px;
  font-weight: 900;
  color: #fff;
  text-transform: uppercase;
  text-align: center;
  line-height: 24px;
  transform: rotate(45deg);
  width: 110px;
  display: block;
  position: absolute;
  top: 19px;
  right: -25px;
  letter-spacing: 0.5px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
}

/* Ribbon de Oferta - Rojo */
.ribbon-oferta span {
  background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);
  border: 1px solid #7f1d1d;
}

.ribbon-oferta span::before,
.ribbon-oferta span::after {
  content: "";
  position: absolute;
  top: 100%;
  z-index: -1;
  border: 3px solid #991b1b;
  border-top-color: transparent;
  border-right-color: transparent;
}

.ribbon-oferta span::before {
  left: 0;
  border-left-color: transparent;
}

.ribbon-oferta span::after {
  right: 0;
  border-right-color: transparent;
}

/* Ribbon de Promoción - Naranja/Amarillo */
.ribbon-promocion span {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  border: 1px solid #b45309;
}

.ribbon-promocion span::before,
.ribbon-promocion span::after {
  content: "";
  position: absolute;
  top: 100%;
  z-index: -1;
  border: 3px solid #d97706;
  border-top-color: transparent;
  border-right-color: transparent;
}

.ribbon-promocion span::before {
  left: 0;
  border-left-color: transparent;
}

.ribbon-promocion span::after {
  right: 0;
  border-right-color: transparent;
}

/* Animación de pulso para el ribbon */
@keyframes ribbon-pulse {
  0%, 100% {
    transform: rotate(45deg) scale(1);
  }
  50% {
    transform: rotate(45deg) scale(1.05);
  }
}

.ribbon:hover span {
  animation: ribbon-pulse 0.6s ease-in-out;
}
</style>

