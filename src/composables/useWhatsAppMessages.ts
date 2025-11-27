import { ref } from 'vue'
import { doc, updateDoc, arrayRemove } from 'firebase/firestore'
import { db } from '@/config/firebase'
import type { GameEmailAccount, GamePlatform } from '@/types/game'
import { useReportes } from './useReportes'

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

CODIGO DE Verificacion: ${codigo1}

CODIGO DE Verficacion de Respaldo: ${codigo2}`
    } else {
      return `PASOS PARA BAJAR UN JUEGO DE PS5

Por favor sigue los pasos del siguiente video de Tiktok, recuerda seguirnos y guardar nuestro número en tus contactos

https://vm.tiktok.com/ZMBx8613x/

CORREO: ${correo}

CODIGO DE Verificacion: ${codigo1}

CODIGO DE Verficacion de Respaldo: ${codigo2}`
    }
  }

  /**
   * Valida que haya suficientes códigos disponibles
   */
  const validarCodigosDisponibles = (correo: GameEmailAccount): boolean => {
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
   * Obtiene los primeros dos códigos disponibles
   */
  const obtenerCodigosParaUsar = (correo: GameEmailAccount): [string, string] | null => {
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
   * Genera el mensaje completo de WhatsApp
   */
  const generarMensajeWhatsApp = (
    correo: GameEmailAccount
  ): WhatsAppMessage | null => {
    try {
      error.value = null

      // Validar que haya códigos disponibles
      if (!validarCodigosDisponibles(correo)) {
        error.value = 'No hay suficientes códigos disponibles (se requieren al menos 2)'
        return null
      }

      // Validar que haya código master (contraseña)
      if (!correo.codigoMaster || correo.codigoMaster.trim() === '') {
        error.value = 'No hay contraseña (código master) disponible'
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
        correo.codigoMaster,
        codigo1,
        codigo2,
        version
      )

      return {
        correo: correo.correo,
        password: correo.codigoMaster,
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
    correo: GameEmailAccount,
    versionSeleccionada: 'PS4' | 'PS5'
  ): WhatsAppMessage | null => {
    try {
      error.value = null

      if (!validarCodigosDisponibles(correo)) {
        error.value = 'No hay suficientes códigos disponibles (se requieren al menos 2)'
        return null
      }

      if (!correo.codigoMaster || correo.codigoMaster.trim() === '') {
        error.value = 'No hay contraseña (código master) disponible'
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
        correo.codigoMaster,
        codigo1,
        codigo2,
        versionSeleccionada
      )

      return {
        correo: correo.correo,
        password: correo.codigoMaster,
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
   * Elimina los códigos usados de Firestore
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

      console.log('🗑️ Eliminando códigos de Firestore...', {
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
   * Proceso completo: generar mensaje, eliminar códigos y crear reporte
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
          tipoCuenta
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
    generarMensajeWhatsApp,
    generarMensajeWhatsAppConVersion,
    eliminarCodigosUsados,
    generarYEliminarCodigos,
    copiarAlPortapapeles
  }
}

