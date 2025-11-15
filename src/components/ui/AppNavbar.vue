<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useRoles } from '@/composables/useRoles'
import { useCartStore } from '@/stores/cart'
import { Search, ShoppingCart, User, Send, Gamepad2, LayoutDashboard } from 'lucide-vue-next'
import type { GamePlatform } from '@/types/game'
import logo from '/Images/logo/logo.png'

const router = useRouter()
const { currentUser, signOut } = useAuth()
const { currentUserData, isAdmin, hasEmployeeAccess, loadUserData } = useRoles()
const cartStore = useCartStore()

const searchQuery = ref('')
const selectedPlatform = ref<GamePlatform>('PS4 & PS5')
const isSearchExpanded = ref(false)

const emit = defineEmits<{
  openCart: []
  search: [query: string]
  platformChange: [platform: GamePlatform]
}>()

const handleLogout = async (): Promise<void> => {
  await signOut()
  router.push('/')
}

const irALogin = (): void => {
  router.push('/login')
}

const irAlDashboard = (): void => {
  if (isAdmin.value) {
    router.push('/admin')
  } else if (hasEmployeeAccess.value) {
    router.push('/employee')
  }
}

onMounted(() => {
  if (currentUser.value) {
    loadUserData()
  }
})

const openCart = (): void => {
  emit('openCart')
}

const handleSearch = (): void => {
  emit('search', searchQuery.value)
}

const toggleSearch = (): void => {
  isSearchExpanded.value = !isSearchExpanded.value
  if (!isSearchExpanded.value) {
    searchQuery.value = ''
    emit('search', '')
  }
}

const handleSearchBlur = (): void => {
  // Cerrar el buscador si está vacío
  if (!searchQuery.value) {
    setTimeout(() => {
      isSearchExpanded.value = false
    }, 200)
  }
}

const getItemPrice = (item: typeof cartStore.items[0]): number => {
  // Calcular precio con descuento si aplica
  if (item.descuento && item.descuento > 0) {
    return item.costo * (1 - item.descuento / 100)
  }
  return item.costo
}

const handleQuickCheckout = (): void => {
  if (cartStore.isEmpty) return
  
  // Generar mensaje para WhatsApp
  let mensaje = '¡Hola! Me gustaría realizar el siguiente pedido:%0A%0A'
  
  cartStore.items.forEach((item, index) => {
    const precioUnitario = getItemPrice(item)
    const subtotal = precioUnitario * item.quantity
    
    mensaje += `${index + 1}. ${item.nombre}%0A`
    mensaje += `   Plataforma: ${item.version}%0A`
    mensaje += `   Cantidad: ${item.quantity}%0A`
    
    if (item.descuento && item.descuento > 0) {
      mensaje += `   Precio original: $${item.costo.toFixed(2)}%0A`
      mensaje += `   Descuento: ${item.descuento}%%0A`
      mensaje += `   Precio con descuento: $${precioUnitario.toFixed(2)} c/u%0A`
    } else {
      mensaje += `   Precio: $${precioUnitario.toFixed(2)} c/u%0A`
    }
    
    mensaje += `   Subtotal: $${subtotal.toFixed(2)}%0A%0A`
  })
  
  mensaje += `*TOTAL: $${cartStore.totalPrice.toFixed(2)}*%0A%0A`
  mensaje += 'Espero su confirmación. ¡Gracias!'
  
  // Número de WhatsApp (formato internacional sin +)
  const numeroWhatsApp = '593992249152'
  
  // Abrir WhatsApp en nueva pestaña
  const urlWhatsApp = `https://wa.me/${numeroWhatsApp}?text=${mensaje}`
  window.open(urlWhatsApp, '_blank')
}

const handlePlatformChange = (platform: GamePlatform): void => {
  selectedPlatform.value = platform
  emit('platformChange', platform)
}

const formatearPrecio = (precio: number): string => {
  return new Intl.NumberFormat('es-US', {
    style: 'currency',
    currency: 'USD'
  }).format(precio)
}

const platforms: { id: GamePlatform; label: string; icon: string }[] = [
  { id: 'PS4 & PS5', label: 'Todos', icon: 'ALL' },
  { id: 'PS4', label: 'PS4', icon: 'PS4' },
  { id: 'PS5', label: 'PS5', icon: 'PS5' }
]
</script>

