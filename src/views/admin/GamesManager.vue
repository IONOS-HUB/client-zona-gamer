<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useRoles } from '@/composables/useRoles'
import { useGames } from '@/composables/useGames'
import type { GameSummary, GameEmailAccount, GamePlatform, AccountOwner, AccountType } from '@/types/game'

const router = useRouter()
const { signOut } = useAuth()
const { currentUserData, isAdmin, hasEmployeeAccess, loadUserData } = useRoles()
const {
  games,
  isLoadingGames,
  cargarJuegos,
  cargarCorreosJuego,
  crearJuego,
  actualizarJuego,
  crearCorreoJuego,
  actualizarCorreoJuego,
  eliminarCorreoJuego,
  eliminarJuegoCompleto,
  actualizarFotoJuego,
  buscarJuegos,
  generarIdJuego
} = useGames()

// Estado general
const plataformaSeleccionada = ref<GamePlatform>('PS4 & PS5')
const searchTerm = ref('')
const vistaActual = ref<'juegos' | 'correos'>('juegos')
const juegoSeleccionado = ref<GameSummary | null>(null)
const correosJuego = ref<GameEmailAccount[]>([])
const isLoadingCorreos = ref(false)

// Estados para crear correo
const showCreateEmail = ref(false)
const newEmail = ref({
  correo: '',
  nombre: '',
  costo: 0,
  version: 'PS4 & PS5' as GamePlatform,
  codigoMaster: '',
  codigosGenerados: [] as string[],
  fecha: new Date(),
  codigo: '',
  cuentas: [] as AccountOwner[]
})
const isCreating = ref(false)
const createError = ref('')
const createSuccess = ref('')

// Estados para editar correo
const showEditEmail = ref(false)
const editingEmail = ref<GameEmailAccount | null>(null)
const editEmailData = ref({
  nombre: '',
  costo: 0,
  version: 'PS4 & PS5' as GamePlatform,
  codigoMaster: '',
  codigosGenerados: [] as string[],
  fecha: new Date(),
  codigo: '',
  cuentas: [] as AccountOwner[]
})
const isEditing = ref(false)
const editError = ref('')
const editSuccess = ref('')

// Estados para eliminar
const showDeleteConfirm = ref(false)
const deletingItem = ref<{ tipo: 'juego' | 'correo', data: any} | null>(null)
const isDeleting = ref(false)
const deleteError = ref('')
const deleteSuccess = ref('')

// Estados para ver detalles de un correo
const showEmailDetails = ref(false)
const selectedEmailDetails = ref<GameEmailAccount | null>(null)

// Estados para editar foto del juego
const showEditPhoto = ref(false)
const editingGamePhoto = ref<GameSummary | null>(null)
const newPhotoUrl = ref('')
const newIsOffert = ref(false)
const isUpdatingPhoto = ref(false)
const photoError = ref('')
const photoSuccess = ref('')

// Estados para crear juego nuevo
const showCreateGame = ref(false)
const newGameName = ref('')
const newGamePhoto = ref('')
const newGameIsOffert = ref(false)
const isCreatingGame = ref(false)
const createGameError = ref('')
const createGameSuccess = ref('')


const juegosFiltrados = computed(() => {
  if (!searchTerm.value) return games.value
  return buscarJuegos(searchTerm.value)
})

const cargarJuegosPorPlataforma = async (): Promise<void> => {
  vistaActual.value = 'juegos'
  juegoSeleccionado.value = null
  try {
    await cargarJuegos(plataformaSeleccionada.value)
  } catch (error) {
    console.error('Error cargando juegos:', error)
  }
}

