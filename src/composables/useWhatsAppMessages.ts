import { ref } from 'vue'
import { doc, updateDoc, arrayRemove } from 'firebase/firestore'
import { db } from '@/config/firebase'
import type { GameEmailAccount, GamePlatform } from '@/types/game'
import type { ComboEmailAccount, ComboPlatform } from '@/types/combo'
import { useReportes } from './useReportes'

// Tipo unificado para ambos tipos de cuentas de correo
type EmailAccount = GameEmailAccount | ComboEmailAccount

export interface WhatsAppMessage {
  correo: string
  password: string
  codigoVerificacion1: string
  codigoVerificacion2: string
  version: 'PS4' | 'PS5'
  mensajeCompleto: string
}

export function useWhatsAppMessages() {
  const isGenerating = ref(false)
  const error = ref<string | null>(null)
  const { crearReporte } = useReportes()

  /**
   * Genera el mensaje de WhatsApp según la plataforma
   */
  const generarMensaje = (
    correo: string,
    password: string,
    codigo1: string,
    codigo2: string,
    version: 'PS4' | 'PS5'
  ): string => {
    if (version === 'PS4') {
      return `PASOS PARA DESCARGAR JUEGO DE PS4

Por favor sigue los pasos del siguiente video de Tiktok, recuerda seguirnos y guardar nuestro número en tus contactos

https://vm.tiktok.com/ZMSN4qThS/

CORREO: ${correo}

CONTRASEÑA DEL CORREO: ${password}

CODIGO DE Verificacion: ${codigo1}

CODIGO DE Verficacion de Respaldo: ${codigo2}`
    } else {
      return `PASOS PARA BAJAR UN JUEGO DE PS5

Por favor sigue los pasos del siguiente video de Tiktok, recuerda seguirnos y guardar nuestro número en tus contactos

https://vm.tiktok.com/ZMBx8613x/

CORREO: ${correo}

CONTRASEÑA DEL CORREO: ${password}

CODIGO DE Verificacion: ${codigo1}

CODIGO DE Verficacion de Respaldo: ${codigo2}`
    }
  }

  /**
   * Valida que haya suficientes códigos disponibles
   */
  const validarCodigosDisponibles = (correo: EmailAccount | null | undefined): boolean => {
    if (!correo) {
      console.warn('⚠️ Validación de códigos: correo es null o undefined')
      return false
    }
    
    const hasCodigos = correo.codigosGenerados &&
      Array.isArray(correo.codigosGenerados) &&
      correo.codigosGenerados.length >= 2
    
    // Debug: Log para diagnóstico
    console.log('🔍 Validación de códigos:', {
      correo: correo.correo,
      tieneCodigos: !!correo.codigosGenerados,
      esArray: Array.isArray(correo.codigosGenerados),
      cantidad: correo.codigosGenerados?.length || 0,
      codigos: correo.codigosGenerados,
      esValido: hasCodigos
    })
    
    return hasCodigos
  }

  /**
   * Valida que haya stock disponible (cuentas disponibles)
   */
  const validarStockDisponible = (correo: EmailAccount | null | undefined): boolean => {
    if (!correo) {
      console.warn('⚠️ Validación de stock: correo es null o undefined')
      return false
    }
    
    const tieneStock = correo.cuentas &&
      Array.isArray(correo.cuentas) &&
      correo.cuentas.some(cuenta => cuenta?.hasStock === true)
    
    // Debug: Log para diagnóstico
    console.log('🔍 Validación de stock:', {
      correo: correo.correo,
      tieneCuentas: !!correo.cuentas,
      esArray: Array.isArray(correo.cuentas),
      cantidadCuentas: correo.cuentas?.length || 0,
      cuentasConStock: correo.cuentas?.filter(c => c?.hasStock === true).length || 0,
      tieneStock
    })
    
    return tieneStock
  }

  /**
   * Valida que no estén ocupados los 4 slots de cuenta
   * Los 4 tipos de cuenta son: Principal PS4, Secundaria PS4, Principal PS5, Secundaria PS5
   */
  const validarSlotsDisponibles = (correo: EmailAccount | null | undefined): boolean => {
    if (!correo) {
      console.warn('⚠️ Validación de slots: correo es null o undefined')
      return false
    }
    
    const cuentas = correo.cuentas || []
    const tiposCuenta: Array<'Principal PS4' | 'Secundaria PS4' | 'Principal PS5' | 'Secundaria PS5'> = [
      'Principal PS4',
      'Secundaria PS4',
      'Principal PS5',
      'Secundaria PS5'
    ]
    
    // Contar cuántos slots están ocupados
    const slotsOcupados = tiposCuenta.filter(tipo => 
      cuentas.some(cuenta => cuenta?.tipo === tipo)
    ).length
    
    const haySlotDisponible = slotsOcupados < 4
    
    // Debug: Log para diagnóstico
    console.log('🔍 Validación de slots:', {
      correo: correo.correo,
      totalCuentas: cuentas.length,
      slotsOcupados,
      slotsDisponibles: 4 - slotsOcupados,
      haySlotDisponible,
      tiposCuentasOcupadas: cuentas.map(c => c?.tipo)
    })
    
    return haySlotDisponible
  }

  /**
   * Obtiene los primeros dos códigos disponibles
   */
  const obtenerCodigosParaUsar = (correo: EmailAccount): [string, string] | null => {
    if (!validarCodigosDisponibles(correo) || !correo.codigosGenerados) {
      return null
    }
    const codigo1 = correo.codigosGenerados[0]
    const codigo2 = correo.codigosGenerados[1]
    if (!codigo1 || !codigo2) {
      return null
    }
    return [codigo1, codigo2]
  }

  /**
   * Obtiene la contraseña de la cuenta Secundaria PS4
   * Si no existe, usa el codigoMaster como fallback
   */
  const obtenerContraseñaSecundariaPS4 = (correo: EmailAccount): string | null => {
    if (!correo.cuentas || !Array.isArray(correo.cuentas)) {
      // Fallback al codigoMaster si no hay cuentas
      return correo.codigoMaster || null
    }

    // Buscar la cuenta Secundaria PS4
    const cuentaSecundariaPS4 = correo.cuentas.find(
      cuenta => cuenta?.tipo === 'Secundaria PS4'
    )

    // Si existe y tiene contraseña, usarla
    if (cuentaSecundariaPS4?.contraseña && cuentaSecundariaPS4.contraseña.trim() !== '') {
      return cuentaSecundariaPS4.contraseña
    }

    // Fallback al codigoMaster si no se encuentra la contraseña de Secundaria PS4
    return correo.codigoMaster || null
  }

  /**
   * Genera el mensaje completo de WhatsApp
   */
  const generarMensajeWhatsApp = (
    correo: EmailAccount
  ): WhatsAppMessage | null => {
    try {
      error.value = null

      // Validar que haya códigos disponibles
      if (!validarCodigosDisponibles(correo)) {
        error.value = 'No hay suficientes códigos disponibles (se requieren al menos 2)'
        return null
      }

      // Obtener la contraseña de la cuenta Secundaria PS4
      const password = obtenerContraseñaSecundariaPS4(correo)
      if (!password || password.trim() === '') {
        error.value = 'No hay contraseña disponible (se requiere contraseña de cuenta Secundaria PS4 o código master)'
        return null
      }

      // Obtener los códigos
      const codigos = obtenerCodigosParaUsar(correo)
      if (!codigos) {
        error.value = 'Error al obtener los códigos'
        return null
      }

      const [codigo1, codigo2] = codigos

      // Determinar la versión (PS4 o PS5)
      let version: 'PS4' | 'PS5' = 'PS4'
      if (correo.version === 'PS5') {
        version = 'PS5'
      } else if (correo.version === 'PS4 & PS5') {
        // Si es ambas plataformas, usar PS4 por defecto
        version = 'PS4'
      }

      // Generar el mensaje
      const mensajeCompleto = generarMensaje(
        correo.correo,
        password,
        codigo1,
        codigo2,
        version
      )

      return {
        correo: correo.correo,
        password: password,
        codigoVerificacion1: codigo1,
        codigoVerificacion2: codigo2,
        version,
        mensajeCompleto
      }
    } catch (err) {
      console.error('Error generando mensaje:', err)
      error.value = err instanceof Error ? err.message : 'Error desconocido'
      return null
    }
  }

  /**
   * Genera mensaje con selección manual de plataforma
   */
  const generarMensajeWhatsAppConVersion = (
    correo: EmailAccount,
    versionSeleccionada: 'PS4' | 'PS5'
  ): WhatsAppMessage | null => {
    try {
      error.value = null

      if (!validarCodigosDisponibles(correo)) {
        error.value = 'No hay suficientes códigos disponibles (se requieren al menos 2)'
        return null
      }

      // Obtener la contraseña de la cuenta Secundaria PS4
      const password = obtenerContraseñaSecundariaPS4(correo)
      if (!password || password.trim() === '') {
        error.value = 'No hay contraseña disponible (se requiere contraseña de cuenta Secundaria PS4 o código master)'
        return null
      }

      const codigos = obtenerCodigosParaUsar(correo)
      if (!codigos) {
        error.value = 'Error al obtener los códigos'
        return null
      }

      const [codigo1, codigo2] = codigos

      const mensajeCompleto = generarMensaje(
        correo.correo,
        password,
        codigo1,
        codigo2,
        versionSeleccionada
      )

      return {
        correo: correo.correo,
        password: password,
        codigoVerificacion1: codigo1,
        codigoVerificacion2: codigo2,
        version: versionSeleccionada,
        mensajeCompleto
      }
    } catch (err) {
      console.error('Error generando mensaje:', err)
      error.value = err instanceof Error ? err.message : 'Error desconocido'
      return null
    }
  }

  /**
   * Elimina los códigos usados de Firestore (para juegos)
   */
  const eliminarCodigosUsados = async (
    plataforma: GamePlatform,
    juegoId: string,
    correoId: string,
    codigo1: string,
    codigo2: string
  ): Promise<boolean> => {
    error.value = null

    try {
      const correoRef = doc(db, 'games', plataforma, 'juegos', juegoId, 'correos', correoId)

      console.log('🗑️ Eliminando códigos de Firestore (juego)...', {
        plataforma,
        juegoId,
        correoId,
        codigo1,
        codigo2
      })

      // Eliminar ambos códigos del array
      await updateDoc(correoRef, {
        codigosGenerados: arrayRemove(codigo1, codigo2)
      })

      console.log('✅ Códigos eliminados de Firestore')
      return true
    } catch (err) {
      console.error('❌ Error eliminando códigos:', err)
      error.value = err instanceof Error ? err.message : 'Error eliminando códigos'
      return false
    }
  }

  /**
   * Elimina los códigos usados de Firestore (para combos)
   */
  const eliminarCodigosUsadosCombo = async (
    plataforma: ComboPlatform,
    comboId: string,
    correoId: string,
    codigo1: string,
    codigo2: string
  ): Promise<boolean> => {
    error.value = null

    try {
      const correoRef = doc(db, 'combos', plataforma, 'combos', comboId, 'correos', correoId)

      console.log('🗑️ Eliminando códigos de Firestore (combo)...', {
        plataforma,
        comboId,
        correoId,
        codigo1,
        codigo2
      })

      // Eliminar ambos códigos del array
      await updateDoc(correoRef, {
        codigosGenerados: arrayRemove(codigo1, codigo2)
      })

      console.log('✅ Códigos eliminados de Firestore')
      return true
    } catch (err) {
      console.error('❌ Error eliminando códigos:', err)
      error.value = err instanceof Error ? err.message : 'Error eliminando códigos'
      return false
    }
  }

  /**
   * Proceso completo: generar mensaje, eliminar códigos y crear reporte (para juegos)
   */
  const generarYEliminarCodigos = async (
    correo: GameEmailAccount,
    plataforma: GamePlatform,
    juegoId: string,
    juegoNombre: string,
    uid: string,
    email: string,
    nombreUsuario: string,
    rol: 'admin' | 'employee',
    versionSeleccionada?: 'PS4' | 'PS5',
    clienteNombre?: string,
    clienteTelefono?: string,
    tipoCuenta?: 'Principal PS4' | 'Secundaria PS4' | 'Principal PS5' | 'Secundaria PS5'
  ): Promise<WhatsAppMessage | null> => {
    isGenerating.value = true
    error.value = null

    try {
      console.log('🔄 Iniciando generación de mensaje...', {
        correo: correo.correo,
        juego: juegoNombre,
        version: versionSeleccionada || 'auto',
        codigosDisponibles: correo.codigosGenerados?.length || 0
      })

      // Generar el mensaje
      const mensaje = versionSeleccionada
        ? generarMensajeWhatsAppConVersion(correo, versionSeleccionada)
        : generarMensajeWhatsApp(correo)

      if (!mensaje) {
        const errorMsg = error.value || 'No se pudo generar el mensaje'
        console.error('❌ Error generando mensaje:', errorMsg)
        return null
      }

      console.log('✅ Mensaje generado, eliminando códigos...')

      // Eliminar los códigos de Firestore
      const eliminado = await eliminarCodigosUsados(
        plataforma,
        juegoId,
        correo.correo,
        mensaje.codigoVerificacion1,
        mensaje.codigoVerificacion2
      )

      if (!eliminado) {
        error.value = 'El mensaje se generó pero hubo un error al eliminar los códigos'
        console.warn('⚠️ Advertencia:', error.value)
        // Continuar de todas formas, el mensaje ya se generó
      } else {
        console.log('✅ Códigos eliminados exitosamente')
      }

      // Crear reporte del mensaje generado (sin datos del cliente aún, se actualizará después)
      try {
        await crearReporte(
          uid,
          email,
          nombreUsuario,
          rol,
          juegoNombre,
          juegoId,
          correo.version,
          correo.correo,
          {
            codigo1: mensaje.codigoVerificacion1,
            codigo2: mensaje.codigoVerificacion2
          },
          mensaje.version,
          clienteNombre,
          clienteTelefono,
          tipoCuenta,
          'juego' // Tipo de item
        )
        console.log('📝 Reporte guardado exitosamente')
      } catch (reporteError) {
        console.error('❌ Error guardando reporte:', reporteError)
        // No fallar si el reporte falla, el mensaje ya se generó
      }

      return mensaje
    } catch (err) {
      console.error('❌ Error en proceso completo:', err)
      error.value = err instanceof Error ? err.message : 'Error en el proceso'
      return null
    } finally {
      isGenerating.value = false
    }
  }

  /**
   * Proceso completo: generar mensaje, eliminar códigos y crear reporte (para combos)
   */
  const generarYEliminarCodigosCombo = async (
    correo: ComboEmailAccount,
    plataforma: ComboPlatform,
    comboId: string,
    comboNombre: string,
    uid: string,
    email: string,
    nombreUsuario: string,
    rol: 'admin' | 'employee',
    versionSeleccionada?: 'PS4' | 'PS5',
    clienteNombre?: string,
    clienteTelefono?: string,
    tipoCuenta?: 'Principal PS4' | 'Secundaria PS4' | 'Principal PS5' | 'Secundaria PS5'
  ): Promise<WhatsAppMessage | null> => {
    isGenerating.value = true
    error.value = null

    try {
      console.log('🔄 Iniciando generación de mensaje (combo)...', {
        correo: correo.correo,
        combo: comboNombre,
        version: versionSeleccionada || 'auto',
        codigosDisponibles: correo.codigosGenerados?.length || 0
      })

      // Validar que haya stock disponible
      if (!validarStockDisponible(correo)) {
        error.value = 'No hay cuentas con stock disponible'
        console.error('❌ Error: No hay stock disponible')
        return null
      }

      // Generar el mensaje
      const mensaje = versionSeleccionada
        ? generarMensajeWhatsAppConVersion(correo, versionSeleccionada)
        : generarMensajeWhatsApp(correo)

      if (!mensaje) {
        const errorMsg = error.value || 'No se pudo generar el mensaje'
        console.error('❌ Error generando mensaje:', errorMsg)
        return null
      }

      console.log('✅ Mensaje generado, eliminando códigos...')

      // Eliminar los códigos de Firestore
      const eliminado = await eliminarCodigosUsadosCombo(
        plataforma,
        comboId,
        correo.correo,
        mensaje.codigoVerificacion1,
        mensaje.codigoVerificacion2
      )

      if (!eliminado) {
        error.value = 'El mensaje se generó pero hubo un error al eliminar los códigos'
        console.warn('⚠️ Advertencia:', error.value)
        // Continuar de todas formas, el mensaje ya se generó
      } else {
        console.log('✅ Códigos eliminados exitosamente')
      }

      // Crear reporte del mensaje generado
      try {
        await crearReporte(
          uid,
          email,
          nombreUsuario,
          rol,
          comboNombre,
          comboId,
          correo.version,
          correo.correo,
          {
            codigo1: mensaje.codigoVerificacion1,
            codigo2: mensaje.codigoVerificacion2
          },
          mensaje.version,
          clienteNombre,
          clienteTelefono,
          tipoCuenta,
          'combo' // Tipo de item
        )
        console.log('📝 Reporte guardado exitosamente')
      } catch (reporteError) {
        console.error('❌ Error guardando reporte:', reporteError)
        // No fallar si el reporte falla, el mensaje ya se generó
      }

      return mensaje
    } catch (err) {
      console.error('❌ Error en proceso completo:', err)
      error.value = err instanceof Error ? err.message : 'Error en el proceso'
      return null
    } finally {
      isGenerating.value = false
    }
  }

  /**
   * Copia texto al portapapeles
   */
  const copiarAlPortapapeles = async (texto: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(texto)
      return true
    } catch (err) {
      console.error('Error copiando al portapapeles:', err)
      
      // Fallback para navegadores que no soportan clipboard API
      try {
        const textarea = document.createElement('textarea')
        textarea.value = texto
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.select()
        const exitoso = document.execCommand('copy')
        document.body.removeChild(textarea)
        return exitoso
      } catch (fallbackErr) {
        console.error('Error en fallback de copiado:', fallbackErr)
        return false
      }
    }
  }

  return {
    isGenerating,
    error,
    validarCodigosDisponibles,
    validarStockDisponible,
    validarSlotsDisponibles,
    generarMensajeWhatsApp,
    generarMensajeWhatsAppConVersion,
    eliminarCodigosUsados,
    eliminarCodigosUsadosCombo,
    generarYEliminarCodigos,
    generarYEliminarCodigosCombo,
    copiarAlPortapapeles
  }
}

