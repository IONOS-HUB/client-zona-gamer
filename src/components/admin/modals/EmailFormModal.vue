<script setup lang="ts">
import { ref, watch } from 'vue'
import { Plus, Trash2, Upload } from 'lucide-vue-next'
import type { GameEmailAccount, AccountOwner, GamePlatform, AccountType } from '@/types/game'

export interface EmailFormData {
  correo: string
  nombre: string
  costo: number
  version: GamePlatform
  codigoMaster: string
  codigo: string
  codigosGenerados: string[]
  cuentas: AccountOwner[]
  saldo?: number
}

interface Props {
  show: boolean
  email?: GameEmailAccount | null
  gameName: string
  gameVersion: GamePlatform
  gameCosto: number
  isLoading?: boolean
  error?: string
}

const props = withDefaults(defineProps<Props>(), {
  email: null,
  isLoading: false,
  error: ''
})

const emit = defineEmits<{
  confirm: [data: EmailFormData]
  cancel: []
}>()

// Form data
const formData = ref<EmailFormData>({
  correo: '',
  nombre: '',
  costo: 0,
  version: 'PS4 & PS5',
  codigoMaster: '',
  codigo: '',
  codigosGenerados: [],
  cuentas: [],
  saldo: 0
})

// Temp fields para agregar códigos y cuentas
const nuevoCodigoTemp = ref('')
const nuevaCuenta = ref<AccountOwner>({
  nombre: '',
  telefono: '',
  tipo: 'Principal PS4',
  hasStock: false
})

// Estados para drag & drop
const isDragging = ref(false)
let dragCounter = 0
const uploadSuccess = ref('')

// Resetear form
watch(() => props.show, (newVal) => {
  if (newVal) {
    if (props.email) {
      // Editar correo existente
      formData.value = {
        correo: props.email.correo,
        nombre: props.email.nombre,
        costo: props.email.costo,
        version: props.email.version,
        codigoMaster: props.email.codigoMaster,
        codigo: props.email.codigo,
        codigosGenerados: [...props.email.codigosGenerados],
        cuentas: [...props.email.cuentas],
        saldo: props.email.saldo || 0
      }
    } else {
      // Crear nuevo correo
      formData.value = {
        correo: '',
        nombre: props.gameName,
        costo: props.gameCosto,
        version: props.gameVersion,
        codigoMaster: '',
        codigo: '',
        codigosGenerados: [],
        cuentas: [],
        saldo: 0
      }
    }
    nuevoCodigoTemp.value = ''
    nuevaCuenta.value = {
      nombre: '',
      telefono: '',
      tipo: 'Principal PS4',
      hasStock: false
    }
    isDragging.value = false
    dragCounter = 0
    uploadSuccess.value = ''
  }
})

const agregarCodigo = () => {
  if (nuevoCodigoTemp.value.trim()) {
    formData.value.codigosGenerados.push(nuevoCodigoTemp.value.trim())
    nuevoCodigoTemp.value = ''
  }
}

const eliminarCodigo = (index: number) => {
  formData.value.codigosGenerados.splice(index, 1)
}

const agregarCuenta = () => {
  if (nuevaCuenta.value.nombre.trim() && nuevaCuenta.value.telefono.trim()) {
    formData.value.cuentas.push({ ...nuevaCuenta.value })
    nuevaCuenta.value = {
      nombre: '',
      telefono: '',
      tipo: 'Principal PS4',
      hasStock: false
    }
  }
}

const eliminarCuenta = (index: number) => {
  formData.value.cuentas.splice(index, 1)
}

