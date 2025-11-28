<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue'
import { useGames } from '@/composables/useGames'
import type { ComboSummary, ComboPlatform } from '@/types/combo'
import type { PromocionType } from '@/types/game'
import type { GamePrices, GameSummary } from '@/types/game'

export interface ComboFormData {
  nombre: string
  precios: GamePrices
  version: ComboPlatform
  foto?: string
  tipoPromocion: PromocionType
  juegoReferenciado?: string // ID del juego referenciado (opcional)
  // Legacy: mantener costo para compatibilidad durante migración
  costo?: number
}

interface Props {
  show: boolean
  combo?: ComboSummary | null
  isLoading?: boolean
  error?: string
}

const props = withDefaults(defineProps<Props>(), {
  combo: null,
  isLoading: false,
  error: ''
})

const emit = defineEmits<{
  confirm: [data: ComboFormData]
  cancel: []
}>()

// Cargar juegos para el selector
const { games, cargarJuegos } = useGames()

// Form data
const formData = ref<ComboFormData>({
  nombre: '',
  precios: {
    ps4Principal: 0,
    ps4Secundaria: 0,
    ps5Principal: 0,
    ps5Secundaria: 0
  },
  version: 'PS4 & PS5',
  foto: '',
  tipoPromocion: 'ninguna',
  juegoReferenciado: undefined
})

// Estado para tipo de nombre
const tipoNombre = ref<'propio' | 'juego'>('propio')
const juegoSeleccionadoRef = ref<GameSummary | null>(null)

// Resetear form cuando se abre/cierra el modal o cambia el combo
watch(() => props.show, async (newVal) => {
  if (newVal) {
    // Cargar juegos si no están cargados
    if (games.value.length === 0) {
      await cargarJuegos('PS4 & PS5')
    }
    
    // Resetear estados de URL
    isDriveUrlTransformed.value = false
    originalUrl.value = ''
    urlCopied.value = false
    
    if (props.combo) {
      // Editar combo existente
      formData.value = {
        nombre: props.combo.nombre,
        precios: props.combo.precios || {
          ps4Principal: props.combo.costo || 0,
          ps4Secundaria: props.combo.costo || 0,
          ps5Principal: props.combo.costo || 0,
          ps5Secundaria: props.combo.costo || 0
        },
        version: props.combo.version,
        foto: props.combo.foto || '',
        tipoPromocion: props.combo.tipoPromocion || 'ninguna',
        juegoReferenciado: props.combo.juegoReferenciado
      }
      
      // Determinar tipo de nombre
      if (props.combo.juegoReferenciado) {
        tipoNombre.value = 'juego'
        juegoSeleccionadoRef.value = games.value.find(g => g.id === props.combo?.juegoReferenciado) || null
      } else {
        tipoNombre.value = 'propio'
      }
    } else {
      // Crear nuevo combo
      formData.value = {
        nombre: '',
        precios: {
          ps4Principal: 0,
          ps4Secundaria: 0,
          ps5Principal: 0,
          ps5Secundaria: 0
        },
        version: 'PS4 & PS5',
        foto: '',
        tipoPromocion: 'ninguna',
        juegoReferenciado: undefined
      }
      tipoNombre.value = 'propio'
      juegoSeleccionadoRef.value = null
    }
  }
})

// Watcher para actualizar nombre cuando se selecciona un juego
watch(() => juegoSeleccionadoRef.value, (juego) => {
  if (juego && tipoNombre.value === 'juego') {
    formData.value.nombre = juego.nombre
    formData.value.juegoReferenciado = juego.id
    // Opcionalmente copiar precios del juego
    if (juego.precios) {
      formData.value.precios = { ...juego.precios }
    }
  } else {
    formData.value.juegoReferenciado = undefined
  }
})

// Watcher para resetear precios de la plataforma no seleccionada (solo al crear, no al editar)
watch(() => formData.value.version, (newVersion) => {
  if (!props.combo) { // Solo al crear, no al editar
    if (newVersion === 'PS4') {
      // Resetear precios PS5
      formData.value.precios.ps5Principal = 0
      formData.value.precios.ps5Secundaria = 0
    } else if (newVersion === 'PS5') {
      // Resetear precios PS4
      formData.value.precios.ps4Principal = 0
      formData.value.precios.ps4Secundaria = 0
    }
  }
})

