<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useGames } from '@/composables/useGames'
import { useWhatsAppMessages } from '@/composables/useWhatsAppMessages'
import { useRoles } from '@/composables/useRoles'
import { useReportes } from '@/composables/useReportes'
import { Gamepad2, Search, RefreshCw, MessageCircle } from 'lucide-vue-next'
import WhatsAppMessageModal from '@/components/ui/WhatsAppMessageModal.vue'
import type { GameSummary, GameEmailAccount, GamePlatform, AccountType } from '@/types/game'
import type { WhatsAppMessage } from '@/composables/useWhatsAppMessages'

const {
  games,
  isLoadingGames,
  isSyncingGames,
  cargarJuegos,
  sincronizarJuegos,
  cargarCorreosJuego,
  generarIdJuego
} = useGames()

const {
  validarCodigosDisponibles,
  generarYEliminarCodigos,
  copiarAlPortapapeles,
  isGenerating
} = useWhatsAppMessages()

const { currentUserData } = useRoles()
const { crearReporte } = useReportes()
const { actualizarCorreoJuego } = useGames()

// Estados principales
const plataformaSeleccionada = ref<GamePlatform>('PS4 & PS5')
const searchTerm = ref('')
const vistaActual = ref<'juegos' | 'correos'>('juegos')
const juegoSeleccionado = ref<GameSummary | null>(null)
const correosJuego = ref<GameEmailAccount[]>([])
const isLoadingCorreos = ref(false)

// Estados para modales
const showEmailDetails = ref(false)
const selectedEmailDetails = ref<GameEmailAccount | null>(null)
const showWhatsAppModal = ref(false)
const mensajeWhatsApp = ref<WhatsAppMessage | null>(null)
const datosCliente = ref<{ nombre: string; telefono: string; tipoCuenta: import('@/types/game').AccountType } | null>(null)

// Estados para filtros
const promoFiltro = ref<'todas' | 'oferta' | 'promocion' | 'ninguna'>('todas')
const stockFiltro = ref<'todas' | 'con' | 'sin'>('todas')
const sortBy = ref<'nombre' | 'costo' | 'correos' | 'stock'>('nombre')
const sortOrder = ref<'asc' | 'desc'>('asc')

