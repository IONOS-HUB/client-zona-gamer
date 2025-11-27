<script setup lang="ts">
import { ref, computed } from 'vue'
import { MessageCircle, Copy, CheckCircle, X, Save } from 'lucide-vue-next'
import type { WhatsAppMessage } from '@/composables/useWhatsAppMessages'
import type { AccountType } from '@/types/game'

interface Props {
  mensaje: WhatsAppMessage | null
  mostrar: boolean
  codigosRestantes?: number
  version?: 'PS4' | 'PS5' | 'PS4 & PS5'
}

interface Emits {
  (e: 'cerrar'): void
  (e: 'copiar', mensaje: string): void
  (e: 'guardarCliente', datos: { nombre: string; telefono: string; tipoCuenta: AccountType }): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const copiado = ref(false)
const guardando = ref(false)
const clienteGuardado = ref(false)

// Datos del cliente
const clienteNombre = ref('')
const clienteTelefono = ref('')
const tipoCuenta = ref<AccountType>('Principal PS4')

// Opciones de tipo de cuenta según la versión
const opcionesCuenta = computed(() => {
  if (props.version === 'PS4') {
    return ['Principal PS4', 'Secundaria PS4'] as AccountType[]
  } else if (props.version === 'PS5') {
    return ['Principal PS5', 'Secundaria PS5'] as AccountType[]
  } else {
    return ['Principal PS4', 'Secundaria PS4', 'Principal PS5', 'Secundaria PS5'] as AccountType[]
  }
})

// Establecer tipo de cuenta por defecto según la versión
const establecerTipoCuentaPorDefecto = () => {
  if (props.mensaje?.version === 'PS4') {
    tipoCuenta.value = 'Principal PS4'
  } else if (props.mensaje?.version === 'PS5') {
    tipoCuenta.value = 'Principal PS5'
  } else {
    tipoCuenta.value = 'Principal PS4'
  }
}

// Resetear formulario cuando se abre el modal
const resetearFormulario = () => {
  clienteNombre.value = ''
  clienteTelefono.value = ''
  establecerTipoCuentaPorDefecto()
  guardando.value = false
  clienteGuardado.value = false
}

const badgeVersionClass = computed(() => {
  if (props.mensaje?.version === 'PS4') {
    return 'badge-primary'
  }
  return 'badge-secondary'
})

const handleCopiar = async (): Promise<void> => {
  if (!props.mensaje) return
  
  emit('copiar', props.mensaje.mensajeCompleto)
  copiado.value = true
  
  // Resetear el estado de copiado después de 2 segundos
  setTimeout(() => {
    copiado.value = false
  }, 2000)
}

const handleCerrar = (): void => {
  copiado.value = false
  resetearFormulario()
  emit('cerrar')
}

const handleGuardarCliente = async (): Promise<void> => {
  if (!clienteNombre.value.trim() || !clienteTelefono.value.trim()) {
    alert('Por favor, completa el nombre y teléfono del cliente')
    return
  }

  guardando.value = true
  try {
    emit('guardarCliente', {
      nombre: clienteNombre.value.trim(),
      telefono: clienteTelefono.value.trim(),
      tipoCuenta: tipoCuenta.value
    })
    
    // Marcar como guardado y ocultar formulario
    setTimeout(() => {
      guardando.value = false
      clienteGuardado.value = true
    }, 500)
  } catch (error) {
    console.error('Error guardando cliente:', error)
    guardando.value = false
    alert('Error al guardar la información del cliente')
  }
}

// Establecer tipo de cuenta por defecto cuando se muestra el modal
const establecerValoresPorDefecto = () => {
  if (props.mostrar && props.mensaje) {
    establecerTipoCuentaPorDefecto()
  }
}

// Watch para resetear cuando se abre el modal
import { watch } from 'vue'
watch(() => props.mostrar, (nuevoValor) => {
  if (nuevoValor) {
    resetearFormulario()
  }
})
</script>

<template>
  <dialog v-if="mostrar && mensaje" class="modal modal-open">
    <div class="modal-box max-w-6xl">
      <!-- Header -->
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-3">
          <div class="avatar placeholder">
            <div class="bg-success text-success-content rounded-full w-12">
              <MessageCircle :size="24" />
            </div>
          </div>
          <div>
            <h3 class="font-bold text-xl">Mensaje para WhatsApp</h3>
            <p class="text-sm text-base-content/60">
              {{ clienteGuardado ? 'Listo para copiar y enviar' : 'Asigna el cliente y luego copia el mensaje' }}
            </p>
          </div>
        </div>
        <button @click="handleCerrar" class="btn btn-sm btn-circle btn-ghost">
          <X :size="20" />
        </button>
      </div>

