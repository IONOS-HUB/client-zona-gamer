<script setup lang="ts">
import { ref, onMounted, computed, watch, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useRoles } from '@/composables/useRoles'
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '@/config/firebase'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/config/firebase'
import type { AppUser, UserRole } from '@/types/user'
import { BarChart3, Users, Gamepad2, Home, Phone, Search, Mail, RefreshCw, MessageCircle, FileText, Calendar } from 'lucide-vue-next'
import StatsOverview from '@/components/admin/StatsOverview.vue'
import WhatsAppMessageModal from '@/components/ui/WhatsAppMessageModal.vue'
import ReportesCharts from '@/components/admin/ReportesCharts.vue'
import { useGames } from '@/composables/useGames'
import { useWhatsAppMessages } from '@/composables/useWhatsAppMessages'
import { useReportes } from '@/composables/useReportes'
import type { TelefonoSearchResult, CorreoSearchResult, GamePlatform, AccountOwner, GameSummary, GameEmailAccount, AccountType } from '@/types/game'
import type { WhatsAppMessage } from '@/composables/useWhatsAppMessages'
import type { Reporte } from '@/types/reporte'

const router = useRouter()
const { signOut } = useAuth()
const { currentUserData, createUserWithRole, loadUserData, updateUserRole, updateUserData, deleteUser, isAdmin, hasEmployeeAccess } = useRoles()
const { 
  buscarPorTelefono, 
  buscarPorCorreo,
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
  generarIdJuego,
  clearCache
} = useGames()

const {
  validarCodigosDisponibles,
  generarYEliminarCodigos,
  copiarAlPortapapeles,
  isGenerating
} = useWhatsAppMessages()

const {
  reportes,
  isLoadingReportes,
  cargarReportes,
  obtenerEstadisticas
} = useReportes()

// Estado para el tab activo
const activeTab = ref<'stats' | 'users' | 'telefono' | 'correo' | 'games' | 'reportes'>('stats')

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

// Estados para crear usuario
const showCreateEmployee = ref(false)
const newEmployeeEmail = ref('')
const newEmployeePassword = ref('')
const newEmployeeName = ref('')
const newEmployeeRole = ref<UserRole>('employee')
const isCreating = ref(false)
const createError = ref('')
const createSuccess = ref('')

// Estados para la lista de empleados
const employees = ref<AppUser[]>([])
const isLoadingEmployees = ref(false)

// Estados para actualizar rol
const updatingRoleUserId = ref<string | null>(null)
const roleUpdateError = ref('')
const roleUpdateSuccess = ref('')

// Estados para editar usuario
const showEditEmployee = ref(false)
const editingEmployee = ref<AppUser | null>(null)
const editEmployeeName = ref('')
const editEmployeeEmail = ref('')
const isEditing = ref(false)
const editError = ref('')
const editSuccess = ref('')

// Estados para eliminar usuario
const showDeleteConfirm = ref(false)
const deletingEmployee = ref<AppUser | null>(null)
const isDeleting = ref(false)
const deleteError = ref('')
const deleteSuccess = ref('')

const loadEmployees = async (): Promise<void> => {
  isLoadingEmployees.value = true
  try {
    const q = query(collection(db, 'users'), where('role', 'in', ['employee', 'admin']))
    const querySnapshot = await getDocs(q)
    employees.value = querySnapshot.docs.map((doc) => doc.data() as AppUser)
  } catch (error) {
    console.error('Error cargando usuarios:', error)
  } finally {
    isLoadingEmployees.value = false
  }
}

const handleCreateEmployee = async (): Promise<void> => {
  if (!newEmployeeEmail.value || !newEmployeePassword.value) {
    createError.value = 'Por favor completa todos los campos'
    return
  }

  isCreating.value = true
  createError.value = ''
  createSuccess.value = ''

  try {
    // Guardar email del admin actual para re-autenticar después
    const adminEmail = currentUserData.value?.email || auth.currentUser?.email
    
    if (!adminEmail) {
      createError.value = 'No se pudo obtener el email del administrador'
      return
    }

    // Crear usuario en Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      newEmployeeEmail.value,
      newEmployeePassword.value
    )

    const employeeUid = userCredential.user.uid

    // Crear documento de usuario con el rol seleccionado
    await createUserWithRole(
      employeeUid,
      newEmployeeEmail.value,
      newEmployeeRole.value,
      currentUserData.value?.uid || '',
      newEmployeeName.value
    )

    // IMPORTANTE: Al crear un nuevo usuario con createUserWithEmailAndPassword,
    // Firebase automáticamente loguea a ese usuario. Para mantener la sesión del admin,
    // necesitamos volver a loguear al admin.
    // Nota: En producción, esto debería hacerse con Cloud Functions o Admin SDK
    
    const roleName = newEmployeeRole.value === 'admin' ? 'Administrador' : 'Empleado'
    createSuccess.value = `${roleName} creado exitosamente. Refresca la página para mantener tu sesión.`
    newEmployeeEmail.value = ''
    newEmployeePassword.value = ''
    newEmployeeName.value = ''
    newEmployeeRole.value = 'employee'
    showCreateEmployee.value = false

    // Recargar lista de empleados
    await loadEmployees()
    
  } catch (error: any) {
    console.error('Error creando empleado:', error)
    if (error.code === 'auth/email-already-in-use') {
      createError.value = 'Este email ya está en uso'
    } else {
      createError.value = 'Error al crear el empleado'
    }
  } finally {
    isCreating.value = false
  }
}

const handleRoleChange = async (userId: string, newRole: UserRole): Promise<void> => {
  if (userId === currentUserData.value?.uid) {
    roleUpdateError.value = 'No puedes cambiar tu propio rol'
    setTimeout(() => {
      roleUpdateError.value = ''
    }, 3000)
    return
  }

  updatingRoleUserId.value = userId
  roleUpdateError.value = ''
  roleUpdateSuccess.value = ''

  try {
    await updateUserRole(userId, newRole)
    
    // Actualizar la lista local
    const employeeIndex = employees.value.findIndex(emp => emp.uid === userId)
    if (employeeIndex !== -1 && employees.value[employeeIndex]) {
      employees.value[employeeIndex]!.role = newRole
    }
    
    const roleName = newRole === 'admin' ? 'Administrador' : 'Empleado'
    roleUpdateSuccess.value = `Rol actualizado a ${roleName} exitosamente`
    
    setTimeout(() => {
      roleUpdateSuccess.value = ''
    }, 3000)
  } catch (error) {
    console.error('Error actualizando rol:', error)
    roleUpdateError.value = 'Error al actualizar el rol'
    
    setTimeout(() => {
      roleUpdateError.value = ''
    }, 3000)
  } finally {
    updatingRoleUserId.value = null
  }
}

