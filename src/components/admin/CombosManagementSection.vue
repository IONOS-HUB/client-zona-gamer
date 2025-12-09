<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useCombos } from '@/composables/useCombos'
import { useWhatsAppMessages } from '@/composables/useWhatsAppMessages'
import { useRoles } from '@/composables/useRoles'
import { useReportes } from '@/composables/useReportes'
import { Package, Search, Phone, Mail, RefreshCw, MessageCircle, Plus, Edit } from 'lucide-vue-next'
import WhatsAppMessageModal from '@/components/ui/WhatsAppMessageModal.vue'
import DeleteConfirmModal from './modals/DeleteConfirmModal.vue'
import ComboFormModal from './modals/ComboFormModal.vue'
import ComboEmailFormModal from './modals/ComboEmailFormModal.vue'
import type { ComboSummary, ComboEmailAccount, ComboPlatform, TelefonoComboSearchResult, CorreoComboSearchResult } from '@/types/combo'
import type { AccountOwner } from '@/types/game'
import type { WhatsAppMessage } from '@/composables/useWhatsAppMessages'
import type { ComboFormData } from './modals/ComboFormModal.vue'
import type { ComboEmailFormData } from './modals/ComboEmailFormModal.vue'

const {
  combos,
  isLoadingCombos,
  isSyncingCombos,
  cargarCombos,
  sincronizarCombos,
  cargarCorreosCombo,
  crearCombo,
  actualizarCombo,
  crearCorreoCombo,
  actualizarCorreoCombo,
  eliminarCorreoCombo,
  eliminarComboCompleto,
  buscarPorTelefono,
  buscarPorCorreo,
  buscarCombos,
  generarIdCombo
} = useCombos()

const {
  validarCodigosDisponibles,
  validarStockDisponible,
  validarSlotsDisponibles,
  generarYEliminarCodigosCombo,
  copiarAlPortapapeles,
  isGenerating
} = useWhatsAppMessages()

const { currentUserData, isAdmin } = useRoles()
const { crearReporte } = useReportes()

// Estados principales
const plataformaSeleccionada = ref<ComboPlatform>('PS4 & PS5')
const searchTerm = ref('')
const vistaActual = ref<'combos' | 'correos'>('combos')
const comboSeleccionado = ref<ComboSummary | null>(null)
const correosCombo = ref<ComboEmailAccount[]>([])
const isLoadingCorreos = ref(false)
const searchTermCorreos = ref('')

// Estados para búsquedas
const telefonoBusqueda = ref('')
const resultadosTelefono = ref<TelefonoComboSearchResult[]>([])
const isLoadingTelefono = ref(false)

const correoBusqueda = ref('')
const resultadosCorreo = ref<CorreoComboSearchResult[]>([])
const isLoadingCorreo = ref(false)

// Estados para filtros
const sortBy = ref<'nombre' | 'costo' | 'correos' | 'stock'>('nombre')
const sortOrder = ref<'asc' | 'desc'>('asc')
const stockFiltro = ref<'todas' | 'con' | 'sin'>('todas')
const promoFiltro = ref<'todas' | 'oferta' | 'promocion' | 'ninguna'>('todas')

// Estados para modales y acciones
const showWhatsAppModal = ref(false)
const mensajeWhatsApp = ref<WhatsAppMessage | null>(null)
const showEmailDetails = ref(false)
const selectedEmailDetails = ref<ComboEmailAccount | null>(null)
const showGenerarMensajeDialog = ref(false)
const correoSeleccionadoParaMensaje = ref<ComboEmailAccount | null>(null)

// Estados para eliminar
const showDeleteConfirm = ref(false)
const deletingItem = ref<{ tipo: 'combo' | 'correo', data: any } | null>(null)
const isDeletingItem = ref(false)
const deleteError = ref('')
const deleteSuccess = ref('')

// Mensajes de éxito/error generales
const successMessage = ref('')
const errorMessage = ref('')

// Estados para modal de combo
const showComboForm = ref(false)
const editingCombo = ref<ComboSummary | null>(null)
const isSavingCombo = ref(false)
const comboFormError = ref('')

// Estados para modal de correo
const showEmailForm = ref(false)
const editingEmail = ref<ComboEmailAccount | null>(null)
const isSavingEmail = ref(false)
const emailFormError = ref('')

