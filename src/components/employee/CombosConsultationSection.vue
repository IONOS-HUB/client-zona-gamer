<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useCombos } from '@/composables/useCombos'
import { useWhatsAppMessages } from '@/composables/useWhatsAppMessages'
import { useRoles } from '@/composables/useRoles'
import { useReportes } from '@/composables/useReportes'
import { Package, RefreshCw, MessageCircle } from 'lucide-vue-next'
import WhatsAppMessageModal from '@/components/ui/WhatsAppMessageModal.vue'
import type { ComboSummary, ComboEmailAccount, ComboPlatform, AccountType } from '@/types/combo'
import type { WhatsAppMessage } from '@/composables/useWhatsAppMessages'

const {
  combos,
  isLoadingCombos,
  isSyncingCombos,
  cargarCombos,
  sincronizarCombos,
  cargarCorreosCombo,
  generarIdCombo,
  actualizarCorreoCombo
} = useCombos()

const {
  validarCodigosDisponibles,
  validarStockDisponible,
  validarSlotsDisponibles,
  generarYEliminarCodigosCombo,
  copiarAlPortapapeles,
  isGenerating
} = useWhatsAppMessages()

const { currentUserData } = useRoles()
const { crearReporte } = useReportes()

// Estados principales
const plataformaSeleccionada = ref<ComboPlatform>('PS4 & PS5')
const searchTerm = ref('')
const vistaActual = ref<'combos' | 'correos'>('combos')
const comboSeleccionado = ref<ComboSummary | null>(null)
const correosCombo = ref<ComboEmailAccount[]>([])
const isLoadingCorreos = ref(false)

// Estados para modales
const showEmailDetails = ref(false)
const selectedEmailDetails = ref<ComboEmailAccount | null>(null)
const showWhatsAppModal = ref(false)
const mensajeWhatsApp = ref<WhatsAppMessage | null>(null)
const datosCliente = ref<{ nombre: string; telefono: string; tipoCuenta: AccountType } | null>(null)

// Estados para filtros
const promoFiltro = ref<'todas' | 'oferta' | 'promocion' | 'ninguna'>('todas')
const stockFiltro = ref<'todas' | 'con' | 'sin'>('todas')
const sortBy = ref<'nombre' | 'precio' | 'correos' | 'stock'>('nombre')
const sortOrder = ref<'asc' | 'desc'>('asc')

// Computed para combos filtrados
const combosFiltrados = computed(() => {
  let resultado = combos.value

  // Filtro por plataforma según el campo version del combo
  // Todos los combos están en combos/PS4 & PS5/combos/, pero cada uno tiene su campo version
  if (plataformaSeleccionada.value === 'PS4 & PS5') {
    // Mostrar todos los combos sin filtrar por versión
    // No filtrar, mostrar todos
  } else if (plataformaSeleccionada.value === 'PS4') {
    // Mostrar solo combos que tienen version === 'PS4' o version === 'PS4 & PS5'
    resultado = resultado.filter(
      combo => combo.version === 'PS4' || combo.version === 'PS4 & PS5'
    )
  } else if (plataformaSeleccionada.value === 'PS5') {
    // Mostrar solo combos que tienen version === 'PS5' o version === 'PS4 & PS5'
    resultado = resultado.filter(
      combo => combo.version === 'PS5' || combo.version === 'PS4 & PS5'
    )
  }

  // Filtro por búsqueda
  if (searchTerm.value.trim()) {
    const termino = searchTerm.value.trim().toLowerCase()
    resultado = resultado.filter(combo => combo.nombre.toLowerCase().includes(termino))
  }

  // Filtro por promoción
  if (promoFiltro.value !== 'todas') {
    resultado = resultado.filter(combo => combo.tipoPromocion === promoFiltro.value)
  }

  // Filtro por stock
  if (stockFiltro.value === 'con') {
    resultado = resultado.filter(combo => (combo.stockAccounts ?? 0) > 0)
  } else if (stockFiltro.value === 'sin') {
    resultado = resultado.filter(combo => (combo.stockAccounts ?? 0) === 0)
  }

  // Ordenamiento
  resultado = [...resultado].sort((a, b) => {
    let comparacion = 0
    switch (sortBy.value) {
      case 'nombre':
        comparacion = a.nombre.localeCompare(b.nombre)
        break
      case 'precio':
        comparacion = (a.precio || 0) - (b.precio || 0)
        break
      case 'correos':
        comparacion = a.totalCorreos - b.totalCorreos
        break
      case 'stock':
        comparacion = (a.stockAccounts ?? 0) - (b.stockAccounts ?? 0)
        break
    }
    return sortOrder.value === 'asc' ? comparacion : -comparacion
  })

  return resultado
})

