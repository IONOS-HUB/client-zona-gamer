<script setup lang="ts">
import { ref, onMounted, computed, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useRoles } from '@/composables/useRoles'
import { useGames } from '@/composables/useGames'
import { useWhatsAppMessages } from '@/composables/useWhatsAppMessages'
import type { GameSummary, GameEmailAccount, GamePlatform, AccountOwner, AccountType, TelefonoSearchResult, CorreoSearchResult } from '@/types/game'
import type { WhatsAppMessage } from '@/composables/useWhatsAppMessages'
import { Phone, Search, Mail, RefreshCw, MessageCircle } from 'lucide-vue-next'
import WhatsAppMessageModal from '@/components/ui/WhatsAppMessageModal.vue'

const router = useRouter()
const { signOut } = useAuth()
const { currentUserData, isAdmin, hasEmployeeAccess, loadUserData } = useRoles()
const {
  games,
  isLoadingGames,
  isSyncingGames,
  cargarJuegos,
  sincronizarJuegos,
  cargarCorreosJuego,
  crearJuego,
  actualizarJuego,
  crearCorreoJuego,
  actualizarCorreoJuego,
  eliminarCorreoJuego,
  eliminarJuegoCompleto,
  actualizarFotoJuego,
  buscarJuegos,
  buscarPorTelefono,
  buscarPorCorreo,
  generarIdJuego,
  clearCache
} = useGames()

const {
  validarCodigosDisponibles,
  generarYEliminarCodigos,
  copiarAlPortapapeles,
  isGenerating
} = useWhatsAppMessages()

// Estado general
const plataformaSeleccionada = ref<GamePlatform>('PS4 & PS5')
const searchTerm = ref('')
const vistaActual = ref<'juegos' | 'correos' | 'telefono'>('juegos')
const juegoSeleccionado = ref<GameSummary | null>(null)
const correosJuego = ref<GameEmailAccount[]>([])
const isLoadingCorreos = ref(false)

// Estados para búsqueda por teléfono
const telefonoBusqueda = ref('')
const resultadosTelefono = ref<TelefonoSearchResult[]>([])
const isLoadingTelefono = ref(false)

// Estados para búsqueda por correo
const correoBusqueda = ref('')
const resultadosCorreo = ref<CorreoSearchResult[]>([])
const isLoadingCorreo = ref(false)

// Estado para búsqueda de correos
const searchTermCorreos = ref('')

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
  cuentas: [] as AccountOwner[],
  saldo: undefined as number | undefined
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
  cuentas: [] as AccountOwner[],
  saldo: undefined as number | undefined
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

// Estados para WhatsApp
const showWhatsAppModal = ref(false)
const mensajeWhatsApp = ref<WhatsAppMessage | null>(null)

// Estados para editar juego
const showEditGame = ref(false)
const editingGame = ref<GameSummary | null>(null)
const editGameName = ref('')
const editPhotoUrl = ref('')
const editGameVersion = ref<GamePlatform>('PS4 & PS5')
const editTipoPromocion = ref<'ninguna' | 'oferta' | 'promocion'>('ninguna')
const isUpdatingGame = ref(false)
const editGameError = ref('')
const editGameSuccess = ref('')

// Estados para crear juego nuevo
const showCreateGame = ref(false)
const newGameName = ref('')
const newGamePhoto = ref('')
const newGameVersion = ref<GamePlatform>('PS4 & PS5')
const newGameTipoPromocion = ref<'ninguna' | 'oferta' | 'promocion'>('ninguna')
const isCreatingGame = ref(false)
const createGameError = ref('')
const createGameSuccess = ref('')


// Estados para filtros adicionales
const sortBy = ref<'nombre' | 'costo' | 'correos' | 'stock'>('nombre')
const sortOrder = ref<'asc' | 'desc'>('asc')
const stockFiltro = ref<'todas' | 'con' | 'sin'>('todas')
const promoFiltro = ref<'todas' | 'oferta' | 'promocion' | 'ninguna'>('todas')

const juegosFiltrados = computed(() => {
  // Primero filtrar por plataforma según el campo 'version' de cada juego
  let juegosPorPlataforma = games.value.filter(juego => {
    if (plataformaSeleccionada.value === 'PS4 & PS5') {
      // Mostrar TODOS los juegos (PS4, PS5, y PS4 & PS5)
      return true
    }
    if (plataformaSeleccionada.value === 'PS4') {
      // Mostrar juegos con version "PS4" o "PS4 & PS5" (compatibles con PS4)
      return juego.version === 'PS4' || juego.version === 'PS4 & PS5'
    }
    if (plataformaSeleccionada.value === 'PS5') {
      // Mostrar juegos con version "PS5" o "PS4 & PS5" (compatibles con PS5)
      return juego.version === 'PS5' || juego.version === 'PS4 & PS5'
    }
    return true
  })
  
  // Filtrar por término de búsqueda si existe
  if (searchTerm.value) {
    const resultadosBusqueda = buscarJuegos(searchTerm.value)
    juegosPorPlataforma = juegosPorPlataforma.filter(juego => {
      return resultadosBusqueda.some(j => j.id === juego.id)
    })
  }

  // Filtro por promoción
  if (promoFiltro.value !== 'todas') {
    juegosPorPlataforma = juegosPorPlataforma.filter(juego => {
      if (promoFiltro.value === 'oferta') {
        return juego.tipoPromocion === 'oferta' || juego.isOffert
      } else if (promoFiltro.value === 'promocion') {
        return juego.tipoPromocion === 'promocion'
      } else if (promoFiltro.value === 'ninguna') {
        return juego.tipoPromocion === 'ninguna' || (!juego.tipoPromocion && !juego.isOffert)
      }
      return true
    })
  }

  // Filtro por stock
  if (stockFiltro.value !== 'todas') {
    juegosPorPlataforma = juegosPorPlataforma.filter(juego => {
      const stock = juego.stockAccounts ?? 0
      if (stockFiltro.value === 'con') {
        return stock > 0
      }
      if (stockFiltro.value === 'sin') {
        return stock === 0
      }
      return true
    })
  }

  // Ordenamiento
  const resultadoOrdenado = [...juegosPorPlataforma].sort((a, b) => {
    let compareValue = 0
    
    switch (sortBy.value) {
      case 'nombre':
        compareValue = a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })
        break
      case 'costo':
        compareValue = a.costo - b.costo
        break
      case 'correos':
        compareValue = a.totalCorreos - b.totalCorreos
        break
      case 'stock':
        compareValue = (a.stockAccounts || 0) - (b.stockAccounts || 0)
        break
    }

    return sortOrder.value === 'asc' ? compareValue : -compareValue
  })

  return resultadoOrdenado
})