const verCorreosJuego = async (juego: GameSummary): Promise<void> => {
  juegoSeleccionado.value = juego
  isLoadingCorreos.value = true
  vistaActual.value = 'correos'

  try {
    correosJuego.value = await cargarCorreosJuego(plataformaSeleccionada.value, juego.id)
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

const formatearFecha = (fecha: Date | string): string => {
  const date = typeof fecha === 'string' ? new Date(fecha) : fecha
  return new Intl.DateTimeFormat('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date)
}

const formatearPrecio = (precio: number): string => {
  return new Intl.NumberFormat('es-US', {
    style: 'currency',
    currency: 'USD'
  }).format(precio)
}

// Función para parsear archivo .txt
const parsearArchivoTxt = (contenido: string): void => {
  try {
    const lineas = contenido.split('\n').map(l => l.trim()).filter(l => l)
    
    // Primera línea es el correo
    const correo = lineas[0] || ''
    newEmail.value.correo = correo
    
    // Buscar cuentas (líneas que contienen "Principal" o "Secundaria")
    const cuentas: AccountOwner[] = []
    lineas.forEach(linea => {
      if (linea.includes('Principal PS4') || linea.includes('Secundaria PS4') || linea.includes('Principal PS5')) {
        // Extraer tipo de cuenta
        let tipo: AccountType = 'Principal PS4'
        if (linea.includes('Secundaria PS4')) tipo = 'Secundaria PS4'
        else if (linea.includes('Principal PS5')) tipo = 'Principal PS5'
        
        // Extraer teléfono (empieza con +593)
        const telefonoMatch = linea.match(/\+593\s*\d+\s*\d+\s*\d+\s*\d+/)
        const telefono = telefonoMatch ? telefonoMatch[0].replace(/\s+/g, ' ') : ''
        
        // Extraer nombre (texto entre "la tiene" y el teléfono)
        const nombreMatch = linea.match(/la tiene\s+(.+?)\s+\+593/)
        const nombre = nombreMatch && nombreMatch[1] ? nombreMatch[1].trim() : ''
        
        if (telefono && nombre) {
          cuentas.push({ tipo, nombre, telefono })
        }
      }
    })
    newEmail.value.cuentas = cuentas
    
    // Buscar nombre del juego
    const nombreIdx = lineas.findIndex(l => l.startsWith('Nombre:'))
    if (nombreIdx !== -1 && lineas[nombreIdx]) {
      newEmail.value.nombre = lineas[nombreIdx]!.replace('Nombre:', '').trim()
    }
    
    // Buscar costo
    const costoIdx = lineas.findIndex(l => l.startsWith('Costo:'))
    if (costoIdx !== -1 && lineas[costoIdx]) {
      const costoStr = lineas[costoIdx]!.replace('Costo:', '').replace('$', '').trim()
      newEmail.value.costo = parseFloat(costoStr) || 0
    }
    
    // Buscar código (después de "MASTER")
    const masterIdx = lineas.findIndex(l => l === 'MASTER')
    if (masterIdx !== -1 && masterIdx + 1 < lineas.length && lineas[masterIdx + 1]) {
      newEmail.value.codigo = lineas[masterIdx + 1]!
    }
    
    // Buscar código master (la línea más larga, típicamente 80+ caracteres)
    const codigoMaster = lineas.find(l => l.length > 80 && /^[A-Z0-9]+$/.test(l))
    if (codigoMaster) {
      newEmail.value.codigoMaster = codigoMaster
    }
    
    // Buscar códigos generados (líneas de 6 caracteres alfanuméricos)
    const codigos = lineas.filter(l => l.length === 6 && /^[A-Za-z0-9]+$/.test(l))
    newEmail.value.codigosGenerados = codigos
    
    createSuccess.value = 'Archivo cargado exitosamente'
    setTimeout(() => { createSuccess.value = '' }, 3000)
  } catch (error) {
    console.error('Error parseando archivo:', error)
    createError.value = 'Error al procesar el archivo. Verifica el formato.'
  }
}

const handleFileUpload = (event: Event): void => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  
  if (!file) return
  
  if (!file.name.endsWith('.txt')) {
    createError.value = 'Por favor selecciona un archivo .txt'
    return
  }
  
  const reader = new FileReader()
  reader.onload = (e) => {
    const contenido = e.target?.result as string
    parsearArchivoTxt(contenido)
  }
  reader.readAsText(file)
  
  // Limpiar el input para permitir subir el mismo archivo de nuevo
  input.value = ''
}

// Funciones para manejar códigos
const agregarCodigo = (isEdit: boolean = false): void => {
  const nuevoCodigo = prompt('Ingresa el nuevo código:')
  if (nuevoCodigo && nuevoCodigo.trim()) {
    if (isEdit) {
      editEmailData.value.codigosGenerados.push(nuevoCodigo.trim())
    } else {
      newEmail.value.codigosGenerados.push(nuevoCodigo.trim())
    }
  }
}

const eliminarCodigo = (index: number, isEdit: boolean = false): void => {
  if (isEdit) {
    editEmailData.value.codigosGenerados.splice(index, 1)
  } else {
    newEmail.value.codigosGenerados.splice(index, 1)
  }
}

// Funciones para manejar cuentas
const agregarCuenta = (isEdit: boolean = false): void => {
  const nuevaCuenta: AccountOwner = {
    tipo: 'Principal PS4',
    nombre: '',
    telefono: ''
  }
  if (isEdit) {
    editEmailData.value.cuentas.push(nuevaCuenta)
  } else {
    newEmail.value.cuentas.push(nuevaCuenta)
  }
}

const eliminarCuenta = (index: number, isEdit: boolean = false): void => {
  if (isEdit) {
    editEmailData.value.cuentas.splice(index, 1)
  } else {
    newEmail.value.cuentas.splice(index, 1)
  }
}

const iniciarCreacion = (): void => {
  if (!juegoSeleccionado.value) return
  
  newEmail.value = {
    correo: '',
    nombre: juegoSeleccionado.value.nombre,
    costo: juegoSeleccionado.value.costo,
    version: plataformaSeleccionada.value,
    codigoMaster: '',
    codigosGenerados: [],
    fecha: new Date(),
    codigo: juegoSeleccionado.value.id,
    cuentas: []
  }
  createError.value = ''
  createSuccess.value = ''
  showCreateEmail.value = true
}

const handleCreateEmail = async (): Promise<void> => {
  if (!juegoSeleccionado.value || !newEmail.value.correo || !newEmail.value.codigoMaster) {
    createError.value = 'Por favor completa los campos obligatorios (correo y código master)'
    return
  }

  isCreating.value = true
  createError.value = ''
  createSuccess.value = ''

  try {
    const emailData = {
      ...newEmail.value,
      createdBy: currentUserData.value?.uid
    }

    await crearCorreoJuego(
      plataformaSeleccionada.value,
      juegoSeleccionado.value.id,
      newEmail.value.correo,
      emailData
    )

    createSuccess.value = 'Correo agregado exitosamente'
    await verCorreosJuego(juegoSeleccionado.value)

    setTimeout(() => {
      showCreateEmail.value = false
      createSuccess.value = ''
    }, 1500)
  } catch (error) {
    console.error('Error creando correo:', error)
    createError.value = 'Error al crear el correo'
  } finally {
    isCreating.value = false
  }
}

const iniciarEdicion = (email: GameEmailAccount): void => {
  editingEmail.value = email
  editEmailData.value = {
    nombre: email.nombre,
    costo: email.costo,
    version: email.version,
    codigoMaster: email.codigoMaster,
    codigosGenerados: [...email.codigosGenerados],
    fecha: email.fecha,
    codigo: email.codigo,
    cuentas: JSON.parse(JSON.stringify(email.cuentas)) // Deep copy
  }
  editError.value = ''
  editSuccess.value = ''
  showEditEmail.value = true
}

const handleEditEmail = async (): Promise<void> => {
  if (!editingEmail.value || !juegoSeleccionado.value) return

  isEditing.value = true
  editError.value = ''
  editSuccess.value = ''

  try {
    await actualizarCorreoJuego(
      plataformaSeleccionada.value,
      juegoSeleccionado.value.id,
      editingEmail.value.correo,
      {
        nombre: editEmailData.value.nombre,
        costo: editEmailData.value.costo,
        codigoMaster: editEmailData.value.codigoMaster,
        codigosGenerados: editEmailData.value.codigosGenerados,
        codigo: editEmailData.value.codigo,
        cuentas: editEmailData.value.cuentas
      }
    )

    editSuccess.value = 'Correo actualizado exitosamente'
    await verCorreosJuego(juegoSeleccionado.value)

    setTimeout(() => {
      showEditEmail.value = false
      editSuccess.value = ''
      editingEmail.value = null
    }, 1500)
  } catch (error) {
    console.error('Error actualizando correo:', error)
    editError.value = 'Error al actualizar el correo'
  } finally {
    isEditing.value = false
  }
}

const iniciarEliminacionCorreo = (email: GameEmailAccount): void => {
  deletingItem.value = { tipo: 'correo', data: email }
  deleteError.value = ''
  showDeleteConfirm.value = true
}

const iniciarEliminacionJuego = (juego: GameSummary): void => {
  deletingItem.value = { tipo: 'juego', data: juego }
  deleteError.value = ''
  showDeleteConfirm.value = true
}

const handleDelete = async (): Promise<void> => {
  if (!deletingItem.value) return

  isDeleting.value = true
  deleteError.value = ''
  deleteSuccess.value = ''

  try {
    if (deletingItem.value.tipo === 'correo' && juegoSeleccionado.value) {
      await eliminarCorreoJuego(
        plataformaSeleccionada.value,
        juegoSeleccionado.value.id,
        deletingItem.value.data.correo
      )
      deleteSuccess.value = 'Correo eliminado exitosamente'
      await verCorreosJuego(juegoSeleccionado.value)
    } else if (deletingItem.value.tipo === 'juego') {
      await eliminarJuegoCompleto(
        plataformaSeleccionada.value,
        deletingItem.value.data.id
      )
      deleteSuccess.value = 'Juego eliminado exitosamente'
      await cargarJuegosPorPlataforma()
    }

    showDeleteConfirm.value = false
    deletingItem.value = null

    setTimeout(() => {
      deleteSuccess.value = ''
    }, 3000)
  } catch (error) {
    console.error('Error eliminando:', error)
    deleteError.value = 'Error al eliminar'
  } finally {
    isDeleting.value = false
  }
}

const cancelarEliminacion = (): void => {
  showDeleteConfirm.value = false
  deletingItem.value = null
  deleteError.value = ''
}

const verDetallesCorreo = (email: GameEmailAccount): void => {
  selectedEmailDetails.value = email
  showEmailDetails.value = true
}

const cerrarDetalles = (): void => {
  showEmailDetails.value = false
  selectedEmailDetails.value = null
}

const iniciarCreacionJuego = (): void => {
  newGameName.value = ''
  newGamePhoto.value = ''
  newGameIsOffert.value = false
  createGameError.value = ''
  createGameSuccess.value = ''
  showCreateGame.value = true
}

const handleCreateGame = async (): Promise<void> => {
  if (!newGameName.value.trim()) {
    createGameError.value = 'Por favor ingresa el nombre del juego'
    return
  }

  isCreatingGame.value = true
  createGameError.value = ''
  createGameSuccess.value = ''

  try {
    await crearJuego(
      plataformaSeleccionada.value,
      newGameName.value.trim(),
      newGamePhoto.value.trim() || undefined,
      newGameIsOffert.value
    )

    createGameSuccess.value = 'Juego creado exitosamente'
    await cargarJuegosPorPlataforma()

    setTimeout(() => {
      showCreateGame.value = false
      createGameSuccess.value = ''
    }, 1500)
  } catch (error: any) {
    console.error('Error creando juego:', error)
    createGameError.value = error.message || 'Error al crear el juego'
  } finally {
    isCreatingGame.value = false
  }
}

const cerrarCrearJuego = (): void => {
  showCreateGame.value = false
  newGameName.value = ''
  newGamePhoto.value = ''
  newGameIsOffert.value = false
  createGameError.value = ''
}

const iniciarEdicionFoto = (juego: GameSummary): void => {
  editingGamePhoto.value = juego
  newPhotoUrl.value = juego.foto || ''
  newIsOffert.value = juego.isOffert || false
  photoError.value = ''
  photoSuccess.value = ''
  showEditPhoto.value = true
}

const handleUpdatePhoto = async (): Promise<void> => {
  if (!editingGamePhoto.value) return

  isUpdatingPhoto.value = true
  photoError.value = ''
  photoSuccess.value = ''

  try {
    await actualizarJuego(
      plataformaSeleccionada.value,
      editingGamePhoto.value.id,
      newPhotoUrl.value.trim() || undefined,
      newIsOffert.value
    )

    photoSuccess.value = 'Información actualizada exitosamente'
    
    // Actualizar en la lista local
    const juegoIndex = games.value.findIndex(j => j.id === editingGamePhoto.value?.id)
    if (juegoIndex !== -1) {
      games.value[juegoIndex]!.foto = newPhotoUrl.value.trim()
      games.value[juegoIndex]!.isOffert = newIsOffert.value
    }

    setTimeout(() => {
      showEditPhoto.value = false
      photoSuccess.value = ''
      editingGamePhoto.value = null
    }, 1500)
  } catch (error) {
    console.error('Error actualizando información:', error)
    photoError.value = 'Error al actualizar la información'
  } finally {
    isUpdatingPhoto.value = false
  }
}

const cerrarEditarFoto = (): void => {
  showEditPhoto.value = false
  editingGamePhoto.value = null
  newPhotoUrl.value = ''
  newIsOffert.value = false
  photoError.value = ''
}


const handleLogout = async (): Promise<void> => {
  await signOut()
  router.push('/login')
}

const volverAlPanel = (): void => {
  if (currentUserData.value?.role === 'admin') {
    router.push('/admin')
  } else if (currentUserData.value?.role === 'employee') {
    router.push('/employee')
  } else {
    router.push('/')
  }
}

onMounted(async () => {
  await loadUserData()
  cargarJuegosPorPlataforma()
})
</script>

<template>
  <div class="min-h-screen bg-base-200">
    <!-- Navbar -->
    <div class="navbar bg-base-100 shadow-lg">
      <div class="flex-1">
        <button class="btn btn-ghost text-xl" @click="volverAlPanel">
          ← Gestión de Juegos
        </button>
      </div>
      <div class="flex-none gap-2">
        <div class="dropdown dropdown-end">
          <div tabindex="0" role="button" class="btn btn-ghost">
            {{ currentUserData?.email }}
          </div>
          <ul
            tabindex="0"
            class="mt-3 z-1 p-2 shadow menu menu-sm dropdown-content bg-base-100 rounded-box w-52"
          >
            <li><a @click="handleLogout">Cerrar Sesión</a></li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Contenido -->
    <div class="container mx-auto p-6">
      <!-- Breadcrumb -->
      <div class="text-sm breadcrumbs mb-4">
        <ul>
          <li><a @click="volverAJuegos">{{ plataformaSeleccionada }}</a></li>
          <li v-if="vistaActual === 'correos'">{{ juegoSeleccionado?.nombre }}</li>
        </ul>
      </div>

      <!-- Controles superiores -->
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div class="flex items-center gap-4">
          <select 
            v-model="plataformaSeleccionada" 
            class="select select-bordered"
            @change="cargarJuegosPorPlataforma"
            :disabled="vistaActual === 'correos'"
          >
            <option value="PS4 & PS5">PS4 & PS5</option>
            <option value="PS4">PS4</option>
            <option value="PS5">PS5</option>
            <option value="Xbox">Xbox</option>
            <option value="Nintendo Switch">Nintendo Switch</option>
          </select>

          <input
            v-if="vistaActual === 'juegos'"
            v-model="searchTerm"
            type="text"
            placeholder="Buscar juego..."
            class="input input-bordered w-full max-w-xs"
          />
        </div>

        <div v-if="isAdmin" class="flex gap-2">
          <button 
            v-if="vistaActual === 'juegos'" 
            class="btn btn-primary"
            @click="iniciarCreacionJuego"
          >
            + Crear Juego
          </button>
          <button 
            v-if="vistaActual === 'correos'" 
            class="btn btn-primary"
            @click="iniciarCreacion"
          >
            + Agregar Correo
          </button>
        </div>
      </div>

      <!-- Mensajes -->
      <div v-if="createSuccess || editSuccess || deleteSuccess || photoSuccess || createGameSuccess" class="alert alert-success mb-4">
        <span>{{ createSuccess || editSuccess || deleteSuccess || photoSuccess || createGameSuccess }}</span>
      </div>

      <div v-if="deleteError || photoError || createGameError" class="alert alert-error mb-4">
        <span>{{ deleteError || photoError || createGameError }}</span>
      </div>

      <!-- Vista de Juegos -->
      <div v-if="vistaActual === 'juegos'" class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title">
            Juegos de {{ plataformaSeleccionada }}
            <span class="badge badge-lg">{{ juegosFiltrados.length }}</span>
          </h2>

          <div v-if="isLoadingGames" class="flex justify-center p-8">
            <span class="loading loading-spinner loading-lg"></span>
          </div>

          <div v-else-if="juegosFiltrados.length === 0" class="text-center p-8">
            <p class="text-gray-500">No hay juegos registrados</p>
          </div>

          <div v-else class="overflow-x-auto">
            <table class="table table-zebra">
              <thead>
                <tr>
                  <th>Foto</th>
                  <th>Nombre del Juego</th>
                  <th>Precio</th>
                  <th>Total Correos</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="juego in juegosFiltrados" :key="juego.id">
                  <td>
                    <div class="avatar">
                      <div class="w-16 rounded">
                        <img 
                          v-if="juego.foto" 
                          :src="juego.foto" 
                          :alt="juego.nombre"
                          class="object-cover"
                        />
                        <div v-else class="bg-base-300 w-full h-full flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div class="font-bold">{{ juego.nombre }}</div>
                    <div class="text-sm opacity-50">ID: {{ juego.id }}</div>
                  </td>
                  <td>
                    <span class="badge badge-success">{{ formatearPrecio(juego.costo) }}</span>
                  </td>
                  <td>
                    <span class="badge badge-info">{{ juego.totalCorreos }}</span>
                  </td>
                  <td>
                    <div class="flex gap-2">
                      <button
                        class="btn btn-sm btn-info"
                        @click="verCorreosJuego(juego)"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Ver Correos
                      </button>
                      <button
                        v-if="isAdmin"
                        class="btn btn-sm btn-warning"
                        @click="iniciarEdicionFoto(juego)"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </button>
                      <button
                        v-if="isAdmin"
                        class="btn btn-sm btn-error"
                        @click="iniciarEliminacionJuego(juego)"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Vista de Correos -->
      <div v-if="vistaActual === 'correos'" class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <div class="flex justify-between items-center">
            <h2 class="card-title">
              Correos de {{ juegoSeleccionado?.nombre }}
              <span class="badge badge-lg">{{ correosJuego.length }}</span>
            </h2>
            <button class="btn btn-sm btn-ghost" @click="volverAJuegos">
              ← Volver a juegos
            </button>
          </div>

          <div v-if="isLoadingCorreos" class="flex justify-center p-8">
            <span class="loading loading-spinner loading-lg"></span>
          </div>

          <div v-else-if="correosJuego.length === 0" class="text-center p-8">
            <p class="text-gray-500">No hay correos registrados para este juego</p>
          </div>

          <div v-else class="overflow-x-auto">
            <table class="table table-zebra">
              <thead>
                <tr>
                  <th>Correo</th>
                  <th>Códigos</th>
                  <th>Cuentas</th>
                  <th>Fecha</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="email in correosJuego" :key="email.correo">
                  <td>
                    <div class="font-mono text-sm">{{ email.correo }}</div>
                    <div class="text-xs opacity-50">Código: {{ email.codigo }}</div>
                  </td>
                  <td>
                    <span class="badge badge-info">{{ email.codigosGenerados.length + 1 }}</span>
                  </td>
                  <td>
                    <span class="badge badge-success">{{ email.cuentas.length }}</span>
                  </td>
                  <td>{{ formatearFecha(email.fecha) }}</td>
                  <td>
                    <div class="flex gap-2">
                      <button
                        class="btn btn-sm btn-info"
                        @click="verDetallesCorreo(email)"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </button>
                      <button
                        v-if="isAdmin"
                        class="btn btn-sm btn-primary"
                        @click="iniciarEdicion(email)"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        v-if="isAdmin"
                        class="btn btn-sm btn-error"
                        @click="iniciarEliminacionCorreo(email)"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal para agregar correo -->
    <dialog :class="['modal', { 'modal-open': showCreateEmail }]">
      <div class="modal-box max-w-4xl">
        <h3 class="font-bold text-lg mb-4">Agregar Correo a {{ juegoSeleccionado?.nombre }}</h3>

        <!-- Botón para subir archivo .txt -->
        <div class="alert alert-info mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div class="flex-1">
            <span>¿Tienes un archivo .txt? Súbelo para llenar automáticamente los campos</span>
          </div>
          <label class="btn btn-sm btn-primary">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Subir .txt
            <input type="file" accept=".txt" class="hidden" @change="handleFileUpload" />
          </label>
        </div>

        <form @submit.prevent="handleCreateEmail" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="form-control md:col-span-2">
              <label class="label">
                <span class="label-text">Correo *</span>
              </label>
              <input
                v-model="newEmail.correo"
                type="email"
                placeholder="theg.am.e.rsz.o.nec@gmail.com"
                class="input input-bordered"
                required
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text">Precio</span>
              </label>
              <input
                v-model.number="newEmail.costo"
                type="number"
                step="0.01"
                class="input input-bordered"
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text">Código</span>
              </label>
              <input
                v-model="newEmail.codigo"
                type="text"
                placeholder="90006"
                class="input input-bordered"
              />
            </div>
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text">Código Master *</span>
            </label>
            <textarea
              v-model="newEmail.codigoMaster"
              class="textarea textarea-bordered h-24"
              placeholder="BSR6BUDLUZJUVUORBS4CIF45..."
              required
            ></textarea>
          </div>

          <!-- Códigos Generados -->
          <div class="form-control">
            <div class="flex justify-between items-center mb-2">
              <label class="label">
                <span class="label-text">Códigos Generados ({{ newEmail.codigosGenerados.length }})</span>
              </label>
              <button type="button" class="btn btn-xs btn-primary" @click="agregarCodigo(false)">
                + Agregar Código
              </button>
            </div>
            <div v-if="newEmail.codigosGenerados.length > 0" class="space-y-2 max-h-40 overflow-y-auto border border-base-300 rounded p-2">
              <div v-for="(codigo, index) in newEmail.codigosGenerados" :key="index" class="flex items-center gap-2 bg-base-200 p-2 rounded">
                <span class="flex-1 font-mono text-sm">{{ codigo }}</span>
                <button type="button" class="btn btn-xs btn-error btn-circle" @click="eliminarCodigo(index, false)">
                  ✕
                </button>
              </div>
            </div>
            <div v-else class="text-sm text-base-content opacity-50 p-4 text-center border border-dashed border-base-300 rounded">
              No hay códigos agregados
            </div>
          </div>

          <!-- Cuentas -->
          <div class="form-control">
            <div class="flex justify-between items-center mb-2">
              <label class="label">
                <span class="label-text">Cuentas ({{ newEmail.cuentas.length }})</span>
              </label>
              <button type="button" class="btn btn-xs btn-primary" @click="agregarCuenta(false)">
                + Agregar Cuenta
              </button>
            </div>
            <div v-if="newEmail.cuentas.length > 0" class="space-y-3 max-h-60 overflow-y-auto border border-base-300 rounded p-3">
              <div v-for="(cuenta, index) in newEmail.cuentas" :key="index" class="bg-base-200 p-3 rounded space-y-2">
                <div class="flex justify-between items-center">
                  <span class="font-semibold text-sm">Cuenta {{ index + 1 }}</span>
                  <button type="button" class="btn btn-xs btn-error btn-circle" @click="eliminarCuenta(index, false)">
                    ✕
                  </button>
                </div>
                <select v-model="cuenta.tipo" class="select select-bordered select-sm w-full">
                  <option value="Principal PS4">Principal PS4</option>
                  <option value="Secundaria PS4">Secundaria PS4</option>
                  <option value="Principal PS5">Principal PS5</option>
                </select>
                <input v-model="cuenta.nombre" type="text" placeholder="Nombre" class="input input-bordered input-sm w-full" />
                <input v-model="cuenta.telefono" type="text" placeholder="Teléfono" class="input input-bordered input-sm w-full" />
              </div>
            </div>
            <div v-else class="text-sm text-base-content opacity-50 p-4 text-center border border-dashed border-base-300 rounded">
              No hay cuentas agregadas
            </div>
          </div>

          <div v-if="createError" class="alert alert-error">
            <span>{{ createError }}</span>
          </div>

          <div v-if="createSuccess" class="alert alert-success">
            <span>{{ createSuccess }}</span>
          </div>

          <div class="modal-action">
            <button
              type="button"
              class="btn"
              @click="showCreateEmail = false"
              :disabled="isCreating"
            >
              Cancelar
            </button>
            <button
              type="submit"
              class="btn btn-primary"
              :disabled="isCreating"
            >
              <span v-if="isCreating" class="loading loading-spinner"></span>
              {{ isCreating ? 'Creando...' : 'Agregar Correo' }}
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="showCreateEmail = false">close</button>
      </form>
    </dialog>

    <!-- Modal para editar correo -->
    <dialog :class="['modal', { 'modal-open': showEditEmail }]">
      <div class="modal-box max-w-4xl">
        <h3 class="font-bold text-lg mb-4">Editar Correo</h3>

        <form @submit.prevent="handleEditEmail" class="space-y-4">
          <div class="alert alert-info">
            <span>Editando: {{ editingEmail?.correo }}</span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="form-control">
              <label class="label">
                <span class="label-text">Precio</span>
              </label>
              <input
                v-model.number="editEmailData.costo"
                type="number"
                step="0.01"
                class="input input-bordered"
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text">Código</span>
              </label>
              <input
                v-model="editEmailData.codigo"
                type="text"
                class="input input-bordered"
              />
            </div>
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text">Código Master</span>
            </label>
            <textarea
              v-model="editEmailData.codigoMaster"
              class="textarea textarea-bordered h-24"
              required
            ></textarea>
          </div>

          <!-- Códigos Generados -->
          <div class="form-control">
            <div class="flex justify-between items-center mb-2">
              <label class="label">
                <span class="label-text">Códigos Generados ({{ editEmailData.codigosGenerados.length }})</span>
              </label>
              <button type="button" class="btn btn-xs btn-primary" @click="agregarCodigo(true)">
                + Agregar Código
              </button>
            </div>
            <div v-if="editEmailData.codigosGenerados.length > 0" class="space-y-2 max-h-40 overflow-y-auto border border-base-300 rounded p-2">
              <div v-for="(codigo, index) in editEmailData.codigosGenerados" :key="index" class="flex items-center gap-2 bg-base-200 p-2 rounded">
                <span class="flex-1 font-mono text-sm">{{ codigo }}</span>
                <button type="button" class="btn btn-xs btn-error btn-circle" @click="eliminarCodigo(index, true)">
                  ✕
                </button>
              </div>
            </div>
            <div v-else class="text-sm text-base-content opacity-50 p-4 text-center border border-dashed border-base-300 rounded">
              No hay códigos agregados
            </div>
          </div>

          <!-- Cuentas -->
          <div class="form-control">
            <div class="flex justify-between items-center mb-2">
              <label class="label">
                <span class="label-text">Cuentas ({{ editEmailData.cuentas.length }})</span>
              </label>
              <button type="button" class="btn btn-xs btn-primary" @click="agregarCuenta(true)">
                + Agregar Cuenta
              </button>
            </div>
            <div v-if="editEmailData.cuentas.length > 0" class="space-y-3 max-h-60 overflow-y-auto border border-base-300 rounded p-3">
              <div v-for="(cuenta, index) in editEmailData.cuentas" :key="index" class="bg-base-200 p-3 rounded space-y-2">
                <div class="flex justify-between items-center">
                  <span class="font-semibold text-sm">Cuenta {{ index + 1 }}</span>
                  <button type="button" class="btn btn-xs btn-error btn-circle" @click="eliminarCuenta(index, true)">
                    ✕
                  </button>
                </div>
                <select v-model="cuenta.tipo" class="select select-bordered select-sm w-full">
                  <option value="Principal PS4">Principal PS4</option>
                  <option value="Secundaria PS4">Secundaria PS4</option>
                  <option value="Principal PS5">Principal PS5</option>
                </select>
                <input v-model="cuenta.nombre" type="text" placeholder="Nombre" class="input input-bordered input-sm w-full" />
                <input v-model="cuenta.telefono" type="text" placeholder="Teléfono" class="input input-bordered input-sm w-full" />
              </div>
            </div>
            <div v-else class="text-sm text-base-content opacity-50 p-4 text-center border border-dashed border-base-300 rounded">
              No hay cuentas agregadas
            </div>
          </div>

          <div v-if="editError" class="alert alert-error">
            <span>{{ editError }}</span>
          </div>

          <div v-if="editSuccess" class="alert alert-success">
            <span>{{ editSuccess }}</span>
          </div>

          <div class="modal-action">
            <button
              type="button"
              class="btn"
              @click="showEditEmail = false"
              :disabled="isEditing"
            >
              Cancelar
            </button>
            <button
              type="submit"
              class="btn btn-primary"
              :disabled="isEditing"
            >
              <span v-if="isEditing" class="loading loading-spinner"></span>
              {{ isEditing ? 'Guardando...' : 'Guardar Cambios' }}
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="showEditEmail = false">close</button>
      </form>
    </dialog>

    <!-- Modal de confirmación de eliminación -->
    <dialog :class="['modal', { 'modal-open': showDeleteConfirm }]">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">Confirmar Eliminación</h3>

        <div class="py-4">
          <p class="text-base mb-4">
            ¿Estás seguro de que deseas eliminar este {{ deletingItem?.tipo === 'juego' ? 'juego completo' : 'correo' }}?
          </p>

          <div v-if="deletingItem" class="bg-base-200 p-4 rounded-lg">
            <p v-if="deletingItem.tipo === 'juego'" class="font-semibold">
              {{ deletingItem.data.nombre }}
            </p>
            <p v-else class="font-mono text-sm">
              {{ deletingItem.data.correo }}
            </p>
          </div>

          <div class="alert alert-warning mt-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>Esta acción no se puede deshacer</span>
          </div>

          <div v-if="deleteError" class="alert alert-error mt-4">
            <span>{{ deleteError }}</span>
          </div>
        </div>

        <div class="modal-action">
          <button
            type="button"
            class="btn"
            @click="cancelarEliminacion"
            :disabled="isDeleting"
          >
            Cancelar
          </button>
          <button
            type="button"
            class="btn btn-error"
            @click="handleDelete"
            :disabled="isDeleting"
          >
            <span v-if="isDeleting" class="loading loading-spinner"></span>
            {{ isDeleting ? 'Eliminando...' : 'Eliminar' }}
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="cancelarEliminacion">close</button>
      </form>
    </dialog>

    <!-- Modal para crear juego nuevo -->
    <dialog :class="['modal', { 'modal-open': showCreateGame }]">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">Crear Nuevo Juego</h3>
        
        <form @submit.prevent="handleCreateGame" class="space-y-4">
          <div class="form-control">
            <label class="label">
              <span class="label-text">Nombre del Juego *</span>
            </label>
            <input
              v-model="newGameName"
              type="text"
              placeholder="Ej: God of War Ragnarök"
              class="input input-bordered"
              required
            />
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text">URL de la Foto</span>
            </label>
            <input
              v-model="newGamePhoto"
              type="url"
              placeholder="https://ecuadorjuegosdigitales.com/wp-content/uploads/..."
              class="input input-bordered"
            />
            <label class="label">
              <span class="label-text-alt">Ingresa la URL completa de la imagen (opcional)</span>
            </label>
          </div>

          <!-- Preview de la nueva foto -->
          <div v-if="newGamePhoto" class="form-control">
            <label class="label">
              <span class="label-text">Vista Previa</span>
            </label>
            <div class="avatar">
              <div class="w-32 rounded">
                <img 
                  :src="newGamePhoto" 
                  alt="Preview"
                  @error="(e) => (e.target as HTMLImageElement).src = ''"
                />
              </div>
            </div>
          </div>

          <div class="form-control">
            <label class="label cursor-pointer">
              <span class="label-text">¿Está en oferta?</span>
              <input type="checkbox" v-model="newGameIsOffert" class="toggle toggle-primary" />
            </label>
          </div>

          <div v-if="createGameError" class="alert alert-error">
            <span>{{ createGameError }}</span>
          </div>

          <div class="modal-action">
            <button
              type="button"
              class="btn"
              @click="cerrarCrearJuego"
              :disabled="isCreatingGame"
            >
              Cancelar
            </button>
            <button
              type="submit"
              class="btn btn-primary"
              :disabled="isCreatingGame"
            >
              <span v-if="isCreatingGame" class="loading loading-spinner"></span>
              {{ isCreatingGame ? 'Creando...' : 'Crear Juego' }}
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="cerrarCrearJuego">close</button>
      </form>
    </dialog>

    <!-- Modal para editar foto del juego -->
    <dialog :class="['modal', { 'modal-open': showEditPhoto }]">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">Editar Información del Juego</h3>

        <form @submit.prevent="handleUpdatePhoto" class="space-y-4">
          <div v-if="editingGamePhoto" class="alert alert-info">
            <span>Editando información de: {{ editingGamePhoto.nombre }}</span>
          </div>

          <!-- Preview de la foto actual -->
          <div v-if="editingGamePhoto?.foto" class="form-control">
            <label class="label">
              <span class="label-text">Foto Actual</span>
            </label>
            <div class="avatar">
              <div class="w-32 rounded">
                <img :src="editingGamePhoto.foto" :alt="editingGamePhoto.nombre" />
              </div>
            </div>
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text">URL de la Foto</span>
            </label>
            <input
              v-model="newPhotoUrl"
              type="url"
              placeholder="https://ecuadorjuegosdigitales.com/wp-content/uploads/..."
              class="input input-bordered"
            />
            <label class="label">
              <span class="label-text-alt">Ingresa la URL completa de la imagen (opcional)</span>
            </label>
          </div>

          <!-- Preview de la nueva foto -->
          <div v-if="newPhotoUrl" class="form-control">
            <label class="label">
              <span class="label-text">Vista Previa</span>
            </label>
            <div class="avatar">
              <div class="w-32 rounded">
                <img 
                  :src="newPhotoUrl" 
                  alt="Preview"
                  @error="(e) => (e.target as HTMLImageElement).src = ''"
                />
              </div>
            </div>
          </div>

          <div class="form-control">
            <label class="label cursor-pointer">
              <span class="label-text">¿Está en oferta?</span>
              <input type="checkbox" v-model="newIsOffert" class="toggle toggle-primary" />
            </label>
          </div>

          <div v-if="photoError" class="alert alert-error">
            <span>{{ photoError }}</span>
          </div>

          <div v-if="photoSuccess" class="alert alert-success">
            <span>{{ photoSuccess }}</span>
          </div>

          <div class="modal-action">
            <button
              type="button"
              class="btn"
              @click="cerrarEditarFoto"
              :disabled="isUpdatingPhoto"
            >
              Cancelar
            </button>
            <button
              type="submit"
              class="btn btn-primary"
              :disabled="isUpdatingPhoto"
            >
              <span v-if="isUpdatingPhoto" class="loading loading-spinner"></span>
              {{ isUpdatingPhoto ? 'Guardando...' : 'Guardar Cambios' }}
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="cerrarEditarFoto">close</button>
      </form>
    </dialog>

    <!-- Modal para ver detalles del correo -->
    <dialog :class="['modal', { 'modal-open': showEmailDetails }]">
      <div class="modal-box max-w-4xl">
        <h3 class="font-bold text-lg mb-4">Detalles del Correo</h3>

        <div v-if="selectedEmailDetails" class="space-y-4">
          <!-- Información General -->
          <div class="card bg-base-200">
            <div class="card-body">
              <h4 class="card-title text-sm">Información General</h4>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <span class="font-semibold">Correo:</span>
                  <p class="font-mono text-sm">{{ selectedEmailDetails.correo }}</p>
                </div>
                <div>
                  <span class="font-semibold">Nombre del Juego:</span>
                  <p>{{ selectedEmailDetails.nombre }}</p>
                </div>
                <div>
                  <span class="font-semibold">Precio:</span>
                  <p>{{ formatearPrecio(selectedEmailDetails.costo) }}</p>
                </div>
                <div>
                  <span class="font-semibold">Código:</span>
                  <p>{{ selectedEmailDetails.codigo }}</p>
                </div>
                <div>
                  <span class="font-semibold">Fecha:</span>
                  <p>{{ formatearFecha(selectedEmailDetails.fecha) }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Código Master -->
          <div class="card bg-base-200">
            <div class="card-body">
              <h4 class="card-title text-sm">Código Master</h4>
              <div class="bg-base-300 p-3 rounded font-mono text-xs break-all">
                {{ selectedEmailDetails.codigoMaster }}
              </div>
            </div>
          </div>

          <!-- Códigos Generados -->
          <div class="card bg-base-200">
            <div class="card-body">
              <h4 class="card-title text-sm">Códigos Generados ({{ selectedEmailDetails.codigosGenerados.length }})</h4>
              <div class="grid grid-cols-3 gap-2">
                <div v-for="(codigo, index) in selectedEmailDetails.codigosGenerados" :key="index" class="bg-base-300 p-2 rounded font-mono text-xs text-center">
                  {{ codigo }}
                </div>
              </div>
            </div>
          </div>

          <!-- Cuentas -->
          <div class="card bg-base-200">
            <div class="card-body">
              <h4 class="card-title text-sm">Cuentas ({{ selectedEmailDetails.cuentas.length }})</h4>
              <div class="space-y-2">
                <div v-for="(cuenta, index) in selectedEmailDetails.cuentas" :key="index" class="flex items-center justify-between bg-base-300 p-3 rounded">
                  <div>
                    <span class="badge badge-sm mr-2" :class="{
                      'badge-primary': cuenta.tipo.includes('Principal'),
                      'badge-secondary': cuenta.tipo.includes('Secundaria')
                    }">
                      {{ cuenta.tipo }}
                    </span>
                    <span class="font-medium">{{ cuenta.nombre }}</span>
                  </div>
                  <span class="text-sm">{{ cuenta.telefono }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-action">
          <button class="btn" @click="cerrarDetalles">
            Cerrar
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="cerrarDetalles">close</button>
      </form>
    </dialog>
  </div>
</template>