// Funciones principales
const cargarCombosPorPlataforma = async (): Promise<void> => {
  if (vistaActual.value === 'combos') comboSeleccionado.value = null
  // Siempre cargar desde 'PS4 & PS5' porque todos los combos están ahí
  // El filtrado por plataforma se hace en combosFiltrados según el campo version
  await cargarCombos('PS4 & PS5', false)
}

const handleSincronizar = async (): Promise<void> => {
  try {
    // Siempre sincronizar desde 'PS4 & PS5' porque todos los combos están ahí
    await sincronizarCombos('PS4 & PS5')
  } catch (error) {
    console.error('Error sincronizando:', error)
  }
}

const verCorreosCombo = async (combo: ComboSummary): Promise<void> => {
  comboSeleccionado.value = combo
  isLoadingCorreos.value = true
  vistaActual.value = 'correos'

  try {
    correosCombo.value = await cargarCorreosCombo('PS4 & PS5', combo.id)
  } catch (error) {
    console.error('Error cargando correos:', error)
  } finally {
    isLoadingCorreos.value = false
  }
}

const volverACombos = (): void => {
  vistaActual.value = 'combos'
  comboSeleccionado.value = null
  correosCombo.value = []
}

const verDetallesCorreo = (correo: ComboEmailAccount): void => {
  selectedEmailDetails.value = correo
  showEmailDetails.value = true
}

const cerrarDetallesCorreo = (): void => {
  showEmailDetails.value = false
  selectedEmailDetails.value = null
}

// WhatsApp
const abrirModalWhatsApp = async (correo: ComboEmailAccount, version?: 'PS4' | 'PS5'): Promise<void> => {
  // Validar que el correo exista y tenga datos básicos
  if (!correo) {
    alert('Error: No se ha seleccionado un correo válido')
    return
  }

  if (!correo.correo || correo.correo.trim() === '') {
    alert('Error: El correo electrónico está vacío o es inválido')
    return
  }

  // Validar información del combo
  if (!comboSeleccionado.value) {
    alert('Error: No hay combo seleccionado')
    return
  }

  if (!comboSeleccionado.value.nombre || comboSeleccionado.value.nombre.trim() === '') {
    alert('Error: El nombre del combo está vacío o es inválido')
    return
  }

  // Validar plataforma
  if (!plataformaSeleccionada.value) {
    alert('Error: No se ha seleccionado una plataforma válida')
    return
  }

  // Validar información del usuario
  if (!currentUserData.value?.uid || !currentUserData.value?.email) {
    alert('Error: Información de usuario incompleta. Por favor, inicia sesión nuevamente.')
    return
  }

  // Validar que el correo tenga código master
  if (!correo.codigoMaster || correo.codigoMaster.trim() === '') {
    alert('Error: El correo no tiene contraseña (código master) configurada')
    return
  }

  // Validar códigos disponibles
  if (!validarCodigosDisponibles(correo)) {
    alert('No hay suficientes códigos disponibles (se requieren al menos 2)')
    return
  }

  // Validar que los códigos no estén vacíos
  if (!correo.codigosGenerados || correo.codigosGenerados.length < 2) {
    alert('Error: Los códigos de verificación están incompletos')
    return
  }

  const codigo1 = correo.codigosGenerados[0]
  const codigo2 = correo.codigosGenerados[1]
  if (!codigo1 || codigo1.trim() === '' || !codigo2 || codigo2.trim() === '') {
    alert('Error: Los códigos de verificación están vacíos o son inválidos')
    return
  }

  // Validar stock disponible
  if (!validarStockDisponible(correo)) {
    alert('No hay cuentas con stock disponible. No se puede generar el mensaje.')
    return
  }

  // Validar que haya slots disponibles (no estén ocupados los 4 tipos de cuenta)
  if (!validarSlotsDisponibles(correo)) {
    alert('No se puede generar el mensaje: Ya están ocupados los 4 slots de cuenta (Principal PS4, Secundaria PS4, Principal PS5, Secundaria PS5)')
    return
  }

  try {
    const comboId = generarIdCombo(comboSeleccionado.value.nombre)
    
    console.log('🔄 Generando mensaje WhatsApp (combo)...', {
      correo: correo.correo,
      combo: comboSeleccionado.value.nombre,
      version: version || 'auto',
      plataforma: plataformaSeleccionada.value,
      codigosDisponibles: correo.codigosGenerados?.length || 0,
      stockDisponible: correo.cuentas?.filter(c => c?.hasStock === true).length || 0
    })

    const mensaje = await generarYEliminarCodigosCombo(
      correo,
      'PS4 & PS5', // Siempre usar 'PS4 & PS5' porque todos los combos están ahí
      comboId,
      comboSeleccionado.value.nombre,
      currentUserData.value.uid,
      currentUserData.value.email,
      currentUserData.value.displayName || currentUserData.value.email || 'Usuario',
      currentUserData.value.role as 'admin' | 'employee',
      version
    )

    if (mensaje) {
      console.log('✅ Mensaje generado exitosamente')
      mensajeWhatsApp.value = mensaje
      showWhatsAppModal.value = true
      
      // Actualizar la lista de correos para reflejar los códigos eliminados
      await verCorreosCombo(comboSeleccionado.value)
      
      // Actualizar el modal de detalles si está abierto
      if (showEmailDetails.value && selectedEmailDetails.value?.correo === correo.correo) {
        const correoActualizado = correosCombo.value.find(c => c.correo === correo.correo)
        if (correoActualizado) {
          selectedEmailDetails.value = correoActualizado
        }
      }
    } else {
      alert('No se pudo generar el mensaje. Por favor, verifica que haya códigos y stock disponibles.')
    }
  } catch (error) {
    console.error('❌ Error generando mensaje:', error)
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido al generar el mensaje'
    alert(`Error al generar el mensaje de WhatsApp: ${errorMessage}`)
  }
}

