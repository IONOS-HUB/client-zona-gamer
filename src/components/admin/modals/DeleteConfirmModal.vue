<script setup lang="ts">
import type { GameSummary, GameEmailAccount } from '@/types/game'
import type { AppUser } from '@/types/user'

interface Props {
  show: boolean
  item: { tipo: 'juego' | 'correo' | 'usuario', data: any } | null
  isDeleting: boolean
  error: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

const getItemName = (): string => {
  if (!props.item) return ''
  
  if (props.item.tipo === 'juego') {
    return props.item.data.nombre
  } else if (props.item.tipo === 'correo') {
    return props.item.data.correo
  } else if (props.item.tipo === 'usuario') {
    return props.item.data.displayName || props.item.data.email
  }
  return ''
}

const getItemDescription = (): string => {
  if (!props.item) return ''
  
  if (props.item.tipo === 'juego') {
    return `ID: ${props.item.data.id}`
  } else if (props.item.tipo === 'correo') {
    return `Código: ${props.item.data.codigo}`
  } else if (props.item.tipo === 'usuario') {
    return props.item.data.email
  }
  return ''
}

const getTipoLabel = (): string => {
  if (!props.item) return ''
  
  if (props.item.tipo === 'juego') return 'juego completo'
  if (props.item.tipo === 'correo') return 'correo'
  if (props.item.tipo === 'usuario') return 'usuario'
  return ''
}
</script>

<template>
  <dialog :class="['modal', { 'modal-open': show && item }]">
    <div class="modal-box">
      <h3 class="font-bold text-lg mb-4">Confirmar Eliminación</h3>

      <div class="py-4">
        <p class="text-base mb-4">
          ¿Estás seguro de que deseas eliminar este {{ getTipoLabel() }}?
        </p>

        <div v-if="item" class="bg-base-200 p-4 rounded-lg">
          <p class="font-semibold" :class="{ 'font-mono text-sm': item.tipo === 'correo' }">
            {{ getItemName() }}
          </p>
          <p v-if="getItemDescription()" class="text-sm text-base-content/60 mt-1">
            {{ getItemDescription() }}
          </p>
          <p v-if="item.tipo === 'usuario' && item.data.role" class="text-sm mt-2">
            <span class="badge badge-sm" :class="item.data.role === 'admin' ? 'badge-error' : 'badge-info'">
              {{ item.data.role === 'admin' ? 'Administrador' : 'Empleado' }}
            </span>
          </p>
        </div>

        <div class="alert alert-warning mt-4">
          <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>Esta acción no se puede deshacer</span>
        </div>

        <div v-if="error" class="alert alert-error mt-4">
          <span>{{ error }}</span>
        </div>
      </div>

      <div class="modal-action">
        <button
          type="button"
          class="btn"
          @click="emit('cancel')"
          :disabled="isDeleting"
        >
          Cancelar
        </button>
        <button
          type="button"
          class="btn btn-error"
          @click="emit('confirm')"
          :disabled="isDeleting"
        >
          <span v-if="isDeleting" class="loading loading-spinner"></span>
          {{ isDeleting ? 'Eliminando...' : `Eliminar ${getTipoLabel()}` }}
        </button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button @click="emit('cancel')">close</button>
    </form>
  </dialog>
</template>