// Filtrar correos según término de búsqueda
const correosFiltrados = computed(() => {
  if (!searchTermCorreos.value || searchTermCorreos.value.trim() === '') {
    return correosJuego.value
  }

  const termino = searchTermCorreos.value.toLowerCase().trim()
  
  return correosJuego.value.filter(correo => {
    // Buscar en el correo
    if (correo.correo.toLowerCase().includes(termino)) return true
    
    // Buscar en el código
    if (correo.codigo.toLowerCase().includes(termino)) return true
    
    // Buscar en el nombre del juego
    if (correo.nombre.toLowerCase().includes(termino)) return true
    
    // Buscar en códigos generados
    if (correo.codigosGenerados.some(codigo => codigo.toLowerCase().includes(termino))) return true
    
    // Buscar en código master
    if (correo.codigoMaster.toLowerCase().includes(termino)) return true
    
    // Buscar en nombres de cuentas
    if (correo.cuentas.some(cuenta => cuenta.nombre.toLowerCase().includes(termino))) return true
    
    // Buscar en teléfonos de cuentas
    if (correo.cuentas.some(cuenta => cuenta.telefono.toLowerCase().includes(termino))) return true
    
    return false
  })
})

const cargarJuegosPorPlataforma = async (): Promise<void> => {
  // Solo cambiar vista si no estamos en correos o teléfono
  if (vistaActual.value === 'juegos') {
    juegoSeleccionado.value = null
  }
  try {
    // Todos los juegos están en la colección PS4 & PS5
    // Cargamos todos y luego filtramos por el campo 'version' de cada juego
    await cargarJuegos('PS4 & PS5', false) // Usar cache si está disponible
    // Los filtros se aplicarán automáticamente porque juegosFiltrados es un computed
  } catch (error) {
    console.error('Error cargando juegos:', error)
  }
}

const handleSincronizarJuegos = async (): Promise<void> => {
  try {
    await sincronizarJuegos(plataformaSeleccionada.value)
    // Mostrar mensaje de éxito
    createGameSuccess.value = 'Juegos sincronizados exitosamente'
    setTimeout(() => {
      createGameSuccess.value = ''
    }, 3000)
  } catch (error) {
    console.error('Error sincronizando juegos:', error)
    createGameError.value = 'Error al sincronizar juegos'
    setTimeout(() => {
      createGameError.value = ''
    }, 3000)
  }
}

// Intervalo para actualizar automáticamente cada 10 minutos
let syncInterval: ReturnType<typeof setInterval> | null = null

