<script setup lang="ts">
import { ref, watch } from 'vue'
import type { GameSummary, GamePlatform, PromocionType } from '@/types/game'

export interface GameFormData {
  nombre: string
  costo: number
  version: GamePlatform
  foto?: string
  tipoPromocion: PromocionType
  descuento?: number
  precioOriginal?: number
  rating?: number
  destacado?: boolean
}

interface Props {
  show: boolean
  game?: GameSummary | null
  isLoading?: boolean
  error?: string
}

const props = withDefaults(defineProps<Props>(), {
  game: null,
  isLoading: false,
  error: ''
})

const emit = defineEmits<{
  confirm: [data: GameFormData]
  cancel: []
}>()

// Form data
const formData = ref<GameFormData>({
  nombre: '',
  costo: 0,
  version: 'PS4 & PS5',
  foto: '',
  tipoPromocion: 'ninguna',
  descuento: 0,
  precioOriginal: 0,
  rating: 0,
  destacado: false
})

// Resetear form cuando se abre/cierra el modal o cambia el juego
watch(() => props.show, (newVal) => {
  if (newVal) {
    if (props.game) {
      // Editar juego existente
      formData.value = {
        nombre: props.game.nombre,
        costo: props.game.costo,
        version: props.game.version,
        foto: props.game.foto || '',
        tipoPromocion: props.game.tipoPromocion || 'ninguna',
        descuento: props.game.descuento || 0,
        precioOriginal: props.game.precioOriginal || 0,
        rating: props.game.rating || 0,
        destacado: props.game.destacado || false
      }
    } else {
      // Crear nuevo juego
      formData.value = {
        nombre: '',
        costo: 0,
        version: 'PS4 & PS5',
        foto: '',
        tipoPromocion: 'ninguna',
        descuento: 0,
        precioOriginal: 0,
        rating: 0,
        destacado: false
      }
    }
  }
})

const handleSubmit = () => {
  if (!formData.value.nombre.trim()) {
    alert('El nombre del juego es obligatorio')
    return
  }
  if (formData.value.costo <= 0) {
    alert('El precio debe ser mayor a 0')
    return
  }

  emit('confirm', formData.value)
}

const handleCancel = () => {
  emit('cancel')
}
</script>

<template>
  <dialog :class="['modal', { 'modal-open': show }]">
    <div class="modal-box max-w-2xl">
      <h3 class="font-bold text-lg mb-4">
        {{ game ? 'Editar Juego' : 'Crear Nuevo Juego' }}
      </h3>

      <form @submit.prevent="handleSubmit" class="space-y-4">
        <!-- Nombre del juego -->
        <div class="form-control">
          <label class="label">
            <span class="label-text font-semibold">Nombre del Juego *</span>
          </label>
          <input
            v-model="formData.nombre"
            type="text"
            placeholder="Ej: FIFA 24, God of War, etc."
            class="input input-bordered"
            :disabled="!!game"
            required
          />
          <label class="label">
            <span class="label-text-alt text-warning">{{ game ? 'No se puede cambiar el nombre de un juego existente' : 'El nombre se usará como ID' }}</span>
          </label>
        </div>

        <!-- Grid de 2 columnas -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Precio -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-semibold">Precio (USD) *</span>
            </label>
            <input
              v-model.number="formData.costo"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              class="input input-bordered"
              required
            />
          </div>

          <!-- Plataforma -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-semibold">Plataforma *</span>
            </label>
            <select v-model="formData.version" class="select select-bordered">
              <option value="PS4 & PS5">PS4 & PS5</option>
              <option value="PS4">PS4</option>
              <option value="PS5">PS5</option>
            </select>
          </div>
        </div>

        <!-- URL de la imagen -->
        <div class="form-control">
          <label class="label">
            <span class="label-text font-semibold">URL de la Imagen</span>
          </label>
          <input
            v-model="formData.foto"
            type="url"
            placeholder="https://ejemplo.com/imagen.jpg"
            class="input input-bordered"
          />
        </div>

        <!-- Vista previa de imagen -->
        <div v-if="formData.foto" class="card bg-base-200">
          <div class="card-body p-4">
            <h4 class="font-semibold text-sm mb-2">Vista previa:</h4>
            <div class="w-32 h-32 mx-auto">
              <img :src="formData.foto" alt="Preview" class="w-full h-full object-cover rounded" />
            </div>
          </div>
        </div>

        <!-- Grid de promoción -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Tipo de promoción -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-semibold">Tipo de Promoción</span>
            </label>
            <select v-model="formData.tipoPromocion" class="select select-bordered">
              <option value="ninguna">Sin Promoción</option>
              <option value="oferta">En Oferta</option>
              <option value="promocion">En Promoción</option>
            </select>
          </div>

          <!-- Descuento -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-semibold">Descuento (%)</span>
            </label>
            <input
              v-model.number="formData.descuento"
              type="number"
              min="0"
              max="100"
              placeholder="0"
              class="input input-bordered"
            />
          </div>
        </div>

        <!-- Grid de rating y destacado -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Rating -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-semibold">Calificación (0-5)</span>
            </label>
            <input
              v-model.number="formData.rating"
              type="number"
              min="0"
              max="5"
              step="0.1"
              placeholder="0"
              class="input input-bordered"
            />
          </div>

          <!-- Destacado -->
          <div class="form-control">
            <label class="label cursor-pointer">
              <span class="label-text font-semibold">Destacado</span>
              <input v-model="formData.destacado" type="checkbox" class="checkbox checkbox-primary" />
            </label>
          </div>
        </div>

        <!-- Error message -->
        <div v-if="error" class="alert alert-error">
          <span>{{ error }}</span>
        </div>

        <!-- Modal actions -->
        <div class="modal-action">
          <button
            type="button"
            class="btn btn-ghost"
            @click="handleCancel"
            :disabled="isLoading"
          >
            Cancelar
          </button>
          <button
            type="submit"
            class="btn btn-primary"
            :disabled="isLoading"
          >
            <span v-if="isLoading" class="loading loading-spinner"></span>
            {{ isLoading ? 'Guardando...' : game ? 'Actualizar' : 'Crear' }}
          </button>
        </div>
      </form>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button @click="handleCancel" :disabled="isLoading">close</button>
    </form>
  </dialog>
</template>