      <!-- Layout de dos columnas: Formulario a la izquierda, Mensaje a la derecha -->
      <div v-if="!clienteGuardado" class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <!-- Columna izquierda: Formulario de datos del cliente -->
        <div class="card bg-base-200">
          <div class="card-body p-4">
            <h4 class="font-semibold mb-3 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Asignar Cliente al Correo
            </h4>
            <div class="space-y-3">
              <div class="form-control">
                <label class="label">
                  <span class="label-text font-semibold">Nombre del Cliente</span>
                </label>
                <input
                  v-model="clienteNombre"
                  type="text"
                  placeholder="Ej: Juan Pérez"
                  class="input input-bordered input-sm"
                />
              </div>
              <div class="form-control">
                <label class="label">
                  <span class="label-text font-semibold">Teléfono</span>
                </label>
                <input
                  v-model="clienteTelefono"
                  type="text"
                  placeholder="Ej: +593 99 123 4567"
                  class="input input-bordered input-sm"
                />
              </div>
              <div class="form-control">
                <label class="label">
                  <span class="label-text font-semibold">Tipo de Cuenta</span>
                </label>
                <select v-model="tipoCuenta" class="select select-bordered select-sm">
                  <option v-for="tipo in opcionesCuenta" :key="tipo" :value="tipo">
                    {{ tipo }}
                  </option>
                </select>
              </div>
            </div>
            <div class="mt-4">
              <button
                @click="handleGuardarCliente"
                :disabled="!clienteNombre.trim() || !clienteTelefono.trim() || guardando"
                class="btn btn-sm btn-success gap-2 w-full"
              >
                <Save :size="16" />
                {{ guardando ? 'Guardando...' : 'Guardar Información del Cliente' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Columna derecha: Información del mensaje (vista previa) -->
        <div class="card bg-base-200">
          <div class="card-body p-4">
            <h4 class="font-semibold mb-3">Vista Previa del Mensaje</h4>
            <div class="space-y-2 text-sm mb-3">
              <div>
                <span class="font-semibold">Correo:</span>
                <p class="text-base-content/80 break-all text-xs">{{ mensaje.correo }}</p>
              </div>
              <div>
                <span class="font-semibold">Plataforma:</span>
                <div class="mt-1">
                  <span :class="['badge badge-sm', badgeVersionClass]">{{ mensaje.version }}</span>
                </div>
              </div>
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <span class="font-semibold text-xs">Código 1:</span>
                  <p class="font-mono text-warning text-xs">{{ mensaje.codigoVerificacion1 }}</p>
                </div>
                <div>
                  <span class="font-semibold text-xs">Código 2:</span>
                  <p class="font-mono text-warning text-xs">{{ mensaje.codigoVerificacion2 }}</p>
                </div>
              </div>
            </div>
            <div class="alert alert-info py-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-4 h-4">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span class="text-xs">
                Guarda la información del cliente para ver el mensaje completo
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Vista completa del mensaje después de guardar -->
      <div v-else class="space-y-4">
        <!-- Información de la cuenta -->
        <div class="card bg-base-200">
          <div class="card-body p-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>
                <span class="font-semibold">Correo:</span>
                <p class="text-base-content/80 break-all">{{ mensaje.correo }}</p>
              </div>
              <div>
                <span class="font-semibold">Plataforma:</span>
                <div class="mt-1">
                  <span :class="['badge', badgeVersionClass]">{{ mensaje.version }}</span>
                </div>
              </div>
            </div>

            <!-- Códigos usados -->
            <div class="divider my-2"></div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>
                <span class="font-semibold">Código 1:</span>
                <p class="font-mono text-warning">{{ mensaje.codigoVerificacion1 }}</p>
              </div>
              <div>
                <span class="font-semibold">Código 2:</span>
                <p class="font-mono text-warning">{{ mensaje.codigoVerificacion2 }}</p>
              </div>
            </div>

            <!-- Códigos restantes -->
            <div v-if="codigosRestantes !== undefined" class="mt-2">
              <div class="alert alert-info py-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-5 h-5">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <span class="text-xs">
                  <strong>Códigos restantes después de usar estos:</strong> {{ codigosRestantes }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Mensaje completo -->
        <div class="form-control">
          <label class="label">
            <span class="label-text font-semibold">Mensaje completo:</span>
            <span class="label-text-alt text-base-content/60">
              Haz clic en copiar para enviarlo por WhatsApp
            </span>
          </label>
          <textarea
            :value="mensaje.mensajeCompleto"
            readonly
            class="textarea textarea-bordered font-mono text-sm h-72 resize-none"
          />
        </div>
      </div>

      <!-- Acciones -->
      <div class="modal-action">
        <button @click="handleCerrar" class="btn btn-ghost">
          Cerrar
        </button>
        <button 
          v-if="clienteGuardado"
          @click="handleCopiar" 
          :class="['btn', copiado ? 'btn-success' : 'btn-primary']"
          class="gap-2"
        >
          <CheckCircle v-if="copiado" :size="20" />
          <Copy v-else :size="20" />
          {{ copiado ? '¡Copiado!' : 'Copiar Mensaje' }}
        </button>
      </div>

      <!-- Nota importante -->
      <div class="alert alert-warning mt-4">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
        </svg>
        <div class="text-sm">
          <p class="font-semibold">Importante:</p>
          <p>Los códigos utilizados ya han sido eliminados de la base de datos automáticamente.</p>
        </div>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button @click="handleCerrar">close</button>
    </form>
  </dialog>
</template>