// Computed para determinar qué precios mostrar según la plataforma
const mostrarPreciosPS4 = computed(() => {
  return formData.value.version === 'PS4' || formData.value.version === 'PS4 & PS5'
})

const mostrarPreciosPS5 = computed(() => {
  return formData.value.version === 'PS5' || formData.value.version === 'PS4 & PS5'
})

const handleSubmit = () => {
  if (!formData.value.nombre.trim()) {
    alert('El nombre del combo es obligatorio')
    return
  }
  
  // Validar precios según la plataforma seleccionada
  const precios = formData.value.precios
  let preciosInvalidos = false
  
  if (mostrarPreciosPS4.value) {
    if (precios.ps4Principal <= 0 || precios.ps4Secundaria <= 0) {
      preciosInvalidos = true
    }
  }
  
  if (mostrarPreciosPS5.value) {
    if (precios.ps5Principal <= 0 || precios.ps5Secundaria <= 0) {
      preciosInvalidos = true
    }
  }
  
  if (preciosInvalidos) {
    alert('Todos los precios de la plataforma seleccionada deben ser mayores a 0')
    return
  }

  emit('confirm', formData.value)
}

const handleCancel = () => {
  emit('cancel')
}

const handleImageError = (event: Event) => {
  const target = event.target as HTMLImageElement
  if (target) {
    target.src = 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'200\' height=\'200\'%3E%3Crect fill=\'%23ddd\' width=\'200\' height=\'200\'/%3E%3Ctext fill=\'%23999\' font-family=\'sans-serif\' font-size=\'18\' dy=\'10.5\' font-weight=\'bold\' x=\'50%25\' y=\'50%25\' text-anchor=\'middle\'%3EImagen no disponible%3C/text%3E%3C/svg%3E'
  }
}

// Función para transformar URLs de Google Drive
const transformDriveUrl = (url: string): string => {
  if (!url || !url.trim()) return url
  
  const isDriveUrl = url.includes('drive.google.com/file/d/')
  if (!isDriveUrl) return url
  
  const fileIdMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)
  if (!fileIdMatch || !fileIdMatch[1]) return url
  
  const fileId = fileIdMatch[1]
  return `https://drive.google.com/thumbnail?id=${fileId}`
}

const isDriveUrlTransformed = ref(false)
const originalUrl = ref('')

const handleUrlInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (!target) return
  
  const inputUrl = target.value
  originalUrl.value = inputUrl
  
  const transformed = transformDriveUrl(inputUrl)
  const isDriveUrl = inputUrl.includes('drive.google.com/file/d/')
  
  if (isDriveUrl && transformed !== inputUrl) {
    formData.value.foto = transformed
    isDriveUrlTransformed.value = true
  } else {
    formData.value.foto = inputUrl
    isDriveUrlTransformed.value = false
  }
}

const urlCopied = ref(false)

const copyUrlToClipboard = async () => {
  if (!formData.value.foto) return
  
  try {
    await navigator.clipboard.writeText(formData.value.foto)
    urlCopied.value = true
    setTimeout(() => {
      urlCopied.value = false
    }, 2000)
  } catch (err) {
    console.error('Error al copiar:', err)
  }
}

onMounted(async () => {
  if (games.value.length === 0) {
    await cargarJuegos('PS4 & PS5')
  }
})
</script>