<template>
  <header class="glass-effect shadow-glow sticky top-0 z-50 border-b border-white/10">
    <!-- Barra superior con logo, búsqueda y acciones -->
    <div class="backdrop-blur-custom">
      <div class="container mx-auto px-4">
        <div class="flex items-center justify-between py-4 gap-6 animate-fadeInUp">
          <!-- Logo -->
          <a href="/" class="flex items-center gap-2">
          <img 
            :src="logo" 
            alt="Zona Gamers" 
            class="w-30  object-contain"
            />
            />
          </a>

          <!-- Centro: Filtros de Plataformas (PS4 y PS5) y Buscador -->
          <div class="flex-1 flex items-center justify-center gap-4 animate-fadeInUp delay-100">
            <!-- Filtros de Plataformas (PS4 y PS5) -->
            <div class="flex items-center gap-3">
              <button
                v-for="platform in platforms"
                :key="platform.id"
                @click="handlePlatformChange(platform.id)"
                :class="[
                  'flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all duration-300 hover:scale-105',
                  selectedPlatform === platform.id
                    ? 'text-white bg-error/20 border border-error/50 shadow-glow'
                    : 'text-base-content/70 hover:text-white hover:bg-white/5 border border-transparent'
                ]"
              >
                <Gamepad2 :size="20" class="shrink-0" />
                <span class="text-sm">{{ platform.label }}</span>
              </button>
            </div>

            <!-- Buscador Expandible -->
            <div class="relative">
              <!-- Botón de búsqueda (ícono) -->
              <button
                v-if="!isSearchExpanded"
                @click="toggleSearch"
                class="btn btn-circle bg-linear-gradient(to right, #dc2626, #991b1b) hover:from-orange-600 hover:to-red-600 border-none shadow-lg text-white transition-all duration-300 hover:scale-110 w-12 h-12"
              >
                <Search :size="20" />
              </button>

              <!-- Input expandido -->
              <div
                v-else
                class="relative flex items-center animate-scaleIn"
              >
                <input
                  v-model="searchQuery"
                  type="text"
                  placeholder="Minecraft, RPG, multijugador..."
                  class="input bg-linear-gradient(to right, #dc2626, #991b1b) border-none text-white placeholder:text-orange-100/90 pl-6 pr-12 rounded-full shadow-lg transition-all duration-300 w-80 focus:outline-none focus:ring-2 focus:ring-orange-400/50 text-base"
                  @keyup.enter="handleSearch"
                  @blur="handleSearchBlur"
                  autofocus
                />
                <button 
                  @click="toggleSearch"
                  class="absolute right-3 top-1/2 -translate-y-1/2 btn btn-ghost btn-sm btn-circle hover:bg-white/20 text-white transition-all duration-300 p-0 w-8 h-8 min-h-0"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <!-- Acciones (Usuario y Carrito) -->
          <div class="flex items-center gap-2 shrink-0 animate-fadeInUp delay-200">
            <!-- Botón Usuario -->
            <div v-if="currentUser" class="dropdown dropdown-end">
              <div 
                tabindex="0" 
                role="button" 
                class="btn btn-ghost btn-circle hover:bg-primary/20 hover:shadow-glow-primary transition-all duration-300 hover:scale-110"
              >
                <User :size="24" class="text-white hover:text-primary transition-colors" />
              </div>
              <ul
                tabindex="0"
                class="mt-3 z-100 p-2 shadow-lg menu menu-sm dropdown-content glass-effect rounded-lg w-60 border border-white/10 animate-scaleIn"
              >
                <!-- Información del usuario -->
                <li class="menu-title">
                  <div class="flex flex-col gap-1 py-2">
                    <span class="text-xs font-semibold text-base-content/90">{{ currentUser.email }}</span>
                    <span v-if="currentUserData" class="text-xs badge badge-sm" :class="isAdmin ? 'badge-error' : hasEmployeeAccess ? 'badge-warning' : 'badge-ghost'">
                      {{ isAdmin ? 'Administrador' : hasEmployeeAccess ? 'Empleado' : 'Cliente' }}
                    </span>
                  </div>
                </li>
                
                <div class="divider my-1"></div>
                
                <!-- Opción Dashboard (solo para admin y empleados) -->
                <li v-if="isAdmin || hasEmployeeAccess">
                  <a @click="irAlDashboard" class="hover:bg-primary/20 hover:text-primary transition-all gap-3">
                    <LayoutDashboard :size="18" />
                    <span>Panel de Control</span>
                  </a>
                </li>
                <div class="divider my-1"></div>
                
                <!-- Cerrar sesión -->
                <li>
                  <a @click="handleLogout" class="text-error hover:bg-error/20 transition-all gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>Cerrar Sesión</span>
                  </a>
                </li>
              </ul>
            </div>
            <button v-else @click="irALogin" class="btn btn-ghost btn-circle hover:bg-primary/20 hover:shadow-glow-primary transition-all duration-300 hover:scale-110">
              <User :size="24" class="text-white hover:text-primary transition-colors" />
            </button>

            <!-- Botón Carrito con dropdown -->
            <div class="dropdown dropdown-end relative">
              <div 
                tabindex="0" 
                role="button" 
                class="btn btn-ghost btn-circle hover:bg-error/20 hover:shadow-glow transition-all duration-300 hover:scale-110 group"
                @click="openCart"
              >
                <ShoppingCart :size="24" class="text-white group-hover:text-error transition-colors" />
              </div>
              <!-- Badge circular con animación - Fuera del botón -->
              <span 
                v-if="cartStore.totalItems > 0" 
                class="absolute -top-2 -right-2 flex items-center justify-center min-w-[22px] h-6 px-1.5 bg-error text-white text-xs font-bold rounded-full shadow-lg animate-pulse border-2 border-base-100 z-30"
              >
                {{ cartStore.totalItems > 99 ? '99+' : cartStore.totalItems }}
              </span>
              
              <!-- Dropdown del carrito -->
              <div
                tabindex="0"
                class="mt-3 z-1 card card-compact dropdown-content w-80 shadow-xl border border-white/10 animate-fadeInUp bg-base-100"
              >
                <div class="card-body">
                  <div class="flex items-center justify-between mb-2">
                    <span class="font-bold text-lg">Carrito de Compras</span>
                    <span class="badge badge-error text-white">{{ cartStore.totalItems }} items</span>
                  </div>
                  
                  <div v-if="!cartStore.isEmpty" class="space-y-2 max-h-64 overflow-y-auto">
                    <div 
                      v-for="item in cartStore.items" 
                      :key="item.id"
                      class="flex items-center gap-2 p-2 bg-base-200 rounded-lg"
                    >
                      <img 
                        v-if="item.foto" 
                        :src="item.foto" 
                        :alt="item.nombre"
                        class="w-12 h-12 object-cover rounded"
                      />
                      <div class="flex-1 min-w-0">
                        <p class="text-sm font-semibold truncate">{{ item.nombre }}</p>
                        <p class="text-xs text-base-content/60">
                          {{ item.quantity }}x {{ formatearPrecio(getItemPrice(item)) }}
                          <span v-if="item.descuento && item.descuento > 0" class="text-error ml-1">
                            (-{{ item.descuento }}%)
                          </span>
                        </p>
                      </div>
                      <button 
                        @click="cartStore.removeFromCart(item.id)"
                        class="btn btn-ghost btn-xs btn-circle"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  <div v-else class="text-center py-8">
                    <ShoppingCart :size="48" class="mx-auto mb-2 text-base-content/30" />
                    <p class="text-sm text-base-content/60">Tu carrito está vacío</p>
                  </div>
                  
                  <div v-if="!cartStore.isEmpty" class="border-t border-base-300 pt-3 mt-2">
                    <div class="flex justify-between items-center mb-3">
                      <span class="font-semibold">Total:</span>
                      <span class="text-xl font-bold text-error">{{ formatearPrecio(cartStore.totalPrice) }}</span>
                    </div>
                    <div class="card-actions">
                      <button 
                        @click="handleQuickCheckout"
                        class="btn btn-error btn-block text-white gap-2"
                      >
                        <Send :size="20" />
                        Pedir por WhatsApp
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>