// Computed para combos filtrados
const combosFiltrados = computed(() => {
  let resultado = combos.value.filter(combo => {
    // Filtro por plataforma según el campo version del combo
    // Todos los combos están en combos/PS4 & PS5/combos/, pero cada uno tiene su campo version
    if (plataformaSeleccionada.value === 'PS4 & PS5') {
      // Mostrar todos los combos sin filtrar por versión
      return true
    } else if (plataformaSeleccionada.value === 'PS4') {
      // Mostrar solo combos que tienen version === 'PS4' o version === 'PS4 & PS5'
      return combo.version === 'PS4' || combo.version === 'PS4 & PS5'
    } else if (plataformaSeleccionada.value === 'PS5') {
      // Mostrar solo combos que tienen version === 'PS5' o version === 'PS4 & PS5'
      return combo.version === 'PS5' || combo.version === 'PS4 & PS5'
    }
    return true
  })

  if (searchTerm.value) {
    const resultadosBusqueda = buscarCombos(searchTerm.value)
    resultado = resultado.filter(combo => resultadosBusqueda.some(c => c.id === combo.id))
  }

  if (promoFiltro.value !== 'todas') {
    resultado = resultado.filter(combo => {
      if (promoFiltro.value === 'oferta') {
        return combo.tipoPromocion === 'oferta' || combo.isOffert
      } else if (promoFiltro.value === 'promocion') {
        return combo.tipoPromocion === 'promocion'
      } else if (promoFiltro.value === 'ninguna') {
        return combo.tipoPromocion === 'ninguna' || (!combo.tipoPromocion && !combo.isOffert)
      }
      return true
    })
  }

  if (stockFiltro.value !== 'todas') {
    resultado = resultado.filter(combo => {
      const stock = combo.stockAccounts ?? 0
      return stockFiltro.value === 'con' ? stock > 0 : stock === 0
    })
  }

  resultado.sort((a, b) => {
    let compareValue = 0
    switch (sortBy.value) {
      case 'nombre':
        compareValue = a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })
        break
      case 'costo':
        compareValue = (a.costo || 0) - (b.costo || 0)
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

  return resultado
})

const correosFiltrados = computed(() => {
  if (!searchTermCorreos.value) return correosCombo.value
  
  const termino = searchTermCorreos.value.toLowerCase()
  return correosCombo.value.filter(correo =>
    correo.correo.toLowerCase().includes(termino) ||
    correo.codigo.toLowerCase().includes(termino) ||
    correo.nombre.toLowerCase().includes(termino) ||
    correo.codigosGenerados.some(c => c.toLowerCase().includes(termino)) ||
    correo.cuentas.some(c => 
      c.nombre.toLowerCase().includes(termino) || 
      c.telefono.toLowerCase().includes(termino)
    )
  )
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
    successMessage.value = 'Combos sincronizados exitosamente'
    setTimeout(() => { successMessage.value = '' }, 3000)
  } catch (error) {
    errorMessage.value = 'Error al sincronizar combos'
    setTimeout(() => { errorMessage.value = '' }, 3000)
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
  searchTermCorreos.value = ''
  correoBusqueda.value = ''
  resultadosCorreo.value = []
}

const verDetallesCorreo = (email: ComboEmailAccount): void => {
  selectedEmailDetails.value = email
  showEmailDetails.value = true
}

const cerrarDetalles = (): void => {
  showEmailDetails.value = false
  selectedEmailDetails.value = null
}

// WhatsApp
const abrirModalWhatsApp = async (correo: ComboEmailAccount, version?: 'PS4' | 'PS5'): Promise<void> => {
  // Validar que el correo tenga códigos
  if (!correo || !correo.codigosGenerados || correo.codigosGenerados.length < 2) {
    alert('No hay suficientes códigos disponibles (se requieren al menos 2)')
    return
  }

  if (!validarCodigosDisponibles(correo)) {
    alert('No hay suficientes códigos disponibles (se requieren al menos 2)')
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

  if (!comboSeleccionado.value || !currentUserData.value?.uid || !currentUserData.value?.email) {
    alert('Error: Información incompleta')
    return
  }

  // Validar que el correo tenga código master
  if (!correo.codigoMaster || correo.codigoMaster.trim() === '') {
    alert('Error: El correo no tiene contraseña (código master) configurada')
    return
  }

  // Asegurar que selectedEmailDetails esté establecido para el modal
  if (!selectedEmailDetails.value || selectedEmailDetails.value.correo !== correo.correo) {
    selectedEmailDetails.value = correo
  }

  try {
    const comboId = generarIdCombo(comboSeleccionado.value.nombre)
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
      mensajeWhatsApp.value = mensaje
      showWhatsAppModal.value = true
      await verCorreosCombo(comboSeleccionado.value)
      
      // Actualizar selectedEmailDetails con los datos actualizados
      const correoActualizado = correosCombo.value.find(c => c.correo === correo.correo)
      if (correoActualizado) {
        selectedEmailDetails.value = correoActualizado
      }
    } else {
      alert('No se pudo generar el mensaje. Por favor, verifica que haya códigos disponibles y que el correo tenga contraseña configurada.')
    }
  } catch (error) {
    console.error('Error generando mensaje:', error)
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

// Abrir dialog para seleccionar plataforma y generar mensaje
const abrirDialogGenerarMensaje = (correo: ComboEmailAccount): void => {
  if (!validarCodigosDisponibles(correo)) {
    alert('No hay suficientes códigos disponibles (se requieren al menos 2)')
    return
  }

  if (!validarStockDisponible(correo)) {
    alert('No hay cuentas con stock disponible. No se puede generar el mensaje.')
    return
  }
  
  if (!validarSlotsDisponibles(correo)) {
    alert('No se puede generar el mensaje: Ya están ocupados los 4 slots de cuenta (Principal PS4, Secundaria PS4, Principal PS5, Secundaria PS5)')
    return
  }
  
  correoSeleccionadoParaMensaje.value = correo
  showGenerarMensajeDialog.value = true
}

const cerrarDialogGenerarMensaje = (): void => {
  showGenerarMensajeDialog.value = false
  correoSeleccionadoParaMensaje.value = null
}

const generarMensajeDesdeDialog = async (version?: 'PS4' | 'PS5'): Promise<void> => {
  if (!correoSeleccionadoParaMensaje.value) {
    alert('Error: No hay correo seleccionado')
    return
  }
  
  // Guardar el correo completo antes de cerrar el dialog
  const correoParaMensaje: ComboEmailAccount = {
    ...correoSeleccionadoParaMensaje.value,
    codigosGenerados: correoSeleccionadoParaMensaje.value.codigosGenerados || [],
    cuentas: correoSeleccionadoParaMensaje.value.cuentas || []
  }
  
  // Validar que el correo tenga códigos
  if (!correoParaMensaje.codigosGenerados || correoParaMensaje.codigosGenerados.length < 2) {
    alert('No hay suficientes códigos disponibles (se requieren al menos 2)')
    return
  }
  
  // Cerrar el dialog primero
  showGenerarMensajeDialog.value = false
  
  // Esperar un momento para que el dialog se cierre completamente
  await new Promise(resolve => setTimeout(resolve, 200))
  
  // Ahora generar el mensaje con el correo guardado
  await abrirModalWhatsApp(correoParaMensaje, version)
  
  // Limpiar después de generar
  correoSeleccionadoParaMensaje.value = null
}

// Guardar datos del cliente desde el modal
const handleGuardarCliente = async (datos: { nombre: string; telefono: string; tipoCuenta: import('@/types/game').AccountType }): Promise<void> => {
  if (!comboSeleccionado.value || !selectedEmailDetails.value || !currentUserData.value || !mensajeWhatsApp.value) {
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
        codigo1: mensajeWhatsApp.value.codigoVerificacion1,
        codigo2: mensajeWhatsApp.value.codigoVerificacion2
      },
      mensajeWhatsApp.value.version,
      datos.nombre,
      datos.telefono,
      datos.tipoCuenta
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

    console.log('✅ Cliente guardado exitosamente en correo y reporte')
  } catch (error) {
    console.error('❌ Error guardando cliente:', error)
    alert('Error al guardar la información del cliente')
  }
}

// Búsquedas
const buscarTelefono = async (): Promise<void> => {
  if (!telefonoBusqueda.value || telefonoBusqueda.value.trim().length < 3) {
    resultadosTelefono.value = []
    return
  }

  isLoadingTelefono.value = true
  try {
    // Siempre buscar en 'PS4 & PS5' porque todos los combos están ahí
    resultadosTelefono.value = await buscarPorTelefono(telefonoBusqueda.value.trim(), 'PS4 & PS5')
  } catch (error) {
    console.error('Error buscando teléfono:', error)
  } finally {
    isLoadingTelefono.value = false
  }
}

const buscarCorreo = async (): Promise<void> => {
  if (!correoBusqueda.value || correoBusqueda.value.trim().length < 3) {
    resultadosCorreo.value = []
    return
  }

  isLoadingCorreo.value = true
  try {
    // Siempre buscar en 'PS4 & PS5' porque todos los combos están ahí
    resultadosCorreo.value = await buscarPorCorreo(correoBusqueda.value.trim(), 'PS4 & PS5')
  } catch (error) {
    console.error('Error buscando correo:', error)
  } finally {
    isLoadingCorreo.value = false
  }
}

// Eliminar
const iniciarEliminacion = (tipo: 'combo' | 'correo', data: any): void => {
  deletingItem.value = { tipo, data }
  deleteError.value = ''
  showDeleteConfirm.value = true
}

const handleDelete = async (): Promise<void> => {
  if (!deletingItem.value) return

  isDeletingItem.value = true
  deleteError.value = ''

  try {
    if (deletingItem.value.tipo === 'correo' && comboSeleccionado.value) {
      await eliminarCorreoCombo('PS4 & PS5', comboSeleccionado.value.id, deletingItem.value.data.correo)
      deleteSuccess.value = 'Correo eliminado exitosamente'
      await verCorreosCombo(comboSeleccionado.value)
    } else if (deletingItem.value.tipo === 'combo') {
      await eliminarComboCompleto('PS4 & PS5', deletingItem.value.data.id)
      deleteSuccess.value = 'Combo eliminado exitosamente'
      await cargarCombosPorPlataforma()
    }

    showDeleteConfirm.value = false
    deletingItem.value = null
    setTimeout(() => { deleteSuccess.value = '' }, 3000)
  } catch (error) {
    deleteError.value = 'Error al eliminar'
  } finally {
    isDeletingItem.value = false
  }
}

const cancelarEliminacion = (): void => {
  showDeleteConfirm.value = false
  deletingItem.value = null
  deleteError.value = ''
}

// Toggle activo/inactivo
const toggleActivoCombo = async (combo: ComboSummary): Promise<void> => {
  try {
    const nuevoEstado = !(combo.activo !== false) // Si no está definido o es true, cambiar a false
    await actualizarCombo('PS4 & PS5', combo.id, {
      activo: nuevoEstado
    })
    
    // Actualizar localmente
    combo.activo = nuevoEstado
    
    successMessage.value = `Combo ${nuevoEstado ? 'activado' : 'desactivado'} exitosamente`
    setTimeout(() => { successMessage.value = '' }, 3000)
  } catch (error) {
    console.error('Error cambiando estado del combo:', error)
    errorMessage.value = 'Error al cambiar el estado del combo'
    setTimeout(() => { errorMessage.value = '' }, 3000)
  }
}

// Funciones para modal de combo
const abrirModalCrearCombo = (): void => {
  editingCombo.value = null
  comboFormError.value = ''
  showComboForm.value = true
}

const abrirModalEditarCombo = (combo: ComboSummary): void => {
  editingCombo.value = combo
  comboFormError.value = ''
  showComboForm.value = true
}

const handleSaveCombo = async (data: ComboFormData): Promise<void> => {
  isSavingCombo.value = true
  comboFormError.value = ''

  try {
    if (editingCombo.value) {
      // Actualizar combo existente
      await actualizarCombo('PS4 & PS5', editingCombo.value.id, {
        nombre: data.nombre,
        foto: data.foto,
        version: data.version,
        tipoPromocion: data.tipoPromocion,
        precio: data.precio,
        juegos: data.juegos,
        juegoReferenciado: data.juegoReferenciado
      })
      successMessage.value = 'Combo actualizado exitosamente'
    } else {
      // Crear nuevo combo
      const isOffert = data.tipoPromocion === 'oferta'
      await crearCombo('PS4 & PS5', data.nombre, data.foto, isOffert, data.version, data.precio, data.juegos, data.juegoReferenciado)
      successMessage.value = 'Combo creado exitosamente'
    }
    
    showComboForm.value = false
    await cargarCombosPorPlataforma()
    setTimeout(() => { successMessage.value = '' }, 3000)
  } catch (error: any) {
    comboFormError.value = error?.message || 'Error al guardar el combo'
  } finally {
    isSavingCombo.value = false
  }
}

const cancelarComboForm = (): void => {
  showComboForm.value = false
  editingCombo.value = null
  comboFormError.value = ''
}

// Funciones para modal de correo
const abrirModalCrearCorreo = (): void => {
  if (!comboSeleccionado.value) return
  editingEmail.value = null
  emailFormError.value = ''
  showEmailForm.value = true
}

const abrirModalEditarCorreo = (email: ComboEmailAccount): void => {
  editingEmail.value = email
  emailFormError.value = ''
  showEmailForm.value = true
}

const handleSaveEmail = async (data: ComboEmailFormData): Promise<void> => {
  if (!comboSeleccionado.value) return

  isSavingEmail.value = true
  emailFormError.value = ''

  try {
    if (editingEmail.value) {
      // Actualizar correo existente
      await actualizarCorreoCombo('PS4 & PS5', comboSeleccionado.value.id, data.correo, {
        nombre: data.nombre,
        precio: data.precio,
        precios: data.precios,
        version: data.version,
        codigoMaster: data.codigoMaster,
        codigo: data.codigo,
        codigosGenerados: data.codigosGenerados,
        cuentas: data.cuentas,
        fecha: data.fecha || new Date(),
        saldo: data.saldo
      })
      successMessage.value = 'Correo actualizado exitosamente'
    } else {
      // Crear nuevo correo
      await crearCorreoCombo('PS4 & PS5', comboSeleccionado.value.id, data.correo, {
        nombre: data.nombre,
        precio: data.precio,
        precios: data.precios,
        version: data.version,
        codigoMaster: data.codigoMaster,
        codigo: data.codigo,
        codigosGenerados: data.codigosGenerados,
        cuentas: data.cuentas,
        fecha: data.fecha || new Date(),
        saldo: data.saldo
      })
      successMessage.value = 'Correo creado exitosamente'
    }
    
    showEmailForm.value = false
    await verCorreosCombo(comboSeleccionado.value)
    setTimeout(() => { successMessage.value = '' }, 3000)
  } catch (error: any) {
    emailFormError.value = error?.message || 'Error al guardar el correo'
  } finally {
    isSavingEmail.value = false
  }
}

const cancelarEmailForm = (): void => {
  showEmailForm.value = false
  editingEmail.value = null
  emailFormError.value = ''
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
    day: 'numeric'
  }).format(date)
}

const contarStockCuentas = (cuentas: AccountOwner[]): number => {
  if (!cuentas) return 0
  return cuentas.filter(c => c?.hasStock).length
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
  }, 10 * 60 * 1000) // 10 minutos
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
    <!-- Breadcrumb -->
    <div class="text-sm breadcrumbs mb-4">
      <ul>
        <li><a @click="volverACombos">{{ plataformaSeleccionada }}</a></li>
        <li v-if="vistaActual === 'correos'">{{ comboSeleccionado?.nombre }}</li>
      </ul>
    </div>

    <!-- Controles superiores -->
    <div class="space-y-4 mb-6">
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div class="flex items-center gap-4 flex-wrap flex-1">
          <select 
            v-model="plataformaSeleccionada" 
            class="select select-bordered"
            @change="cargarCombosPorPlataforma"
            :disabled="vistaActual === 'correos'"
          >
            <option value="PS4 & PS5">Todas (PS4 & PS5)</option>
            <option value="PS4">PS4</option>
            <option value="PS5">PS5</option>
          </select>

          <div v-if="vistaActual === 'combos'" class="form-control">
            <div class="relative">
              <input
                v-model="searchTerm"
                type="text"
                placeholder="Buscar combo..."
                class="input input-bordered w-full max-w-xs pl-10"
                autocomplete="off"
              />
              <Search :size="18" class="absolute left-3 top-3 text-base-content/40" />
            </div>
          </div>

          <div class="form-control">
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

          <div class="form-control">
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

      <!-- Filtros avanzados (solo en vista combos) -->
      <div v-if="vistaActual === 'combos'" class="card bg-base-100 shadow-lg">
        <div class="card-body p-4">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div class="form-control">
              <label class="label"><span class="label-text font-semibold text-sm">Promoción</span></label>
              <select v-model="promoFiltro" class="select select-bordered select-sm">
                <option value="todas">Todas</option>
                <option value="oferta">En Oferta</option>
                <option value="promocion">En Promoción</option>
                <option value="ninguna">Sin Promoción</option>
              </select>
            </div>

            <div class="form-control">
              <label class="label"><span class="label-text font-semibold text-sm">Stock</span></label>
              <select v-model="stockFiltro" class="select select-bordered select-sm">
                <option value="todas">Todos</option>
                <option value="con">Con stock</option>
                <option value="sin">Sin stock</option>
              </select>
            </div>

            <div class="form-control">
              <label class="label"><span class="label-text font-semibold text-sm">Ordenar Por</span></label>
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

            <div class="form-control">
              <label class="label"><span class="label-text font-semibold text-sm opacity-0">Acción</span></label>
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
    <div class="flex flex-wrap gap-2 mb-4">
      <button 
        v-if="vistaActual === 'combos' && isAdmin"
        class="btn btn-primary gap-2"
        @click="abrirModalCrearCombo"
      >
        <Plus :size="18" />
        Crear Combo
      </button>
      
      <button 
        v-if="vistaActual === 'correos' && isAdmin"
        class="btn btn-primary gap-2"
        @click="abrirModalCrearCorreo"
      >
        <Plus :size="18" />
        Agregar Correo
      </button>
      
      <button 
        v-if="vistaActual === 'combos'"
        class="btn btn-outline btn-primary gap-2"
        @click="handleSincronizar"
        :disabled="isSyncingCombos || isLoadingCombos"
      >
        <RefreshCw :size="18" :class="{ 'animate-spin': isSyncingCombos }" />
        {{ isSyncingCombos ? 'Sincronizando...' : 'Sincronizar' }}
      </button>
    </div>

    <!-- Mensajes -->
    <div v-if="successMessage || deleteSuccess" class="alert alert-success mb-4">
      <span>{{ successMessage || deleteSuccess }}</span>
    </div>
    <div v-if="errorMessage || deleteError" class="alert alert-error mb-4">
      <span>{{ errorMessage || deleteError }}</span>
    </div>

    <!-- Resultados de búsqueda por teléfono -->
    <div v-if="vistaActual === 'combos' && resultadosTelefono.length > 0" class="card bg-base-100 shadow-xl mb-4">
      <div class="card-body">
        <div class="flex justify-between items-center mb-4">
          <h3 class="card-title text-lg flex items-center gap-2">
            <Phone :size="20" />
            Resultados ({{ resultadosTelefono.length }})
          </h3>
          <button @click="telefonoBusqueda = ''; resultadosTelefono = []" class="btn btn-sm btn-ghost">✕</button>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div v-for="(resultado, index) in resultadosTelefono" :key="index" class="card bg-base-200">
            <div class="card-body p-3">
              <h4 class="font-semibold text-sm">{{ resultado.cuenta.nombre }}</h4>
              <p class="text-xs"><Phone :size="12" class="inline mr-1" />{{ resultado.cuenta.telefono }}</p>
              <button @click="verCorreosCombo(resultado.combo)" class="btn btn-xs btn-ghost mt-2 w-full">
                Ver correos →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Resultados de búsqueda por correo -->
    <div v-if="vistaActual === 'combos' && resultadosCorreo.length > 0" class="card bg-base-100 shadow-xl mb-4">
      <div class="card-body">
        <div class="flex justify-between items-center mb-4">
          <h3 class="card-title text-lg flex items-center gap-2">
            <Mail :size="20" />
            Resultados ({{ resultadosCorreo.length }})
          </h3>
          <button @click="correoBusqueda = ''; resultadosCorreo = []" class="btn btn-sm btn-ghost">✕</button>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div v-for="(resultado, index) in resultadosCorreo" :key="index" class="card bg-base-200">
            <div class="card-body p-3">
              <h4 class="font-semibold text-sm">{{ resultado.correo.correo }}</h4>
              <p class="text-xs">{{ resultado.combo.nombre }}</p>
              <button @click="verCorreosCombo(resultado.combo)" class="btn btn-xs btn-ghost mt-2 w-full">
                Ver correos →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Vista de Combos -->
    <div v-if="vistaActual === 'combos'" class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <div class="flex justify-between items-center mb-4">
          <h2 class="card-title">
            Combos de {{ plataformaSeleccionada }}
            <span class="badge badge-lg">{{ combosFiltrados.length }}</span>
          </h2>
        </div>

        <div v-if="isLoadingCombos" class="flex justify-center p-8">
          <span class="loading loading-spinner loading-lg"></span>
        </div>

        <div v-else-if="combosFiltrados.length === 0" class="text-center p-8">
          <p class="text-base-content/60">No hay combos registrados</p>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="table table-zebra">
            <thead>
              <tr>
                <th>#</th>
                <th>Estado</th>
                <th>Foto</th>
                <th>Nombre</th>
                <th>Precio</th>
                <th>Correos</th>
                <th>Stock</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(combo, index) in combosFiltrados" :key="combo.id">
                <td>{{ index + 1 }}</td>
                <td>
                  <div class="form-control">
                    <label class="label cursor-pointer flex-col gap-1">
                      <input 
                        type="checkbox" 
                        :checked="combo.activo !== false"
                        @change="toggleActivoCombo(combo)"
                        class="toggle toggle-success" 
                      />
                      <span class="label-text text-xs">
                        {{ combo.activo !== false ? 'Activo' : 'Inactivo' }}
                      </span>
                    </label>
                  </div>
                </td>
                <td>
                  <div class="avatar">
                    <div class="rounded overflow-hidden" style="width: 89px; height: 107px; aspect-ratio: 446 / 537;">
                      <img v-if="combo.foto" :src="combo.foto" :alt="combo.nombre" class="w-full h-full object-cover" style="width: 100%; height: 100%; object-fit: cover;" />
                      <div v-else class="bg-base-300 w-full h-full flex items-center justify-center" style="width: 100%; height: 100%;">
                        <Package :size="24" class="opacity-30" />
                      </div>
                    </div>
                  </div>
                </td>
                <td>
                  <div class="font-bold">{{ combo.nombre }}</div>
                </td>
                <td>
                  <div class="font-semibold text-lg">
                    {{ formatearPrecio(combo.precio || combo.costo || 0) }}
                  </div>
                  <div v-if="combo.juegos && combo.juegos.length > 0" class="text-xs text-base-content/60 mt-1">
                    {{ combo.juegos.length }} juego{{ combo.juegos.length !== 1 ? 's' : '' }}
                  </div>
                </td>
                <td><span class="badge badge-info">{{ combo.totalCorreos }}</span></td>
                <td>
                  <span class="badge" :class="(combo.stockAccounts || 0) > 0 ? 'badge-primary' : 'badge-ghost'">
                    {{ combo.stockAccounts || 0 }}
                  </span>
                </td>
                <td>
                  <div class="flex gap-2">
                    <button class="btn btn-sm btn-info" @click="verCorreosCombo(combo)">Ver Correos</button>
                    <button v-if="isAdmin" class="btn btn-sm btn-warning" @click="abrirModalEditarCombo(combo)">
                      <Edit :size="14" />
                    </button>
                    <button v-if="isAdmin" class="btn btn-sm btn-error" @click="iniciarEliminacion('combo', combo)">
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
        <div class="flex justify-between items-center mb-4">
          <h2 class="card-title">
            Correos de {{ comboSeleccionado?.nombre }}
            <span class="badge badge-lg">{{ correosFiltrados.length }}</span>
          </h2>
          <button class="btn btn-sm btn-ghost" @click="volverACombos">← Volver</button>
        </div>

        <!-- Buscador -->
        <div class="mb-4">
          <div class="relative">
            <input
              v-model="searchTermCorreos"
              type="text"
              placeholder="Buscar correos..."
              class="input input-bordered w-full pl-10"
            />
            <Search :size="18" class="absolute left-3 top-3 text-base-content/40" />
          </div>
        </div>

        <div v-if="isLoadingCorreos" class="flex justify-center p-8">
          <span class="loading loading-spinner loading-lg"></span>
        </div>

        <div v-else-if="correosCombo.length === 0" class="text-center p-8">
          <p class="text-base-content/60">No hay correos registrados</p>
        </div>

        <div v-else-if="correosFiltrados.length === 0" class="text-center p-8">
          <p class="text-base-content/60">No se encontraron correos que coincidan con la búsqueda</p>
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
                  <span :class="['badge', validarCodigosDisponibles(email) ? 'badge-success' : 'badge-error']">
                    {{ email.codigosGenerados?.length || 0 }} códigos
                  </span>
                </td>
                <td><span class="badge badge-info">{{ email.cuentas.length }}</span></td>
                <td>
                  <span class="badge" :class="contarStockCuentas(email.cuentas) > 0 ? 'badge-primary' : 'badge-ghost'">
                    {{ contarStockCuentas(email.cuentas) }}
                  </span>
                </td>
                <td>{{ formatearFecha(email.fecha) }}</td>
                <td>
                  <div class="flex gap-2">
                    <button class="btn btn-sm btn-info" @click="verDetallesCorreo(email)">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>
                    
                    <button
                      :class="['btn btn-sm gap-1', validarCodigosDisponibles(email) && validarStockDisponible(email) && validarSlotsDisponibles(email) ? 'btn-success' : 'btn-disabled']"
                      :disabled="!validarCodigosDisponibles(email) || !validarStockDisponible(email) || !validarSlotsDisponibles(email)"
                      @click.stop="abrirDialogGenerarMensaje(email)"
                      :title="!validarCodigosDisponibles(email) ? 'Se requieren al menos 2 códigos disponibles' : !validarStockDisponible(email) ? 'No hay stock disponible' : !validarSlotsDisponibles(email) ? 'Ya están ocupados los 4 slots de cuenta' : 'Generar mensaje WhatsApp'"
                    >
                      <MessageCircle :size="14" />
                      <span class="hidden md:inline">Mensaje</span>
                    </button>
                    
                    <button v-if="isAdmin" class="btn btn-sm btn-warning" @click="abrirModalEditarCorreo(email)">
                      <Edit :size="14" />
                    </button>
                    
                    <button v-if="isAdmin" class="btn btn-sm btn-error" @click="iniciarEliminacion('correo', email)">
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

    <!-- Modal de detalles del correo (simplificado) -->
    <dialog :class="['modal', { 'modal-open': showEmailDetails }]">
      <div class="modal-box max-w-4xl">
        <h3 class="font-bold text-lg mb-4">Detalles del Correo</h3>

        <div v-if="selectedEmailDetails" class="space-y-4">
          <div class="card bg-base-200">
            <div class="card-body">
              <h4 class="card-title text-sm">Información General</h4>
              <div class="grid grid-cols-2 gap-4">
                <div><span class="font-semibold">Correo:</span><p class="font-mono text-sm">{{ selectedEmailDetails.correo }}</p></div>
                <div><span class="font-semibold">Nombre:</span><p>{{ selectedEmailDetails.nombre }}</p></div>
                <div><span class="font-semibold">Costo:</span><p>{{ formatearPrecio(selectedEmailDetails.costo || 0) }}</p></div>
                <div><span class="font-semibold">Código:</span><p>{{ selectedEmailDetails.codigo }}</p></div>
              </div>
            </div>
          </div>

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

          <div class="card bg-base-200">
            <div class="card-body">
              <h4 class="card-title text-sm">Cuentas ({{ selectedEmailDetails.cuentas.length }})</h4>
              <div class="space-y-2">
                <div v-for="(cuenta, index) in selectedEmailDetails.cuentas" :key="index" class="flex items-center justify-between bg-base-300 p-3 rounded">
                  <div>
                    <span class="badge badge-sm" :class="cuenta.tipo.includes('Principal') ? 'badge-primary' : 'badge-secondary'">
                      {{ cuenta.tipo }}
                    </span>
                    <span class="font-medium ml-2">{{ cuenta.nombre }}</span>
                    <div class="text-xs opacity-70">{{ cuenta.telefono }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-action">
          <button class="btn btn-ghost" @click="cerrarDetalles">Cerrar</button>
          
          <!-- Botones para generar mensaje -->
          <div v-if="selectedEmailDetails && selectedEmailDetails.version === 'PS4 & PS5'" class="dropdown dropdown-top dropdown-end">
            <label
              tabindex="0"
              :class="[
                'btn gap-2',
                validarCodigosDisponibles(selectedEmailDetails) && validarStockDisponible(selectedEmailDetails) && validarSlotsDisponibles(selectedEmailDetails) && !isGenerating ? 'btn-success' : 'btn-disabled'
              ]"
              :title="!validarCodigosDisponibles(selectedEmailDetails) ? 'Se requieren al menos 2 códigos disponibles' : !validarStockDisponible(selectedEmailDetails) ? 'No hay stock disponible' : !validarSlotsDisponibles(selectedEmailDetails) ? 'Ya están ocupados los 4 slots de cuenta' : ''"
            >
              <MessageCircle :size="20" />
              Generar Mensaje
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
            v-else-if="selectedEmailDetails"
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
        <button @click="cerrarDetalles">close</button>
      </form>
    </dialog>

    <!-- Dialog para seleccionar plataforma y generar mensaje -->
    <dialog :class="['modal', { 'modal-open': showGenerarMensajeDialog }]">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4 flex items-center gap-2">
          <MessageCircle :size="24" class="text-success" />
          Generar Mensaje WhatsApp
        </h3>
        
        <div v-if="correoSeleccionadoParaMensaje" class="space-y-4">
          <div class="card bg-base-200">
            <div class="card-body p-4">
              <div class="space-y-2 text-sm">
                <div>
                  <span class="font-semibold">Correo:</span>
                  <p class="font-mono text-xs break-all">{{ correoSeleccionadoParaMensaje.correo }}</p>
                </div>
                <div>
                  <span class="font-semibold">Códigos disponibles:</span>
                  <span :class="['badge ml-2', validarCodigosDisponibles(correoSeleccionadoParaMensaje) ? 'badge-success' : 'badge-error']">
                    {{ correoSeleccionadoParaMensaje.codigosGenerados?.length || 0 }}
                  </span>
                </div>
                <div>
                  <span class="font-semibold">Plataforma:</span>
                  <span class="badge badge-primary ml-2">{{ correoSeleccionadoParaMensaje.version }}</span>
                </div>
              </div>
            </div>
          </div>

          <div v-if="correoSeleccionadoParaMensaje.version === 'PS4 & PS5'" class="space-y-3">
            <p class="font-semibold">Selecciona la plataforma para el mensaje:</p>
            <div class="grid grid-cols-2 gap-3">
              <button
                @click="generarMensajeDesdeDialog('PS4')"
                class="btn btn-primary gap-2"
                :disabled="isGenerating"
              >
                <MessageCircle :size="18" />
                Generar Mensaje PS4
              </button>
              <button
                @click="generarMensajeDesdeDialog('PS5')"
                class="btn btn-secondary gap-2"
                :disabled="isGenerating"
              >
                <MessageCircle :size="18" />
                Generar Mensaje PS5
              </button>
            </div>
          </div>
          <div v-else>
            <button
              @click="generarMensajeDesdeDialog()"
              class="btn btn-success w-full gap-2"
              :disabled="isGenerating"
            >
              <MessageCircle :size="18" />
              {{ isGenerating ? 'Generando...' : 'Generar Mensaje' }}
            </button>
          </div>
        </div>

        <div class="modal-action">
          <button @click="cerrarDialogGenerarMensaje" class="btn btn-ghost">Cancelar</button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="cerrarDialogGenerarMensaje">close</button>
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

    <!-- Modal de eliminar -->
    <DeleteConfirmModal
      :show="showDeleteConfirm"
      :item="deletingItem"
      :is-deleting="isDeletingItem"
      :error="deleteError"
      @confirm="handleDelete"
      @cancel="cancelarEliminacion"
    />

    <!-- Modal de crear/editar combo -->
    <ComboFormModal
      :show="showComboForm"
      :combo="editingCombo"
      :is-loading="isSavingCombo"
      :error="comboFormError"
      @confirm="handleSaveCombo"
      @cancel="cancelarComboForm"
    />

    <!-- Modal de crear/editar correo -->
    <ComboEmailFormModal
      v-if="comboSeleccionado"
      :show="showEmailForm"
      :email="editingEmail"
      :combo-name="comboSeleccionado.nombre"
      :combo-version="comboSeleccionado.version"
      :combo-precios="comboSeleccionado.precios"
      :is-loading="isSavingEmail"
      :error="emailFormError"
      @confirm="handleSaveEmail"
      @cancel="cancelarEmailForm"
    />
  </div>
</template>

