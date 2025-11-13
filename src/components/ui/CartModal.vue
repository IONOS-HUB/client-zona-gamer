<script setup lang="ts">
import { computed } from 'vue'
import { useCartStore } from '@/stores/cart'
import { Send } from 'lucide-vue-next'

interface Props {
  open: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  close: []
  checkout: []
}>()

const cartStore = useCartStore()

const formatearPrecio = (precio: number): string => {
  return new Intl.NumberFormat('es-US', {
    style: 'currency',
    currency: 'USD'
  }).format(precio)
}

const handleClose = (): void => {
  emit('close')
}

const handleCheckout = (): void => {
  emit('checkout')
}

const updateQuantity = (gameId: string, newQuantity: number): void => {
  if (newQuantity <= 0) {
    cartStore.removeFromCart(gameId)
  } else {
    cartStore.updateQuantity(gameId, newQuantity)
  }
}

const getItemTotalPrice = (item: typeof cartStore.items[0]): number => {
  if (item.descuento && item.descuento > 0) {
    return item.costo * (1 - item.descuento / 100)
  }
  return item.costo
}
</script>

<template>
  <dialog :class="['modal', { 'modal-open': open }]">
    <div class="modal-box max-w-3xl border border-white/10 shadow-glow animate-scaleIn bg-base-200" style="background-color: #1f2937 !important; opacity: 1 !important; backdrop-filter: none !important; -webkit-backdrop-filter: none !important;">
      <!-- Header mejorado -->
      <div class="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
        <div class="flex items-center gap-3">
          <div class="p-2 bg-error/10 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </div>
          <div>
            <h3 class="font-black text-3xl text-gradient-animated">Carrito de Compras</h3>
            <p class="text-sm text-base-content/60">Revisa tus productos antes de continuar</p>
          </div>
        </div>
        <button 
          @click="handleClose"
          class="btn btn-sm btn-circle btn-ghost hover:bg-error/20 hover:text-error hover:rotate-90 transition-all duration-300"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Items del carrito -->
      <div v-if="!cartStore.isEmpty" class="space-y-4 max-h-[450px] overflow-y-auto mb-6 pr-2">
        <div 
          v-for="(item, index) in cartStore.items" 
          :key="item.id"
          class="card bg-base-200 shadow-lg hover-lift border border-white/5 animate-fadeInUp"
          :style="{ animationDelay: `${index * 100}ms` }"
        >
          <div class="card-body p-4">
            <div class="flex gap-4">
              <!-- Imagen mejorada -->
              <figure class="w-28 h-36 flex-shrink-0 rounded-xl overflow-hidden bg-base-300 relative group">
                <img 
                  v-if="item.foto" 
                  :src="item.foto" 
                  :alt="item.nombre"
                  class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div v-else class="w-full h-full flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 opacity-30 animate-float" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <!-- Overlay en hover -->
                <div class="absolute inset-0 bg-gradient-to-t from-error/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </figure>

              <!-- Info -->
              <div class="flex-1 space-y-3">
                <div>
                  <h4 class="font-bold text-lg mb-1 group-hover:text-error transition-colors">{{ item.nombre }}</h4>
                  <p class="text-sm badge badge-ghost">{{ item.version }}</p>
                </div>
                
                <div class="flex items-center justify-between">
                  <!-- Cantidad con mejor diseño -->
                  <div class="flex items-center gap-1 bg-base-300 rounded-full p-1">
                    <button 
                      @click="updateQuantity(item.id, item.quantity - 1)"
                      class="btn btn-xs btn-circle hover:bg-error hover:text-white transition-all duration-300"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
                      </svg>
                    </button>
                    
                    <span class="font-bold px-4 text-lg">{{ item.quantity }}</span>
                    
                    <button 
                      @click="updateQuantity(item.id, item.quantity + 1)"
                      class="btn btn-xs btn-circle hover:bg-success hover:text-white transition-all duration-300"
                      :disabled="item.quantity >= item.totalCorreos"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  </div>

                  <!-- Precio mejorado -->
                  <div class="text-right">
                    <p class="text-xl font-black text-gradient">
                      {{ formatearPrecio(getItemTotalPrice(item) * item.quantity) }}
                    </p>
                    <p class="text-xs text-base-content/60">
                      {{ formatearPrecio(getItemTotalPrice(item)) }} c/u
                    </p>
                  </div>
                </div>

                <!-- Disponibilidad con badge -->
                <div class="flex items-center gap-2">
                  <span class="badge badge-sm badge-success">{{ item.totalCorreos }} disponibles</span>
                </div>
              </div>

              <!-- Eliminar con mejor diseño -->
              <button 
                @click="cartStore.removeFromCart(item.id)"
                class="btn btn-ghost btn-sm btn-square self-start hover:bg-error/20 hover:text-error hover:rotate-12 transition-all duration-300"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty state mejorado -->
      <div v-else class="text-center py-20 animate-fadeInUp">
        <div class="relative mb-6">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            class="h-32 w-32 mx-auto text-error/20 animate-float" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              stroke-linecap="round" 
              stroke-linejoin="round" 
              stroke-width="1.5" 
              d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" 
            />
          </svg>
          <div class="absolute inset-0 blur-2xl bg-error/10"></div>
        </div>
        <h4 class="text-2xl font-black text-gradient mb-2">Tu carrito está vacío</h4>
        <p class="text-base-content/60 mb-6 text-lg">Agrega algunos juegos increíbles a tu colección</p>
        <button @click="handleClose" class="btn btn-error gap-2 shadow-glow">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          Explorar Juegos
        </button>
      </div>

      <!-- Footer con totales mejorado -->
      <div v-if="!cartStore.isEmpty" class="border-t border-white/10 pt-6 space-y-6">
        <!-- Stats del carrito -->
        <div class="bg-base-300 p-4 rounded-xl border border-white/10 space-y-3">
          <div class="flex justify-between items-center">
            <span class="text-base-content/70 font-medium">Subtotal</span>
            <span class="font-bold text-lg">{{ formatearPrecio(cartStore.totalPrice) }}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-base-content/70 font-medium">Items</span>
            <span class="badge badge-error text-white font-bold">{{ cartStore.totalItems }}</span>
          </div>
          <div class="divider my-2"></div>
          <div class="flex justify-between items-center">
            <span class="font-black text-xl">Total</span>
            <span class="font-black text-3xl text-gradient-animated">{{ formatearPrecio(cartStore.totalPrice) }}</span>
          </div>
        </div>

        <!-- Botones de acción mejorados -->
        <div class="flex gap-3">
          <button 
            @click="handleClose"
            class="btn btn-ghost flex-1 hover:bg-white/5 transition-all duration-300"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Seguir Comprando
          </button>
          <button 
            @click="handleCheckout"
            class="btn btn-error text-white flex-1 gap-2 shadow-glow hover:shadow-glow relative overflow-hidden group"
          >
            <!-- Efecto de ondas -->
            <span class="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
            <Send :size="20" class="relative z-10" />
            <span class="relative z-10">Pedir por WhatsApp</span>
          </button>
        </div>
        
        <!-- Mensaje de seguridad -->
        <div class="flex items-center justify-center gap-2 text-xs text-base-content/60">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <span>Compra 100% segura</span>
        </div>
      </div>
    </div>
    
    <!-- Backdrop mejorado -->
    <form method="dialog" class="modal-backdrop" style="background-color: rgba(0, 0, 0, 1) !important; backdrop-filter: none !important;">
      <button @click="handleClose">Cerrar</button>
    </form>
  </dialog>
</template>

<style scoped>
/* Forzar fondo completamente opaco del modal con color sólido */
:deep(.modal-box) {
  background-color: #1f2937 !important;
  opacity: 1 !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}

/* Forzar backdrop completamente opaco */
:deep(.modal-backdrop) {
  background-color: rgba(0, 0, 0, 1) !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  opacity: 1 !important;
}

/* Asegurar que el dialog no tenga transparencia */
:deep(dialog.modal) {
  background-color: transparent !important;
}

/* Asegurar que el modal-box tenga un fondo sólido */
.modal-box {
  background-color: #1f2937 !important;
  opacity: 1 !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}
</style>