const formatearFecha = (fecha: Date | string): string => {
  const date = typeof fecha === 'string' ? new Date(fecha) : fecha
  return new Intl.DateTimeFormat('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).format(date)
}

const iniciarEdicion = (employee: AppUser): void => {
  editingEmployee.value = employee
  editEmployeeName.value = employee.displayName || ''
  editEmployeeEmail.value = employee.email
  editError.value = ''
  editSuccess.value = ''
  showEditEmployee.value = true
}

const handleEditEmployee = async (): Promise<void> => {
  if (!editingEmployee.value) return

  isEditing.value = true
  editError.value = ''
  editSuccess.value = ''

  try {
    await updateUserData(
      editingEmployee.value.uid,
      editEmployeeName.value
    )

    // Actualizar en la lista local
    const employeeIndex = employees.value.findIndex(emp => emp.uid === editingEmployee.value?.uid)
    if (employeeIndex !== -1 && employees.value[employeeIndex]) {
      employees.value[employeeIndex]!.displayName = editEmployeeName.value
    }

    editSuccess.value = 'Usuario actualizado exitosamente'
    
    setTimeout(() => {
      showEditEmployee.value = false
      editSuccess.value = ''
      editingEmployee.value = null
    }, 1500)
  } catch (error) {
    console.error('Error actualizando usuario:', error)
    editError.value = 'Error al actualizar el usuario'
  } finally {
    isEditing.value = false
  }
}

const iniciarEliminacion = (employee: AppUser): void => {
  if (employee.uid === currentUserData.value?.uid) {
    deleteError.value = 'No puedes eliminar tu propia cuenta'
    setTimeout(() => {
      deleteError.value = ''
    }, 3000)
    return
  }
  
  deletingEmployee.value = employee
  deleteError.value = ''
  showDeleteConfirm.value = true
}

const handleDeleteEmployee = async (): Promise<void> => {
  if (!deletingEmployee.value) return

  isDeleting.value = true
  deleteError.value = ''
  deleteSuccess.value = ''

  try {
    await deleteUser(deletingEmployee.value.uid)

    // Remover de la lista local
    employees.value = employees.value.filter(emp => emp.uid !== deletingEmployee.value?.uid)

    deleteSuccess.value = 'Usuario eliminado exitosamente'
    showDeleteConfirm.value = false
    deletingEmployee.value = null

    setTimeout(() => {
      deleteSuccess.value = ''
    }, 3000)
  } catch (error) {
    console.error('Error eliminando usuario:', error)
    deleteError.value = 'Error al eliminar el usuario'
  } finally {
    isDeleting.value = false
  }
}

const cancelarEliminacion = (): void => {
  showDeleteConfirm.value = false
  deletingEmployee.value = null
  deleteError.value = ''
}

const handleLogout = async (): Promise<void> => {
  await signOut()
  router.push('/login')
}

onMounted(() => {
  loadEmployees()
})

const irAHome = (): void => {
  router.push('/')
}

const contarStockCuentasGame = (cuentas: AccountOwner[]): number => {
  if (!cuentas) return 0
  return cuentas.filter((cuenta: AccountOwner) => cuenta?.hasStock).length
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
    resultadosCorreo.value = await buscarPorCorreo(correoBusqueda.value.trim(), plataformaCorreo.value)
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

const formatearPrecio = (precio: number): string => {
  return new Intl.NumberFormat('es-EC', {
    style: 'currency',
    currency: 'USD'
  }).format(precio)
}

const verDetallesJuego = (juegoId: string): void => {
  // Cambiar al tab de juegos y abrir el juego específico
  activeTab.value = 'games'
  const juego = games.value.find(g => g.id === juegoId)
  if (juego) {
    setTimeout(() => {
      verCorreosJuego(juego)
    }, 100)
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
    // Pequeño delay para asegurar que el tab se haya cambiado
    setTimeout(() => {
      verCorreosJuego(juegoEncontrado)
    }, 100)
  } else {
    // Si no se encuentra, usar el juego pasado directamente
    setTimeout(() => {
      verCorreosJuego(juego)
    }, 100)
  }
}

// ========== ESTADOS PARA GESTIÓN DE JUEGOS ==========
const plataformaSeleccionada = ref<GamePlatform>('PS4 & PS5')
const searchTerm = ref('')
const vistaActual = ref<'juegos' | 'correos' | 'telefono'>('juegos')
const juegoSeleccionado = ref<GameSummary | null>(null)
const correosJuego = ref<GameEmailAccount[]>([])
const isLoadingCorreos = ref(false)

// Estados para búsqueda por teléfono (en gestión de juegos)
const telefonoBusquedaGames = ref('')
const resultadosTelefonoGames = ref<TelefonoSearchResult[]>([])
const isLoadingTelefonoGames = ref(false)

// Estados para búsqueda por correo (en gestión de juegos)
const correoBusquedaGames = ref('')
const resultadosCorreoGames = ref<CorreoSearchResult[]>([])
const isLoadingCorreoGames = ref(false)

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
const isCreatingEmail = ref(false)
const createEmailError = ref('')
const createEmailSuccess = ref('')

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
const isEditingEmail = ref(false)
const editEmailError = ref('')
const editEmailSuccess = ref('')

// Estados para eliminar juegos/correos
const showDeleteConfirmGame = ref(false)
const deletingItem = ref<{ tipo: 'juego' | 'correo', data: any} | null>(null)
const isDeletingGame = ref(false)
const deleteGameError = ref('')
const deleteGameSuccess = ref('')

// Estados para ver detalles de un correo
const showEmailDetails = ref(false)
const selectedEmailDetails = ref<GameEmailAccount | null>(null)

// Estados para WhatsApp
const showWhatsAppModal = ref(false)
const mensajeWhatsApp = ref<WhatsAppMessage | null>(null)

// Estados para reportes
const filtroUsuarioReporte = ref<string>('')
const filtroRolReporte = ref<'admin' | 'employee' | ''>('')
const busquedaReporte = ref('')
const limiteReportes = ref(100)
const fechaInicio = ref('')
const fechaFin = ref('')
const mostrarGraficos = ref(true)

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

// ========== COMPUTED Y FUNCIONES PARA GESTIÓN DE JUEGOS ==========
const juegosFiltrados = computed(() => {
  // Primero filtrar por plataforma según el campo 'version' de cada juego
  let juegosPorPlataforma = games.value.filter(juego => {
    if (plataformaSeleccionada.value === 'PS4 & PS5') {
      return true
    }
    if (plataformaSeleccionada.value === 'PS4') {
      return juego.version === 'PS4' || juego.version === 'PS4 & PS5'
    }
    if (plataformaSeleccionada.value === 'PS5') {
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
    if (correo.correo.toLowerCase().includes(termino)) return true
    if (correo.codigo.toLowerCase().includes(termino)) return true
    if (correo.nombre.toLowerCase().includes(termino)) return true
    if (correo.codigosGenerados.some(codigo => codigo.toLowerCase().includes(termino))) return true
    if (correo.codigoMaster.toLowerCase().includes(termino)) return true
    if (correo.cuentas.some(cuenta => cuenta.nombre.toLowerCase().includes(termino))) return true
    if (correo.cuentas.some(cuenta => cuenta.telefono.toLowerCase().includes(termino))) return true
    return false
  })
})

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
  searchTermCorreos.value = ''
  correoBusquedaGames.value = ''
  resultadosCorreoGames.value = []
}

const formatearFechaGame = (fecha: Date | string): string => {
  const date = typeof fecha === 'string' ? new Date(fecha) : fecha
  return new Intl.DateTimeFormat('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date)
}

const contarStockCuentas = (cuentas: AccountOwner[]): number => {
  if (!cuentas) return 0
  return cuentas.filter(cuenta => cuenta?.hasStock).length
}

const buscarTelefonoGames = async (): Promise<void> => {
  if (!telefonoBusquedaGames.value || telefonoBusquedaGames.value.trim().length < 3) {
    resultadosTelefonoGames.value = []
    return
  }

  isLoadingTelefonoGames.value = true
  if (vistaActual.value !== 'juegos') {
    vistaActual.value = 'telefono'
  }
  try {
    resultadosTelefonoGames.value = await buscarPorTelefono(telefonoBusquedaGames.value.trim(), plataformaSeleccionada.value)
  } catch (error) {
    console.error('Error buscando teléfono:', error)
  } finally {
    isLoadingTelefonoGames.value = false
  }
}

const buscarCorreoGames = async (): Promise<void> => {
  if (!correoBusquedaGames.value || correoBusquedaGames.value.trim().length < 3) {
    resultadosCorreoGames.value = []
    return
  }

  isLoadingCorreoGames.value = true
  try {
    resultadosCorreoGames.value = await buscarPorCorreo(correoBusquedaGames.value.trim(), plataformaSeleccionada.value)
  } catch (error) {
    console.error('Error buscando correo:', error)
  } finally {
    isLoadingCorreoGames.value = false
  }
}

// Estados para drag & drop
const isDragging = ref(false)
let dragCounter = 0

// Función para parsear archivo .txt
const parsearArchivoTxt = (contenido: string): void => {
  try {
    const lineas = contenido.split('\n').map(l => l.trim()).filter(l => l)
    
    const correo = lineas[0] || ''
    newEmail.value.correo = correo
    
    const cuentas: AccountOwner[] = []
    lineas.forEach(linea => {
      if (linea.includes('Principal PS4') || linea.includes('Secundaria PS4') || linea.includes('Principal PS5')) {
        let tipo: AccountType = 'Principal PS4'
        if (linea.includes('Secundaria PS4')) tipo = 'Secundaria PS4'
        else if (linea.includes('Principal PS5')) tipo = 'Principal PS5'
        
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
    newEmail.value.cuentas = cuentas
    
    const nombreIdx = lineas.findIndex(l => l.startsWith('Nombre:'))
    if (nombreIdx !== -1 && lineas[nombreIdx]) {
      newEmail.value.nombre = lineas[nombreIdx]!.replace('Nombre:', '').trim()
    }
    
    const costoIdx = lineas.findIndex(l => l.startsWith('Costo:'))
    if (costoIdx !== -1 && lineas[costoIdx]) {
      const costoStr = lineas[costoIdx]!.replace('Costo:', '').replace('$', '').trim()
      newEmail.value.costo = parseFloat(costoStr) || 0
    }
    
    const saldoIdx = lineas.findIndex(l => l.toLowerCase().includes('saldo'))
    if (saldoIdx !== -1 && lineas[saldoIdx]) {
      const saldoMatch = lineas[saldoIdx]!.match(/Saldo[:\s]+[\$]?(\d+\.?\d*)/i)
      if (saldoMatch && saldoMatch[1]) {
        newEmail.value.saldo = parseFloat(saldoMatch[1])
      }
    }
    
    const masterIdx = lineas.findIndex(l => l === 'MASTER')
    if (masterIdx !== -1 && masterIdx + 1 < lineas.length && lineas[masterIdx + 1]) {
      newEmail.value.codigo = lineas[masterIdx + 1]!
    }
    
    const codigoMaster = lineas.find(l => l.length > 80 && /^[A-Z0-9]+$/.test(l))
    if (codigoMaster) {
      newEmail.value.codigoMaster = codigoMaster
    }
    
    const codigos = lineas.filter(l => l.length === 6 && /^[A-Za-z0-9]+$/.test(l))
    newEmail.value.codigosGenerados = codigos
    
    createEmailSuccess.value = 'Archivo cargado exitosamente'
    setTimeout(() => { createEmailSuccess.value = '' }, 3000)
  } catch (error) {
    console.error('Error parseando archivo:', error)
    createEmailError.value = 'Error al procesar el archivo. Verifica el formato.'
  }
}

const handleFileUpload = (event: Event): void => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  
  if (!file) return
  
  if (!file.name.endsWith('.txt')) {
    createEmailError.value = 'Por favor selecciona un archivo .txt'
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
    createEmailError.value = 'Por favor arrastra un archivo .txt'
    return
  }
  
  const reader = new FileReader()
  reader.onload = (e) => {
    const contenido = e.target?.result as string
    parsearArchivoTxt(contenido)
  }
  reader.readAsText(file)
}

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

const agregarCuenta = (isEdit: boolean = false): void => {
  const nuevaCuenta: AccountOwner = {
    tipo: 'Principal PS4',
    nombre: '',
    telefono: '',
    saldo: undefined,
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
  createEmailError.value = ''
  createEmailSuccess.value = ''
  isDragging.value = false
  dragCounter = 0
  showCreateEmail.value = true
}

const handleCreateEmail = async (): Promise<void> => {
  if (!juegoSeleccionado.value || !newEmail.value.correo || !newEmail.value.codigoMaster) {
    createEmailError.value = 'Por favor completa los campos obligatorios (correo y código master)'
    return
  }

  isCreatingEmail.value = true
  createEmailError.value = ''
  createEmailSuccess.value = ''

  try {
    const cuentasLimpias = newEmail.value.cuentas.map(cuenta => {
      const cuentaLimpia: AccountOwner = {
        tipo: cuenta.tipo,
        nombre: cuenta.nombre,
        telefono: cuenta.telefono
      }
      if (cuenta.saldo !== undefined && cuenta.saldo !== null && !isNaN(cuenta.saldo)) {
        cuentaLimpia.saldo = cuenta.saldo
      }
      if (cuenta.hasStock) {
        cuentaLimpia.hasStock = true
      }
      return cuentaLimpia
    })

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
      'PS4 & PS5',
      juegoSeleccionado.value.id,
      newEmail.value.correo,
      emailData
    )

    createEmailSuccess.value = 'Correo agregado exitosamente'
    // El cache ya se limpia automáticamente en crearCorreoJuego
    await verCorreosJuego(juegoSeleccionado.value)

    setTimeout(() => {
      showCreateEmail.value = false
      createEmailSuccess.value = ''
    }, 1500)
  } catch (error) {
    console.error('Error creando correo:', error)
    createEmailError.value = 'Error al crear el correo'
  } finally {
    isCreatingEmail.value = false
  }
}

const iniciarEdicionEmail = (email: GameEmailAccount): void => {
  editingEmail.value = email
  editEmailData.value = {
    nombre: email.nombre,
    costo: email.costo,
    version: email.version,
    codigoMaster: email.codigoMaster,
    codigosGenerados: [...email.codigosGenerados],
    fecha: email.fecha,
    codigo: email.codigo,
    cuentas: JSON.parse(JSON.stringify(email.cuentas)),
    saldo: email.saldo
  }
  editEmailError.value = ''
  editEmailSuccess.value = ''
  showEditEmail.value = true
}

const handleEditEmail = async (): Promise<void> => {
  if (!editingEmail.value || !juegoSeleccionado.value) return

  isEditingEmail.value = true
  editEmailError.value = ''
  editEmailSuccess.value = ''

  try {
    const cuentasLimpias = editEmailData.value.cuentas.map(cuenta => {
      const cuentaLimpia: AccountOwner = {
        tipo: cuenta.tipo,
        nombre: cuenta.nombre,
        telefono: cuenta.telefono
      }
      if (cuenta.saldo !== undefined && cuenta.saldo !== null && !isNaN(cuenta.saldo)) {
        cuentaLimpia.saldo = cuenta.saldo
      }
      if (cuenta.hasStock) {
        cuentaLimpia.hasStock = true
      }
      return cuentaLimpia
    })

    const saldoCorreo = editEmailData.value.saldo !== undefined && editEmailData.value.saldo !== null && !isNaN(editEmailData.value.saldo)
      ? editEmailData.value.saldo
      : undefined

    await actualizarCorreoJuego(
      'PS4 & PS5',
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

    editEmailSuccess.value = 'Correo actualizado exitosamente'
    // El cache ya se limpia automáticamente en actualizarCorreoJuego
    await verCorreosJuego(juegoSeleccionado.value)

    setTimeout(() => {
      showEditEmail.value = false
      editEmailSuccess.value = ''
      editingEmail.value = null
    }, 1500)
  } catch (error) {
    console.error('Error actualizando correo:', error)
    editEmailError.value = 'Error al actualizar el correo'
  } finally {
    isEditingEmail.value = false
  }
}

const iniciarEliminacionCorreo = (email: GameEmailAccount): void => {
  deletingItem.value = { tipo: 'correo', data: email }
  deleteGameError.value = ''
  showDeleteConfirmGame.value = true
}

const iniciarEliminacionJuego = (juego: GameSummary): void => {
  deletingItem.value = { tipo: 'juego', data: juego }
  deleteGameError.value = ''
  showDeleteConfirmGame.value = true
}

const handleDeleteGame = async (): Promise<void> => {
  if (!deletingItem.value) return

  isDeletingGame.value = true
  deleteGameError.value = ''
  deleteGameSuccess.value = ''

  try {
    if (deletingItem.value.tipo === 'correo' && juegoSeleccionado.value) {
      await eliminarCorreoJuego(
        'PS4 & PS5',
        juegoSeleccionado.value.id,
        deletingItem.value.data.correo
      )
      deleteGameSuccess.value = 'Correo eliminado exitosamente'
      // El cache ya se limpia automáticamente en eliminarCorreoJuego
      await verCorreosJuego(juegoSeleccionado.value)
    } else if (deletingItem.value.tipo === 'juego') {
      await eliminarJuegoCompleto(
        'PS4 & PS5',
        deletingItem.value.data.id
      )
      deleteGameSuccess.value = 'Juego eliminado exitosamente'
      // El cache ya se limpia automáticamente en eliminarJuegoCompleto
      await cargarJuegosPorPlataforma()
    }

    showDeleteConfirmGame.value = false
    deletingItem.value = null

    setTimeout(() => {
      deleteGameSuccess.value = ''
    }, 3000)
  } catch (error) {
    console.error('Error eliminando:', error)
    deleteGameError.value = 'Error al eliminar'
  } finally {
    isDeletingGame.value = false
  }
}

const cancelarEliminacionGame = (): void => {
  showDeleteConfirmGame.value = false
  deletingItem.value = null
  deleteGameError.value = ''
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

// Funciones para Reportes
const cargarReportesConFiltros = async (): Promise<void> => {
  // Solo cargar todos los reportes sin filtros
  // Los filtros se aplican en memoria con el computed reportesFiltrados
  await cargarReportes({}, limiteReportes.value)
  
  console.log('📊 Reportes cargados:', reportes.value.length)
  console.log('🔍 Filtros activos:', filtrosActivos.value)
  console.log('📋 Reportes filtrados:', reportesFiltrados.value.length)
}

const limpiarFiltrosReportes = (): void => {
  filtroUsuarioReporte.value = ''
  filtroRolReporte.value = ''
  busquedaReporte.value = ''
  fechaInicio.value = ''
  fechaFin.value = ''
  // No es necesario llamar a cargarReportesConFiltros() porque los watchers lo harán
}

const aplicarFiltroRapido = (dias: number): void => {
  const hoy = new Date()
  const inicio = new Date()
  inicio.setDate(hoy.getDate() - dias)
  
  fechaInicio.value = inicio.toISOString().split('T')[0] as string
  fechaFin.value = hoy.toISOString().split('T')[0] as string
  // No es necesario llamar a cargarReportesConFiltros() porque los watchers lo harán
}

const formatearFechaReporte = (fecha: Date): string => {
  return new Intl.DateTimeFormat('es-ES', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(fecha)
}

const reportesFiltrados = computed(() => {
  let resultado = reportes.value
  
  // Filtrar por usuario
  if (filtroUsuarioReporte.value) {
    resultado = resultado.filter(r => r.uid === filtroUsuarioReporte.value)
  }
  
  // Filtrar por rol
  if (filtroRolReporte.value) {
    resultado = resultado.filter(r => r.rol === filtroRolReporte.value)
  }
  
  // Filtrar por búsqueda
  if (busquedaReporte.value && busquedaReporte.value.trim()) {
    const busqueda = busquedaReporte.value.toLowerCase().trim()
    resultado = resultado.filter(r =>
      r.juegoNombre.toLowerCase().includes(busqueda) ||
      r.correoUtilizado.toLowerCase().includes(busqueda) ||
      (r.nombreUsuario && r.nombreUsuario.toLowerCase().includes(busqueda)) ||
      r.email.toLowerCase().includes(busqueda)
    )
  }
  
  // Filtrar por fecha inicio
  if (fechaInicio.value) {
    const fechaInicioDate = new Date(fechaInicio.value)
    fechaInicioDate.setHours(0, 0, 0, 0)
    resultado = resultado.filter(r => {
      const fechaReporte = new Date(r.fechaGeneracion)
      fechaReporte.setHours(0, 0, 0, 0)
      return fechaReporte >= fechaInicioDate
    })
  }
  
  // Filtrar por fecha fin
  if (fechaFin.value) {
    const fechaFinDate = new Date(fechaFin.value)
    fechaFinDate.setHours(23, 59, 59, 999)
    resultado = resultado.filter(r => {
      const fechaReporte = new Date(r.fechaGeneracion)
      return fechaReporte <= fechaFinDate
    })
  }
  
  return resultado
})

const estadisticasReportes = computed(() => {
  return obtenerEstadisticas()
})

// Computed para contar filtros activos
const filtrosActivos = computed(() => {
  let count = 0
  if (filtroUsuarioReporte.value) count++
  if (filtroRolReporte.value) count++
  if (busquedaReporte.value) count++
  if (fechaInicio.value) count++
  if (fechaFin.value) count++
  return count
})

const usuariosUnicos = computed(() => {
  const usuarios = new Map<string, { email: string; nombre: string; uid: string }>()
  reportes.value.forEach(r => {
    if (!usuarios.has(r.uid)) {
      usuarios.set(r.uid, {
        uid: r.uid,
        email: r.email,
        nombre: r.nombreUsuario || r.email
      })
    }
  })
  return Array.from(usuarios.values())
})

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
      'PS4 & PS5',
      newGameName.value.trim(),
      newGamePhoto.value.trim() || undefined,
      newGameTipoPromocion.value === 'oferta',
      newGameVersion.value
    )
    
    await actualizarJuego(
      'PS4 & PS5',
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
      'PS4 & PS5',
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

// Intervalo para actualizar automáticamente cada 10 minutos
let syncInterval: ReturnType<typeof setInterval> | null = null

const iniciarSincronizacionAutomatica = (): void => {
  // Limpiar intervalo anterior si existe
  if (syncInterval) {
    clearInterval(syncInterval)
  }
  
  // Sincronizar cada 10 minutos (600000 ms)
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

// Watcher para cargar juegos cuando se cambia al tab de juegos
watch(activeTab, async (newTab) => {
  if (newTab === 'games') {
    if (games.value.length === 0) {
      await cargarJuegosPorPlataforma()
    }
    // Iniciar sincronización automática cuando se entra al tab de juegos
    iniciarSincronizacionAutomatica()
  } else {
    // Detener sincronización automática cuando se sale del tab de juegos
    detenerSincronizacionAutomatica()
  }
  
  // Cargar reportes cuando se entra al tab de reportes
  if (newTab === 'reportes') {
    await cargarReportesConFiltros()
  }
})

// Los filtros ahora son reactivos automáticamente a través del computed reportesFiltrados
// No necesitamos watchers porque Vue detecta los cambios automáticamente

// Watcher para sincronizar cuando cambia la plataforma
watch(plataformaSeleccionada, async () => {
  if (activeTab.value === 'games') {
    await cargarJuegosPorPlataforma()
  }
})

// Cargar juegos al montar si estamos en el tab de juegos
onMounted(async () => {
  await loadUserData()
  await loadEmployees()
  
  // Si hay un juego para abrir desde el state del router
  const openGame = window.history.state?.openGame as GameSummary | undefined
  
  if (openGame) {
    activeTab.value = 'games'
    plataformaSeleccionada.value = 'PS4 & PS5'
    await cargarJuegos('PS4 & PS5')
    setTimeout(() => {
      const juego = games.value.find(g => g.id === openGame.id)
      if (juego) {
        verCorreosJuego(juego)
      }
    }, 100)
  } else if (activeTab.value === 'games') {
    await cargarJuegosPorPlataforma()
    iniciarSincronizacionAutomatica()
  }
})

// Limpiar intervalos al desmontar el componente
onBeforeUnmount(() => {
  detenerSincronizacionAutomatica()
})
</script>

<template>
  <div class="min-h-screen bg-base-200">
    <!-- Navbar -->
    <div class="navbar bg-base-100 shadow-lg border-b border-white/10">
      <div class="flex-1">
        <a class="btn btn-ghost text-xl font-bold">
          <BarChart3 :size="24" class="text-primary" />
          Panel de Administración
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
              <div class="bg-primary text-primary-content rounded-full w-8">
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
              <span class="text-xs">Administrador</span>
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
            @click="activeTab = 'users'" 
            :class="['tab gap-2 transition-all', activeTab === 'users' ? 'tab-active' : '']"
          >
            <Users :size="18" />
            Gestión de Usuarios
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
            Gestión de Juegos
          </button>
          <button 
            @click="activeTab = 'reportes'" 
            :class="['tab gap-2 transition-all', activeTab === 'reportes' ? 'tab-active' : '']"
          >
            <FileText :size="18" />
            Reportes
          </button>
        </div>
      </div>
    </div>

    <!-- Contenido por Tab -->
    <div class="container mx-auto p-6">
      <!-- Tab: Estadísticas -->
      <div v-if="activeTab === 'stats'">
        <StatsOverview 
          :read-only="false" 
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
                    <button 
                      @click="verDetallesJuego(resultado.juego.id)"
                      class="btn btn-sm btn-ghost mt-2"
                    >
                      Ver detalles del juego →
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

      <!-- Tab: Búsqueda por Correo -->
      <div v-if="activeTab === 'correo'">
        <div class="flex justify-between items-center mb-6">
          <div>
            <h1 class="text-3xl font-bold flex items-center gap-3">
              <Mail :size="32" class="text-primary" />
              Búsqueda por Correo
            </h1>
            <p class="text-base-content/60 mt-1">Busca juegos por dirección de correo electrónico</p>
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
                    type="email"
                    placeholder="Ej: zonagae.cu.4@gmail.com"
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
            <p class="text-base-content/60">No se encontraron juegos con ese correo electrónico</p>
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
                  <h3 class="card-title text-lg">
                    <Mail :size="20" class="text-primary" />
                    {{ resultado.correo.correo }}
                  </h3>
                  <p class="text-base-content/60 mt-1">
                    Código: {{ resultado.correo.codigo }}
                  </p>
                </div>
                <div class="badge badge-lg badge-primary">
                  {{ resultado.correo.cuentas.length }} cuenta{{ resultado.correo.cuentas.length !== 1 ? 's' : '' }}
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
                      @click="verDetallesJuego(resultado.juego.id)"
                      class="btn btn-sm btn-ghost mt-2"
                    >
                      Ver detalles del juego →
                    </button>
                  </div>
                </div>
                <div>
                  <h4 class="font-semibold mb-2">Información del Correo</h4>
                  <div class="space-y-1 text-sm">
                    <p><span class="font-medium">Correo:</span> <span class="font-mono text-xs">{{ resultado.correo.correo }}</span></p>
                    <p><span class="font-medium">Fecha:</span> {{ formatearFecha(resultado.correo.fecha) }}</p>
                    <p><span class="font-medium">Código:</span> {{ resultado.correo.codigo }}</p>
                    <p><span class="font-medium">Códigos generados:</span> {{ resultado.correo.codigosGenerados.length + 1 }}</p>
                    <p v-if="resultado.correo.saldo !== undefined">
                      <span class="font-medium">Saldo:</span> 
                      <span class="badge badge-success">{{ formatearPrecio(resultado.correo.saldo) }}</span>
                    </p>
                    <p v-if="contarStockCuentas(resultado.correo.cuentas) > 0">
                      <span class="badge badge-primary badge-sm">Stock: {{ contarStockCuentas(resultado.correo.cuentas) }}</span>
                    </p>
                  </div>
                </div>
              </div>

              <!-- Lista de cuentas -->
              <div v-if="resultado.correo.cuentas.length > 0" class="mt-4">
                <div class="divider"></div>
                <h4 class="font-semibold mb-2">Cuentas asociadas ({{ resultado.correo.cuentas.length }})</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div 
                    v-for="(cuenta, cuentaIndex) in resultado.correo.cuentas" 
                    :key="cuentaIndex"
                    class="card bg-base-200 shadow-sm"
                  >
                    <div class="card-body p-3">
                      <div class="flex justify-between items-start">
                        <div class="flex-1">
                          <p class="font-medium text-sm">{{ cuenta.nombre }}</p>
                          <p class="text-xs text-base-content/60 mt-1">
                            <Phone :size="12" class="inline mr-1" />
                            {{ cuenta.telefono }}
                          </p>
                          <div class="mt-1">
                            <span class="badge badge-xs" :class="{
                              'badge-primary': cuenta.tipo.includes('Principal'),
                              'badge-secondary': cuenta.tipo.includes('Secundaria')
                            }">
                              {{ cuenta.tipo }}
                            </span>
                            <span v-if="cuenta.hasStock" class="badge badge-xs badge-success ml-1">Stock</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab: Gestión de Juegos -->
      <div v-if="activeTab === 'games'">
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
                    v-model="telefonoBusquedaGames"
                    type="text"
                    placeholder="Buscar por teléfono..."
                    class="input input-bordered w-full max-w-xs pl-10"
                    @keyup.enter="buscarTelefonoGames"
                    autocomplete="off"
                  />
                  <Phone :size="18" class="absolute left-3 top-3 text-base-content/40" />
                </div>
                <button 
                  v-if="telefonoBusquedaGames && telefonoBusquedaGames.trim().length >= 3"
                  @click="buscarTelefonoGames" 
                  class="btn btn-sm btn-primary btn-block mt-1"
                  :disabled="isLoadingTelefonoGames"
                >
                  {{ isLoadingTelefonoGames ? 'Buscando...' : 'Buscar Teléfono' }}
                </button>
              </div>
              <div v-if="vistaActual === 'juegos' || vistaActual === 'correos'" class="form-control">
                <div class="relative">
                  <input
                    v-model="correoBusquedaGames"
                    type="email"
                    placeholder="Buscar por correo..."
                    class="input input-bordered w-full max-w-xs pl-10"
                    @keyup.enter="buscarCorreoGames"
                    autocomplete="off"
                  />
                  <Mail :size="18" class="absolute left-3 top-3 text-base-content/40" />
                </div>
                <button 
                  v-if="correoBusquedaGames && correoBusquedaGames.trim().length >= 3"
                  @click="buscarCorreoGames" 
                  class="btn btn-sm btn-primary btn-block mt-1"
                  :disabled="isLoadingCorreoGames"
                >
                  {{ isLoadingCorreoGames ? 'Buscando...' : 'Buscar Correo' }}
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
        </div>

        <!-- Mensajes -->
        <div v-if="createEmailSuccess || editEmailSuccess || deleteGameSuccess || editGameSuccess || createGameSuccess" class="alert alert-success mb-4">
          <span>{{ createEmailSuccess || editEmailSuccess || deleteGameSuccess || editGameSuccess || createGameSuccess }}</span>
        </div>

        <div v-if="deleteGameError || editGameError || createGameError || createEmailError || editEmailError" class="alert alert-error mb-4">
          <span>{{ deleteGameError || editGameError || createGameError || createEmailError || editEmailError }}</span>
        </div>

        <!-- Resultados de Búsqueda por Teléfono (en vista de juegos) -->
        <div v-if="vistaActual === 'juegos' && resultadosTelefonoGames.length > 0" class="card bg-base-100 shadow-xl mb-4">
          <div class="card-body">
            <div class="flex justify-between items-center mb-4">
              <h3 class="card-title text-lg flex items-center gap-2">
                <Phone :size="20" />
                Resultados de Búsqueda por Teléfono ({{ resultadosTelefonoGames.length }})
              </h3>
              <button @click="telefonoBusquedaGames = ''; resultadosTelefonoGames = []" class="btn btn-sm btn-ghost">
                ✕ Cerrar
              </button>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div v-for="(resultado, index) in resultadosTelefonoGames" :key="index" class="card bg-base-200 shadow">
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
        <div v-if="vistaActual === 'juegos' && resultadosCorreoGames.length > 0" class="card bg-base-100 shadow-xl mb-4">
          <div class="card-body">
            <div class="flex justify-between items-center mb-4">
              <h3 class="card-title text-lg flex items-center gap-2">
                <Mail :size="20" />
                Resultados de Búsqueda por Correo ({{ resultadosCorreoGames.length }})
              </h3>
              <button @click="correoBusquedaGames = ''; resultadosCorreoGames = []" class="btn btn-sm btn-ghost">
                ✕ Cerrar
              </button>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div v-for="(resultado, index) in resultadosCorreoGames" :key="index" class="card bg-base-200 shadow">
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
                        <span v-if="contarStockCuentasGame(resultado.correo.cuentas) > 0" class="badge badge-xs badge-primary">
                          Stock: {{ contarStockCuentasGame(resultado.correo.cuentas) }}
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
                      <span 
                        :class="['badge', validarCodigosDisponibles(email) ? 'badge-success' : 'badge-error']"
                        :title="`${email.codigosGenerados?.length || 0} códigos generados`"
                      >
                        {{ email.codigosGenerados?.length || 0 }} códigos
                      </span>
                    </td>
                    <td>
                      <span class="badge badge-info">{{ email.cuentas.length }}</span>
                    </td>
                    <td>
                      <span 
                        class="badge" 
                        :class="contarStockCuentasGame(email.cuentas) > 0 ? 'badge-primary' : 'badge-ghost'"
                      >
                        {{ contarStockCuentasGame(email.cuentas) }}
                      </span>
                    </td>
                    <td>{{ formatearFechaGame(email.fecha) }}</td>
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
                        <div v-if="email.version === 'PS4 & PS5'" class="dropdown dropdown-end">
                          <label
                            tabindex="0"
                            :class="['btn btn-sm gap-1', validarCodigosDisponibles(email) ? 'btn-success' : 'btn-disabled']"
                          >
                            <MessageCircle :size="14" />
                          </label>
                          <ul tabindex="0" class="dropdown-content z-100 menu p-2 shadow-lg bg-base-100 rounded-box w-48 border border-white/10 mt-2">
                            <li>
                              <a @click.prevent="abrirModalWhatsApp(email, 'PS4')" class="text-xs">
                                <span class="badge badge-primary badge-sm">PS4</span>
                                Mensaje PS4
                              </a>
                            </li>
                            <li>
                              <a @click.prevent="abrirModalWhatsApp(email, 'PS5')" class="text-xs">
                                <span class="badge badge-secondary badge-sm">PS5</span>
                                Mensaje PS5
                              </a>
                            </li>
                          </ul>
                        </div>
                        <button
                          v-else
                          type="button"
                          :class="['btn btn-sm gap-1', validarCodigosDisponibles(email) ? 'btn-success' : 'btn-disabled']"
                          :disabled="!validarCodigosDisponibles(email) || isGenerating"
                          @click.stop="abrirModalWhatsApp(email)"
                          :title="validarCodigosDisponibles(email) ? 'Generar mensaje WhatsApp' : 'Necesitas al menos 2 códigos'"
                        >
                          <MessageCircle :size="14" />
                        </button>
                        
                        <button
                          v-if="isAdmin"
                          class="btn btn-sm btn-primary"
                          @click="iniciarEdicionEmail(email)"
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

      <!-- Tab: Gestión de Usuarios -->
      <div v-if="activeTab === 'users'">
        <div class="flex justify-between items-center mb-6">
          <div>
            <h1 class="text-3xl font-bold">Gestión de Usuarios</h1>
            <p class="text-base-content/60 mt-1">Administra los usuarios del sistema</p>
          </div>
          <button class="btn btn-primary gap-2" @click="showCreateEmployee = true">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Crear Usuario
          </button>
        </div>

      <!-- Mensaje de éxito de creación -->
      <div v-if="createSuccess" class="alert alert-success mb-4">
        <div class="flex-1">
          <span>{{ createSuccess }}</span>
        </div>
        <div class="flex gap-2">
          <button
            class="btn btn-sm btn-primary"
            @click="loadEmployees()"
          >
            Recargar Página
          </button>
          <button
            class="btn btn-sm btn-ghost"
            @click="createSuccess = ''"
          >
            ✕
          </button>
        </div>
      </div>

      <!-- Mensaje de éxito de actualización de rol -->
      <div v-if="roleUpdateSuccess" class="alert alert-success mb-4">
        <div class="flex-1">
          <span>{{ roleUpdateSuccess }}</span>
        </div>
      </div>

      <!-- Mensaje de error de actualización de rol -->
      <div v-if="roleUpdateError" class="alert alert-error mb-4">
        <div class="flex-1">
          <span>{{ roleUpdateError }}</span>
        </div>
      </div>

      <!-- Mensaje de éxito de edición -->
      <div v-if="editSuccess" class="alert alert-success mb-4">
        <div class="flex-1">
          <span>{{ editSuccess }}</span>
        </div>
      </div>

      <!-- Mensaje de éxito de eliminación -->
      <div v-if="deleteSuccess" class="alert alert-success mb-4">
        <div class="flex-1">
          <span>{{ deleteSuccess }}</span>
        </div>
      </div>

      <!-- Mensaje de error de eliminación -->
      <div v-if="deleteError" class="alert alert-error mb-4">
        <div class="flex-1">
          <span>{{ deleteError }}</span>
        </div>
      </div>

      <!-- Lista de usuarios -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title">Usuarios del Sistema</h2>
          
          <div v-if="isLoadingEmployees" class="flex justify-center p-8">
            <span class="loading loading-spinner loading-lg"></span>
          </div>

          <div v-else-if="employees.length === 0" class="text-center p-8">
            <p class="text-gray-500">No hay usuarios registrados</p>
          </div>

          <div v-else class="overflow-x-auto">
            <table class="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Nombre</th>
                  <th>Email</th>
                  <th>Tipo</th>
                  <th>Fecha de Creación</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(employee, index) in employees" :key="employee.uid">
                  <td>{{ index + 1 }}</td>
                  <td>{{ employee.displayName || 'Sin nombre' }}</td>
                  <td>
                    {{ employee.email }}
                    <span 
                      v-if="employee.uid === currentUserData?.uid" 
                      class="badge badge-sm badge-outline ml-2"
                    >
                      Tú
                    </span>
                  </td>
                  <td>
                    <select 
                      :value="employee.role"
                      @change="(e) => handleRoleChange(employee.uid, (e.target as HTMLSelectElement).value as UserRole)"
                      class="select select-bordered select-sm w-full max-w-xs"
                      :disabled="updatingRoleUserId === employee.uid || employee.uid === currentUserData?.uid"
                    >
                      <option value="employee">Empleado</option>
                      <option value="admin">Administrador</option>
                    </select>
                    <span v-if="updatingRoleUserId === employee.uid" class="loading loading-spinner loading-sm ml-2"></span>
                  </td>
                  <td>{{ formatearFecha(employee.createdAt) }}</td>
                  <td>
                    <div class="flex gap-2">
                      <button
                        class="btn btn-sm btn-primary"
                        @click="iniciarEdicion(employee)"
                        :disabled="updatingRoleUserId === employee.uid"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Editar
                      </button>
                      <button
                        class="btn btn-sm btn-error"
                        @click="iniciarEliminacion(employee)"
                        :disabled="updatingRoleUserId === employee.uid || employee.uid === currentUserData?.uid"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Borrar
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

    <!-- Modal para crear usuario -->
    <dialog :class="['modal', { 'modal-open': showCreateEmployee }]">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">Crear Nuevo Usuario</h3>
        
        <form @submit.prevent="handleCreateEmployee" class="space-y-4">
          <div class="form-control">
            <label class="label">
              <span class="label-text">Nombre</span>
            </label>
            <input
              v-model="newEmployeeName"
              type="text"
              placeholder="Nombre del empleado"
              class="input input-bordered"
            />
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text">Email</span>
            </label>
            <input
              v-model="newEmployeeEmail"
              type="email"
              placeholder="empleado@email.com"
              class="input input-bordered"
              required
            />
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text">Contraseña</span>
            </label>
            <input
              v-model="newEmployeePassword"
              type="password"
              placeholder="••••••••"
              class="input input-bordered"
              required
            />
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text">Rol</span>
            </label>
            <select v-model="newEmployeeRole" class="select select-bordered">
              <option value="employee">Empleado</option>
              <option value="admin">Administrador</option>
            </select>
            <label class="label">
              <span class="label-text-alt text-xs">
                Los administradores tienen acceso completo al sistema
              </span>
            </label>
          </div>

          <div v-if="createError" class="alert alert-error">
            <span>{{ createError }}</span>
          </div>

          <div class="modal-action">
            <button
              type="button"
              class="btn"
              @click="showCreateEmployee = false"
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
              {{ isCreating ? 'Creando...' : 'Crear Usuario' }}
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="showCreateEmployee = false">close</button>
      </form>
    </dialog>

    <!-- Modal para editar usuario -->
    <dialog :class="['modal', { 'modal-open': showEditEmployee }]">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">Editar Usuario</h3>
        
        <form @submit.prevent="handleEditEmployee" class="space-y-4">
          <div class="form-control">
            <label class="label">
              <span class="label-text">Nombre</span>
            </label>
            <input
              v-model="editEmployeeName"
              type="text"
              placeholder="Nombre del empleado"
              class="input input-bordered"
            />
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text">Email</span>
            </label>
            <input
              v-model="editEmployeeEmail"
              type="email"
              placeholder="empleado@email.com"
              class="input input-bordered"
              required
              disabled
            />
            <label class="label">
              <span class="label-text-alt text-xs text-warning">
                El email no se puede modificar desde esta interfaz
              </span>
            </label>
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
              @click="showEditEmployee = false"
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
        <button @click="showEditEmployee = false">close</button>
      </form>
    </dialog>

    <!-- Modal de confirmación para eliminar usuario -->
    <dialog :class="['modal', { 'modal-open': showDeleteConfirm }]">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">Confirmar Eliminación</h3>
        
        <div class="py-4">
          <p class="text-base mb-4">
            ¿Estás seguro de que deseas eliminar al usuario?
          </p>
          
          <div v-if="deletingEmployee" class="bg-base-200 p-4 rounded-lg">
            <p class="font-semibold">{{ deletingEmployee.displayName || 'Sin nombre' }}</p>
            <p class="text-sm text-gray-500">{{ deletingEmployee.email }}</p>
            <p class="text-sm">
              <span class="badge badge-sm" :class="deletingEmployee.role === 'admin' ? 'badge-error' : 'badge-info'">
                {{ deletingEmployee.role === 'admin' ? 'Administrador' : 'Empleado' }}
              </span>
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
            @click="handleDeleteEmployee"
            :disabled="isDeleting"
          >
            <span v-if="isDeleting" class="loading loading-spinner"></span>
            {{ isDeleting ? 'Eliminando...' : 'Eliminar Usuario' }}
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="cancelarEliminacion">close</button>
      </form>
    </dialog>

    <!-- Modales de Gestión de Juegos -->
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

          <div v-if="createEmailError" class="alert alert-error">
            <span>{{ createEmailError }}</span>
          </div>

          <div v-if="createEmailSuccess" class="alert alert-success">
            <span>{{ createEmailSuccess }}</span>
          </div>

          <div class="modal-action">
            <button
              type="button"
              class="btn"
              @click="showCreateEmail = false"
              :disabled="isCreatingEmail"
            >
              Cancelar
            </button>
            <button
              type="submit"
              class="btn btn-primary"
              :disabled="isCreatingEmail"
            >
              <span v-if="isCreatingEmail" class="loading loading-spinner"></span>
              {{ isCreatingEmail ? 'Creando...' : 'Agregar Correo' }}
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

          <div v-if="editEmailError" class="alert alert-error">
            <span>{{ editEmailError }}</span>
          </div>

          <div v-if="editEmailSuccess" class="alert alert-success">
            <span>{{ editEmailSuccess }}</span>
          </div>

          <div class="modal-action">
            <button
              type="button"
              class="btn"
              @click="showEditEmail = false"
              :disabled="isEditingEmail"
            >
              Cancelar
            </button>
            <button
              type="submit"
              class="btn btn-primary"
              :disabled="isEditingEmail"
            >
              <span v-if="isEditingEmail" class="loading loading-spinner"></span>
              {{ isEditingEmail ? 'Guardando...' : 'Guardar Cambios' }}
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="showEditEmail = false">close</button>
      </form>
    </dialog>

    <!-- Modal de confirmación de eliminación (juegos/correos) -->
    <dialog :class="['modal', { 'modal-open': showDeleteConfirmGame && deletingItem }]">
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

          <div v-if="deleteGameError" class="alert alert-error mt-4">
            <span>{{ deleteGameError }}</span>
          </div>
        </div>

        <div class="modal-action">
          <button
            type="button"
            class="btn"
            @click="cancelarEliminacionGame"
            :disabled="isDeletingGame"
          >
            Cancelar
          </button>
          <button
            type="button"
            class="btn btn-error"
            @click="handleDeleteGame"
            :disabled="isDeletingGame"
          >
            <span v-if="isDeletingGame" class="loading loading-spinner"></span>
            {{ isDeletingGame ? 'Eliminando...' : 'Eliminar' }}
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="cancelarEliminacionGame">close</button>
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
                  <p>{{ formatearFechaGame(selectedEmailDetails.fecha) }}</p>
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

    <!-- Tab: Reportes -->
    <div v-if="activeTab === 'reportes'">
      <div class="flex justify-between items-center mb-6">
        <div>
          <h1 class="text-3xl font-bold flex items-center gap-3">
            <FileText :size="32" class="text-primary" />
            Reportes de Mensajes WhatsApp
          </h1>
          <p class="text-base-content/60 mt-1">Historial de mensajes generados por usuarios</p>
        </div>
        <button @click="cargarReportesConFiltros" class="btn btn-primary gap-2" :disabled="isLoadingReportes">
          <RefreshCw :size="18" :class="{ 'animate-spin': isLoadingReportes }" />
          Actualizar
        </button>
      </div>

      <!-- Estadísticas -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div class="stat bg-base-100 rounded-lg shadow">
          <div class="stat-title">Total Reportes</div>
          <div class="stat-value text-primary">{{ estadisticasReportes.totalReportes }}</div>
        </div>
        <div class="stat bg-base-100 rounded-lg shadow">
          <div class="stat-title">Mensajes PS4</div>
          <div class="stat-value text-info">{{ estadisticasReportes.porPlataforma.PS4 || 0 }}</div>
        </div>
        <div class="stat bg-base-100 rounded-lg shadow">
          <div class="stat-title">Mensajes PS5</div>
          <div class="stat-value text-secondary">{{ estadisticasReportes.porPlataforma.PS5 || 0 }}</div>
        </div>
        <div class="stat bg-base-100 rounded-lg shadow">
          <div class="stat-title">Por Admins</div>
          <div class="stat-value text-success">{{ estadisticasReportes.porRol.admin || 0 }}</div>
        </div>
      </div>

      <!-- Filtros Rápidos -->
      <div class="flex gap-2 mb-4 flex-wrap">
        <button @click="aplicarFiltroRapido(1)" class="btn btn-sm btn-outline">
          <Calendar :size="16" />
          Hoy
        </button>
        <button @click="aplicarFiltroRapido(7)" class="btn btn-sm btn-outline">
          <Calendar :size="16" />
          Últimos 7 días
        </button>
        <button @click="aplicarFiltroRapido(30)" class="btn btn-sm btn-outline">
          <Calendar :size="16" />
          Últimos 30 días
        </button>
        <button @click="aplicarFiltroRapido(90)" class="btn btn-sm btn-outline">
          <Calendar :size="16" />
          Últimos 3 meses
        </button>
        <div class="ml-auto">
          <button @click="mostrarGraficos = !mostrarGraficos" class="btn btn-sm btn-outline gap-2">
            <BarChart3 :size="16" />
            {{ mostrarGraficos ? 'Ocultar' : 'Mostrar' }} Gráficos
          </button>
        </div>
      </div>

      <!-- Gráficos -->
      <div v-if="mostrarGraficos && reportesFiltrados.length > 0" class="mb-6">
        <ReportesCharts :reportes="reportesFiltrados" />
      </div>

      <!-- Filtros Detallados -->
      <div class="card bg-base-100 shadow-xl mb-6">
        <div class="card-body">
          <div class="flex justify-between items-center mb-4">
            <h3 class="card-title text-lg">
              🔍 Filtros Detallados
              <span v-if="filtrosActivos > 0" class="badge badge-primary ml-2">
                {{ filtrosActivos }} activo{{ filtrosActivos > 1 ? 's' : '' }}
              </span>
            </h3>
            <div class="text-sm text-base-content/60">
              Filtros dinámicos - Se actualizan automáticamente
            </div>
          </div>
          
          <!-- Primera fila -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <div class="form-control">
              <label class="label">
                <span class="label-text font-semibold">📅 Fecha Inicio</span>
              </label>
              <input
                v-model="fechaInicio"
                type="date"
                class="input input-bordered"
              />
            </div>
            <div class="form-control">
              <label class="label">
                <span class="label-text font-semibold">📅 Fecha Fin</span>
              </label>
              <input
                v-model="fechaFin"
                type="date"
                class="input input-bordered"
              />
            </div>
            <div class="form-control">
              <label class="label">
                <span class="label-text font-semibold">👤 Usuario</span>
              </label>
              <select v-model="filtroUsuarioReporte" class="select select-bordered">
                <option value="">Todos los usuarios</option>
                <option v-for="usuario in usuariosUnicos" :key="usuario.uid" :value="usuario.uid">
                  {{ usuario.nombre }}
                </option>
              </select>
            </div>
          </div>

          <!-- Segunda fila -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div class="form-control">
              <label class="label">
                <span class="label-text font-semibold">🎭 Rol</span>
              </label>
              <select v-model="filtroRolReporte" class="select select-bordered">
                <option value="">Todos los roles</option>
                <option value="admin">Admin</option>
                <option value="employee">Empleado</option>
              </select>
            </div>
            <div class="form-control">
              <label class="label">
                <span class="label-text font-semibold">
                  🔎 Buscar
                  <span v-if="busquedaReporte && busquedaReporte.length > 0" class="badge badge-sm badge-primary ml-2">
                    Filtrando
                  </span>
                </span>
              </label>
              <input
                v-model="busquedaReporte"
                type="text"
                placeholder="Juego, correo, usuario..."
                class="input input-bordered"
              />
            </div>
            <div class="form-control">
              <label class="label">
                <span class="label-text opacity-0">Acciones</span>
              </label>
              <button @click="limpiarFiltrosReportes" class="btn btn-ghost btn-block">
                <RefreshCw :size="16" />
                Limpiar Filtros
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Tabla de Reportes -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <div v-if="isLoadingReportes" class="flex justify-center p-8">
            <span class="loading loading-spinner loading-lg"></span>
          </div>

          <div v-else-if="reportesFiltrados.length === 0" class="text-center p-8">
            <FileText :size="48" class="mx-auto text-base-content/30 mb-4" />
            <p class="text-base-content/60">No hay reportes disponibles</p>
          </div>

          <div v-else class="overflow-x-auto">
            <table class="table table-zebra">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Fecha</th>
                  <th>Usuario</th>
                  <th>Rol</th>
                  <th>Juego</th>
                  <th>Correo</th>
                  <th>Plataforma</th>
                  <th>Códigos Usados</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(reporte, index) in reportesFiltrados" :key="reporte.id">
                  <td>{{ index + 1 }}</td>
                  <td class="text-sm">{{ formatearFechaReporte(reporte.fechaGeneracion) }}</td>
                  <td>
                    <div class="font-medium">{{ reporte.nombreUsuario }}</div>
                    <div class="text-xs opacity-60">{{ reporte.email }}</div>
                  </td>
                  <td>
                    <span :class="['badge badge-sm', reporte.rol === 'admin' ? 'badge-primary' : 'badge-secondary']">
                      {{ reporte.rol === 'admin' ? 'Admin' : 'Empleado' }}
                    </span>
                  </td>
                  <td>
                    <div class="font-medium">{{ reporte.juegoNombre }}</div>
                    <div class="text-xs opacity-60">{{ reporte.plataforma }}</div>
                  </td>
                  <td class="font-mono text-xs">{{ reporte.correoUtilizado }}</td>
                  <td>
                    <span :class="['badge', reporte.plataformaMensaje === 'PS4' ? 'badge-info' : 'badge-secondary']">
                      {{ reporte.plataformaMensaje }}
                    </span>
                  </td>
                  <td>
                    <div class="flex flex-col gap-1">
                      <span class="badge badge-outline badge-sm">{{ reporte.codigosUsados.codigo1 }}</span>
                      <span class="badge badge-outline badge-sm">{{ reporte.codigosUsados.codigo2 }}</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-if="reportesFiltrados.length > 0" class="mt-4 text-sm text-base-content/60 text-center">
            Mostrando {{ reportesFiltrados.length }} reporte(s)
          </div>
        </div>
      </div>
    </div>

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

