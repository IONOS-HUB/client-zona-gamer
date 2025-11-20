<script setup lang="ts">
import { ref, onMounted, computed, watch, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useRoles } from '@/composables/useRoles'
import { BarChart3, Gamepad2, Home, Phone, Search, Mail, RefreshCw, MessageCircle } from 'lucide-vue-next'
import StatsOverview from '@/components/admin/StatsOverview.vue'
import WhatsAppMessageModal from '@/components/ui/WhatsAppMessageModal.vue'
import { useGames } from '@/composables/useGames'
import { useWhatsAppMessages } from '@/composables/useWhatsAppMessages'
import type { TelefonoSearchResult, CorreoSearchResult, GamePlatform, GameSummary, GameEmailAccount } from '@/types/game'
import type { WhatsAppMessage } from '@/composables/useWhatsAppMessages'

const router = useRouter()
const { signOut } = useAuth()
const { currentUserData, loadUserData } = useRoles()
const { 
  buscarPorTelefono, 
  buscarPorCorreo,
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

// Estado para el tab activo
const activeTab = ref<'stats' | 'telefono' | 'correo' | 'games'>('stats')

// Estados para búsqueda por teléfono
const telefonoBusqueda = ref('')
const resultadosTelefono = ref<TelefonoSearchResult[]>([])
const isLoadingTelefono = ref(false)
const plataformaTelefono = ref<GamePlatform>('PS4 & PS5')

// Estados para búsqueda por correo
const correoBusqueda = ref('')
const resultadosCorreo = ref<CorreoSearchResult[]>([])
const isLoadingCorreo = ref(false)
const plataformaCorreo = ref<GamePlatform>('PS4 & PS5')

// Estados para gestión de juegos (solo lectura)
const plataformaSeleccionada = ref<GamePlatform>('PS4 & PS5')
const searchTerm = ref('')
const vistaActual = ref<'juegos' | 'correos'>('juegos')
const juegoSeleccionado = ref<GameSummary | null>(null)
const correosJuego = ref<GameEmailAccount[]>([])
const isLoadingCorreos = ref(false)
const showEmailDetails = ref(false)
const selectedEmailDetails = ref<GameEmailAccount | null>(null)
const showWhatsAppModal = ref(false)
const mensajeWhatsApp = ref<WhatsAppMessage | null>(null)
const versionSeleccionadaParaMensaje = ref<'PS4' | 'PS5'>('PS4')

// Debounce manual para búsqueda de teléfono
let telefonoDebounceTimer: ReturnType<typeof setTimeout> | null = null
const buscarTelefonoDebounced = (): void => {
  if (telefonoDebounceTimer) {
    clearTimeout(telefonoDebounceTimer)
  }
  telefonoDebounceTimer = setTimeout(() => {
    buscarTelefono()
  }, 500)
}

const buscarTelefono = async (): Promise<void> => {
  if (!telefonoBusqueda.value || telefonoBusqueda.value.trim().length < 3) {
    resultadosTelefono.value = []
    return
  }

  isLoadingTelefono.value = true
  try {
    resultadosTelefono.value = await buscarPorTelefono(telefonoBusqueda.value.trim(), plataformaTelefono.value)
  } catch (error) {
    console.error('Error buscando teléfono:', error)
  } finally {
    isLoadingTelefono.value = false
  }
}

// Debounce manual para búsqueda de correo
let correoDebounceTimer: ReturnType<typeof setTimeout> | null = null
const buscarCorreoDebounced = (): void => {
  if (correoDebounceTimer) {
    clearTimeout(correoDebounceTimer)
  }
  correoDebounceTimer = setTimeout(() => {
    buscarCorreo()
  }, 500)
}

const buscarCorreo = async (): Promise<void> => {
  if (!correoBusqueda.value || correoBusqueda.value.trim().length < 3) {
    resultadosCorreo.value = []
    return
  }

  isLoadingCorreo.value = true
  try {
    resultadosCorreo.value = await buscarPorCorreo(correoBusqueda.value.trim(), plataformaCorreo.value)
  } catch (error) {
    console.error('Error buscando correo:', error)
  } finally {
    isLoadingCorreo.value = false
  }
}

// Funciones para gestión de juegos
const cargarJuegosPorPlataforma = async (): Promise<void> => {
  if (vistaActual.value === 'juegos') {
    juegoSeleccionado.value = null
  }
  try {
    await cargarJuegos(plataformaSeleccionada.value, false) // Usar cache si está disponible
  } catch (error) {
    console.error('Error cargando juegos:', error)
  }
}

const handleSincronizarJuegos = async (): Promise<void> => {
  try {
    await sincronizarJuegos(plataformaSeleccionada.value)
  } catch (error) {
    console.error('Error sincronizando juegos:', error)
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

const abrirModalWhatsApp = async (correo: GameEmailAccount, version?: 'PS4' | 'PS5'): Promise<void> => {
  if (!validarCodigosDisponibles(correo)) {
    alert('No hay suficientes códigos disponibles (se requieren al menos 2)')
    return
  }

  if (!juegoSeleccionado.value) {
    alert('Error: No se ha seleccionado un juego')
    return
  }

  if (!currentUserData.value?.uid || !currentUserData.value?.email) {
    alert('Error: No se pudo obtener la información del usuario')
    return
  }

  try {
    const juegoId = generarIdJuego(juegoSeleccionado.value.nombre)
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
      mensajeWhatsApp.value = mensaje
      showWhatsAppModal.value = true
      
      // Recargar los correos para reflejar los códigos eliminados
      await verCorreosJuego(juegoSeleccionado.value)
      
      // Si el modal de detalles está abierto, actualizar también ese correo
      if (showEmailDetails.value && selectedEmailDetails.value?.correo === correo.correo) {
        const correoActualizado = correosJuego.value.find(c => c.correo === correo.correo)
        if (correoActualizado) {
          selectedEmailDetails.value = correoActualizado
        }
      }
    }
  } catch (error) {
    console.error('Error generando mensaje:', error)
    alert('Error al generar el mensaje de WhatsApp')
  }
}

const cerrarModalWhatsApp = (): void => {
  showWhatsAppModal.value = false
  mensajeWhatsApp.value = null
}

const copiarMensajeWhatsApp = async (mensaje: string): Promise<void> => {
  const exitoso = await copiarAlPortapapeles(mensaje)
  if (!exitoso) {
    alert('No se pudo copiar el mensaje. Por favor, cópialo manualmente.')
  }
}

const handleGameClickFromStats = async (juego: GameSummary): Promise<void> => {
  // Cambiar al tab de juegos
  activeTab.value = 'games'
  
  // Asegurarse de que los juegos estén cargados
  if (games.value.length === 0) {
    await cargarJuegosPorPlataforma()
  }
  
  // Buscar el juego en la lista cargada
  const juegoEncontrado = games.value.find(g => g.id === juego.id)
  if (juegoEncontrado) {
    setTimeout(() => {
      verCorreosJuego(juegoEncontrado)
    }, 100)
  } else {
    setTimeout(() => {
      verCorreosJuego(juego)
    }, 100)
  }
}

// Filtros y ordenamiento para juegos
const promoFiltro = ref<'todas' | 'oferta' | 'promocion' | 'ninguna'>('todas')
const stockFiltro = ref<'todas' | 'con' | 'sin'>('todas')
const sortBy = ref<'nombre' | 'costo' | 'correos' | 'stock'>('nombre')
const sortOrder = ref<'asc' | 'desc'>('asc')

const juegosFiltrados = computed(() => {
  let resultado = games.value

  // Filtro por plataforma
  if (plataformaSeleccionada.value !== 'PS4 & PS5') {
    resultado = resultado.filter(
      juego => juego.version === plataformaSeleccionada.value || juego.version === 'PS4 & PS5'
    )
  }

  // Filtro por término de búsqueda
  if (searchTerm.value.trim()) {
    const termino = searchTerm.value.trim().toLowerCase()
    resultado = resultado.filter(juego =>
      juego.nombre.toLowerCase().includes(termino)
    )
  }

  // Filtro por promoción
  if (promoFiltro.value !== 'todas') {
    resultado = resultado.filter(juego => juego.tipoPromocion === promoFiltro.value)
  }

  // Filtro por stock
  if (stockFiltro.value === 'con') {
    resultado = resultado.filter(juego => juego.stockAccounts > 0)
  } else if (stockFiltro.value === 'sin') {
    resultado = resultado.filter(juego => juego.stockAccounts === 0)
  }

  // Ordenamiento
  resultado = [...resultado].sort((a, b) => {
    let comparacion = 0
    switch (sortBy.value) {
      case 'nombre':
        comparacion = a.nombre.localeCompare(b.nombre)
        break
      case 'costo':
        comparacion = a.costo - b.costo
        break
      case 'correos':
        comparacion = a.totalCorreos - b.totalCorreos
        break
      case 'stock':
        comparacion = a.stockAccounts - b.stockAccounts
        break
    }
    return sortOrder.value === 'asc' ? comparacion : -comparacion
  })

  return resultado
})

// Funciones de formato
const formatearPrecio = (precio: number): string => {
  return new Intl.NumberFormat('es-EC', {
    style: 'currency',
    currency: 'USD'
  }).format(precio)
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

// Intervalo para actualizar automáticamente cada 10 minutos
let syncInterval: ReturnType<typeof setInterval> | null = null

const iniciarSincronizacionAutomatica = (): void => {
  if (syncInterval) {
    clearInterval(syncInterval)
  }
  
  syncInterval = setInterval(async () => {
    if (activeTab.value === 'games' && plataformaSeleccionada.value) {
      try {
        await sincronizarJuegos(plataformaSeleccionada.value)
        console.log('Sincronización automática completada')
      } catch (error) {
        console.error('Error en sincronización automática:', error)
      }
    }
  }, 10 * 60 * 1000) // 10 minutos
}

const detenerSincronizacionAutomatica = (): void => {
  if (syncInterval) {
    clearInterval(syncInterval)
    syncInterval = null
  }
}

// Watchers
watch(activeTab, async (newTab) => {
  if (newTab === 'games') {
    if (games.value.length === 0) {
      await cargarJuegosPorPlataforma()
    }
    iniciarSincronizacionAutomatica()
  } else {
    detenerSincronizacionAutomatica()
  }
})

watch(plataformaSeleccionada, async () => {
  if (activeTab.value === 'games') {
    await cargarJuegosPorPlataforma()
  }
})

watch(telefonoBusqueda, () => {
  buscarTelefonoDebounced()
})

watch(correoBusqueda, () => {
  buscarCorreoDebounced()
})

// Lifecycle hooks
onMounted(async () => {
  await loadUserData()
  
  if (activeTab.value === 'games') {
    await cargarJuegosPorPlataforma()
    iniciarSincronizacionAutomatica()
  }
})

onBeforeUnmount(() => {
  detenerSincronizacionAutomatica()
  if (telefonoDebounceTimer) {
    clearTimeout(telefonoDebounceTimer)
  }
  if (correoDebounceTimer) {
    clearTimeout(correoDebounceTimer)
  }
})

const handleLogout = async (): Promise<void> => {
  await signOut()
  router.push('/login')
}

const irAHome = (): void => {
  router.push('/')
}
</script>

<template>
  <div class="min-h-screen bg-base-200">
    <!-- Navbar -->
    <div class="navbar bg-base-100 shadow-lg border-b border-white/10">
      <div class="flex-1">
        <a class="btn btn-ghost text-xl font-bold">
          <BarChart3 :size="24" class="text-warning" />
          Panel de Empleado
        </a>
      </div>
      <div class="flex-none gap-2">
        <button @click="irAHome" class="btn btn-ghost gap-2">
          <Home :size="20" />
          <span class="hidden md:inline">Ir a la Tienda</span>
        </button>
        <div class="dropdown dropdown-end">
          <div tabindex="0" role="button" class="btn btn-ghost gap-2">
            <div class="avatar placeholder">
              <div class="bg-warning text-warning-content rounded-full w-8">
                <span class="text-xs">{{ currentUserData?.email?.charAt(0).toUpperCase() }}</span>
              </div>
            </div>
            <span class="hidden md:inline">{{ currentUserData?.email }}</span>
          </div>
          <ul
            tabindex="0"
            class="mt-3 z-100 p-2 shadow-lg menu menu-sm dropdown-content bg-base-100 rounded-box w-52 border border-white/10"
          >
            <li class="menu-title">
              <span class="text-xs">Empleado</span>
            </li>
            <div class="divider my-1"></div>
            <li><a @click="handleLogout" class="text-error">Cerrar Sesión</a></li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Tabs de Navegación -->
    <div class="bg-base-100 border-b border-white/10 sticky top-0 z-50">
      <div class="container mx-auto">
        <div class="tabs tabs-boxed bg-transparent gap-2 p-4">
          <button 
            @click="activeTab = 'stats'" 
            :class="['tab gap-2 transition-all', activeTab === 'stats' ? 'tab-active' : '']"
          >
            <BarChart3 :size="18" />
            Estadísticas
          </button>
          <button 
            @click="activeTab = 'telefono'" 
            :class="['tab gap-2 transition-all', activeTab === 'telefono' ? 'tab-active' : '']"
          >
            <Phone :size="18" />
            Búsqueda por Teléfono
          </button>
          <button 
            @click="activeTab = 'correo'" 
            :class="['tab gap-2 transition-all', activeTab === 'correo' ? 'tab-active' : '']"
          >
            <Mail :size="18" />
            Búsqueda por Correo
          </button>
          <button 
            @click="activeTab = 'games'" 
            :class="['tab gap-2 transition-all', activeTab === 'games' ? 'tab-active' : '']"
          >
            <Gamepad2 :size="18" />
            Consulta de Juegos
          </button>
        </div>
      </div>
    </div>

    <!-- Contenido por Tab -->
    <div class="container mx-auto p-6">
      <!-- Tab: Estadísticas -->
      <div v-if="activeTab === 'stats'">
        <div class="alert alert-info mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span><strong>Modo Solo Lectura:</strong> Como empleado, puedes consultar las estadísticas pero no modificar datos.</span>
        </div>
        <StatsOverview 
          :read-only="true" 
          :on-game-click="handleGameClickFromStats"
        />
      </div>

      <!-- Tab: Búsqueda por Teléfono -->
      <div v-if="activeTab === 'telefono'">
        <div class="flex justify-between items-center mb-6">
          <div>
            <h1 class="text-3xl font-bold flex items-center gap-3">
              <Phone :size="32" class="text-primary" />
              Búsqueda por Teléfono
            </h1>
            <p class="text-base-content/60 mt-1">Busca cuentas por número de teléfono</p>
          </div>
        </div>

        <!-- Formulario de búsqueda -->
        <div class="card bg-base-100 shadow-xl mb-6">
          <div class="card-body">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div class="form-control md:col-span-2">
                <label class="label">
                  <span class="label-text font-semibold">Número de Teléfono</span>
                </label>
                <div class="relative">
                  <input
                    v-model="telefonoBusqueda"
                    type="text"
                    placeholder="Ej: +593 99 358 6097 o 993586097"
                    class="input input-bordered w-full pl-10"
                    @keyup.enter="buscarTelefono"
                    autocomplete="off"
                  />
                  <Phone :size="20" class="absolute left-3 top-3 text-base-content/40" />
                </div>
              </div>
              <div class="form-control">
                <label class="label">
                  <span class="label-text font-semibold">Plataforma</span>
                </label>
                <select v-model="plataformaTelefono" class="select select-bordered">
                  <option value="PS4 & PS5">PS4 & PS5</option>
                  <option value="PS4">PS4</option>
                  <option value="PS5">PS5</option>
                </select>
              </div>
            </div>
            <div class="card-actions justify-end mt-4">
              <button 
                @click="buscarTelefono" 
                class="btn btn-primary gap-2"
                :disabled="isLoadingTelefono || !telefonoBusqueda || telefonoBusqueda.trim().length < 3"
              >
                <Search :size="18" />
                {{ isLoadingTelefono ? 'Buscando...' : 'Buscar' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Resultados -->
        <div v-if="isLoadingTelefono" class="flex justify-center p-8">
          <span class="loading loading-spinner loading-lg"></span>
        </div>

        <div v-else-if="resultadosTelefono.length === 0 && telefonoBusqueda && telefonoBusqueda.trim().length >= 3" class="card bg-base-100 shadow-xl">
          <div class="card-body text-center">
            <p class="text-base-content/60">No se encontraron cuentas con ese número de teléfono</p>
          </div>
        </div>

        <div v-else-if="resultadosTelefono.length > 0" class="space-y-4">
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <h2 class="card-title">
                Resultados encontrados ({{ resultadosTelefono.length }})
              </h2>
            </div>
          </div>

          <div v-for="(resultado, index) in resultadosTelefono" :key="index" class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <div class="flex justify-between items-start mb-4">
                <div>
                  <h3 class="card-title text-lg">{{ resultado.cuenta.nombre }}</h3>
                  <p class="text-base-content/60 mt-1">
                    <Phone :size="16" class="inline mr-1" />
                    {{ resultado.cuenta.telefono }}
                  </p>
                </div>
                <div class="badge badge-lg" :class="{
                  'badge-primary': resultado.cuenta.tipo.includes('Principal'),
                  'badge-secondary': resultado.cuenta.tipo.includes('Secundaria')
                }">
                  {{ resultado.cuenta.tipo }}
                </div>
              </div>

              <div class="divider"></div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 class="font-semibold mb-2">Información del Juego</h4>
                  <div class="space-y-1 text-sm">
                    <p><span class="font-medium">Juego:</span> {{ resultado.juego.nombre }}</p>
                    <p><span class="font-medium">Precio:</span> {{ formatearPrecio(resultado.juego.costo) }}</p>
                    <p><span class="font-medium">Versión:</span> {{ resultado.juego.version }}</p>
                  </div>
                </div>
                <div>
                  <h4 class="font-semibold mb-2">Información del Correo</h4>
                  <div class="space-y-1 text-sm">
                    <p><span class="font-medium">Correo:</span> {{ resultado.correo.correo }}</p>
                    <p><span class="font-medium">Código:</span> {{ resultado.correo.codigo || 'N/A' }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab: Búsqueda por Correo -->
      <div v-if="activeTab === 'correo'">
        <div class="flex justify-between items-center mb-6">
          <div>
            <h1 class="text-3xl font-bold flex items-center gap-3">
              <Mail :size="32" class="text-primary" />
              Búsqueda por Correo
            </h1>
            <p class="text-base-content/60 mt-1">Busca cuentas por dirección de correo electrónico</p>
          </div>
        </div>

        <!-- Formulario de búsqueda -->
        <div class="card bg-base-100 shadow-xl mb-6">
          <div class="card-body">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div class="form-control md:col-span-2">
                <label class="label">
                  <span class="label-text font-semibold">Correo Electrónico</span>
                </label>
                <div class="relative">
                  <input
                    v-model="correoBusqueda"
                    type="text"
                    placeholder="Ej: ejemplo@gmail.com"
                    class="input input-bordered w-full pl-10"
                    @keyup.enter="buscarCorreo"
                    autocomplete="off"
                  />
                  <Mail :size="20" class="absolute left-3 top-3 text-base-content/40" />
                </div>
              </div>
              <div class="form-control">
                <label class="label">
                  <span class="label-text font-semibold">Plataforma</span>
                </label>
                <select v-model="plataformaCorreo" class="select select-bordered">
                  <option value="PS4 & PS5">PS4 & PS5</option>
                  <option value="PS4">PS4</option>
                  <option value="PS5">PS5</option>
                </select>
              </div>
            </div>
            <div class="card-actions justify-end mt-4">
              <button 
                @click="buscarCorreo" 
                class="btn btn-primary gap-2"
                :disabled="isLoadingCorreo || !correoBusqueda || correoBusqueda.trim().length < 3"
              >
                <Search :size="18" />
                {{ isLoadingCorreo ? 'Buscando...' : 'Buscar' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Resultados -->
        <div v-if="isLoadingCorreo" class="flex justify-center p-8">
          <span class="loading loading-spinner loading-lg"></span>
        </div>

        <div v-else-if="resultadosCorreo.length === 0 && correoBusqueda && correoBusqueda.trim().length >= 3" class="card bg-base-100 shadow-xl">
          <div class="card-body text-center">
            <p class="text-base-content/60">No se encontraron cuentas con ese correo electrónico</p>
          </div>
        </div>

        <div v-else-if="resultadosCorreo.length > 0" class="space-y-4">
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <h2 class="card-title">
                Resultados encontrados ({{ resultadosCorreo.length }})
              </h2>
            </div>
          </div>

          <div v-for="(resultado, index) in resultadosCorreo" :key="index" class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <div class="flex justify-between items-start mb-4">
                <div>
                  <h3 class="card-title text-lg">{{ resultado.correo.correo }}</h3>
                  <p class="text-base-content/60 mt-1">
                    <span class="font-medium">Juego:</span> {{ resultado.juego.nombre }}
                  </p>
                </div>
              </div>

              <div class="divider"></div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 class="font-semibold mb-2">Información del Juego</h4>
                  <div class="space-y-1 text-sm">
                    <p><span class="font-medium">Juego:</span> {{ resultado.juego.nombre }}</p>
                    <p><span class="font-medium">Precio:</span> {{ formatearPrecio(resultado.juego.costo) }}</p>
                    <p><span class="font-medium">Versión:</span> {{ resultado.juego.version }}</p>
                  </div>
                </div>
                <div>
                  <h4 class="font-semibold mb-2">Información del Correo</h4>
                  <div class="space-y-1 text-sm">
                    <p><span class="font-medium">Correo:</span> {{ resultado.correo.correo }}</p>
                    <p><span class="font-medium">Código:</span> {{ resultado.correo.codigo || 'N/A' }}</p>
                    <p><span class="font-medium">Nombre:</span> {{ resultado.correo.nombre || 'N/A' }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab: Gestión de Juegos (Solo Lectura) -->
      <div v-if="activeTab === 'games'">
        <div class="alert alert-info mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span><strong>Modo Solo Lectura:</strong> Puedes consultar los juegos y sus correos, pero no puedes modificarlos.</span>
        </div>

        <!-- Breadcrumb -->
        <div class="breadcrumbs mb-4">
          <ul>
            <li v-if="vistaActual === 'juegos'">
              <span class="font-semibold">Juegos</span>
            </li>
            <li v-if="vistaActual === 'correos'">
              <button @click="volverAJuegos" class="text-primary hover:underline">Juegos</button>
            </li>
            <li v-if="vistaActual === 'correos'">{{ juegoSeleccionado?.nombre }}</li>
          </ul>
        </div>

        <!-- Vista de Juegos -->
        <div v-if="vistaActual === 'juegos'">
          <!-- Filtros y controles -->
          <div class="card bg-base-100 shadow-xl mb-6">
            <div class="card-body">
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <!-- Plataforma -->
                <div class="form-control">
                  <label class="label">
                    <span class="label-text font-semibold">Plataforma</span>
                  </label>
                  <select v-model="plataformaSeleccionada" class="select select-bordered">
                    <option value="PS4 & PS5">PS4 & PS5</option>
                    <option value="PS4">PS4</option>
                    <option value="PS5">PS5</option>
                  </select>
                </div>

                <!-- Búsqueda -->
                <div class="form-control">
                  <label class="label">
                    <span class="label-text font-semibold">Buscar Juego</span>
                  </label>
                  <input
                    v-model="searchTerm"
                    type="text"
                    placeholder="Nombre del juego..."
                    class="input input-bordered"
                  />
                </div>

                <!-- Filtro de Promoción -->
                <div class="form-control">
                  <label class="label">
                    <span class="label-text font-semibold">Promoción</span>
                  </label>
                  <select v-model="promoFiltro" class="select select-bordered">
                    <option value="todas">Todas</option>
                    <option value="oferta">Ofertas</option>
                    <option value="promocion">Promociones</option>
                    <option value="ninguna">Sin promoción</option>
                  </select>
                </div>

                <!-- Filtro de Stock -->
                <div class="form-control">
                  <label class="label">
                    <span class="label-text font-semibold">Stock</span>
                  </label>
                  <select v-model="stockFiltro" class="select select-bordered">
                    <option value="todas">Todas</option>
                    <option value="con">Con stock</option>
                    <option value="sin">Sin stock</option>
                  </select>
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <!-- Ordenar Por -->
                <div class="form-control">
                  <label class="label">
                    <span class="label-text font-semibold">Ordenar Por</span>
                  </label>
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
                        <path 
                          v-if="sortOrder === 'asc'"
                          stroke-linecap="round" 
                          stroke-linejoin="round" 
                          stroke-width="2" 
                          d="M5 15l7-7 7 7" 
                        />
                        <path 
                          v-else
                          stroke-linecap="round" 
                          stroke-linejoin="round" 
                          stroke-width="2" 
                          d="M19 9l-7 7-7-7" 
                        />
                      </svg>
                    </button>
                  </div>
                </div>

                <!-- Botón Sincronizar -->
                <div class="form-control">
                  <label class="label">
                    <span class="label-text font-semibold opacity-0">Acción</span>
                  </label>
                  <button 
                    class="btn btn-outline btn-primary gap-2 w-full"
                    @click="handleSincronizarJuegos"
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
                <img
                  v-if="juego.foto"
                  :src="juego.foto"
                  :alt="juego.nombre"
                  class="w-full h-full object-cover"
                />
                <div v-else class="w-full h-full bg-base-300 flex items-center justify-center">
                  <Gamepad2 :size="48" class="text-base-content/30" />
                </div>
              </figure>
              <div class="card-body">
                <h2 class="card-title">{{ juego.nombre }}</h2>
                <div class="flex flex-wrap gap-2 mt-2">
                  <div class="badge badge-primary">{{ formatearPrecio(juego.costo) }}</div>
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
                  <p class="text-base-content/60 mt-1">{{ formatearPrecio(juegoSeleccionado.costo) }} • {{ juegoSeleccionado.version }}</p>
                </div>
                <button @click="volverAJuegos" class="btn btn-ghost">
                  ← Volver a Juegos
                </button>
              </div>
            </div>
          </div>

          <div v-if="isLoadingCorreos" class="flex justify-center p-8">
            <span class="loading loading-spinner loading-lg"></span>
          </div>

          <div v-else-if="correosJuego.length === 0" class="card bg-base-100 shadow-xl">
            <div class="card-body text-center">
              <p class="text-base-content/60">No hay correos registrados para este juego</p>
            </div>
          </div>

          <div v-else class="space-y-4">
            <div
              v-for="correo in correosJuego"
              :key="correo.correo"
              class="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow"
            >
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
                
                <!-- Botones de acción -->
                <div class="card-actions justify-end mt-4">
                  <button
                    @click="verDetallesCorreo(correo)"
                    class="btn btn-sm btn-outline"
                  >
                    Ver Detalles
                  </button>
                  <div v-if="correo.version === 'PS4 & PS5'" class="dropdown dropdown-end">
                    <label
                      tabindex="0"
                      :class="['btn btn-sm gap-2', validarCodigosDisponibles(correo) ? 'btn-success' : 'btn-disabled']"
                    >
                      <MessageCircle :size="16" />
                      Generar Mensaje
                    </label>
                    <ul tabindex="0" class="dropdown-content z-50 menu p-2 shadow-lg bg-base-100 rounded-box w-52 border border-white/10 mt-2">
                      <li>
                        <a @click.prevent="abrirModalWhatsApp(correo, 'PS4')" :class="{ 'disabled': isGenerating }">
                          <span class="badge badge-primary badge-sm">PS4</span>
                          Mensaje para PS4
                        </a>
                      </li>
                      <li>
                        <a @click.prevent="abrirModalWhatsApp(correo, 'PS5')" :class="{ 'disabled': isGenerating }">
                          <span class="badge badge-secondary badge-sm">PS5</span>
                          Mensaje para PS5
                        </a>
                      </li>
                    </ul>
                  </div>
                  <button
                    v-else
                    @click.stop="abrirModalWhatsApp(correo)"
                    :class="['btn btn-sm gap-2', validarCodigosDisponibles(correo) ? 'btn-success' : 'btn-disabled']"
                    :disabled="!validarCodigosDisponibles(correo) || isGenerating"
                  >
                    <MessageCircle :size="16" />
                    {{ isGenerating ? 'Generando...' : 'Generar Mensaje' }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de Detalles de Correo -->
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
              <p><span class="font-medium">Código Master:</span> {{ selectedEmailDetails.codigoMaster || 'N/A' }}</p>
              <p><span class="font-medium">Fecha:</span> {{ formatearFecha(selectedEmailDetails.fecha) }}</p>
            </div>
          </div>

          <div v-if="selectedEmailDetails.codigosGenerados && selectedEmailDetails.codigosGenerados.length > 0">
            <h4 class="font-semibold mb-2">Códigos Generados</h4>
            <div class="flex flex-wrap gap-2">
              <div
                v-for="(codigo, index) in selectedEmailDetails.codigosGenerados"
                :key="index"
                class="badge badge-outline"
              >
                {{ codigo }}
              </div>
            </div>
          </div>

          <div v-if="selectedEmailDetails.cuentas && selectedEmailDetails.cuentas.length > 0">
            <h4 class="font-semibold mb-2">Cuentas Asociadas</h4>
            <div class="space-y-2">
              <div
                v-for="(cuenta, index) in selectedEmailDetails.cuentas"
                :key="index"
                class="card bg-base-200 p-4"
              >
                <div class="flex justify-between items-start">
                  <div>
                    <p class="font-medium">{{ cuenta.nombre }}</p>
                    <p class="text-sm text-base-content/60">
                      <Phone :size="14" class="inline mr-1" />
                      {{ cuenta.telefono }}
                    </p>
                  </div>
                  <div class="badge" :class="{
                    'badge-primary': cuenta.tipo.includes('Principal'),
                    'badge-secondary': cuenta.tipo.includes('Secundaria')
                  }">
                    {{ cuenta.tipo }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-action">
          <button @click="cerrarDetallesCorreo" class="btn btn-ghost">Cerrar</button>
          
          <!-- Botón de generar mensaje -->
          <div v-if="selectedEmailDetails.version === 'PS4 & PS5'" class="dropdown dropdown-top dropdown-end">
            <label
              tabindex="0"
              :class="['btn gap-2', validarCodigosDisponibles(selectedEmailDetails) ? 'btn-success' : 'btn-disabled']"
              :disabled="!validarCodigosDisponibles(selectedEmailDetails) || isGenerating"
            >
              <MessageCircle :size="20" />
              Generar Mensaje WhatsApp
            </label>
            <ul tabindex="0" class="dropdown-content z-[1] menu p-2 shadow-lg bg-base-100 rounded-box w-52 border border-white/10 mb-2">
              <li>
                <button @click="abrirModalWhatsApp(selectedEmailDetails, 'PS4')" :disabled="isGenerating">
                  <span class="badge badge-primary badge-sm">PS4</span>
                  Mensaje para PS4
                </button>
              </li>
              <li>
                <button @click="abrirModalWhatsApp(selectedEmailDetails, 'PS5')" :disabled="isGenerating">
                  <span class="badge badge-secondary badge-sm">PS5</span>
                  Mensaje para PS5
                </button>
              </li>
            </ul>
          </div>
          <button
            v-else
            @click="abrirModalWhatsApp(selectedEmailDetails)"
            :class="['btn gap-2', validarCodigosDisponibles(selectedEmailDetails) ? 'btn-success' : 'btn-disabled']"
            :disabled="!validarCodigosDisponibles(selectedEmailDetails) || isGenerating"
          >
            <MessageCircle :size="20" />
            {{ isGenerating ? 'Generando...' : 'Generar Mensaje WhatsApp' }}
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
      @cerrar="cerrarModalWhatsApp"
      @copiar="copiarMensajeWhatsApp"
    />
  </div>
</template>
