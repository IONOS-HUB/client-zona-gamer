<script setup lang="ts">
import { ref, computed } from 'vue'
import { MessageCircle, Copy, CheckCircle, X, Save, User, Phone, CreditCard, Mail, Key, Sparkles } from 'lucide-vue-next'
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
  
  // Si no se ha guardado el cliente, guardarlo automáticamente al copiar
  if (!clienteGuardado.value && clienteNombre.value.trim() && clienteTelefono.value.trim()) {
    await handleGuardarCliente()
  }
  
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
    <div class="modal-box max-w-6xl max-h-[90vh] p-0 overflow-y-auto overflow-x-hidden">
      <!-- Header con gradiente -->
      <div class="bg-linear-to-r from-success via-success/90 to-success/80 p-6 text-white sticky top-0 z-10">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <div class="avatar placeholder">
              <div class="bg-white/20 backdrop-blur-sm text-white rounded-full w-14 h-14 border-2 border-white/30 shadow-lg flex items-center justify-center">
                <MessageCircle :size="28" />
              </div>
            </div>
            <div>
              <h3 class="font-bold text-2xl mb-1">Mensaje para WhatsApp</h3>
              <p class="text-sm text-white/90 flex items-center gap-2">
                <Sparkles :size="14" />
                {{ clienteGuardado ? 'Listo para copiar y enviar' : 'Asigna el cliente y luego copia el mensaje' }}
              </p>
            </div>
          </div>
          <button @click="handleCerrar" class="btn btn-sm btn-circle btn-ghost hover:bg-white/20 text-white border-white/30">
            <X :size="20" />
          </button>
        </div>
      </div>

      <div class="p-6">

      <!-- Layout de dos columnas: Formulario a la izquierda, Mensaje a la derecha -->
      <div v-if="!clienteGuardado" class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Columna izquierda: Formulario de datos del cliente -->
        <div class="card bg-linear-to-br from-base-200 to-base-300 shadow-xl border border-base-300">
          <div class="card-body p-6">
            <div class="flex items-center gap-3 mb-6">
              <div class="p-3 bg-success/20 rounded-xl">
                <User :size="24" class="text-success" />
              </div>
              <div>
                <h4 class="font-bold text-lg">Asignar Cliente</h4>
                <p class="text-xs text-base-content/60">Completa los datos del cliente</p>
              </div>
            </div>
            <div class="space-y-4">
              <div class="form-control">
                <label class="label pb-2">
                  <span class="label-text font-semibold flex items-center gap-2">
                    <User :size="16" class="text-primary" />
                    Nombre del Cliente
                  </span>
                </label>
                <input
                  v-model="clienteNombre"
                  type="text"
                  placeholder="Ej: Juan Pérez"
                  class="input input-bordered focus:input-primary transition-all"
                />
              </div>
              <div class="form-control">
                <label class="label pb-2">
                  <span class="label-text font-semibold flex items-center gap-2">
                    <Phone :size="16" class="text-primary" />
                    Teléfono
                  </span>
                </label>
                <input
                  v-model="clienteTelefono"
                  type="text"
                  placeholder="Ej: +593 99 123 4567 o +1 234 567 8900"
                  class="input input-bordered focus:input-primary transition-all"
                />
              </div>
              <div class="form-control">
                <label class="label pb-2">
                  <span class="label-text font-semibold flex items-center gap-2">
                    <CreditCard :size="16" class="text-primary" />
                    Tipo de Cuenta
                  </span>
                </label>
                <select v-model="tipoCuenta" class="select select-bordered focus:select-primary transition-all">
                  <option v-for="tipo in opcionesCuenta" :key="tipo" :value="tipo">
                    {{ tipo }}
                  </option>
                </select>
              </div>
            </div>
            <div class="mt-6">
              <button
                @click="handleGuardarCliente"
                :disabled="!clienteNombre.trim() || !clienteTelefono.trim() || guardando"
                class="btn btn-success gap-2 w-full shadow-lg hover:shadow-xl transition-all"
                :class="guardando ? 'loading' : ''"
              >
                <Save v-if="!guardando" :size="18" />
                {{ guardando ? 'Guardando...' : 'Guardar y Ver Mensaje' }}
              </button>
              <p class="text-xs text-center text-base-content/60 mt-2">
                O haz clic en "Guardar y Copiar Mensaje" abajo
              </p>
            </div>
          </div>
        </div>

        <!-- Columna derecha: Información del mensaje (vista previa) -->
        <div class="card bg-linear-to-br from-primary/10 via-primary/5 to-base-200 shadow-xl border border-primary/20">
          <div class="card-body p-6">
            <div class="flex items-center gap-3 mb-6">
              <div class="p-3 bg-primary/20 rounded-xl">
                <MessageCircle :size="24" class="text-primary" />
              </div>
              <div>
                <h4 class="font-bold text-lg">Vista Previa</h4>
                <p class="text-xs text-base-content/60">Información del mensaje</p>
              </div>
            </div>
            <div class="space-y-4">
              <div class="bg-base-100/50 rounded-lg p-4 border border-base-300">
                <div class="flex items-center gap-2 mb-2">
                  <Mail :size="16" class="text-primary" />
                  <span class="font-semibold text-sm">Correo:</span>
                </div>
                <p class="text-base-content/80 break-all text-sm font-mono bg-base-200 p-2 rounded">{{ mensaje.correo }}</p>
              </div>
              <div class="bg-base-100/50 rounded-lg p-4 border border-base-300">
                <div class="flex items-center gap-2 mb-2">
                  <span :class="['badge', badgeVersionClass, 'badge-lg']">{{ mensaje.version }}</span>
                  <span class="text-sm font-semibold">Plataforma</span>
                </div>
              </div>
            </div>
            <div class="alert alert-info mt-4 shadow-sm">
              <Sparkles :size="18" />
              <span class="text-sm">
                <strong>Paso siguiente:</strong> Completa los datos del cliente y haz clic en cualquier botón de guardado o copia
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Vista completa del mensaje después de guardar -->
      <div v-else class="space-y-6 animate-fadeIn">
        <!-- Información de la cuenta -->
        <div class="card bg-linear-to-br from-success/10 via-success/5 to-base-200 shadow-xl border border-success/20">
          <div class="card-body p-6">
            <div class="flex items-center gap-3 mb-4">
              <div class="p-3 bg-success/20 rounded-xl">
                <CheckCircle :size="24" class="text-success" />
              </div>
              <div>
                <h4 class="font-bold text-lg">Cliente Asignado</h4>
                <p class="text-sm text-base-content/60">Información del correo y códigos</p>
              </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="bg-base-100/50 rounded-lg p-4 border border-base-300">
                <div class="flex items-center gap-2 mb-2">
                  <Mail :size="16" class="text-primary" />
                  <span class="font-semibold">Correo:</span>
                </div>
                <p class="text-base-content/80 break-all text-sm font-mono bg-base-200 p-2 rounded">{{ mensaje.correo }}</p>
              </div>
              <div class="bg-base-100/50 rounded-lg p-4 border border-base-300">
                <div class="flex items-center gap-2 mb-2">
                  <span class="font-semibold">Plataforma:</span>
                </div>
                <span :class="['badge badge-lg', badgeVersionClass]">{{ mensaje.version }}</span>
              </div>
              <div class="bg-base-100/50 rounded-lg p-4 border border-base-300">
                <div class="flex items-center gap-2 mb-2">
                  <Key :size="16" class="text-warning" />
                  <span class="font-semibold">Código 1:</span>
                </div>
                <p class="font-mono text-warning font-bold text-lg">{{ mensaje.codigoVerificacion1 }}</p>
              </div>
              <div class="bg-base-100/50 rounded-lg p-4 border border-base-300">
                <div class="flex items-center gap-2 mb-2">
                  <Key :size="16" class="text-warning" />
                  <span class="font-semibold">Código 2:</span>
                </div>
                <p class="font-mono text-warning font-bold text-lg">{{ mensaje.codigoVerificacion2 }}</p>
              </div>
            </div>

            <!-- Códigos restantes -->
            <div v-if="codigosRestantes !== undefined" class="mt-4">
              <div class="alert alert-info shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-5 h-5">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <span class="text-sm">
                  <strong>Códigos restantes después de usar estos:</strong> {{ codigosRestantes }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Mensaje completo -->
        <div class="card bg-linear-to-br from-primary/10 via-primary/5 to-base-200 shadow-xl border border-primary/20">
          <div class="card-body p-6">
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center gap-3">
                <div class="p-2 bg-primary/20 rounded-lg">
                  <MessageCircle :size="20" class="text-primary" />
                </div>
                <div>
                  <label class="label-text font-bold text-lg">Mensaje completo</label>
                  <p class="text-xs text-base-content/60">Haz clic en copiar para enviarlo por WhatsApp</p>
                </div>
              </div>
            </div>
            <div class="bg-base-100 rounded-lg p-4 border-2 border-primary/20 shadow-inner">
              <textarea
                :value="mensaje.mensajeCompleto"
                readonly
                class="textarea textarea-ghost font-mono text-sm h-80 resize-none p-4 bg-transparent border-0 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Acciones -->
      <div class="modal-action gap-3 pt-4 border-t border-base-300">
        <button @click="handleCerrar" class="btn btn-ghost gap-2">
          <X :size="18" />
          Cerrar
        </button>
        <button 
          @click="handleCopiar" 
          :class="[
            'btn gap-2 shadow-lg hover:shadow-xl transition-all',
            copiado ? 'btn-success' : clienteGuardado ? 'btn-primary' : 'btn-warning'
          ]"
          :disabled="!clienteNombre.trim() || !clienteTelefono.trim() || guardando"
        >
          <CheckCircle v-if="copiado" :size="20" />
          <Copy v-else :size="20" />
          {{ copiado ? '¡Copiado al Portapapeles!' : clienteGuardado ? 'Copiar Mensaje' : 'Guardar y Copiar Mensaje' }}
        </button>
      </div>

      <!-- Nota importante -->
      <div v-if="clienteGuardado" class="alert alert-warning shadow-sm mt-4">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
        </svg>
        <div class="text-sm">
          <p class="font-semibold">Importante:</p>
          <p>Los códigos utilizados ya han sido eliminados de la base de datos automáticamente.</p>
        </div>
      </div>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button @click="handleCerrar">close</button>
    </form>
  </dialog>
</template>

<style scoped>
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fadeIn {
  animation: fadeIn 0.3s ease-out;
}
</style>

