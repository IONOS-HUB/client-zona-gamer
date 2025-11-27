import { ref, computed, watch } from 'vue'
import { defineStore } from 'pinia'
import type { GameSummary, AccountType } from '@/types/game'

export interface CartItem extends GameSummary {
  quantity: number
  selectedAccountType: AccountType
}

const CART_STORAGE_KEY = 'zona_gamer_cart'

// Funciones de localStorage
const loadCartFromStorage = (): CartItem[] => {
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY)
    if (stored) {
      const items = JSON.parse(stored) as any[]
      // Migración: agregar selectedAccountType si no existe
      return items.map(item => {
        if (!item.selectedAccountType) {
          item.selectedAccountType = 'Principal PS4' // Valor por defecto
        }
        // Migración: asegurar que precios exista
        if (!item.precios && item.costo !== undefined) {
          item.precios = {
            ps4Principal: item.costo,
            ps4Secundaria: item.costo,
            ps5Principal: item.costo,
            ps5Secundaria: item.costo
          }
        }
        return item as CartItem
      })
    }
  } catch (error) {
    console.error('Error cargando carrito desde localStorage:', error)
  }
  return []
}

const saveCartToStorage = (cartItems: CartItem[]): void => {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems))
  } catch (error) {
    console.error('Error guardando carrito en localStorage:', error)
  }
}

export const useCartStore = defineStore('cart', () => {
  // Cargar carrito desde localStorage al inicializar
  const items = ref<CartItem[]>(loadCartFromStorage())

  // Computed
  const totalItems = computed(() => {
    return items.value.reduce((total, item) => total + item.quantity, 0)
  })

  const totalPrice = computed(() => {
    return items.value.reduce((total, item) => {
      // Obtener el precio según el tipo de cuenta seleccionado
      let precioBase = 0
      switch (item.selectedAccountType) {
        case 'Principal PS4':
          precioBase = item.precios.ps4Principal
          break
        case 'Secundaria PS4':
          precioBase = item.precios.ps4Secundaria
          break
        case 'Principal PS5':
          precioBase = item.precios.ps5Principal
          break
        case 'Secundaria PS5':
          precioBase = item.precios.ps5Secundaria
          break
      }
      
      // Calcular precio con descuento si aplica
      const precioUnitario = item.descuento && item.descuento > 0
        ? precioBase * (1 - item.descuento / 100)
        : precioBase
      return total + (precioUnitario * item.quantity)
    }, 0)
  })

  const isEmpty = computed(() => items.value.length === 0)

  // Watcher para guardar automáticamente en localStorage cuando cambie el carrito
  watch(
    items,
    (newItems) => {
      saveCartToStorage(newItems)
    },
    { deep: true }
  )

  // Actions
  const addToCart = (game: GameSummary, quantity: number = 1, accountType: AccountType = 'Principal PS4'): void => {
    const existingItem = items.value.find(item => 
      item.id === game.id && item.selectedAccountType === accountType
    )
    
    if (existingItem) {
      // Si el juego con el mismo tipo de cuenta ya está en el carrito, aumentar cantidad
      existingItem.quantity += quantity
    } else {
      // Si es nuevo o es diferente tipo de cuenta, agregarlo como nuevo item
      items.value.push({
        ...game,
        quantity: quantity,
        selectedAccountType: accountType
      })
    }
  }

  const removeFromCart = (gameId: string): void => {
    const index = items.value.findIndex(item => item.id === gameId)
    if (index > -1) {
      items.value.splice(index, 1)
    }
  }

  const updateQuantity = (gameId: string, quantity: number, accountType?: AccountType): void => {
    const item = accountType 
      ? items.value.find(item => item.id === gameId && item.selectedAccountType === accountType)
      : items.value.find(item => item.id === gameId)
    
    if (item) {
      if (quantity <= 0) {
        removeFromCart(gameId)
      } else {
        // Sin límite de cantidad
        item.quantity = quantity
      }
    }
  }

  const clearCart = (): void => {
    items.value = []
    // El watcher se encargará de limpiar localStorage automáticamente
  }

  const isInCart = (gameId: string, accountType?: AccountType): boolean => {
    if (accountType) {
      return items.value.some(item => item.id === gameId && item.selectedAccountType === accountType)
    }
    return items.value.some(item => item.id === gameId)
  }

  const getItemQuantity = (gameId: string, accountType?: AccountType): number => {
    const item = accountType
      ? items.value.find(item => item.id === gameId && item.selectedAccountType === accountType)
      : items.value.find(item => item.id === gameId)
    return item?.quantity || 0
  }
  
  const getItemPrice = (item: CartItem): number => {
    let precioBase = 0
    switch (item.selectedAccountType) {
      case 'Principal PS4':
        precioBase = item.precios.ps4Principal
        break
      case 'Secundaria PS4':
        precioBase = item.precios.ps4Secundaria
        break
      case 'Principal PS5':
        precioBase = item.precios.ps5Principal
        break
      case 'Secundaria PS5':
        precioBase = item.precios.ps5Secundaria
        break
    }
    
    if (item.descuento && item.descuento > 0) {
      return precioBase * (1 - item.descuento / 100)
    }
    return precioBase
  }

  return {
    items,
    totalItems,
    totalPrice,
    isEmpty,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    isInCart,
    getItemQuantity,
    getItemPrice
  }
})

