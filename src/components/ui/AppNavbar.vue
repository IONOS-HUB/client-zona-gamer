<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useRoles } from '@/composables/useRoles'
import { useCartStore } from '@/stores/cart'
import { Search, ShoppingCart, User, Send, Gamepad2, LayoutDashboard, Menu, X, Trash2, Plus, Minus, BookOpen } from 'lucide-vue-next'
import type { GamePlatform } from '@/types/game'
import logo from '/Images/logo/logo.png'

const router = useRouter()
const route = useRoute()
const { currentUser, signOut } = useAuth()
const { currentUserData, isAdmin, hasEmployeeAccess, loadUserData } = useRoles()
const cartStore = useCartStore()

// Computed para determinar la ruta activa
const isHomeActive = computed(() => route.path === '/')
const isCatalogActive = computed(() => route.path === '/ver-mas')

const searchQuery = ref('')
const selectedPlatform = ref<GamePlatform>('PS4 & PS5')
const isSearchExpanded = ref(false)
const isMobileMenuOpen = ref(false)
const userDropdownRef = ref<HTMLElement | null>(null)
const cartDropdownRef = ref<HTMLElement | null>(null)
const showClearCartConfirm = ref(false)
const itemToDelete = ref<string | null>(null)
const showDeleteConfirm = ref(false)

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


const positionDropdown = (dropdownRef: HTMLElement | null, buttonElement: HTMLElement | null): void => {
  if (!dropdownRef || !buttonElement || window.innerWidth >= 1024) return
  
  const rect = buttonElement.getBoundingClientRect()
  const scrollY = window.scrollY
  const scrollX = window.scrollX
  
  dropdownRef.style.position = 'fixed'
  dropdownRef.style.top = `${rect.bottom + scrollY + 8}px`
  dropdownRef.style.right = `${window.innerWidth - rect.right - scrollX}px`
  dropdownRef.style.left = 'auto'
  dropdownRef.style.transform = 'none'
  dropdownRef.style.marginTop = '0'
}

const openCart = (): void => {
  emit('openCart')
  // Posicionar dropdown del carrito en móvil
  setTimeout(() => {
    if (cartDropdownRef.value) {
      const button = cartDropdownRef.value.closest('.dropdown')?.querySelector('[role="button"]') as HTMLElement
      if (button) {
        positionDropdown(cartDropdownRef.value, button)
      }
    }
  }, 50)
}

const handleUserDropdownToggle = (): void => {
  // Posicionar dropdown de usuario en móvil
  setTimeout(() => {
    if (userDropdownRef.value) {
      const button = userDropdownRef.value.closest('.dropdown')?.querySelector('[role="button"]') as HTMLElement
      if (button) {
        positionDropdown(userDropdownRef.value, button)
      }
    }
  }, 50)
}

// Observar cambios en los dropdowns para reposicionarlos
let userObserver: MutationObserver | null = null
let cartObserver: MutationObserver | null = null
let handleReposition: (() => void) | null = null

const setupDropdownObserver = (dropdownRef: HTMLElement | null, buttonSelector: string): MutationObserver | null => {
  if (!dropdownRef || window.innerWidth >= 1024) return null
  
  const observer = new MutationObserver(() => {
    nextTick(() => {
      const button = dropdownRef.closest('.dropdown')?.querySelector(buttonSelector) as HTMLElement
      if (button && dropdownRef.offsetParent !== null) {
        positionDropdown(dropdownRef, button)
      }
    })
  })
  
  observer.observe(dropdownRef, {
    attributes: true,
    attributeFilter: ['style', 'class'],
    childList: false,
    subtree: false
  })
  
  return observer
}

onMounted(() => {
  if (currentUser.value) {
    loadUserData()
  }
  
  // Configurar observers para los dropdowns después de que se monten
  nextTick(() => {
    if (userDropdownRef.value) {
      userObserver = setupDropdownObserver(userDropdownRef.value, '[role="button"]')
    }
    if (cartDropdownRef.value) {
      cartObserver = setupDropdownObserver(cartDropdownRef.value, '[role="button"]')
    }
  })
  
  // Reposicionar dropdowns al hacer scroll o redimensionar
  handleReposition = (): void => {
    if (userDropdownRef.value && window.innerWidth < 1024) {
      const button = userDropdownRef.value.closest('.dropdown')?.querySelector('[role="button"]') as HTMLElement
      if (button && userDropdownRef.value.offsetParent !== null) {
        positionDropdown(userDropdownRef.value, button)
      }
    }
    if (cartDropdownRef.value && window.innerWidth < 1024) {
      const button = cartDropdownRef.value.closest('.dropdown')?.querySelector('[role="button"]') as HTMLElement
      if (button && cartDropdownRef.value.offsetParent !== null) {
        positionDropdown(cartDropdownRef.value, button)
      }
    }
  }
  
  window.addEventListener('scroll', handleReposition, { passive: true })
  window.addEventListener('resize', handleReposition)
})