// Función para parsear archivo .txt
const parsearArchivoTxt = (contenido: string): void => {
  try {
    const lineas = contenido.split('\n').map(l => l.trim()).filter(l => l)
    
    const correo = lineas[0] || ''
    formData.value.correo = correo
    
    const cuentas: AccountOwner[] = []
    lineas.forEach(linea => {
      if (linea.includes('Principal PS4') || linea.includes('Secundaria PS4') || linea.includes('Principal PS5') || linea.includes('Secundaria PS5')) {
        let tipo: AccountType = 'Principal PS4'
        if (linea.includes('Secundaria PS4')) tipo = 'Secundaria PS4'
        else if (linea.includes('Principal PS5')) tipo = 'Principal PS5'
        else if (linea.includes('Secundaria PS5')) tipo = 'Secundaria PS5'
        
        const esStock = /stock/i.test(linea)
        const telefonoMatch = linea.match(/\+593\s*\d+\s*\d+\s*\d+\s*\d+/)
        const telefono = telefonoMatch ? telefonoMatch[0].replace(/\s+/g, ' ') : ''
        
        const nombreMatch = linea.match(/la tiene\s+(.+?)\s+\+593/)
        let nombre = nombreMatch && nombreMatch[1] ? nombreMatch[1].trim() : ''
        
        if (!nombre && esStock) {
          nombre = 'STOCK'
        }
        
        let saldo: number | undefined = undefined
        const saldoMatch = linea.match(/Saldo[:\s]+[\$]?(\d+\.?\d*)/i)
        if (saldoMatch && saldoMatch[1]) {
          saldo = parseFloat(saldoMatch[1])
        }
        
        if (nombre) {
          const cuentaData: AccountOwner = {
            tipo,
            nombre,
            telefono: telefono || '',
            saldo,
            hasStock: esStock ? true : undefined
          }
          
          cuentas.push(cuentaData)
        }
      }
    })
    formData.value.cuentas = cuentas
    
    const nombreIdx = lineas.findIndex(l => l.startsWith('Nombre:'))
    if (nombreIdx !== -1 && lineas[nombreIdx]) {
      formData.value.nombre = lineas[nombreIdx]!.replace('Nombre:', '').trim()
    }
    
    const costoIdx = lineas.findIndex(l => l.startsWith('Costo:'))
    if (costoIdx !== -1 && lineas[costoIdx]) {
      const costoStr = lineas[costoIdx]!.replace('Costo:', '').replace('$', '').trim()
      formData.value.costo = parseFloat(costoStr) || 0
    }
    
    const saldoIdx = lineas.findIndex(l => l.toLowerCase().includes('saldo'))
    if (saldoIdx !== -1 && lineas[saldoIdx]) {
      const saldoMatch = lineas[saldoIdx]!.match(/Saldo[:\s]+[\$]?(\d+\.?\d*)/i)
      if (saldoMatch && saldoMatch[1]) {
        formData.value.saldo = parseFloat(saldoMatch[1])
      }
    }
    
    const masterIdx = lineas.findIndex(l => l === 'MASTER')
    if (masterIdx !== -1 && masterIdx + 1 < lineas.length && lineas[masterIdx + 1]) {
      formData.value.codigo = lineas[masterIdx + 1]!
    }
    
    const codigoMaster = lineas.find(l => l.length > 80 && /^[A-Z0-9]+$/.test(l))
    if (codigoMaster) {
      formData.value.codigoMaster = codigoMaster
    }
    
    const codigos = lineas.filter(l => l.length === 6 && /^[A-Za-z0-9]+$/.test(l))
    formData.value.codigosGenerados = codigos
    
    uploadSuccess.value = 'Archivo cargado exitosamente'
    setTimeout(() => { uploadSuccess.value = '' }, 3000)
  } catch (error) {
    console.error('Error parseando archivo:', error)
    alert('Error al procesar el archivo. Verifica el formato.')
  }
}

const handleFileUpload = (event: Event): void => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  
  if (!file) return
  
  if (!file.name.endsWith('.txt')) {
    alert('Por favor selecciona un archivo .txt')
    return
  }
  
  const reader = new FileReader()
  reader.onload = (e) => {
    const contenido = e.target?.result as string
    parsearArchivoTxt(contenido)
  }
  reader.readAsText(file)
  
  input.value = ''
}

const handleDragEnter = (e: DragEvent): void => {
  e.preventDefault()
  dragCounter++
  isDragging.value = true
}

const handleDragLeave = (e: DragEvent): void => {
  e.preventDefault()
  dragCounter--
  if (dragCounter === 0) {
    isDragging.value = false
  }
}

const handleDragOver = (e: DragEvent): void => {
  e.preventDefault()
}

const handleDrop = (e: DragEvent): void => {
  e.preventDefault()
  isDragging.value = false
  dragCounter = 0
  
  const files = e.dataTransfer?.files
  if (!files || files.length === 0) return
  
  const file = files[0]
  if (!file) return
  
  if (!file.name.endsWith('.txt')) {
    alert('Por favor arrastra un archivo .txt')
    return
  }
  
  const reader = new FileReader()
  reader.onload = (e) => {
    const contenido = e.target?.result as string
    parsearArchivoTxt(contenido)
  }
  reader.readAsText(file)
}

