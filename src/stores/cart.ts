import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { GameSummary } from '@/types/game'

export interface CartItem extends GameSummary {
  quantity: number
}

export const useCartStore = defineStore('cart', () => {
  const items = ref<CartItem[]>([])

  // Computed
  const totalItems = computed(() => {
    return items.value.reduce((total, item) => total + item.quantity, 0)
  })

  const totalPrice = computed(() => {
    return items.value.reduce((total, item) => {
      // Calcular precio con descuento si aplica
      const precioUnitario = item.descuento && item.descuento > 0
        ? item.costo * (1 - item.descuento / 100)
        : item.costo
      return total + (precioUnitario * item.quantity)
    }, 0)
  })

  const isEmpty = computed(() => items.value.length === 0)

  // Actions
  const addToCart = (game: GameSummary, quantity: number = 1): void => {
    const existingItem = items.value.find(item => item.id === game.id)
    
    if (existingItem) {
      // Si el juego ya está en el carrito, aumentar cantidad
      existingItem.quantity += quantity
    } else {
      // Si es nuevo, agregarlo con la cantidad especificada
      items.value.push({
        ...game,
        quantity: quantity
      })
    }
  }

  const removeFromCart = (gameId: string): void => {
    const index = items.value.findIndex(item => item.id === gameId)
    if (index > -1) {
      items.value.splice(index, 1)
    }
  }

  const updateQuantity = (gameId: string, quantity: number): void => {
    const item = items.value.find(item => item.id === gameId)
    if (item) {
      if (quantity <= 0) {
        removeFromCart(gameId)
      } else {
        item.quantity = quantity
      }
    }
  }

  const clearCart = (): void => {
    items.value = []
  }

  const isInCart = (gameId: string): boolean => {
    return items.value.some(item => item.id === gameId)
  }

  const getItemQuantity = (gameId: string): number => {
    const item = items.value.find(item => item.id === gameId)
    return item?.quantity || 0
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
    getItemQuantity
  }
})