const cerrarModalWhatsApp = (): void => {
  showWhatsAppModal.value = false
  mensajeWhatsApp.value = null
}

const copiarMensaje = async (mensaje: string): Promise<void> => {
  const exitoso = await copiarAlPortapapeles(mensaje)
  if (!exitoso) alert('No se pudo copiar el mensaje')
}

// Guardar datos del cliente desde el modal
const handleGuardarCliente = async (datos: { nombre: string; telefono: string; tipoCuenta: AccountType }): Promise<void> => {
  if (!comboSeleccionado.value || !selectedEmailDetails.value || !currentUserData.value) {
    alert('Error: Información incompleta para guardar cliente')
    return
  }

  try {
    const comboId = generarIdCombo(comboSeleccionado.value.nombre)
    const correo = selectedEmailDetails.value

    // Actualizar el correo en Firestore agregando la cuenta del cliente
    const cuentasActualizadas = [...(correo.cuentas || [])]
    
    // Verificar si ya existe una cuenta con este tipo
    const indiceExistente = cuentasActualizadas.findIndex(c => c.tipo === datos.tipoCuenta)
    
    if (indiceExistente >= 0) {
      // Actualizar cuenta existente
      cuentasActualizadas[indiceExistente] = {
        tipo: datos.tipoCuenta,
        nombre: datos.nombre,
        telefono: datos.telefono,
        hasStock: false
      }
    } else {
      // Agregar nueva cuenta
      cuentasActualizadas.push({
        tipo: datos.tipoCuenta,
        nombre: datos.nombre,
        telefono: datos.telefono,
        hasStock: false
      })
    }

    await actualizarCorreoCombo(
      'PS4 & PS5', // Siempre usar 'PS4 & PS5' porque todos los combos están ahí
      comboId,
      correo.correo,
      { cuentas: cuentasActualizadas }
    )

    // Crear reporte con los datos del cliente
    await crearReporte(
      currentUserData.value.uid,
      currentUserData.value.email,
      currentUserData.value.displayName || currentUserData.value.email || 'Usuario',
      currentUserData.value.role as 'admin' | 'employee',
      comboSeleccionado.value.nombre,
      comboId,
      correo.version,
      correo.correo,
      {
        codigo1: mensajeWhatsApp.value?.codigoVerificacion1 || '',
        codigo2: mensajeWhatsApp.value?.codigoVerificacion2 || ''
      },
      mensajeWhatsApp.value?.version || 'PS4',
      datos.nombre,
      datos.telefono,
      datos.tipoCuenta,
      'combo' // Tipo de item
    )

    // Actualizar la lista de correos
    await verCorreosCombo(comboSeleccionado.value)
    
    // Actualizar el modal de detalles si está abierto
    if (showEmailDetails.value) {
      const correoActualizado = correosCombo.value.find(c => c.correo === correo.correo)
      if (correoActualizado) {
        selectedEmailDetails.value = correoActualizado
      }
    }

    datosCliente.value = datos
    console.log('✅ Cliente guardado exitosamente en correo y reporte')
  } catch (error) {
    console.error('❌ Error guardando cliente:', error)
    alert('Error al guardar la información del cliente')
  }
}