<template>
  <dialog :class="['modal', { 'modal-open': show }]">
    <div class="modal-box max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 my-auto">
      <!-- Header -->
      <div class="flex justify-between items-center mb-6 pb-4 border-b border-base-300">
        <div class="flex items-center gap-3">
          <div class="avatar placeholder">
            <div class="bg-primary text-primary-content rounded-full w-12">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
          </div>
          <div>
            <h3 class="font-bold text-2xl text-base-content">
              {{ combo ? 'Editar Combo' : 'Crear Nuevo Combo' }}
            </h3>
            <p class="text-sm text-base-content/60">
              {{ combo ? 'Modifica la información del combo' : 'Completa los datos para agregar un nuevo combo' }}
            </p>
          </div>
        </div>
        <button
          type="button"
          class="btn btn-sm btn-circle btn-ghost hover:bg-error/20 hover:text-error"
          @click="handleCancel"
          :disabled="isLoading"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-6 flex-1">
        <!-- Información Básica -->
        <div class="space-y-4">
          <div class="flex items-center gap-2 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h4 class="font-bold text-lg text-base-content">Información Básica</h4>
          </div>

          <!-- Tipo de nombre -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-semibold">Tipo de Nombre</span>
            </label>
            <div class="join w-full">
              <button
                type="button"
                :class="['btn join-item flex-1', tipoNombre === 'propio' ? 'btn-primary' : 'btn-outline']"
                @click="tipoNombre = 'propio'; juegoSeleccionadoRef = null; formData.juegoReferenciado = undefined"
                :disabled="!!combo"
              >
                Nombre Propio
              </button>
              <button
                type="button"
                :class="['btn join-item flex-1', tipoNombre === 'juego' ? 'btn-primary' : 'btn-outline']"
                @click="tipoNombre = 'juego'"
                :disabled="!!combo"
              >
                Usar Juego Existente
              </button>
            </div>
          </div>

          <!-- Selector de juego (si se selecciona usar juego existente) -->
          <div v-if="tipoNombre === 'juego'" class="form-control">
            <label class="label">
              <span class="label-text font-semibold">Seleccionar Juego *</span>
            </label>
            <select
              v-model="juegoSeleccionadoRef"
              class="select select-bordered w-full"
              :disabled="!!combo"
              required
            >
              <option :value="null">Selecciona un juego...</option>
              <option
                v-for="juego in games"
                :key="juego.id"
                :value="juego"
              >
                {{ juego.nombre }}
              </option>
            </select>
          </div>

          <!-- Nombre del combo -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-semibold flex items-center gap-2">
                Nombre del Combo *
              </span>
            </label>
            <input
              v-model="formData.nombre"
              type="text"
              placeholder="Ej: Combo Assassins Creed, Combo Premium, etc."
              class="input input-bordered w-full focus:input-primary"
              :disabled="tipoNombre === 'juego' || !!combo"
              required
            />
            <label class="label">
              <span class="label-text-alt text-info">
                {{ tipoNombre === 'juego' ? 'El nombre se copiará del juego seleccionado' : 'Ingresa un nombre único para el combo' }}
              </span>
            </label>
          </div>

          <!-- Plataforma -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-semibold flex items-center gap-2">
                Plataforma *
              </span>
            </label>
            <select v-model="formData.version" class="select select-bordered w-full focus:select-primary">
              <option value="PS4 & PS5">PS4 & PS5</option>
              <option value="PS4">PS4</option>
              <option value="PS5">PS5</option>
            </select>
          </div>
        </div>

        <!-- Precios por tipo de cuenta -->
        <div class="space-y-4">
          <div class="flex items-center gap-2 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h4 class="font-bold text-lg text-base-content">Precios por Tipo de Cuenta (USD) *</h4>
          </div>
          
          <div class="card bg-base-200 border border-base-300 shadow-lg">
            <div class="card-body p-6">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <!-- PS4 Principal -->
                <div v-if="mostrarPreciosPS4" class="form-control">
                  <label class="label">
                    <span class="label-text font-semibold flex items-center gap-2">
                      <span class="badge badge-primary badge-lg px-3 py-1">PS4</span>
                      <span>Principal</span>
                    </span>
                  </label>
                  <div class="relative">
                    <span class="absolute left-4 top-1/2 transform -translate-y-1/2 text-base-content/60">$</span>
                    <input
                      v-model.number="formData.precios.ps4Principal"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      class="input input-bordered w-full pl-8 focus:input-primary"
                      required
                    />
                  </div>
                </div>

                <!-- PS4 Secundaria -->
                <div v-if="mostrarPreciosPS4" class="form-control">
                  <label class="label">
                    <span class="label-text font-semibold flex items-center gap-2">
                      <span class="badge badge-primary badge-lg px-3 py-1">PS4</span>
                      <span>Secundaria</span>
                    </span>
                  </label>
                  <div class="relative">
                    <span class="absolute left-4 top-1/2 transform -translate-y-1/2 text-base-content/60">$</span>
                    <input
                      v-model.number="formData.precios.ps4Secundaria"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      class="input input-bordered w-full pl-8 focus:input-primary"
                      required
                    />
                  </div>
                </div>

                <!-- PS5 Principal -->
                <div v-if="mostrarPreciosPS5" class="form-control">
                  <label class="label">
                    <span class="label-text font-semibold flex items-center gap-2">
                      <span class="badge badge-success badge-lg px-3 py-1">PS5</span>
                      <span>Principal</span>
                    </span>
                  </label>
                  <div class="relative">
                    <span class="absolute left-4 top-1/2 transform -translate-y-1/2 text-base-content/60">$</span>
                    <input
                      v-model.number="formData.precios.ps5Principal"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      class="input input-bordered w-full pl-8 focus:input-primary"
                      required
                    />
                  </div>
                </div>

                <!-- PS5 Secundaria -->
                <div v-if="mostrarPreciosPS5" class="form-control">
                  <label class="label">
                    <span class="label-text font-semibold flex items-center gap-2">
                      <span class="badge badge-success badge-lg px-3 py-1">PS5</span>
                      <span>Secundaria</span>
                    </span>
                  </label>
                  <div class="relative">
                    <span class="absolute left-4 top-1/2 transform -translate-y-1/2 text-base-content/60">$</span>
                    <input
                      v-model.number="formData.precios.ps5Secundaria"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      class="input input-bordered w-full pl-8 focus:input-primary"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- URL de la imagen -->
        <div class="space-y-4">
          <div class="flex items-center gap-2 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h4 class="font-bold text-lg text-base-content">Imagen del Combo</h4>
          </div>
          
          <div class="form-control">
            <label class="label">
              <span class="label-text font-semibold flex items-center gap-2">
                URL de la Imagen
                <span v-if="isDriveUrlTransformed" class="badge badge-success badge-sm gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  URL de Drive transformada
                </span>
              </span>
            </label>
            <div class="flex gap-2">
              <input
                :value="formData.foto"
                @input="handleUrlInput"
                type="url"
                placeholder="https://drive.google.com/file/d/... o https://ejemplo.com/imagen.jpg"
                class="input input-bordered w-full focus:input-primary"
              />
              <button
                v-if="formData.foto"
                type="button"
                :class="['btn btn-square', urlCopied ? 'btn-success' : 'btn-primary']"
                @click="copyUrlToClipboard"
                :title="urlCopied ? '¡Copiado!' : 'Copiar URL'"
              >
                <svg v-if="!urlCopied" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
              </button>
            </div>
            <label class="label">
              <span class="label-text-alt text-info flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {{ isDriveUrlTransformed ? 'Las URLs de Google Drive se transforman automáticamente a formato thumbnail' : 'Pega la URL de la imagen. Si es de Google Drive, se convertirá automáticamente.' }}
              </span>
            </label>
          </div>

          <!-- Vista previa de imagen mejorada -->
          <div v-if="formData.foto" class="card bg-base-200 border border-base-300 shadow-lg">
            <div class="card-body p-6">
              <h4 class="font-semibold mb-4 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Vista previa
              </h4>
              <div class="flex justify-center">
                <div class="rounded-lg overflow-hidden shadow-xl border-2 border-primary/20" style="width: 446px; height: 537px; max-width: 100%; aspect-ratio: 446 / 537;">
                  <img :src="formData.foto" alt="Preview" class="w-full h-full object-cover" style="width: 100%; height: 100%; object-fit: cover;" @error="handleImageError" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Promoción -->
        <div class="space-y-4">
          <div class="flex items-center gap-2 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            <h4 class="font-bold text-lg text-base-content">Promoción</h4>
          </div>
          
          <div class="form-control">
            <label class="label">
              <span class="label-text font-semibold flex items-center gap-2">
                Tipo de Promoción
              </span>
            </label>
            <select v-model="formData.tipoPromocion" class="select select-bordered w-full focus:select-primary">
              <option value="ninguna">Sin Promoción</option>
              <option value="oferta">En Oferta</option>
              <option value="promocion">En Promoción</option>
            </select>
          </div>
        </div>

        <!-- Error message -->
        <div v-if="error" class="alert alert-error shadow-lg">
          <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{{ error }}</span>
        </div>

        <!-- Modal actions -->
        <div class="modal-action pt-6 border-t border-base-300">
          <button
            type="button"
            class="btn btn-ghost gap-2"
            @click="handleCancel"
            :disabled="isLoading"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
            Cancelar
          </button>
          <button
            type="submit"
            class="btn btn-primary gap-2 min-w-[120px]"
            :disabled="isLoading"
          >
            <span v-if="isLoading" class="loading loading-spinner loading-sm"></span>
            <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            {{ isLoading ? 'Guardando...' : combo ? 'Actualizar' : 'Crear' }}
          </button>
        </div>
      </form>
    </div>
    <form method="dialog" class="modal-backdrop" @click="handleCancel">
      <button type="button" :disabled="isLoading">close</button>
    </form>
  </dialog>
</template>