const handleSubmit = () => {
  if (!formData.value.correo.trim()) {
    alert('El correo electrónico es obligatorio')
    return
  }
  if (!formData.value.codigoMaster.trim()) {
    alert('El código master es obligatorio')
    return
  }
  if (!formData.value.codigo.trim()) {
    alert('El código es obligatorio')
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
    <div class="modal-box max-w-4xl max-h-[90vh] overflow-y-auto">
      <h3 class="font-bold text-lg mb-4">
        {{ email ? 'Editar Correo' : 'Agregar Nuevo Correo' }}
      </h3>

      <!-- Área de drag & drop solo para crear (no para editar) -->
      <div 
        v-if="!email"
        class="border-2 border-dashed rounded-lg p-6 mb-6 transition-all"
        :class="isDragging ? 'border-primary bg-primary bg-opacity-10' : 'border-base-300'"
        @dragenter="handleDragEnter"
        @dragleave="handleDragLeave"
        @dragover="handleDragOver"
        @drop="handleDrop"
      >
        <div class="flex flex-col items-center justify-center text-center">
          <Upload 
            :size="48"
            class="mb-3 transition-colors"
            :class="isDragging ? 'text-primary' : 'text-base-content opacity-50'"
          />
          <p class="text-base font-medium mb-2" :class="isDragging ? 'text-primary' : ''">
            {{ isDragging ? '¡Suelta el archivo aquí!' : 'Arrastra y suelta tu archivo .txt aquí' }}
          </p>
          <p class="text-sm text-base-content opacity-60 mb-4">o</p>
          <label class="btn btn-sm btn-primary">
            <Upload :size="16" class="mr-2" />
            Seleccionar archivo
            <input type="file" accept=".txt" class="hidden" @change="handleFileUpload" />
          </label>
          <p class="text-xs text-base-content opacity-50 mt-3">
            El archivo se leerá automáticamente y llenará todos los campos
          </p>
        </div>
      </div>

      <!-- Mensaje de éxito de carga -->
      <div v-if="uploadSuccess" class="alert alert-success mb-4">
        <span>{{ uploadSuccess }}</span>
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-4">
        <!-- Información básica -->
        <div class="card bg-base-200">
          <div class="card-body p-4">
            <h4 class="font-semibold mb-2">Información Básica</h4>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="form-control md:col-span-2">
                <label class="label">
                  <span class="label-text font-semibold">Correo Electrónico *</span>
                </label>
                <input
                  v-model="formData.correo"
                  type="email"
                  placeholder="ejemplo@gmail.com"
                  class="input input-bordered"
                  :disabled="!!email"
                  required
                />
              </div>

              <div class="form-control">
                <label class="label">
                  <span class="label-text font-semibold">Nombre del Juego</span>
                </label>
                <input
                  v-model="formData.nombre"
                  type="text"
                  class="input input-bordered"
                  disabled
                />
              </div>

              <div class="form-control">
                <label class="label">
                  <span class="label-text font-semibold">Precio</span>
                </label>
                <input
                  v-model.number="formData.costo"
                  type="number"
                  step="0.01"
                  class="input input-bordered"
                  disabled
                />
              </div>

              <div class="form-control">
                <label class="label">
                  <span class="label-text font-semibold">Versión</span>
                </label>
                <select v-model="formData.version" class="select select-bordered" disabled>
                  <option value="PS4 & PS5">PS4 & PS5</option>
                  <option value="PS4">PS4</option>
                  <option value="PS5">PS5</option>
                </select>
              </div>

              <div class="form-control">
                <label class="label">
                  <span class="label-text font-semibold">Saldo</span>
                </label>
                <input
                  v-model.number="formData.saldo"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  class="input input-bordered"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Códigos -->
        <div class="card bg-base-200">
          <div class="card-body p-4">
            <h4 class="font-semibold mb-2">Códigos</h4>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div class="form-control">
                <label class="label">
                  <span class="label-text font-semibold">Código Master *</span>
                </label>
                <input
                  v-model="formData.codigoMaster"
                  type="text"
                  placeholder="Código master de la cuenta"
                  class="input input-bordered font-mono"
                  required
                />
              </div>

              <div class="form-control">
                <label class="label">
                  <span class="label-text font-semibold">Código *</span>
                </label>
                <input
                  v-model="formData.codigo"
                  type="text"
                  placeholder="Código de verificación"
                  class="input input-bordered font-mono"
                  required
                />
              </div>
            </div>

            <!-- Agregar códigos generados -->
            <div class="divider text-sm">Códigos Generados</div>
            
            <div class="join w-full mb-2">
              <input
                v-model="nuevoCodigoTemp"
                type="text"
                placeholder="Nuevo código"
                class="input input-bordered join-item flex-1"
                @keyup.enter="agregarCodigo"
              />
              <button
                type="button"
                class="btn btn-primary join-item"
                @click="agregarCodigo"
              >
                <Plus :size="16" />
                Agregar
              </button>
            </div>

            <!-- Lista de códigos -->
            <div v-if="formData.codigosGenerados.length > 0" class="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div
                v-for="(codigo, index) in formData.codigosGenerados"
                :key="index"
                class="flex items-center gap-2 bg-base-300 p-2 rounded"
              >
                <span class="flex-1 font-mono text-sm">{{ codigo }}</span>
                <button
                  type="button"
                  class="btn btn-xs btn-ghost btn-circle"
                  @click="eliminarCodigo(index)"
                >
                  <Trash2 :size="12" />
                </button>
              </div>
            </div>
            <div v-else class="text-center text-sm text-base-content/50 py-2">
              No hay códigos generados
            </div>
          </div>
        </div>

        <!-- Cuentas -->
        <div class="card bg-base-200">
          <div class="card-body p-4">
            <h4 class="font-semibold mb-2">Cuentas Asociadas</h4>
            
            <!-- Agregar cuenta -->
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2 mb-2">
              <input
                v-model="nuevaCuenta.nombre"
                type="text"
                placeholder="Nombre"
                class="input input-bordered input-sm md:col-span-3"
              />
              <input
                v-model="nuevaCuenta.telefono"
                type="tel"
                placeholder="Teléfono"
                class="input input-bordered input-sm md:col-span-3"
              />
              <select v-model="nuevaCuenta.tipo" class="select select-bordered select-sm md:col-span-3">
                <option value="Principal PS4">Principal PS4</option>
                <option value="Secundaria PS4">Secundaria PS4</option>
                <option value="Principal PS5">Principal PS5</option>
                <option value="Secundaria PS5">Secundaria PS5</option>
              </select>
              <label class="label cursor-pointer md:col-span-2 justify-center gap-2">
                <span class="label-text text-xs">Stock</span>
                <input v-model="nuevaCuenta.hasStock" type="checkbox" class="checkbox checkbox-xs" />
              </label>
              <button
                type="button"
                class="btn btn-sm btn-primary md:col-span-1"
                @click="agregarCuenta"
              >
                <Plus :size="14" />
              </button>
            </div>

            <!-- Lista de cuentas -->
            <div v-if="formData.cuentas.length > 0" class="space-y-2">
              <div
                v-for="(cuenta, index) in formData.cuentas"
                :key="index"
                class="flex items-center justify-between bg-base-300 p-3 rounded"
              >
                <div class="flex-1">
                  <div class="flex items-center gap-2">
                    <span class="badge badge-sm" :class="{
                      'badge-primary': cuenta.tipo.includes('Principal'),
                      'badge-secondary': cuenta.tipo.includes('Secundaria')
                    }">
                      {{ cuenta.tipo }}
                    </span>
                    <span v-if="cuenta.hasStock" class="badge badge-sm badge-success">Stock</span>
                  </div>
                  <p class="font-medium">{{ cuenta.nombre }}</p>
                  <p class="text-xs opacity-70">{{ cuenta.telefono }}</p>
                </div>
                <button
                  type="button"
                  class="btn btn-sm btn-ghost btn-circle"
                  @click="eliminarCuenta(index)"
                >
                  <Trash2 :size="16" />
                </button>
              </div>
            </div>
            <div v-else class="text-center text-sm text-base-content/50 py-2">
              No hay cuentas asociadas
            </div>
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
            {{ isLoading ? 'Guardando...' : email ? 'Actualizar' : 'Crear' }}
          </button>
        </div>
      </form>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button @click="handleCancel" :disabled="isLoading">close</button>
    </form>
  </dialog>
</template>