// Computed para juegos filtrados
const juegosFiltrados = computed(() => {
  let resultado = games.value

  // Filtro por plataforma
  if (plataformaSeleccionada.value !== 'PS4 & PS5') {
    resultado = resultado.filter(
      juego => juego.version === plataformaSeleccionada.value || juego.version === 'PS4 & PS5'
    )
  }

  // Filtro por búsqueda
  if (searchTerm.value.trim()) {
    const termino = searchTerm.value.trim().toLowerCase()
    resultado = resultado.filter(juego => juego.nombre.toLowerCase().includes(termino))
  }

  // Filtro por promoción
  if (promoFiltro.value !== 'todas') {
    resultado = resultado.filter(juego => juego.tipoPromocion === promoFiltro.value)
  }

  // Filtro por stock
  if (stockFiltro.value === 'con') {
    resultado = resultado.filter(juego => (juego.stockAccounts ?? 0) > 0)
  } else if (stockFiltro.value === 'sin') {
    resultado = resultado.filter(juego => (juego.stockAccounts ?? 0) === 0)
  }

  // Ordenamiento
  resultado = [...resultado].sort((a, b) => {
    let comparacion = 0
    switch (sortBy.value) {
      case 'nombre':
        comparacion = a.nombre.localeCompare(b.nombre)
        break
      case 'costo':
        const precioMinA = Math.min(a.precios.ps4Principal, a.precios.ps4Secundaria, a.precios.ps5Principal, a.precios.ps5Secundaria)
        const precioMinB = Math.min(b.precios.ps4Principal, b.precios.ps4Secundaria, b.precios.ps5Principal, b.precios.ps5Secundaria)
        comparacion = precioMinA - precioMinB
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
const cargarJuegosPorPlataforma = async (): Promise<void> => {
  if (vistaActual.value === 'juegos') juegoSeleccionado.value = null
  await cargarJuegos(plataformaSeleccionada.value, false)
}

const handleSincronizar = async (): Promise<void> => {
  try {
    await sincronizarJuegos(plataformaSeleccionada.value)
  } catch (error) {
    console.error('Error sincronizando:', error)
  }
}

const verCorreosJuego = async (juego: GameSummary): Promise<void> => {
  juegoSeleccionado.value = juego
  isLoadingCorreos.value = true
  vistaActual.value = 'correos'

  try {
    correosJuego.value = await cargarCorreosJuego('PS4 & PS5', juego.id)
  } catch (error) {
    console.error('Error cargando correos:', error)
  } finally {
    isLoadingCorreos.value = false
  }
}

const volverAJuegos = (): void => {
  vistaActual.value = 'juegos'
  juegoSeleccionado.value = null
  correosJuego.value = []
}

const verDetallesCorreo = (correo: GameEmailAccount): void => {
  selectedEmailDetails.value = correo
  showEmailDetails.value = true
}

const cerrarDetallesCorreo = (): void => {
  showEmailDetails.value = false
  selectedEmailDetails.value = null
}

// WhatsApp
const abrirModalWhatsApp = async (correo: GameEmailAccount, version?: 'PS4' | 'PS5'): Promise<void> => {
  // Validar códigos disponibles
  if (!validarCodigosDisponibles(correo)) {
    alert('No hay suficientes códigos disponibles (se requieren al menos 2)')
    return
  }

  // Validar información del usuario
  if (!juegoSeleccionado.value) {
    alert('Error: No hay juego seleccionado')
    return
  }

  if (!currentUserData.value?.uid || !currentUserData.value?.email) {
    alert('Error: Información de usuario incompleta. Por favor, inicia sesión nuevamente.')
    return
  }

  // Validar que el correo tenga código master
  if (!correo.codigoMaster || correo.codigoMaster.trim() === '') {
    alert('Error: El correo no tiene contraseña (código master) configurada')
    return
  }

  try {
    const juegoId = generarIdJuego(juegoSeleccionado.value.nombre)
    
    console.log('🔄 Generando mensaje WhatsApp...', {
      correo: correo.correo,
      juego: juegoSeleccionado.value.nombre,
      version: version || 'auto',
      plataforma: plataformaSeleccionada.value,
      codigosDisponibles: correo.codigosGenerados?.length || 0
    })

    const mensaje = await generarYEliminarCodigos(
      correo,
      plataformaSeleccionada.value,
      juegoId,
      juegoSeleccionado.value.nombre,
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
      await verCorreosJuego(juegoSeleccionado.value)
      
      // Actualizar el modal de detalles si está abierto
      if (showEmailDetails.value && selectedEmailDetails.value?.correo === correo.correo) {
        const correoActualizado = correosJuego.value.find(c => c.correo === correo.correo)
        if (correoActualizado) {
          selectedEmailDetails.value = correoActualizado
        }
      }
    } else {
      alert('No se pudo generar el mensaje. Por favor, verifica que haya códigos disponibles y que el correo tenga contraseña configurada.')
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
  if (!juegoSeleccionado.value || !selectedEmailDetails.value || !currentUserData.value) {
    alert('Error: Información incompleta para guardar cliente')
    return
  }

  try {
    const juegoId = generarIdJuego(juegoSeleccionado.value.nombre)
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

    await actualizarCorreoJuego(
      plataformaSeleccionada.value,
      juegoId,
      correo.correo,
      { cuentas: cuentasActualizadas }
    )

    // Crear reporte con los datos del cliente
    await crearReporte(
      currentUserData.value.uid,
      currentUserData.value.email,
      currentUserData.value.displayName || currentUserData.value.email || 'Usuario',
      currentUserData.value.role as 'admin' | 'employee',
      juegoSeleccionado.value.nombre,
      juegoId,
      correo.version,
      correo.correo,
      {
        codigo1: mensajeWhatsApp.value?.codigoVerificacion1 || '',
        codigo2: mensajeWhatsApp.value?.codigoVerificacion2 || ''
      },
      mensajeWhatsApp.value?.version || 'PS4',
      datos.nombre,
      datos.telefono,
      datos.tipoCuenta
    )

    // Actualizar la lista de correos
    await verCorreosJuego(juegoSeleccionado.value)
    
    // Actualizar el modal de detalles si está abierto
    if (showEmailDetails.value) {
      const correoActualizado = correosJuego.value.find(c => c.correo === correo.correo)
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
        await sincronizarJuegos(plataformaSeleccionada.value)
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
  await cargarJuegosPorPlataforma()
})

// Lifecycle
onMounted(async () => {
  await cargarJuegosPorPlataforma()
  iniciarSincronizacionAutomatica()
})

onBeforeUnmount(() => {
  detenerSincronizacionAutomatica()
})

// Exponer función para navegar desde fuera
defineExpose({
  verCorreosJuego
})
</script>

<template>
  <div>
    <div class="alert alert-info mb-6">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
      <span><strong>Modo Solo Lectura:</strong> Puedes consultar los juegos y generar mensajes WhatsApp, pero no modificar datos.</span>
    </div>

    <!-- Breadcrumb -->
    <div class="breadcrumbs mb-4">
      <ul>
        <li v-if="vistaActual === 'juegos'"><span class="font-semibold">Juegos</span></li>
        <li v-if="vistaActual === 'correos'">
          <button @click="volverAJuegos" class="text-primary hover:underline">Juegos</button>
        </li>
        <li v-if="vistaActual === 'correos'">{{ juegoSeleccionado?.nombre }}</li>
      </ul>
    </div>

    <!-- Vista de Juegos -->
    <div v-if="vistaActual === 'juegos'">
      <!-- Filtros -->
      <div class="card bg-base-100 shadow-xl mb-6">
        <div class="card-body">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div class="form-control">
              <label class="label"><span class="label-text font-semibold">Plataforma</span></label>
              <select v-model="plataformaSeleccionada" class="select select-bordered">
                <option value="PS4 & PS5">PS4 & PS5</option>
                <option value="PS4">PS4</option>
                <option value="PS5">PS5</option>
              </select>
            </div>

            <div class="form-control">
              <label class="label"><span class="label-text font-semibold">Buscar Juego</span></label>
              <input v-model="searchTerm" type="text" placeholder="Nombre del juego..." class="input input-bordered" />
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
                  <option value="costo">Precio</option>
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
                :disabled="isSyncingGames || isLoadingGames"
              >
                <RefreshCw :size="18" :class="{ 'animate-spin': isSyncingGames }" />
                {{ isSyncingGames ? 'Sincronizando...' : 'Sincronizar' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Lista de Juegos -->
      <div v-if="isLoadingGames" class="flex justify-center p-8">
        <span class="loading loading-spinner loading-lg"></span>
      </div>

      <div v-else-if="juegosFiltrados.length === 0" class="card bg-base-100 shadow-xl">
        <div class="card-body text-center">
          <p class="text-base-content/60">No se encontraron juegos</p>
        </div>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="juego in juegosFiltrados"
          :key="juego.id"
          class="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow cursor-pointer"
          @click="verCorreosJuego(juego)"
        >
          <figure class="h-48 overflow-hidden">
            <img v-if="juego.foto" :src="juego.foto" :alt="juego.nombre" class="w-full h-full object-cover" />
            <div v-else class="w-full h-full bg-base-300 flex items-center justify-center">
              <Gamepad2 :size="48" class="text-base-content/30" />
            </div>
          </figure>
          <div class="card-body">
            <h2 class="card-title">{{ juego.nombre }}</h2>
            <div class="flex flex-wrap gap-2 mt-2">
              <div class="badge badge-primary badge-sm">PS4 P: {{ formatearPrecio(juego.precios.ps4Principal) }}</div>
              <div class="badge badge-secondary badge-sm">PS4 S: {{ formatearPrecio(juego.precios.ps4Secundaria) }}</div>
              <div class="badge badge-success badge-sm">PS5 P: {{ formatearPrecio(juego.precios.ps5Principal) }}</div>
              <div class="badge badge-accent badge-sm">PS5 S: {{ formatearPrecio(juego.precios.ps5Secundaria) }}</div>
              <div class="badge badge-secondary">{{ juego.version }}</div>
              <div v-if="juego.tipoPromocion === 'oferta'" class="badge badge-warning">Oferta</div>
              <div v-if="juego.tipoPromocion === 'promocion'" class="badge badge-info">Promoción</div>
            </div>
            <div class="mt-4 text-sm text-base-content/60">
              <p>📧 {{ juego.totalCorreos }} cuenta(s)</p>
              <p>📦 {{ juego.stockAccounts }} con stock</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Vista de Correos -->
    <div v-if="vistaActual === 'correos' && juegoSeleccionado">
      <div class="card bg-base-100 shadow-xl mb-6">
        <div class="card-body">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-2xl font-bold">{{ juegoSeleccionado.nombre }}</h2>
              <p class="text-base-content/60 mt-1">{{ formatearPrecio(Math.min(juegoSeleccionado.precios.ps4Principal, juegoSeleccionado.precios.ps4Secundaria, juegoSeleccionado.precios.ps5Principal, juegoSeleccionado.precios.ps5Secundaria)) }} • {{ juegoSeleccionado.version }}</p>
            </div>
            <button @click="volverAJuegos" class="btn btn-ghost">← Volver a Juegos</button>
          </div>
        </div>
      </div>

      <div v-if="isLoadingCorreos" class="flex justify-center p-8">
        <span class="loading loading-spinner loading-lg"></span>
      </div>

      <div v-else-if="correosJuego.length === 0" class="card bg-base-100 shadow-xl">
        <div class="card-body text-center">
          <p class="text-base-content/60">No hay correos registrados</p>
        </div>
      </div>

      <div v-else class="space-y-4">
        <div v-for="correo in correosJuego" :key="correo.correo" class="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow">
          <div class="card-body">
            <div class="flex justify-between items-start">
              <div class="cursor-pointer flex-1" @click="verDetallesCorreo(correo)">
                <h3 class="card-title text-lg">{{ correo.correo }}</h3>
                <p class="text-base-content/60 mt-1">{{ correo.nombre || 'Sin nombre' }}</p>
              </div>
              <div class="flex flex-col gap-2 items-end">
                <div class="badge badge-lg">{{ correo.cuentas.length }} cuenta(s)</div>
                <div class="badge" :class="validarCodigosDisponibles(correo) ? 'badge-success' : 'badge-error'">
                  {{ correo.codigosGenerados?.length || 0 }} códigos
                </div>
              </div>
            </div>
            <div class="mt-4 text-sm">
              <p><span class="font-medium">Código:</span> {{ correo.codigo || 'N/A' }}</p>
              <p><span class="font-medium">Fecha:</span> {{ formatearFecha(correo.fecha) }}</p>
            </div>
            
            <div class="card-actions justify-end mt-4">
              <button @click="verDetallesCorreo(correo)" class="btn btn-sm btn-outline">Ver Detalles</button>
              <div v-if="correo.version === 'PS4 & PS5'" class="dropdown dropdown-end">
                <label 
                  tabindex="0" 
                  :class="[
                    'btn btn-sm gap-2',
                    validarCodigosDisponibles(correo) && !isGenerating ? 'btn-success' : 'btn-disabled'
                  ]"
                  :title="!validarCodigosDisponibles(correo) ? 'Se requieren al menos 2 códigos disponibles' : ''"
                >
                  <MessageCircle :size="16" />
                  {{ isGenerating ? 'Generando...' : 'Generar Mensaje' }}
                </label>
                <ul 
                  v-if="validarCodigosDisponibles(correo) && !isGenerating"
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
                  validarCodigosDisponibles(correo) && !isGenerating ? 'btn-success' : 'btn-disabled'
                ]"
                :disabled="!validarCodigosDisponibles(correo) || isGenerating"
                :title="!validarCodigosDisponibles(correo) ? 'Se requieren al menos 2 códigos disponibles' : ''"
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
              <p><span class="font-medium">Código:</span> {{ selectedEmailDetails.codigo || 'N/A' }}</p>
              <p><span class="font-medium">Fecha:</span> {{ formatearFecha(selectedEmailDetails.fecha) }}</p>
            </div>
          </div>

          <div v-if="selectedEmailDetails.codigosGenerados?.length">
            <h4 class="font-semibold mb-2">Códigos Generados ({{ selectedEmailDetails.codigosGenerados.length }})</h4>
            <div class="flex flex-wrap gap-2">
              <div v-for="(codigo, index) in selectedEmailDetails.codigosGenerados" :key="index" class="badge badge-outline">
                {{ codigo }}
              </div>
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
                  <div class="badge" :class="cuenta.tipo.includes('Principal') ? 'badge-primary' : 'badge-secondary'">
                    {{ cuenta.tipo }}
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
                validarCodigosDisponibles(selectedEmailDetails) && !isGenerating ? 'btn-success' : 'btn-disabled'
              ]"
              :title="!validarCodigosDisponibles(selectedEmailDetails) ? 'Se requieren al menos 2 códigos disponibles' : ''"
            >
              <MessageCircle :size="20" />
              {{ isGenerating ? 'Generando...' : 'Generar Mensaje' }}
            </label>
            <ul 
              v-if="validarCodigosDisponibles(selectedEmailDetails) && !isGenerating"
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
              validarCodigosDisponibles(selectedEmailDetails) && !isGenerating ? 'btn-success' : 'btn-disabled'
            ]"
            :disabled="!validarCodigosDisponibles(selectedEmailDetails) || isGenerating"
            :title="!validarCodigosDisponibles(selectedEmailDetails) ? 'Se requieren al menos 2 códigos disponibles' : ''"
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