// Utilidades
const formatearPrecio = (precio: number): string => {
  return new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(precio)
}

const formatearFecha = (fecha: Date | string): string => {
  const date = typeof fecha === 'string' ? new Date(fecha) : fecha
  return new Intl.DateTimeFormat('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

// Sincronización automática
let syncInterval: ReturnType<typeof setInterval> | null = null

const iniciarSincronizacionAutomatica = (): void => {
  if (syncInterval) clearInterval(syncInterval)
  syncInterval = setInterval(async () => {
    if (plataformaSeleccionada.value) {
      try {
        // Siempre sincronizar desde 'PS4 & PS5' porque todos los combos están ahí
        await sincronizarCombos('PS4 & PS5')
      } catch (error) {
        console.error('Error en sincronización automática:', error)
      }
    }
  }, 10 * 60 * 1000)
}

const detenerSincronizacionAutomatica = (): void => {
  if (syncInterval) {
    clearInterval(syncInterval)
    syncInterval = null
  }
}

// Watchers
watch(plataformaSeleccionada, async () => {
  await cargarCombosPorPlataforma()
})

// Lifecycle
onMounted(async () => {
  await cargarCombosPorPlataforma()
  iniciarSincronizacionAutomatica()
})

onBeforeUnmount(() => {
  detenerSincronizacionAutomatica()
})

// Exponer función para navegar desde fuera
defineExpose({
  verCorreosCombo
})
</script>

<template>
  <div>
    <div class="alert alert-info mb-6">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
      <span><strong>Modo Solo Lectura:</strong> Puedes consultar los combos y generar mensajes WhatsApp, pero no modificar datos.</span>
    </div>

    <!-- Breadcrumb -->
    <div class="breadcrumbs mb-4">
      <ul>
        <li v-if="vistaActual === 'combos'"><span class="font-semibold">Combos</span></li>
        <li v-if="vistaActual === 'correos'">
          <button @click="volverACombos" class="text-primary hover:underline">Combos</button>
        </li>
        <li v-if="vistaActual === 'correos'">{{ comboSeleccionado?.nombre }}</li>
      </ul>
    </div>

    <!-- Vista de Combos -->
    <div v-if="vistaActual === 'combos'">
      <!-- Filtros -->
      <div class="card bg-base-100 shadow-xl mb-6">
        <div class="card-body">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div class="form-control">
              <label class="label"><span class="label-text font-semibold">Plataforma</span></label>
              <select v-model="plataformaSeleccionada" class="select select-bordered">
                <option value="PS4 & PS5">Todas (PS4 & PS5)</option>
                <option value="PS4">PS4</option>
                <option value="PS5">PS5</option>
              </select>
            </div>

            <div class="form-control">
              <label class="label"><span class="label-text font-semibold">Buscar Combo</span></label>
              <input v-model="searchTerm" type="text" placeholder="Nombre del combo..." class="input input-bordered" />
            </div>

            <div class="form-control">
              <label class="label"><span class="label-text font-semibold">Promoción</span></label>
              <select v-model="promoFiltro" class="select select-bordered">
                <option value="todas">Todas</option>
                <option value="oferta">Ofertas</option>
                <option value="promocion">Promociones</option>
                <option value="ninguna">Sin promoción</option>
              </select>
            </div>

            <div class="form-control">
              <label class="label"><span class="label-text font-semibold">Stock</span></label>
              <select v-model="stockFiltro" class="select select-bordered">
                <option value="todas">Todas</option>
                <option value="con">Con stock</option>
                <option value="sin">Sin stock</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div class="form-control">
              <label class="label"><span class="label-text font-semibold">Ordenar Por</span></label>
              <div class="join w-full">
                <select v-model="sortBy" class="select select-bordered select-sm join-item flex-1">
                  <option value="nombre">Nombre (A-Z)</option>
                  <option value="precio">Precio</option>
                  <option value="correos">Cuentas</option>
                  <option value="stock">Stock</option>
                </select>
                <button 
                  @click="sortOrder = sortOrder === 'asc' ? 'desc' : 'asc'" 
                  class="btn btn-square btn-sm join-item"
                  :class="sortOrder === 'asc' ? 'btn-primary' : 'btn-secondary'"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path v-if="sortOrder === 'asc'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
                    <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            </div>

            <div class="form-control">
              <label class="label"><span class="label-text font-semibold opacity-0">Acción</span></label>
              <button 
                class="btn btn-outline btn-primary gap-2 w-full"
                @click="handleSincronizar"
                :disabled="isSyncingCombos || isLoadingCombos"
              >
                <RefreshCw :size="18" :class="{ 'animate-spin': isSyncingCombos }" />
                {{ isSyncingCombos ? 'Sincronizando...' : 'Sincronizar' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Lista de Combos -->
      <div v-if="isLoadingCombos" class="flex justify-center p-8">
        <span class="loading loading-spinner loading-lg"></span>
      </div>

      <div v-else-if="combosFiltrados.length === 0" class="card bg-base-100 shadow-xl">
        <div class="card-body text-center">
          <p class="text-base-content/60">No se encontraron combos</p>
        </div>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="combo in combosFiltrados"
          :key="combo.id"
          class="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow cursor-pointer"
          @click="verCorreosCombo(combo)"
        >
          <figure class="h-48 overflow-hidden">
            <img v-if="combo.foto" :src="combo.foto" :alt="combo.nombre" class="w-full h-full object-cover" />
            <div v-else class="w-full h-full bg-base-300 flex items-center justify-center">
              <Package :size="48" class="text-base-content/30" />
            </div>
          </figure>
          <div class="card-body">
            <h2 class="card-title">{{ combo.nombre }}</h2>
            <div class="flex flex-wrap gap-2 mt-2">
              <div class="badge badge-primary">{{ formatearPrecio(combo.precio || 0) }}</div>
              <div class="badge badge-secondary">{{ combo.version }}</div>
              <div v-if="combo.tipoPromocion === 'oferta'" class="badge badge-warning">Oferta</div>
              <div v-if="combo.tipoPromocion === 'promocion'" class="badge badge-info">Promoción</div>
            </div>
            <div class="mt-4 text-sm text-base-content/60">
              <p>📧 {{ combo.totalCorreos }} cuenta(s)</p>
              <p>📦 {{ combo.stockAccounts }} con stock</p>
              <p>🎮 {{ combo.juegos?.length || 0 }} juego(s)</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Vista de Correos -->
    <div v-if="vistaActual === 'correos' && comboSeleccionado">
      <div class="card bg-base-100 shadow-xl mb-6">
        <div class="card-body">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-2xl font-bold">{{ comboSeleccionado.nombre }}</h2>
              <p class="text-base-content/60 mt-1">{{ formatearPrecio(comboSeleccionado.precio || 0) }} • {{ comboSeleccionado.version }}</p>
            </div>
            <button @click="volverACombos" class="btn btn-ghost">← Volver a Combos</button>
          </div>
        </div>
      </div>

      <div v-if="isLoadingCorreos" class="flex justify-center p-8">
        <span class="loading loading-spinner loading-lg"></span>
      </div>

      <div v-else-if="correosCombo.length === 0" class="card bg-base-100 shadow-xl">
        <div class="card-body text-center">
          <p class="text-base-content/60">No hay correos registrados</p>
        </div>
      </div>

      <div v-else class="space-y-4">
        <div v-for="correo in correosCombo" :key="correo.correo" class="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow">
          <div class="card-body">
            <div class="flex justify-between items-start">
              <div class="cursor-pointer flex-1" @click="verDetallesCorreo(correo)">
                <h3 class="card-title text-lg">{{ correo.correo }}</h3>
                <p class="text-base-content/60 mt-1">{{ correo.nombre || 'Sin nombre' }}</p>
              </div>
              <div class="flex flex-col gap-2 items-end">
                <div class="badge badge-lg">{{ correo.cuentas.length }} cuenta(s)</div>
                <div class="badge" :class="validarCodigosDisponibles(correo) ? 'badge-success' : 'badge-error'">
                  {{ validarCodigosDisponibles(correo) ? 'Disponible' : 'No disponible' }}
                </div>
                <div class="badge" :class="validarStockDisponible(correo) ? 'badge-success' : 'badge-warning'">
                  {{ correo.cuentas?.filter(c => c?.hasStock === true).length || 0 }} con stock
                </div>
              </div>
            </div>
            <div class="mt-4 text-sm">
              <p><span class="font-medium">Fecha:</span> {{ formatearFecha(correo.fecha) }}</p>
            </div>
            
            <div class="card-actions justify-end mt-4">
              <button @click="verDetallesCorreo(correo)" class="btn btn-sm btn-outline">Ver Detalles</button>
              <div v-if="correo.version === 'PS4 & PS5'" class="dropdown dropdown-end">
                <label 
                  tabindex="0" 
                  :class="[
                    'btn btn-sm gap-2',
                    validarCodigosDisponibles(correo) && validarStockDisponible(correo) && validarSlotsDisponibles(correo) && !isGenerating ? 'btn-success' : 'btn-disabled'
                  ]"
                  :title="!validarCodigosDisponibles(correo) ? 'Se requieren al menos 2 códigos disponibles' : !validarStockDisponible(correo) ? 'No hay stock disponible' : !validarSlotsDisponibles(correo) ? 'Ya están ocupados los 4 slots de cuenta' : ''"
                >
                  <MessageCircle :size="16" />
                  {{ isGenerating ? 'Generando...' : 'Generar Mensaje' }}
                </label>
                <ul 
                  v-if="validarCodigosDisponibles(correo) && validarStockDisponible(correo) && validarSlotsDisponibles(correo) && !isGenerating"
                  tabindex="0" 
                  class="dropdown-content z-50 menu p-2 shadow-lg bg-base-100 rounded-box w-52"
                >
                  <li><a @click.prevent="abrirModalWhatsApp(correo, 'PS4')"><span class="badge badge-primary badge-sm">PS4</span> Mensaje PS4</a></li>
                  <li><a @click.prevent="abrirModalWhatsApp(correo, 'PS5')"><span class="badge badge-secondary badge-sm">PS5</span> Mensaje PS5</a></li>
                </ul>
              </div>
              <button
                v-else
                @click.stop="abrirModalWhatsApp(correo)"
                :class="[
                  'btn btn-sm gap-2',
                  validarCodigosDisponibles(correo) && validarStockDisponible(correo) && validarSlotsDisponibles(correo) && !isGenerating ? 'btn-success' : 'btn-disabled'
                ]"
                :disabled="!validarCodigosDisponibles(correo) || !validarStockDisponible(correo) || !validarSlotsDisponibles(correo) || isGenerating"
                :title="!validarCodigosDisponibles(correo) ? 'Se requieren al menos 2 códigos disponibles' : !validarStockDisponible(correo) ? 'No hay stock disponible' : !validarSlotsDisponibles(correo) ? 'Ya están ocupados los 4 slots de cuenta' : ''"
              >
                <MessageCircle :size="16" />
                {{ isGenerating ? 'Generando...' : 'Generar Mensaje' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de Detalles -->
    <dialog v-if="showEmailDetails && selectedEmailDetails" class="modal modal-open">
      <div class="modal-box max-w-4xl">
        <h3 class="font-bold text-lg mb-4">Detalles del Correo</h3>
        
        <div class="space-y-4">
          <div>
            <h4 class="font-semibold mb-2">Información General</h4>
            <div class="space-y-1 text-sm">
              <p><span class="font-medium">Correo:</span> {{ selectedEmailDetails.correo }}</p>
              <p><span class="font-medium">Nombre:</span> {{ selectedEmailDetails.nombre || 'N/A' }}</p>
              <p><span class="font-medium">Fecha:</span> {{ formatearFecha(selectedEmailDetails.fecha) }}</p>
            </div>
          </div>

          <div v-if="selectedEmailDetails.cuentas?.length">
            <h4 class="font-semibold mb-2">Cuentas Asociadas ({{ selectedEmailDetails.cuentas.length }})</h4>
            <div class="space-y-2">
              <div v-for="(cuenta, index) in selectedEmailDetails.cuentas" :key="index" class="card bg-base-200 p-4">
                <div class="flex justify-between items-start">
                  <div>
                    <p class="font-medium">{{ cuenta.nombre }}</p>
                    <p class="text-sm text-base-content/60">📱 {{ cuenta.telefono }}</p>
                  </div>
                  <div class="flex gap-2">
                    <div class="badge" :class="cuenta.tipo.includes('Principal') ? 'badge-primary' : 'badge-secondary'">
                      {{ cuenta.tipo }}
                    </div>
                    <div v-if="cuenta.hasStock" class="badge badge-success">
                      Stock
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-action">
          <button @click="cerrarDetallesCorreo" class="btn btn-ghost">Cerrar</button>
          
          <div v-if="selectedEmailDetails.version === 'PS4 & PS5'" class="dropdown dropdown-top dropdown-end">
            <label
              tabindex="0"
              :class="[
                'btn gap-2',
                validarCodigosDisponibles(selectedEmailDetails) && validarStockDisponible(selectedEmailDetails) && validarSlotsDisponibles(selectedEmailDetails) && !isGenerating ? 'btn-success' : 'btn-disabled'
              ]"
              :title="!validarCodigosDisponibles(selectedEmailDetails) ? 'Se requieren al menos 2 códigos disponibles' : !validarStockDisponible(selectedEmailDetails) ? 'No hay stock disponible' : !validarSlotsDisponibles(selectedEmailDetails) ? 'Ya están ocupados los 4 slots de cuenta' : ''"
            >
              <MessageCircle :size="20" />
              {{ isGenerating ? 'Generando...' : 'Generar Mensaje' }}
            </label>
            <ul 
              v-if="validarCodigosDisponibles(selectedEmailDetails) && validarStockDisponible(selectedEmailDetails) && validarSlotsDisponibles(selectedEmailDetails) && !isGenerating"
              tabindex="0" 
              class="dropdown-content z-1 menu p-2 shadow-lg bg-base-100 rounded-box w-52 mb-2"
            >
              <li><button @click="abrirModalWhatsApp(selectedEmailDetails, 'PS4')"><span class="badge badge-primary badge-sm">PS4</span> Mensaje PS4</button></li>
              <li><button @click="abrirModalWhatsApp(selectedEmailDetails, 'PS5')"><span class="badge badge-secondary badge-sm">PS5</span> Mensaje PS5</button></li>
            </ul>
          </div>
          <button
            v-else
            @click="abrirModalWhatsApp(selectedEmailDetails)"
            :class="[
              'btn gap-2',
              validarCodigosDisponibles(selectedEmailDetails) && validarStockDisponible(selectedEmailDetails) && validarSlotsDisponibles(selectedEmailDetails) && !isGenerating ? 'btn-success' : 'btn-disabled'
            ]"
            :disabled="!validarCodigosDisponibles(selectedEmailDetails) || !validarStockDisponible(selectedEmailDetails) || !validarSlotsDisponibles(selectedEmailDetails) || isGenerating"
            :title="!validarCodigosDisponibles(selectedEmailDetails) ? 'Se requieren al menos 2 códigos disponibles' : !validarStockDisponible(selectedEmailDetails) ? 'No hay stock disponible' : !validarSlotsDisponibles(selectedEmailDetails) ? 'Ya están ocupados los 4 slots de cuenta' : ''"
          >
            <MessageCircle :size="20" />
            {{ isGenerating ? 'Generando...' : 'Generar Mensaje' }}
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="cerrarDetallesCorreo">close</button>
      </form>
    </dialog>

    <!-- Modal de WhatsApp -->
    <WhatsAppMessageModal
      :mensaje="mensajeWhatsApp"
      :mostrar="showWhatsAppModal"
      :codigos-restantes="selectedEmailDetails?.codigosGenerados?.length || 0"
      :version="selectedEmailDetails?.version"
      @cerrar="cerrarModalWhatsApp"
      @copiar="copiarMensaje"
      @guardar-cliente="handleGuardarCliente"
    />
  </div>
</template>