onUnmounted(() => {
  if (handleReposition) {
    window.removeEventListener('scroll', handleReposition)
    window.removeEventListener('resize', handleReposition)
  }
  if (userObserver) userObserver.disconnect()
  if (cartObserver) cartObserver.disconnect()
})

const handleSearch = (): void => {
  if (searchQuery.value.trim()) {
    // Redirigir al catálogo con la búsqueda
    router.push({
      name: 'VerMas',
      query: {
        q: searchQuery.value.trim()
      }
    })
    // Cerrar el buscador en desktop
    isSearchExpanded.value = false
    // Cerrar menú móvil
    isMobileMenuOpen.value = false
  }
}

// Búsqueda en tiempo real mientras escribe (solo emitir para filtrado local)
const handleSearchInput = (): void => {
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
  // No cerrar el buscador automáticamente si hay texto
  // Permitir que el usuario vea los resultados
  if (!searchQuery.value) {
    setTimeout(() => {
      isSearchExpanded.value = false
    }, 200)
  }
}

const clearSearch = (): void => {
  searchQuery.value = ''
  emit('search', '')
}

const getItemPrice = (item: typeof cartStore.items[0]): number => {
  return cartStore.getItemPrice(item)
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
    
    const precioBase = cartStore.getItemPrice(item) / (item.descuento && item.descuento > 0 ? (1 - item.descuento / 100) : 1)
    if (item.descuento && item.descuento > 0) {
      mensaje += `   Tipo de cuenta: ${item.selectedAccountType}%0A`
      mensaje += `   Precio original: $${precioBase.toFixed(2)}%0A`
      mensaje += `   Descuento: ${item.descuento}%%0A`
      mensaje += `   Precio con descuento: $${precioUnitario.toFixed(2)} c/u%0A`
    } else {
      mensaje += `   Tipo de cuenta: ${item.selectedAccountType}%0A`
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
  // Cerrar menú móvil después de seleccionar plataforma
  isMobileMenuOpen.value = false
}

const irAlCatalogo = (): void => {
  router.push('/ver-mas')
  // Cerrar menú móvil
  isMobileMenuOpen.value = false
}

const toggleMobileMenu = (): void => {
  isMobileMenuOpen.value = !isMobileMenuOpen.value
}

const closeMobileMenu = (): void => {
  isMobileMenuOpen.value = false
}

const formatearPrecio = (precio: number): string => {
  return new Intl.NumberFormat('es-US', {
    style: 'currency',
    currency: 'USD'
  }).format(precio)
}

const incrementCartQuantity = (gameId: string, currentQuantity: number): void => {
  cartStore.updateQuantity(gameId, currentQuantity + 1)
}

const decrementCartQuantity = (gameId: string, currentQuantity: number): void => {
  if (currentQuantity > 1) {
    cartStore.updateQuantity(gameId, currentQuantity - 1)
  } else {
    iniciarEliminacionItem(gameId)
  }
}

const iniciarEliminacionItem = (gameId: string): void => {
  itemToDelete.value = gameId
  showDeleteConfirm.value = true
}

const confirmarEliminacionItem = (): void => {
  if (itemToDelete.value) {
    cartStore.removeFromCart(itemToDelete.value)
    itemToDelete.value = null
    showDeleteConfirm.value = false
  }
}

const cancelarEliminacionItem = (): void => {
  itemToDelete.value = null
  showDeleteConfirm.value = false
}

const iniciarVaciarCarrito = (): void => {
  showClearCartConfirm.value = true
}

const confirmarVaciarCarrito = (): void => {
  cartStore.clearCart()
  showClearCartConfirm.value = false
}

const cancelarVaciarCarrito = (): void => {
  showClearCartConfirm.value = false
}

const getItemName = (gameId: string): string => {
  const item = cartStore.items.find(i => i.id === gameId)
  return item?.nombre || 'este juego'
}

const platforms: { id: GamePlatform; label: string; icon: string }[] = [
  { id: 'PS4 & PS5', label: 'Todos', icon: 'ALL' },
  { id: 'PS4', label: 'PS4', icon: 'PS4' },
  { id: 'PS5', label: 'PS5', icon: 'PS5' }
]
</script>

<template>
  <!-- Navbar flotante con márgenes y bordes redondeados -->
  <header class="sticky top-4 z-50 px-2 sm:px-4 animate-fadeInUp">
    <nav class="navbar-glass shadow-2xl rounded-2xl border border-white/30">
      <div class="container mx-auto px-3 sm:px-4 lg:px-6 relative z-10">
        <!-- Barra principal -->
        <div class="flex items-center justify-between py-3 sm:py-4 gap-2 sm:gap-4 lg:gap-6">
          <!-- Logo -->
          <a href="/" class="flex items-center gap-2 shrink-0 z-10">
            <img 
              :src="logo" 
              alt="Zona Gamers" 
              class="h-8 sm:h-10 lg:h-12 w-auto object-contain transition-transform duration-300 hover:scale-105"
            />
          </a>

          <!-- Centro: Navegación y Buscador (Desktop) -->
          <div class="hidden lg:flex flex-1 items-center justify-center gap-6 animate-fadeInUp delay-100">
            <!-- Navegación Principal -->
            <nav class="flex items-center gap-2">
              <!-- Botón Inicio -->
              <a
                href="/"
                :class="[
                  'flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all duration-300 hover:scale-105 text-sm text-white',
                  isHomeActive 
                    ? 'bg-linear-to-r from-error to-orange-600 shadow-lg' 
                    : 'hover:bg-white/10'
                ]"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span>Inicio</span>
              </a>

              <!-- Botón Catálogo -->
              <button
                @click="irAlCatalogo"
                :class="[
                  'flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all duration-300 hover:scale-105 text-sm text-white',
                  isCatalogActive
                     ? 'bg-linear-to-r from-error to-orange-600 shadow-lg' 
                    : 'hover:bg-white/10'
                ]"
              >
                <BookOpen :size="20" class="shrink-0" />
                <span>Catálogo</span>
              </button>
            </nav>

            <!-- Separador vertical -->
            <div class="h-8 w-px bg-white/20"></div>

            <!-- Buscador -->
            <div class="relative">
              <!-- Botón de búsqueda (ícono) -->
              <button
                v-if="!isSearchExpanded"
                @click="toggleSearch"
                class="btn btn-circle bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-all duration-300 hover:scale-110 w-11 h-11"
              >
                <Search :size="20" />
              </button>

              <!-- Input expandido -->
              <div
                v-else
                class="relative flex items-center animate-scaleIn"
              >
                <Search :size="18" class="absolute left-4 text-white/60" />
                <input
                  v-model="searchQuery"
                  type="text"
                  placeholder="Buscar juegos, combos..."
                  class="input bg-white/10 border border-white/20 text-white placeholder:text-white/50 pl-12 pr-12 rounded-xl shadow-lg transition-all duration-300 w-64 lg:w-96 focus:outline-none focus:ring-2 focus:ring-error/50 focus:bg-white/15 text-sm"
                  @input="handleSearchInput"
                  @keyup.enter="handleSearch"
                  @blur="handleSearchBlur"
                  autofocus
                />
                <button 
                  @click="searchQuery ? clearSearch() : toggleSearch()"
                  class="absolute right-3 top-1/2 -translate-y-1/2 btn btn-ghost btn-sm btn-circle hover:bg-white/20 text-white transition-all duration-300 p-0 w-8 h-8 min-h-0"
                  :title="searchQuery ? 'Limpiar búsqueda' : 'Cerrar búsqueda'"
                >
                  <X :size="18" />
                </button>
              </div>
            </div>
          </div>

          <!-- Acciones (Usuario y Carrito) -->
          <div class="flex items-center gap-1 sm:gap-2 shrink-0 animate-fadeInUp delay-200">
            <!-- Botón Usuario -->
            <div v-if="currentUser" class="dropdown dropdown-end">
              <div 
                tabindex="0" 
                role="button" 
                class="btn btn-ghost btn-circle hover:bg-primary/20 hover:shadow-glow-primary transition-all duration-300 hover:scale-110 w-9 h-9 sm:w-10 sm:h-10 lg:w-12 lg:h-12 min-h-0"
                @click="handleUserDropdownToggle"
              >
                <User :size="18" class="sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white hover:text-primary transition-colors" />
              </div>
              <ul
                ref="userDropdownRef"
                tabindex="0"
                class="mt-3 z-9999 p-2 shadow-lg menu menu-sm dropdown-content glass-effect rounded-lg w-56 sm:w-60 border border-white/10 animate-scaleIn fixed lg:absolute"
              >
                <!-- Información del usuario -->
                <li class="menu-title">
                  <div class="flex flex-col gap-1 py-2">
                    <span class="text-xs font-semibold text-base-content/90 break-all">{{ currentUser.email }}</span>
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
            <button v-else @click="irALogin" class="btn btn-ghost btn-circle hover:bg-primary/20 hover:shadow-glow-primary transition-all duration-300 hover:scale-110 w-9 h-9 sm:w-10 sm:h-10 lg:w-12 lg:h-12 min-h-0">
              <User :size="18" class="sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white hover:text-primary transition-colors" />
            </button>

            <!-- Botón Carrito con dropdown -->
            <div class="dropdown dropdown-end relative">
              <div 
                tabindex="0" 
                role="button" 
                class="btn btn-ghost btn-circle hover:bg-error/20 hover:shadow-glow transition-all duration-300 hover:scale-110 group w-9 h-9 sm:w-10 sm:h-10 lg:w-12 lg:h-12 min-h-0"
                @click="openCart"
              >
                <ShoppingCart :size="18" class="sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white group-hover:text-error transition-colors" />
              </div>
              <!-- Badge circular con animación - Fuera del botón -->
              <span 
                v-if="cartStore.totalItems > 0" 
                class="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 flex items-center justify-center min-w-[18px] sm:min-w-[22px] h-5 sm:h-6 px-1 sm:px-1.5 bg-error text-white text-[10px] sm:text-xs font-bold rounded-full shadow-lg animate-pulse border-2 border-base-100 z-30"
              >
                {{ cartStore.totalItems > 99 ? '99+' : cartStore.totalItems }}
              </span>
              
              <!-- Dropdown del carrito -->
              <div
                ref="cartDropdownRef"
                tabindex="0"
                class="mt-3 z-9999 card card-compact dropdown-content w-[calc(100vw-2rem)] sm:w-80 shadow-xl border border-white/10 animate-fadeInUp bg-base-100 fixed lg:absolute"
              >
                <div class="card-body">
                  <div class="flex items-center justify-between mb-2">
                    <span class="font-bold text-lg">Carrito de Compras</span>
                    <span class="badge badge-error text-white">{{ cartStore.totalItems }} items</span>
                  </div>
                  
                  <div v-if="!cartStore.isEmpty" class="space-y-3 max-h-80 overflow-y-auto custom-scrollbar">
                    <div 
                      v-for="item in cartStore.items" 
                      :key="item.id"
                      class="flex flex-col gap-2 p-3 bg-base-200 rounded-lg border border-base-300 hover:border-error/30 transition-all"
                    >
                      <!-- Información principal del item -->
                      <div class="flex items-start gap-3">
                        <img 
                          v-if="item.foto" 
                          :src="item.foto" 
                          :alt="item.nombre"
                          class="w-16 h-20 sm:w-20 sm:h-24 object-cover rounded-lg shrink-0"
                        />
                        <div v-else class="w-16 h-20 sm:w-20 sm:h-24 bg-base-300 rounded-lg flex items-center justify-center shrink-0">
                          <Gamepad2 :size="24" class="text-base-content/30" />
                        </div>
                        <div class="flex-1 min-w-0">
                          <p class="text-sm sm:text-base font-semibold text-white mb-1 line-clamp-2">{{ item.nombre }}</p>
                          <p class="text-xs text-base-content/60 mb-2">{{ item.version }}</p>
                          <div class="flex items-center gap-2 mb-2">
                            <span class="text-sm font-bold text-error">
                              {{ formatearPrecio(getItemPrice(item) * item.quantity) }}
                            </span>
                            <span class="text-xs text-base-content/60">
                              ({{ formatearPrecio(getItemPrice(item)) }} c/u)
                            </span>
                            <span v-if="item.descuento && item.descuento > 0" class="badge badge-error badge-sm">
                              -{{ item.descuento }}%
                            </span>
                          </div>
                          <p class="text-xs text-base-content/50">
                            {{ item.totalCorreos || 0 }} disponibles
                          </p>
                        </div>
                        <button 
                          @click="iniciarEliminacionItem(item.id)"
                          class="btn btn-ghost btn-xs btn-circle shrink-0 hover:bg-error/20 hover:text-error transition-all"
                          title="Eliminar del carrito"
                        >
                          <Trash2 :size="14" />
                        </button>
                      </div>
                      
                      <!-- Controles de cantidad -->
                      <div class="flex items-center justify-between pt-2 border-t border-base-300">
                        <span class="text-xs text-base-content/70 font-medium">Cantidad:</span>
                        <div class="flex items-center gap-2">
                          <button 
                            @click.stop="decrementCartQuantity(item.id, item.quantity)"
                            class="btn btn-xs btn-circle h-6 w-6 min-h-0 p-0 hover:bg-error hover:text-white transition-all"
                            :disabled="item.quantity <= 0"
                            title="Disminuir cantidad"
                          >
                            <Minus :size="12" />
                          </button>
                          <span class="text-sm font-bold min-w-8 text-center">{{ item.quantity }}</span>
                          <button 
                            @click.stop="incrementCartQuantity(item.id, item.quantity)"
                            class="btn btn-xs btn-circle h-6 w-6 min-h-0 p-0 hover:bg-success hover:text-white transition-all"
                            title="Aumentar cantidad"
                          >
                            <Plus :size="12" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div v-else class="text-center py-8">
                    <ShoppingCart :size="48" class="mx-auto mb-2 text-base-content/30" />
                    <p class="text-sm text-base-content/60">Tu carrito está vacío</p>
                  </div>
                  
                  <div v-if="!cartStore.isEmpty" class="border-t border-base-300 pt-4 mt-3 space-y-3">
                    <!-- Resumen de totales -->
                    <div class="space-y-2">
                      <div class="flex justify-between items-center">
                        <span class="text-xs text-base-content/70">Items:</span>
                        <span class="badge badge-error text-white font-bold">{{ cartStore.totalItems }}</span>
                      </div>
                      <div class="flex justify-between items-center">
                        <span class="text-sm sm:text-base font-semibold">Total:</span>
                        <span class="text-lg sm:text-xl font-bold text-error">{{ formatearPrecio(cartStore.totalPrice) }}</span>
                      </div>
                    </div>
                    
                    <!-- Botones de acción -->
                    <div class="card-actions flex-col gap-2">
                      <button 
                        @click="handleQuickCheckout"
                        class="btn btn-error btn-block text-white gap-2 text-xs sm:text-sm"
                      >
                        <Send :size="16" class="sm:w-5 sm:h-5" />
                        <span class="hidden sm:inline">Pedir por WhatsApp</span>
                        <span class="sm:hidden">WhatsApp</span>
                      </button>
                      <button 
                        @click="iniciarVaciarCarrito"
                        class="btn btn-outline btn-error btn-block btn-sm gap-2 text-xs"
                      >
                        <Trash2 :size="14" />
                        Vaciar Carrito
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Botón Menú Móvil -->
            <button 
              @click="toggleMobileMenu"
              class="lg:hidden btn btn-ghost btn-circle hover:bg-primary/20 hover:shadow-glow-primary transition-all duration-300 hover:scale-110 w-9 h-9 sm:w-10 sm:h-10 min-h-0"
            >
              <Menu v-if="!isMobileMenuOpen" :size="20" class="text-white" />
              <X v-else :size="20" class="text-white" />
            </button>
          </div>
        </div>

        <!-- Menú Móvil Expandible -->
        <div 
          v-if="isMobileMenuOpen"
          class="lg:hidden border-t border-white/10 pt-4 pb-3 animate-fadeInDown"
        >
          <!-- Navegación Móvil -->
          <div class="space-y-2 mb-4">
            <!-- Botón Inicio -->
            <a
              href="/"
              :class="[
                'flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all duration-300 text-white w-full',
                isHomeActive
                  ? 'bg-linear-to-r from-error to-orange-600 shadow-lg'
                  : 'hover:bg-white/10'
              ]"
              @click="closeMobileMenu"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span>Inicio</span>
            </a>

            <!-- Botón Catálogo -->
            <button
              @click="irAlCatalogo"
              :class="[
                'flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all duration-300 text-white shadow-lg w-full',
                isCatalogActive
                  ? 'bg-linear-to-r from-error to-orange-600 shadow-lg'
                  : 'bg-linear-gradient(to right, #ef4444, #f97316)'
              ]"
            >
              <BookOpen :size="24" class="shrink-0" />
              <span>Explorar Catálogo</span>
            </button>
          </div>

          <!-- Buscador Móvil -->
          <div class="mb-4">
            <div class="relative">
              <Search :size="18" class="absolute left-4 top-1/2 -translate-y-1/2 text-white/60" />
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Buscar juegos, combos..."
                class="input w-full bg-white/10 border border-white/20 text-white placeholder:text-white/50 pl-12 pr-12 rounded-xl shadow-lg text-sm"
                @input="handleSearchInput"
                @keyup.enter="handleSearch"
              />
              <button 
                v-if="searchQuery"
                @click="clearSearch"
                class="absolute right-3 top-1/2 -translate-y-1/2 btn btn-ghost btn-sm btn-circle hover:bg-white/20 text-white p-0 w-8 h-8 min-h-0"
                title="Limpiar"
              >
                <X :size="18" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  </header>

  <!-- Modal de confirmación para eliminar item del carrito -->
  <dialog :class="['modal', { 'modal-open': showDeleteConfirm }]">
    <div class="modal-box">
      <h3 class="font-bold text-lg mb-4">¿Eliminar juego del carrito?</h3>
      <p class="mb-6">
        ¿Estás seguro de que deseas eliminar <strong>{{ itemToDelete ? getItemName(itemToDelete) : 'este juego' }}</strong> del carrito?
      </p>
      <div class="modal-action">
        <button @click="cancelarEliminacionItem" class="btn btn-ghost">
          Cancelar
        </button>
        <button @click="confirmarEliminacionItem" class="btn btn-error">
          Sí, eliminar
        </button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button @click="cancelarEliminacionItem">close</button>
    </form>
  </dialog>

  <!-- Modal de confirmación para vaciar carrito -->
  <dialog :class="['modal', { 'modal-open': showClearCartConfirm }]">
    <div class="modal-box">
      <h3 class="font-bold text-lg mb-4">¿Vaciar todo el carrito?</h3>
      <p class="mb-6">
        ¿Estás seguro de que deseas eliminar todos los juegos del carrito? Esta acción no se puede deshacer.
      </p>
      <div class="modal-action">
        <button @click="cancelarVaciarCarrito" class="btn btn-ghost">
          Cancelar
        </button>
        <button @click="confirmarVaciarCarrito" class="btn btn-error">
          Sí, vaciar carrito
        </button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button @click="cancelarVaciarCarrito">close</button>
    </form>
  </dialog>