const iniciarSincronizacionAutomatica = (): void => {
  // Limpiar intervalo anterior si existe
  if (syncInterval) {
    clearInterval(syncInterval)
  }
  
  // Sincronizar cada 10 minutos (600000 ms)
  syncInterval = setInterval(async () => {
    if (vistaActual.value === 'juegos' && plataformaSeleccionada.value) {
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

const verCorreosJuego = async (juego: GameSummary): Promise<void> => {
  juegoSeleccionado.value = juego
  isLoadingCorreos.value = true
  vistaActual.value = 'correos'

  try {
    // Todos los correos están en la colección PS4 & PS5
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
  searchTermCorreos.value = '' // Limpiar búsqueda de correos al volver
  correoBusqueda.value = '' // Limpiar búsqueda por correo al volver
  resultadosCorreo.value = [] // Limpiar resultados de correo
  // Los filtros de juegos se mantienen automáticamente porque están en refs reactivos
  // No es necesario limpiarlos - se aplicarán automáticamente al cambiar la vista
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

const contarStockCuentas = (cuentas: AccountOwner[]): number => {
  if (!cuentas) return 0
  return cuentas.filter(cuenta => cuenta?.hasStock).length
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
        
        const esStock = /stock/i.test(linea)
        
        // Extraer teléfono (empieza con +593)
        const telefonoMatch = linea.match(/\+593\s*\d+\s*\d+\s*\d+\s*\d+/)
        const telefono = telefonoMatch ? telefonoMatch[0].replace(/\s+/g, ' ') : ''
        
        // Extraer nombre (texto entre "la tiene" y el teléfono)
        const nombreMatch = linea.match(/la tiene\s+(.+?)\s+\+593/)
        let nombre = nombreMatch && nombreMatch[1] ? nombreMatch[1].trim() : ''
        
        if (!nombre && esStock) {
          nombre = 'STOCK'
        }
        
        // Extraer saldo si está presente (buscar patrones como "Saldo: $XX" o "Saldo: XX")
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
    
    // Buscar saldo del correo (buscar patrones como "Saldo: $XX" o "Saldo: XX")
    const saldoIdx = lineas.findIndex(l => l.toLowerCase().includes('saldo'))
    if (saldoIdx !== -1 && lineas[saldoIdx]) {
      const saldoMatch = lineas[saldoIdx]!.match(/Saldo[:\s]+[\$]?(\d+\.?\d*)/i)
      if (saldoMatch && saldoMatch[1]) {
        newEmail.value.saldo = parseFloat(saldoMatch[1])
      }
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

// Estados para drag & drop
const isDragging = ref(false)
let dragCounter = 0

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
    createError.value = 'Por favor arrastra un archivo .txt'
    return
  }
  
  const reader = new FileReader()
  reader.onload = (e) => {
    const contenido = e.target?.result as string
    parsearArchivoTxt(contenido)
  }
  reader.readAsText(file)
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
    telefono: '',
    saldo: undefined, // Saldo opcional
    hasStock: false
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
    cuentas: [],
    saldo: undefined
  }
  createError.value = ''
  createSuccess.value = ''
  isDragging.value = false
  dragCounter = 0
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
    // Limpiar valores de saldo de las cuentas: eliminar el campo si es undefined
    const cuentasLimpias = newEmail.value.cuentas.map(cuenta => {
      const cuentaLimpia: AccountOwner = {
        tipo: cuenta.tipo,
        nombre: cuenta.nombre,
        telefono: cuenta.telefono
      }
      // Solo agregar saldo si tiene un valor válido
      if (cuenta.saldo !== undefined && cuenta.saldo !== null && !isNaN(cuenta.saldo)) {
        cuentaLimpia.saldo = cuenta.saldo
      }
      if (cuenta.hasStock) {
        cuentaLimpia.hasStock = true
      }
      return cuentaLimpia
    })

    // Limpiar saldo del correo: convertir NaN, null, o valores vacíos a undefined
    const saldoCorreo = newEmail.value.saldo !== undefined && newEmail.value.saldo !== null && !isNaN(newEmail.value.saldo)
      ? newEmail.value.saldo
      : undefined

    const emailData = {
      ...newEmail.value,
      cuentas: cuentasLimpias,
      saldo: saldoCorreo,
      createdBy: currentUserData.value?.uid
    }

    await crearCorreoJuego(
      'PS4 & PS5', // Todos los correos están en esta colección
      juegoSeleccionado.value.id,
      newEmail.value.correo,
      emailData
    )

    createSuccess.value = 'Correo agregado exitosamente'
    // El cache ya se limpia automáticamente en crearCorreoJuego
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
    cuentas: JSON.parse(JSON.stringify(email.cuentas)), // Deep copy
    saldo: email.saldo
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
    // Limpiar valores de saldo de las cuentas: eliminar el campo si es undefined
    const cuentasLimpias = editEmailData.value.cuentas.map(cuenta => {
      const cuentaLimpia: AccountOwner = {
        tipo: cuenta.tipo,
        nombre: cuenta.nombre,
        telefono: cuenta.telefono
      }
      // Solo agregar saldo si tiene un valor válido
      if (cuenta.saldo !== undefined && cuenta.saldo !== null && !isNaN(cuenta.saldo)) {
        cuentaLimpia.saldo = cuenta.saldo
      }
      if (cuenta.hasStock) {
        cuentaLimpia.hasStock = true
      }
      return cuentaLimpia
    })

    // Limpiar saldo del correo: convertir NaN, null, o valores vacíos a undefined
    const saldoCorreo = editEmailData.value.saldo !== undefined && editEmailData.value.saldo !== null && !isNaN(editEmailData.value.saldo)
      ? editEmailData.value.saldo
      : undefined

    await actualizarCorreoJuego(
      'PS4 & PS5', // Todos los correos están en esta colección
      juegoSeleccionado.value.id,
      editingEmail.value.correo,
      {
        nombre: editEmailData.value.nombre,
        costo: editEmailData.value.costo,
        codigoMaster: editEmailData.value.codigoMaster,
        codigosGenerados: editEmailData.value.codigosGenerados,
        codigo: editEmailData.value.codigo,
        cuentas: cuentasLimpias,
        saldo: saldoCorreo
      }
    )

    editSuccess.value = 'Correo actualizado exitosamente'
    // El cache ya se limpia automáticamente en actualizarCorreoJuego
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
        'PS4 & PS5', // Todos los correos están en esta colección
        juegoSeleccionado.value.id,
        deletingItem.value.data.correo
      )
      deleteSuccess.value = 'Correo eliminado exitosamente'
      // El cache ya se limpia automáticamente en eliminarCorreoJuego
      await verCorreosJuego(juegoSeleccionado.value)
    } else if (deletingItem.value.tipo === 'juego') {
      await eliminarJuegoCompleto(
        'PS4 & PS5', // Todos los juegos están en esta colección
        deletingItem.value.data.id
      )
      deleteSuccess.value = 'Juego eliminado exitosamente'
      // El cache ya se limpia automáticamente en eliminarJuegoCompleto
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

const iniciarCreacionJuego = (): void => {
  newGameName.value = ''
  newGamePhoto.value = ''
  newGameVersion.value = plataformaSeleccionada.value
  newGameTipoPromocion.value = 'ninguna'
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
    const juegoId = await crearJuego(
      'PS4 & PS5', // Todos los juegos están en esta colección
      newGameName.value.trim(),
      newGamePhoto.value.trim() || undefined,
      newGameTipoPromocion.value === 'oferta', // Legacy support
      newGameVersion.value // Versión del juego (PS4, PS5, o PS4 & PS5)
    )
    
    // Actualizar con el nuevo campo de tipo de promoción
    await actualizarJuego(
      'PS4 & PS5', // Todos los juegos están en esta colección
      juegoId,
      {
        tipoPromocion: newGameTipoPromocion.value,
        version: newGameVersion.value
      }
    )

    createGameSuccess.value = 'Juego creado exitosamente'
    // El cache ya se limpia automáticamente en crearJuego
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
  newGameVersion.value = 'PS4 & PS5'
  newGameTipoPromocion.value = 'ninguna'
  createGameError.value = ''
}

const iniciarEdicionJuego = (juego: GameSummary): void => {
  editingGame.value = juego
  editGameName.value = juego.nombre
  editPhotoUrl.value = juego.foto || ''
  editGameVersion.value = juego.version
  editTipoPromocion.value = juego.tipoPromocion || 'ninguna'
  editGameError.value = ''
  editGameSuccess.value = ''
  showEditGame.value = true
}

const handleUpdateGame = async (): Promise<void> => {
  if (!editingGame.value) return
  
  if (!editGameName.value.trim()) {
    editGameError.value = 'Por favor ingresa el nombre del juego'
    return
  }

  isUpdatingGame.value = true
  editGameError.value = ''
  editGameSuccess.value = ''

  try {
    await actualizarJuego(
      'PS4 & PS5', // Todos los juegos están en esta colección
      editingGame.value.id,
      {
        nombre: editGameName.value.trim(),
        foto: editPhotoUrl.value.trim() || undefined,
        version: editGameVersion.value,
        tipoPromocion: editTipoPromocion.value
      }
    )

    editGameSuccess.value = 'Juego actualizado exitosamente'
    
    // El cache ya se limpia automáticamente en actualizarJuego
    await cargarJuegosPorPlataforma()
    
    // Actualizar en la lista local
    const juegoIndex = games.value.findIndex(j => j.id === editingGame.value?.id)
    if (juegoIndex !== -1) {
      games.value[juegoIndex]!.nombre = editGameName.value.trim()
      games.value[juegoIndex]!.foto = editPhotoUrl.value.trim()
      games.value[juegoIndex]!.version = editGameVersion.value
      games.value[juegoIndex]!.tipoPromocion = editTipoPromocion.value
      games.value[juegoIndex]!.isOffert = editTipoPromocion.value === 'oferta'
    }

    setTimeout(() => {
      showEditGame.value = false
      editGameSuccess.value = ''
      editingGame.value = null
    }, 1500)
  } catch (error) {
    console.error('Error actualizando juego:', error)
    editGameError.value = 'Error al actualizar el juego'
  } finally {
    isUpdatingGame.value = false
  }
}

const cerrarEditarJuego = (): void => {
  showEditGame.value = false
  editingGame.value = null
  editGameName.value = ''
  editPhotoUrl.value = ''
  editGameVersion.value = 'PS4 & PS5'
  editTipoPromocion.value = 'ninguna'
  editGameError.value = ''
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

const buscarTelefono = async (): Promise<void> => {
  if (!telefonoBusqueda.value || telefonoBusqueda.value.trim().length < 3) {
    resultadosTelefono.value = []
    return
  }

  isLoadingTelefono.value = true
  // Si estamos en vista de juegos, mantener la vista pero mostrar resultados
  // Si estamos en otra vista, cambiar a vista de teléfono
  if (vistaActual.value !== 'juegos') {
    vistaActual.value = 'telefono'
  }
  try {
    resultadosTelefono.value = await buscarPorTelefono(telefonoBusqueda.value.trim(), plataformaSeleccionada.value)
  } catch (error) {
    console.error('Error buscando teléfono:', error)
  } finally {
    isLoadingTelefono.value = false
  }
}

// Debounce manual para optimizar búsquedas
let debounceTimer: ReturnType<typeof setTimeout> | null = null
const buscarTelefonoDebounced = (): void => {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }
  debounceTimer = setTimeout(() => {
    buscarTelefono()
  }, 500)
}

const buscarCorreo = async (): Promise<void> => {
  if (!correoBusqueda.value || correoBusqueda.value.trim().length < 3) {
    resultadosCorreo.value = []
    return
  }

  isLoadingCorreo.value = true
  try {
    resultadosCorreo.value = await buscarPorCorreo(correoBusqueda.value.trim(), plataformaSeleccionada.value)
  } catch (error) {
    console.error('Error buscando correo:', error)
  } finally {
    isLoadingCorreo.value = false
  }
}

// Debounce manual para búsqueda de correos
let debounceTimerCorreo: ReturnType<typeof setTimeout> | null = null
const buscarCorreoDebounced = (): void => {
  if (debounceTimerCorreo) {
    clearTimeout(debounceTimerCorreo)
  }
  debounceTimerCorreo = setTimeout(() => {
    buscarCorreo()
  }, 500)
}

onMounted(async () => {
  await loadUserData()
  
  // Verificar si hay un juego para abrir desde el state del router
  const openGame = window.history.state?.openGame as GameSummary | undefined
  
  if (openGame) {
    // Si viene un juego desde el dashboard, siempre cargar desde PS4 & PS5
    plataformaSeleccionada.value = 'PS4 & PS5'
    
    // Cargar todos los juegos (usar cache si está disponible)
    await cargarJuegos('PS4 & PS5', false)
    
    // Buscar el juego en la lista cargada (por si el estado tiene datos desactualizados)
    const juegoActualizado = games.value.find(g => g.id === openGame.id)
    
    if (juegoActualizado) {
      // Mostrar directamente los correos de ese juego
      await verCorreosJuego(juegoActualizado)
    } else {
      // Si no se encuentra, intentar con el juego del state original
      await verCorreosJuego(openGame)
    }
  } else {
    // Navegación normal, cargar la plataforma por defecto
    await cargarJuegosPorPlataforma()
  }
  
  // Iniciar sincronización automática
  iniciarSincronizacionAutomatica()
})

// Limpiar intervalos al desmontar el componente
onBeforeUnmount(() => {
  detenerSincronizacionAutomatica()
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
      <div class="space-y-4 mb-6">
        <!-- Primera fila: Búsquedas y plataforma -->
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div class="flex items-center gap-4 flex-wrap flex-1">
            <select 
              v-model="plataformaSeleccionada" 
              class="select select-bordered"
              @change="cargarJuegosPorPlataforma"
              :disabled="vistaActual === 'correos' || vistaActual === 'telefono'"
            >
              <option value="PS4 & PS5">PS4 & PS5</option>
              <option value="PS4">PS4</option>
              <option value="PS5">PS5</option>
            </select>

            <div v-if="vistaActual === 'juegos'" class="form-control">
              <div class="relative">
                <input
                  v-model="searchTerm"
                  type="text"
                  placeholder="Buscar juego por nombre..."
                  class="input input-bordered w-full max-w-xs pl-10"
                  autocomplete="off"
                />
                <Search :size="18" class="absolute left-3 top-3 text-base-content/40" />
              </div>
            </div>

            <div v-if="vistaActual === 'juegos' || vistaActual === 'correos'" class="form-control">
              <div class="relative">
                <input
                  v-model="telefonoBusqueda"
                  type="text"
                  placeholder="Buscar por teléfono..."
                  class="input input-bordered w-full max-w-xs pl-10"
                  @keyup.enter="buscarTelefono"
                  autocomplete="off"
                />
                <Phone :size="18" class="absolute left-3 top-3 text-base-content/40" />
              </div>
              <button 
                v-if="telefonoBusqueda && telefonoBusqueda.trim().length >= 3"
                @click="buscarTelefono" 
                class="btn btn-sm btn-primary btn-block mt-1"
                :disabled="isLoadingTelefono"
              >
                {{ isLoadingTelefono ? 'Buscando...' : 'Buscar Teléfono' }}
              </button>
            </div>
            <div v-if="vistaActual === 'juegos' || vistaActual === 'correos'" class="form-control">
              <div class="relative">
                <input
                  v-model="correoBusqueda"
                  type="email"
                  placeholder="Buscar por correo..."
                  class="input input-bordered w-full max-w-xs pl-10"
                  @keyup.enter="buscarCorreo"
                  autocomplete="off"
                />
                <Mail :size="18" class="absolute left-3 top-3 text-base-content/40" />
              </div>
              <button 
                v-if="correoBusqueda && correoBusqueda.trim().length >= 3"
                @click="buscarCorreo" 
                class="btn btn-sm btn-primary btn-block mt-1"
                :disabled="isLoadingCorreo"
              >
                {{ isLoadingCorreo ? 'Buscando...' : 'Buscar Correo' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Segunda fila: Filtros avanzados -->
        <div v-if="vistaActual === 'juegos'" class="card bg-base-100 shadow-lg">
          <div class="card-body p-4">
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <!-- Filtro Promoción -->
              <div class="form-control">
                <label class="label">
                  <span class="label-text font-semibold text-sm">Promoción</span>
                </label>
                <select v-model="promoFiltro" class="select select-bordered select-sm">
                  <option value="todas">Todas</option>
                  <option value="oferta">En Oferta</option>
                  <option value="promocion">En Promoción</option>
                  <option value="ninguna">Sin Promoción</option>
                </select>
              </div>

              <!-- Filtro Stock -->
              <div class="form-control">
                <label class="label">
                  <span class="label-text font-semibold text-sm">Stock</span>
                </label>
                <select v-model="stockFiltro" class="select select-bordered select-sm">
                  <option value="todas">Todos</option>
                  <option value="con">Con stock</option>
                  <option value="sin">Sin stock</option>
                </select>
              </div>

              <!-- Ordenar Por -->
              <div class="form-control">
                <label class="label">
                  <span class="label-text font-semibold text-sm">Ordenar Por</span>
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

              <!-- Botón Limpiar Filtros -->
              <div class="form-control">
                <label class="label">
                  <span class="label-text font-semibold text-sm opacity-0">Acción</span>
                </label>
                <button 
                  @click="searchTerm = ''; promoFiltro = 'todas'; stockFiltro = 'todas'; sortBy = 'nombre'; sortOrder = 'asc'" 
                  class="btn btn-sm btn-ghost w-full"
                >
                  Limpiar Filtros
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Botones de acción -->
      <div v-if="vistaActual === 'juegos'" class="flex gap-2 mb-4">
        <button 
          v-if="isAdmin"
          class="btn btn-primary"
          @click="iniciarCreacionJuego"
        >
          + Crear Juego
        </button>
        <button 
          class="btn btn-outline btn-primary gap-2"
          @click="handleSincronizarJuegos"
          :disabled="isSyncingGames || isLoadingGames"
          title="Sincronizar con la base de datos"
        >
          <RefreshCw :size="18" :class="{ 'animate-spin': isSyncingGames }" />
          {{ isSyncingGames ? 'Sincronizando...' : 'Sincronizar' }}
        </button>
      </div>
      
      <div v-if="isAdmin && vistaActual === 'correos'" class="flex gap-2 mb-4">
        <button 
          class="btn btn-primary"
          @click="iniciarCreacion"
        >
          + Agregar Correo
        </button>
        <button 
          class="btn btn-outline btn-primary gap-2"
          @click="handleSincronizarJuegos"
          :disabled="isSyncingGames || isLoadingGames"
          title="Sincronizar con la base de datos"
        >
          <RefreshCw :size="18" :class="{ 'animate-spin': isSyncingGames }" />
          {{ isSyncingGames ? 'Sincronizando...' : 'Sincronizar' }}
        </button>
      </div>

      <!-- Mensajes -->
      <div v-if="createSuccess || editSuccess || deleteSuccess || editGameSuccess || createGameSuccess" class="alert alert-success mb-4">
        <span>{{ createSuccess || editSuccess || deleteSuccess || editGameSuccess || createGameSuccess }}</span>
      </div>

      <div v-if="deleteError || editGameError || createGameError" class="alert alert-error mb-4">
        <span>{{ deleteError || editGameError || createGameError }}</span>
      </div>

      <!-- Resultados de Búsqueda por Teléfono (en vista de juegos) -->
      <div v-if="vistaActual === 'juegos' && resultadosTelefono.length > 0" class="card bg-base-100 shadow-xl mb-4">
        <div class="card-body">
          <div class="flex justify-between items-center mb-4">
            <h3 class="card-title text-lg flex items-center gap-2">
              <Phone :size="20" />
              Resultados de Búsqueda por Teléfono ({{ resultadosTelefono.length }})
            </h3>
            <button @click="telefonoBusqueda = ''; resultadosTelefono = []" class="btn btn-sm btn-ghost">
              ✕ Cerrar
            </button>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div v-for="(resultado, index) in resultadosTelefono" :key="index" class="card bg-base-200 shadow">
              <div class="card-body p-3">
                <div class="flex justify-between items-start">
                  <div class="flex-1">
                    <h4 class="font-semibold text-sm">{{ resultado.cuenta.nombre }}</h4>
                    <p class="text-xs text-base-content/60 mt-1">
                      <Phone :size="12" class="inline mr-1" />
                      {{ resultado.cuenta.telefono }}
                    </p>
                    <div class="mt-2 flex flex-wrap gap-1">
                      <span class="badge badge-xs">{{ resultado.juego.nombre }}</span>
                      <span class="badge badge-xs badge-outline">{{ formatearPrecio(resultado.juego.costo) }}</span>
                      <span v-if="resultado.cuenta.hasStock" class="badge badge-xs badge-primary">Stock</span>
                    </div>
                  </div>
                  <div class="badge badge-sm ml-2" :class="{
                    'badge-primary': resultado.cuenta.tipo.includes('Principal'),
                    'badge-secondary': resultado.cuenta.tipo.includes('Secundaria')
                  }">
                    {{ resultado.cuenta.tipo }}
                  </div>
                </div>
                <button 
                  @click="verCorreosJuego(resultado.juego)"
                  class="btn btn-xs btn-ghost mt-2 w-full"
                >
                  Ver correos →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Resultados de Búsqueda por Correo (en vista de juegos) -->
      <div v-if="vistaActual === 'juegos' && resultadosCorreo.length > 0" class="card bg-base-100 shadow-xl mb-4">
        <div class="card-body">
          <div class="flex justify-between items-center mb-4">
            <h3 class="card-title text-lg flex items-center gap-2">
              <Mail :size="20" />
              Resultados de Búsqueda por Correo ({{ resultadosCorreo.length }})
            </h3>
            <button @click="correoBusqueda = ''; resultadosCorreo = []" class="btn btn-sm btn-ghost">
              ✕ Cerrar
            </button>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div v-for="(resultado, index) in resultadosCorreo" :key="index" class="card bg-base-200 shadow">
              <div class="card-body p-3">
                <div class="flex justify-between items-start">
                  <div class="flex-1">
                    <h4 class="font-semibold text-sm flex items-center gap-2">
                      <Mail :size="14" />
                      {{ resultado.correo.correo }}
                    </h4>
                    <p class="text-xs text-base-content/60 mt-1">
                      Código: {{ resultado.correo.codigo }}
                    </p>
                    <div class="mt-2 flex flex-wrap gap-1">
                      <span class="badge badge-xs">{{ resultado.juego.nombre }}</span>
                      <span class="badge badge-xs badge-outline">{{ formatearPrecio(resultado.juego.costo) }}</span>
                      <span class="badge badge-xs">{{ resultado.correo.cuentas.length }} cuenta{{ resultado.correo.cuentas.length !== 1 ? 's' : '' }}</span>
                      <span v-if="contarStockCuentas(resultado.correo.cuentas) > 0" class="badge badge-xs badge-primary">
                        Stock: {{ contarStockCuentas(resultado.correo.cuentas) }}
                      </span>
                    </div>
                  </div>
                </div>
                <button 
                  @click="verCorreosJuego(resultado.juego)"
                  class="btn btn-xs btn-ghost mt-2 w-full"
                >
                  Ver correos →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Vista de Juegos -->
      <div v-if="vistaActual === 'juegos'" class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <div class="flex justify-between items-center mb-4">
            <h2 class="card-title">
              Juegos de {{ plataformaSeleccionada }}
              <span class="badge badge-lg">{{ juegosFiltrados.length }}</span>
              <span v-if="games.length !== juegosFiltrados.length" class="badge badge-outline badge-sm">
                de {{ games.length }} total
              </span>
            </h2>
            <div v-if="searchTerm || promoFiltro !== 'todas' || stockFiltro !== 'todas'" class="flex gap-2 items-center">
              <span class="text-sm text-base-content/60">Filtros activos</span>
              <button 
                @click="searchTerm = ''; promoFiltro = 'todas'; stockFiltro = 'todas'; sortBy = 'nombre'; sortOrder = 'asc'"
                class="btn btn-xs btn-ghost"
              >
                Limpiar
              </button>
            </div>
          </div>

          <div v-if="isLoadingGames" class="flex justify-center p-8">
            <span class="loading loading-spinner loading-lg"></span>
          </div>

          <div v-else-if="juegosFiltrados.length === 0" class="text-center p-8">
            <p class="text-gray-500">
              {{ searchTerm || promoFiltro !== 'todas' || stockFiltro !== 'todas' 
                ? 'No se encontraron juegos con los filtros aplicados' 
                : 'No hay juegos registrados' }}
            </p>
            <button 
              v-if="searchTerm || promoFiltro !== 'todas' || stockFiltro !== 'todas'"
              @click="searchTerm = ''; promoFiltro = 'todas'; stockFiltro = 'todas'; sortBy = 'nombre'; sortOrder = 'asc'"
              class="btn btn-sm btn-ghost mt-4"
            >
              Limpiar filtros
            </button>
          </div>

          <div v-else class="overflow-x-auto">
            <table class="table table-zebra">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Foto</th>
                  <th>Nombre del Juego</th>
                  <th>Precio</th>
                  <th>Total Correos</th>
                  <th>Stock</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(juego, index) in juegosFiltrados" :key="juego.id">
                  <td>{{ index + 1 }}</td>
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
                    <span 
                      class="badge" 
                      :class="(juego.stockAccounts || 0) > 0 ? 'badge-primary' : 'badge-ghost'"
                    >
                      {{ juego.stockAccounts || 0 }}
                    </span>
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
                        @click="iniciarEdicionJuego(juego)"
                        title="Editar juego"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
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

      <!-- Vista de Búsqueda por Teléfono -->
      <div v-if="vistaActual === 'telefono'" class="space-y-4">
        <div class="card bg-base-100 shadow-xl">
          <div class="card-body">
            <div class="flex justify-between items-center mb-4">
              <h2 class="card-title text-xl flex items-center gap-2">
                <Phone :size="24" />
                Búsqueda por Teléfono
              </h2>
              <button class="btn btn-sm btn-ghost" @click="volverAJuegos">
                ← Volver a juegos
              </button>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
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
                <select v-model="plataformaSeleccionada" class="select select-bordered">
                  <option value="PS4 & PS5">PS4 & PS5</option>
                  <option value="PS4">PS4</option>
                  <option value="PS5">PS5</option>
                </select>
              </div>
            </div>
            <div class="card-actions justify-end">
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
                    <button 
                      @click="verCorreosJuego(resultado.juego)"
                      class="btn btn-sm btn-ghost mt-2"
                    >
                      Ver correos del juego →
                    </button>
                  </div>
                </div>
                <div>
                  <h4 class="font-semibold mb-2">Información del Correo</h4>
                  <div class="space-y-1 text-sm">
                    <p><span class="font-medium">Correo:</span> <span class="font-mono text-xs">{{ resultado.correo.correo }}</span></p>
                    <p><span class="font-medium">Fecha:</span> {{ formatearFecha(resultado.correo.fecha) }}</p>
                    <p><span class="font-medium">Código:</span> {{ resultado.correo.codigo }}</p>
                    <p v-if="resultado.cuenta.saldo !== undefined">
                      <span class="font-medium">Saldo de la cuenta:</span> 
                      <span class="badge badge-success">{{ formatearPrecio(resultado.cuenta.saldo) }}</span>
                    </p>
                    <p v-if="resultado.cuenta.hasStock">
                      <span class="badge badge-primary badge-sm">Cuenta con Stock</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Vista de Correos -->
      <div v-if="vistaActual === 'correos'" class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
            <div>
              <h2 class="card-title">
                Correos de {{ juegoSeleccionado?.nombre }}
                <span class="badge badge-lg">{{ correosFiltrados.length }}</span>
                <span v-if="correosJuego.length !== correosFiltrados.length" class="badge badge-outline badge-sm">
                  de {{ correosJuego.length }} total
                </span>
              </h2>
            </div>
            <button class="btn btn-sm btn-ghost" @click="volverAJuegos">
              ← Volver a juegos
            </button>
          </div>

          <!-- Buscador de Correos -->
          <div class="mb-4">
            <div class="form-control">
              <div class="relative">
                <input
                  v-model="searchTermCorreos"
                  type="text"
                  placeholder="Buscar correos por email, código, nombre, teléfono..."
                  class="input input-bordered w-full pl-10"
                  autocomplete="off"
                />
                <Search :size="18" class="absolute left-3 top-3 text-base-content/40" />
              </div>
              <label class="label">
                <span class="label-text-alt">Busca en correos, códigos, nombres de cuentas y teléfonos</span>
                <button 
                  v-if="searchTermCorreos"
                  @click="searchTermCorreos = ''"
                  class="btn btn-xs btn-ghost"
                >
                  Limpiar
                </button>
              </label>
            </div>
          </div>

          <div v-if="isLoadingCorreos" class="flex justify-center p-8">
            <span class="loading loading-spinner loading-lg"></span>
          </div>

          <div v-else-if="correosJuego.length === 0" class="text-center p-8">
            <p class="text-gray-500">No hay correos registrados para este juego</p>
          </div>

          <div v-else-if="correosFiltrados.length === 0 && searchTermCorreos" class="text-center p-8">
            <p class="text-gray-500">No se encontraron correos con el término de búsqueda "{{ searchTermCorreos }}"</p>
            <button 
              @click="searchTermCorreos = ''"
              class="btn btn-sm btn-ghost mt-2"
            >
              Limpiar búsqueda
            </button>
          </div>

          <div v-else class="overflow-x-auto">
            <table class="table table-zebra">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Correo</th>
                  <th>Códigos</th>
                  <th>Cuentas</th>
                  <th>Stock</th>
                  <th>Fecha</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(email, index) in correosFiltrados" :key="email.correo">
                  <td>{{ index + 1 }}</td>
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
                  <td>
                    <span 
                      class="badge" 
                      :class="contarStockCuentas(email.cuentas) > 0 ? 'badge-primary' : 'badge-ghost'"
                    >
                      {{ contarStockCuentas(email.cuentas) }}
                    </span>
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
                      
                      <!-- Botón de WhatsApp -->
                      <div v-if="email.version === 'PS4 & PS5'" class="dropdown dropdown-top dropdown-end">
                        <label
                          tabindex="0"
                          :class="['btn btn-sm gap-1', validarCodigosDisponibles(email) ? 'btn-success' : 'btn-disabled']"
                          :disabled="!validarCodigosDisponibles(email) || isGenerating"
                        >
                          <MessageCircle :size="14" />
                        </label>
                        <ul tabindex="0" class="dropdown-content z-1 menu p-2 shadow-lg bg-base-100 rounded-box w-48 border border-white/10 mb-1">
                          <li>
                            <button @click="abrirModalWhatsApp(email, 'PS4')" :disabled="isGenerating" class="text-xs">
                              <span class="badge badge-primary badge-sm">PS4</span>
                              Mensaje PS4
                            </button>
                          </li>
                          <li>
                            <button @click="abrirModalWhatsApp(email, 'PS5')" :disabled="isGenerating" class="text-xs">
                              <span class="badge badge-secondary badge-sm">PS5</span>
                              Mensaje PS5
                            </button>
                          </li>
                        </ul>
                      </div>
                      <button
                        v-else
                        :class="['btn btn-sm gap-1', validarCodigosDisponibles(email) ? 'btn-success' : 'btn-disabled']"
                        :disabled="!validarCodigosDisponibles(email) || isGenerating"
                        @click="abrirModalWhatsApp(email)"
                      >
                        <MessageCircle :size="14" />
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
    </div>

    <!-- Modales -->
    <!-- Modal para agregar correo -->
    <dialog :class="['modal', { 'modal-open': showCreateEmail }]">
      <div class="modal-box max-w-4xl">
        <h3 class="font-bold text-lg mb-4">Agregar Correo a {{ juegoSeleccionado?.nombre }}</h3>

        <!-- Área de drag & drop para subir archivo .txt -->
        <div 
          class="border-2 border-dashed rounded-lg p-6 mb-4 transition-all"
          :class="isDragging ? 'border-primary bg-primary bg-opacity-10' : 'border-base-300'"
          @dragenter="handleDragEnter"
          @dragleave="handleDragLeave"
          @dragover="handleDragOver"
          @drop="handleDrop"
        >
          <div class="flex flex-col items-center justify-center text-center">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              class="h-12 w-12 mb-3 transition-colors"
              :class="isDragging ? 'text-primary' : 'text-base-content opacity-50'"
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p class="text-base font-medium mb-2" :class="isDragging ? 'text-primary' : ''">
              {{ isDragging ? '¡Suelta el archivo aquí!' : 'Arrastra y suelta tu archivo .txt aquí' }}
            </p>
            <p class="text-sm text-base-content opacity-60 mb-4">o</p>
            <label class="btn btn-sm btn-primary">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Seleccionar archivo
              <input type="file" accept=".txt" class="hidden" @change="handleFileUpload" />
            </label>
            <p class="text-xs text-base-content opacity-50 mt-3">
              El archivo se leerá automáticamente y llenará todos los campos
            </p>
          </div>
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
                <span class="label-text">Saldo del Correo</span>
                <span class="label-text-alt text-xs opacity-60">Opcional</span>
              </label>
              <input
                v-model.number="newEmail.saldo"
                type="number"
                step="0.01"
                placeholder="0.00"
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
                  <span class="font-semibold text-sm flex items-center gap-2">
                    Cuenta {{ index + 1 }}
                    <span v-if="cuenta.hasStock" class="badge badge-success badge-xs">Stock</span>
                  </span>
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
                <input v-model.number="cuenta.saldo" type="number" step="0.01" placeholder="Saldo (opcional)" class="input input-bordered input-sm w-full" />
                <label class="label cursor-pointer justify-start gap-3">
                  <span class="label-text text-sm">Cuenta con stock</span>
                  <input v-model="cuenta.hasStock" type="checkbox" class="toggle toggle-primary toggle-sm" />
                </label>
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
                <span class="label-text">Saldo del Correo</span>
                <span class="label-text-alt text-xs opacity-60">Opcional</span>
              </label>
              <input
                v-model.number="editEmailData.saldo"
                type="number"
                step="0.01"
                placeholder="0.00"
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
                  <span class="font-semibold text-sm flex items-center gap-2">
                    Cuenta {{ index + 1 }}
                    <span v-if="cuenta.hasStock" class="badge badge-success badge-xs">Stock</span>
                  </span>
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
                <input v-model.number="cuenta.saldo" type="number" step="0.01" placeholder="Saldo (opcional)" class="input input-bordered input-sm w-full" />
                <label class="label cursor-pointer justify-start gap-3">
                  <span class="label-text text-sm">Cuenta con stock</span>
                  <input v-model="cuenta.hasStock" type="checkbox" class="toggle toggle-primary toggle-sm" />
                </label>
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
      <div class="modal-box max-w-2xl">
        <h3 class="font-bold text-2xl mb-6 flex items-center gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Crear Nuevo Juego
        </h3>
        
        <form @submit.prevent="handleCreateGame" class="space-y-6">
          <!-- Nombre del Juego -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-semibold flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                Nombre del Juego *
              </span>
            </label>
            <input
              v-model="newGameName"
              type="text"
              placeholder="Ej: God of War Ragnarök"
              class="input input-bordered input-lg"
              required
            />
            <label class="label">
              <span class="label-text-alt">Este nombre será visible para los clientes</span>
            </label>
          </div>

          <!-- Versión/Categoría del Juego -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-semibold flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
                Versión/Categoría *
              </span>
            </label>
            <select v-model="newGameVersion" class="select select-bordered select-lg">
              <option value="PS4 & PS5">PS4 & PS5</option>
              <option value="PS4">PS4</option>
              <option value="PS5">PS5</option>
            </select>
            <label class="label">
              <span class="label-text-alt">Selecciona: PS4, PS5 o PS4 & PS5 (ambas)</span>
            </label>
          </div>

          <!-- Sección de Imagen -->
          <div class="divider">
            <span class="flex items-center gap-2 text-sm font-semibold">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Imagen del Juego
            </span>
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">URL de la Foto</span>
              <span class="label-text-alt text-xs opacity-60">Opcional</span>
            </label>
            <input
              v-model="newGamePhoto"
              type="url"
              placeholder="https://ecuadorjuegosdigitales.com/wp-content/uploads/..."
              class="input input-bordered"
            />
          </div>

          <!-- Preview de la nueva foto -->
          <div v-if="newGamePhoto" class="form-control">
            <label class="label">
              <span class="label-text font-medium">Vista Previa</span>
            </label>
            <div class="flex justify-center bg-base-200 rounded-lg p-4">
              <div class="avatar">
                <div class="w-48 rounded-lg shadow-lg">
                  <img 
                    :src="newGamePhoto" 
                    alt="Preview"
                    class="object-cover"
                    @error="(e) => (e.target as HTMLImageElement).src = ''"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Tipo de Promoción -->
          <div class="divider">
            <span class="flex items-center gap-2 text-sm font-semibold">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Tipo de Promoción
            </span>
          </div>

          <div class="form-control bg-base-200 rounded-lg p-4">
            <div class="grid grid-cols-3 gap-3">
              <label 
                class="cursor-pointer rounded-lg border-2 transition-all duration-200 p-4 hover:bg-base-300"
                :class="newGameTipoPromocion === 'ninguna' ? 'border-primary bg-primary/10' : 'border-base-300'"
              >
                <div class="flex flex-col items-center gap-2">
                  <input 
                    type="radio" 
                    name="newGamePromocion" 
                    value="ninguna" 
                    v-model="newGameTipoPromocion" 
                    class="radio radio-primary" 
                  />
                  <span class="font-medium text-sm">Ninguna</span>
                  <span class="text-xs opacity-60">Sin promoción</span>
                </div>
              </label>
              
              <label 
                class="cursor-pointer rounded-lg border-2 transition-all duration-200 p-4 hover:bg-base-300"
                :class="newGameTipoPromocion === 'oferta' ? 'border-success bg-success/10' : 'border-base-300'"
              >
                <div class="flex flex-col items-center gap-2">
                  <input 
                    type="radio" 
                    name="newGamePromocion" 
                    value="oferta" 
                    v-model="newGameTipoPromocion" 
                    class="radio radio-success" 
                  />
                  <span class="font-medium text-sm">Oferta</span>
                  <span class="text-xs opacity-60">Precio especial</span>
                </div>
              </label>
              
              <label 
                class="cursor-pointer rounded-lg border-2 transition-all duration-200 p-4 hover:bg-base-300"
                :class="newGameTipoPromocion === 'promocion' ? 'border-warning bg-warning/10' : 'border-base-300'"
              >
                <div class="flex flex-col items-center gap-2">
                  <input 
                    type="radio" 
                    name="newGamePromocion" 
                    value="promocion" 
                    v-model="newGameTipoPromocion" 
                    class="radio radio-warning" 
                  />
                  <span class="font-medium text-sm">Promoción</span>
                  <span class="text-xs opacity-60">Destacado</span>
                </div>
              </label>
            </div>
          </div>

          <!-- Mensaje de error -->
          <div v-if="createGameError" class="alert alert-error shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{{ createGameError }}</span>
          </div>

          <!-- Botones de acción -->
          <div class="modal-action">
            <button
              type="button"
              class="btn btn-ghost"
              @click="cerrarCrearJuego"
              :disabled="isCreatingGame"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cancelar
            </button>
            <button
              type="submit"
              class="btn btn-primary btn-lg"
              :disabled="isCreatingGame"
            >
              <span v-if="isCreatingGame" class="loading loading-spinner"></span>
              <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              {{ isCreatingGame ? 'Creando...' : 'Crear Juego' }}
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="cerrarCrearJuego">close</button>
      </form>
    </dialog>

    <!-- Modal para editar juego -->
    <dialog :class="['modal', { 'modal-open': showEditGame }]">
      <div class="modal-box max-w-3xl">
        <h3 class="font-bold text-2xl mb-6">Editar Juego</h3>

        <form @submit.prevent="handleUpdateGame" class="space-y-6">
          <!-- Info del juego que se está editando -->
          <div v-if="editingGame" class="bg-base-200 rounded-lg p-4">
            <div class="flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-info" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <span class="text-sm opacity-70">ID del juego:</span>
                <span class="font-mono ml-2 font-semibold">{{ editingGame.id }}</span>
              </div>
            </div>
          </div>

          <!-- Nombre del Juego -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-semibold flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                Nombre del Juego *
              </span>
            </label>
            <input
              v-model="editGameName"
              type="text"
              placeholder="Ej: God of War Ragnarök"
              class="input input-bordered input-lg"
              required
            />
          </div>

          <!-- Versión/Categoría del Juego -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-semibold flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
                Versión/Categoría *
              </span>
            </label>
            <select v-model="editGameVersion" class="select select-bordered select-lg">
              <option value="PS4 & PS5">PS4 & PS5</option>
              <option value="PS4">PS4</option>
              <option value="PS5">PS5</option>
            </select>
            <label class="label">
              <span class="label-text-alt">Selecciona: PS4, PS5 o PS4 & PS5 (ambas)</span>
            </label>
          </div>

          <!-- Sección de Imágenes -->
          <div class="divider">
            <span class="flex items-center gap-2 text-sm font-semibold">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Imagen del Juego
            </span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Foto Actual -->
            <div v-if="editingGame?.foto" class="form-control">
              <label class="label">
                <span class="label-text font-medium">Foto Actual</span>
              </label>
              <div class="flex justify-center bg-base-200 rounded-lg p-4">
                <div class="avatar">
                  <div class="w-48 rounded-lg shadow-lg">
                    <img :src="editingGame.foto" :alt="editingGame.nombre" class="object-cover" />
                  </div>
                </div>
              </div>
            </div>

            <!-- Preview de Nueva Foto -->
            <div v-if="editPhotoUrl && editPhotoUrl !== editingGame?.foto" class="form-control">
              <label class="label">
                <span class="label-text font-medium flex items-center gap-2">
                  <span class="badge badge-success badge-sm">Nueva</span>
                  Vista Previa
                </span>
              </label>
              <div class="flex justify-center bg-base-200 rounded-lg p-4">
                <div class="avatar">
                  <div class="w-48 rounded-lg shadow-lg">
                    <img 
                      :src="editPhotoUrl" 
                      alt="Preview"
                      class="object-cover"
                      @error="(e) => (e.target as HTMLImageElement).src = ''"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- URL de la Foto -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">URL de la Foto</span>
              <span class="label-text-alt text-xs opacity-60">Opcional</span>
            </label>
            <input
              v-model="editPhotoUrl"
              type="url"
              placeholder="https://ecuadorjuegosdigitales.com/wp-content/uploads/..."
              class="input input-bordered"
            />
          </div>

          <!-- Tipo de Promoción -->
          <div class="divider">
            <span class="flex items-center gap-2 text-sm font-semibold">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Tipo de Promoción
            </span>
          </div>

          <div class="form-control bg-base-200 rounded-lg p-4">
            <div class="grid grid-cols-3 gap-3">
              <label 
                class="cursor-pointer rounded-lg border-2 transition-all duration-200 p-4 hover:bg-base-300"
                :class="editTipoPromocion === 'ninguna' ? 'border-primary bg-primary/10' : 'border-base-300'"
              >
                <div class="flex flex-col items-center gap-2">
                  <input 
                    type="radio" 
                    name="editPromocion" 
                    value="ninguna" 
                    v-model="editTipoPromocion" 
                    class="radio radio-primary" 
                  />
                  <span class="font-medium text-sm">Ninguna</span>
                  <span class="text-xs opacity-60">Sin promoción</span>
                </div>
              </label>
              
              <label 
                class="cursor-pointer rounded-lg border-2 transition-all duration-200 p-4 hover:bg-base-300"
                :class="editTipoPromocion === 'oferta' ? 'border-success bg-success/10' : 'border-base-300'"
              >
                <div class="flex flex-col items-center gap-2">
                  <input 
                    type="radio" 
                    name="editPromocion" 
                    value="oferta" 
                    v-model="editTipoPromocion" 
                    class="radio radio-success" 
                  />
                  <span class="font-medium text-sm">Oferta</span>
                  <span class="text-xs opacity-60">Precio especial</span>
                </div>
              </label>
              
              <label 
                class="cursor-pointer rounded-lg border-2 transition-all duration-200 p-4 hover:bg-base-300"
                :class="editTipoPromocion === 'promocion' ? 'border-warning bg-warning/10' : 'border-base-300'"
              >
                <div class="flex flex-col items-center gap-2">
                  <input 
                    type="radio" 
                    name="editPromocion" 
                    value="promocion" 
                    v-model="editTipoPromocion" 
                    class="radio radio-warning" 
                  />
                  <span class="font-medium text-sm">Promoción</span>
                  <span class="text-xs opacity-60">Destacado</span>
                </div>
              </label>
            </div>
          </div>

          <!-- Mensajes de error/éxito -->
          <div v-if="editGameError" class="alert alert-error shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{{ editGameError }}</span>
          </div>

          <div v-if="editGameSuccess" class="alert alert-success shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{{ editGameSuccess }}</span>
          </div>

          <!-- Botones de acción -->
          <div class="modal-action">
            <button
              type="button"
              class="btn btn-ghost"
              @click="cerrarEditarJuego"
              :disabled="isUpdatingGame"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cancelar
            </button>
            <button
              type="submit"
              class="btn btn-primary btn-lg"
              :disabled="isUpdatingGame"
            >
              <span v-if="isUpdatingGame" class="loading loading-spinner"></span>
              <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              {{ isUpdatingGame ? 'Guardando...' : 'Guardar Cambios' }}
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="cerrarEditarJuego">close</button>
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
                <div v-if="selectedEmailDetails.saldo !== undefined">
                  <span class="font-semibold">Saldo del Correo:</span>
                  <p class="badge badge-success badge-lg">{{ formatearPrecio(selectedEmailDetails.saldo) }}</p>
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
                  <div class="flex-1">
                    <div class="flex items-center gap-2">
                      <span class="badge badge-sm" :class="{
                        'badge-primary': cuenta.tipo.includes('Principal'),
                        'badge-secondary': cuenta.tipo.includes('Secundaria')
                      }">
                        {{ cuenta.tipo }}
                      </span>
                      <span v-if="cuenta.hasStock" class="badge badge-success badge-sm">Stock</span>
                      <span class="font-medium">{{ cuenta.nombre }}</span>
                    </div>
                    <div class="text-xs opacity-70 mt-1">{{ cuenta.telefono }}</div>
                  </div>
                  <div v-if="cuenta.saldo !== undefined" class="text-right">
                    <div class="badge badge-success">{{ formatearPrecio(cuenta.saldo) }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-action">
          <button class="btn btn-ghost" @click="cerrarDetalles">
            Cerrar
          </button>
          
          <!-- Botón de generar mensaje WhatsApp -->
          <template v-if="selectedEmailDetails">
            <div v-if="selectedEmailDetails.version === 'PS4 & PS5'" class="dropdown dropdown-top dropdown-end">
              <label
                tabindex="0"
                :class="['btn gap-2', validarCodigosDisponibles(selectedEmailDetails) ? 'btn-success' : 'btn-disabled']"
                :disabled="!validarCodigosDisponibles(selectedEmailDetails) || isGenerating"
              >
                <MessageCircle :size="20" />
                Generar Mensaje WhatsApp
              </label>
              <ul tabindex="0" class="dropdown-content z-1 menu p-2 shadow-lg bg-base-100 rounded-box w-52 border border-white/10 mb-2">
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
          </template>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="cerrarDetalles">close</button>
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

</template>