</template>

<style scoped>
/* Efecto Glass mejorado para el navbar */
.navbar-glass {
  background: linear-gradient(
    135deg,
    rgba(17, 24, 39, 0.75) 0%,
    rgba(31, 41, 55, 0.65) 50%,
    rgba(17, 24, 39, 0.75) 100%
  );
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  box-shadow: 
    0 8px 32px 0 rgba(0, 0, 0, 0.37),
    0 0 0 1px rgba(255, 255, 255, 0.1) inset,
    0 0 40px rgba(220, 38, 38, 0.1);
  position: relative;
  overflow: visible;
}

.navbar-glass::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.3),
    transparent
  );
  pointer-events: none;
}

.navbar-glass::after {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.05),
    transparent
  );
  animation: shimmer-navbar 3s infinite;
  pointer-events: none;
}

@keyframes shimmer-navbar {
  0% {
    left: -100%;
  }
  100% {
    left: 100%;
  }
}

/* Scrollbar personalizado */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(220, 38, 38, 0.5);
  border-radius: 10px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(220, 38, 38, 0.7);
}

/* Mejora del efecto glass en dropdowns */
:deep(.glass-effect) {
  background: linear-gradient(
    135deg,
    rgba(17, 24, 39, 0.9) 0%,
    rgba(31, 41, 55, 0.85) 100%
  );
  backdrop-filter: blur(16px) saturate(180%);
  -webkit-backdrop-filter: blur(16px) saturate(180%);
  box-shadow: 
    0 8px 32px 0 rgba(0, 0, 0, 0.4),
    0 0 0 1px rgba(255, 255, 255, 0.1) inset;
}

/* Posicionamiento de dropdowns en móvil */
@media (max-width: 1023px) {
  .dropdown.dropdown-end .dropdown-content {
    position: fixed !important;
    left: auto !important;
    transform: none !important;
    margin-top: 0 !important;
  }
  
  /* Asegurar que los dropdowns aparezcan sobre el navbar */
  .dropdown.dropdown-end .dropdown-content {
    z-index: 9999 !important;
  }
  
  /* Dropdown del carrito en móvil - ajustar ancho */
  .dropdown.dropdown-end .dropdown-content.card {
    max-width: calc(100vw - 2rem);
    min-width: 280px;
  }
}

/* Line clamp utility */
.line-clamp-2 {
  display: -webkit-box;
  line-clamp: 2;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>

