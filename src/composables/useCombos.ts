import { ref } from 'vue'
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  Timestamp
} from 'firebase/firestore'
import { db } from '@/config/firebase'
import type { 
  ComboEmailAccount, 
  ComboSummary, 
  ComboPlatform, 
  TelefonoComboSearchResult, 
  CorreoComboSearchResult 
} from '@/types/combo'

const combos = ref<ComboSummary[]>([])
const comboEmails = ref<ComboEmailAccount[]>([])
const isLoadingCombos = ref(false)
const isSyncingCombos = ref(false)

// Constantes para cache
const CACHE_KEY_PREFIX = 'combos_cache_'
const CACHE_DURATION = 30 * 60 * 1000 // 30 minutos en milisegundos

// Funciones de cache
const getCacheKey = (plataforma: ComboPlatform): string => {
  return `${CACHE_KEY_PREFIX}${plataforma}`
}

const getCacheTimestampKey = (plataforma: ComboPlatform): string => {
  return `${CACHE_KEY_PREFIX}${plataforma}_timestamp`
}

const getCachedCombos = (plataforma: ComboPlatform): ComboSummary[] | null => {
  try {
    const cacheKey = getCacheKey(plataforma)
    const timestampKey = getCacheTimestampKey(plataforma)
    
    const cachedData = localStorage.getItem(cacheKey)
    const cachedTimestamp = localStorage.getItem(timestampKey)
    
    if (!cachedData || !cachedTimestamp) {
      return null
    }
    
    const timestamp = parseInt(cachedTimestamp, 10)
    const now = Date.now()
    
    // Verificar si el cache ha expirado (más de 30 minutos)
    if (now - timestamp > CACHE_DURATION) {
      // Cache expirado, limpiar
      localStorage.removeItem(cacheKey)
      localStorage.removeItem(timestampKey)
      return null
    }
    
    return JSON.parse(cachedData) as ComboSummary[]
  } catch (error) {
    console.error('Error leyendo cache:', error)
    return null
  }
}

const setCachedCombos = (plataforma: ComboPlatform, combosData: ComboSummary[]): void => {
  try {
    const cacheKey = getCacheKey(plataforma)
    const timestampKey = getCacheTimestampKey(plataforma)
    
    localStorage.setItem(cacheKey, JSON.stringify(combosData))
    localStorage.setItem(timestampKey, Date.now().toString())
  } catch (error) {
    console.error('Error guardando cache:', error)
  }
}

const clearCache = (plataforma?: ComboPlatform): void => {
  try {
    if (plataforma) {
      const cacheKey = getCacheKey(plataforma)
      const timestampKey = getCacheTimestampKey(plataforma)
      localStorage.removeItem(cacheKey)
      localStorage.removeItem(timestampKey)
    } else {
      // Limpiar todo el cache de combos
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(CACHE_KEY_PREFIX)) {
          localStorage.removeItem(key)
        }
      })
    }
  } catch (error) {
    console.error('Error limpiando cache:', error)
  }
}

export function useCombos() {
  const cargarCombos = async (plataforma: ComboPlatform = 'PS4 & PS5', forceRefresh: boolean = false): Promise<void> => {
    // Si no es forzado, intentar cargar desde cache primero
    if (!forceRefresh) {
      const cachedCombos = getCachedCombos(plataforma)
      if (cachedCombos && cachedCombos.length > 0) {
        combos.value = cachedCombos
        return
      }
    }
    
    isLoadingCombos.value = true
    try {
      const plataformaRef = collection(db, 'combos', plataforma, 'combos')
      const querySnapshot = await getDocs(plataformaRef)

      const combosMap = new Map<string, ComboSummary>()

      // Iterar sobre cada documento de combo (ej: assassins_creed_combo)
      for (const comboDoc of querySnapshot.docs) {
        const comboId = comboDoc.id
        const comboDocData = comboDoc.data()
        
        // Intentar obtener todos los correos dentro de este combo
        let correos: string[] = []
        let comboData: any = null
        let stockCount = 0

        try {
          const correosRef = collection(db, 'combos', plataforma, 'combos', comboId, 'correos')
          const correosSnapshot = await getDocs(correosRef)

          correosSnapshot.docs.forEach((correoDoc) => {
            const data = correoDoc.data()
            correos.push(correoDoc.id)
            if (!comboData) {
              comboData = data
            }
            if (Array.isArray(data.cuentas)) {
              data.cuentas.forEach((cuenta: import('@/types/game').AccountOwner) => {
                if (cuenta?.hasStock) {
                  stockCount++
                }
              })
            }
          })
        } catch (error) {
          // Si no tiene permisos (usuario no autenticado), usar datos del documento padre
          console.log(`No se pudo acceder a correos de ${comboId} (usuario no autenticado)`)
          correos = []
          stockCount = 0
        }

        // Convertir ID del combo a nombre legible
        const nombreFromId = comboId
          .split('_')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')
          .replace(' Combo', '')

        // Determinar tipo de promoción
        let tipoPromocion: 'ninguna' | 'oferta' | 'promocion' = 'ninguna'
        if (comboDocData.tipoPromocion) {
          tipoPromocion = comboDocData.tipoPromocion
        } else if (comboDocData.isOffert === true) {
          tipoPromocion = 'oferta'
        }

        // Usar el precio del documento principal si existe, sino del costo legacy
        const precioCombo = comboDocData.precio !== undefined ? comboDocData.precio : (comboDocData.costo !== undefined ? comboDocData.costo : (comboData?.costo || 0))
        
        // Legacy: mantener precios y costo para compatibilidad
        const preciosCombo = comboDocData.precios || comboData?.precios || {
          ps4Principal: precioCombo,
          ps4Secundaria: precioCombo,
          ps5Principal: precioCombo,
          ps5Secundaria: precioCombo
        }
        const costoCombo = precioCombo
        
        // Obtener juegos del combo
        const juegosCombo = comboDocData.juegos || []
        
        // Usar la version del documento principal si existe, sino usar la plataforma actual o del primer correo
        const versionCombo = comboDocData.version || comboData?.version || plataforma

        combosMap.set(comboId, {
          id: comboId,
          nombre: comboDocData.nombre || comboData?.nombre || nombreFromId,
          precio: precioCombo,
          precios: preciosCombo, // Legacy: mantener para compatibilidad
          costo: costoCombo, // Legacy: mantener para compatibilidad
          version: versionCombo,
          foto: comboDocData.foto || '',
          activo: comboDocData.activo !== false, // Por defecto true si no está definido
          isOffert: comboDocData.isOffert || false,
          tipoPromocion,
          totalCorreos: correos.length,
          correos,
          stockAccounts: stockCount,
          juegos: juegosCombo,
          juegoReferenciado: comboDocData.juegoReferenciado
        })
      }

      const sortedCombos = Array.from(combosMap.values()).sort((a, b) => 
        a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })
      )

      console.log(`✅ Combos cargados para ${plataforma}:`, sortedCombos.length)
      console.log('📦 Lista de combos:', sortedCombos.map(c => ({ 
        id: c.id, 
        nombre: c.nombre, 
        correos: c.totalCorreos, 
        stock: c.stockAccounts 
      })))

      combos.value = sortedCombos
      
      // Guardar en cache
      setCachedCombos(plataforma, sortedCombos)
    } catch (error) {
      console.error('Error cargando combos:', error)
      throw error
    } finally {
      isLoadingCombos.value = false
    }
  }

  const sincronizarCombos = async (plataforma: ComboPlatform = 'PS4 & PS5'): Promise<void> => {
    isSyncingCombos.value = true
    try {
      // Limpiar cache y forzar recarga
      clearCache(plataforma)
      await cargarCombos(plataforma, true)
    } catch (error) {
      console.error('Error sincronizando combos:', error)
      throw error
    } finally {
      isSyncingCombos.value = false
    }
  }

  const cargarCorreosCombo = async (
    plataforma: ComboPlatform,
    comboId: string
  ): Promise<ComboEmailAccount[]> => {
    try {
      const correosRef = collection(db, 'combos', plataforma, 'combos', comboId, 'correos')
      const querySnapshot = await getDocs(correosRef)

      return querySnapshot.docs.map((doc) => {
        const data = doc.data()
        // Determinar precio: usar precio si existe, sino costo legacy
        const precio = data.precio !== undefined ? data.precio : (data.costo || 0)
        // Manejar migración: si no hay precios, usar costo legacy
        const precios = data.precios || {
          ps4Principal: precio,
          ps4Secundaria: precio,
          ps5Principal: precio,
          ps5Secundaria: precio
        }
        return {
          correo: doc.id,
          nombre: data.nombre || '',
          precio,
          precios,
          costo: data.costo || precio, // Legacy: mantener para compatibilidad
          version: data.version || plataforma,
          codigoMaster: data.codigoMaster || '',
          codigosGenerados: data.codigosGenerados || [],
          fecha: data.fecha?.toDate() || new Date(),
          codigo: data.codigo || '',
          cuentas: data.cuentas || [],
          saldo: data.saldo !== undefined ? data.saldo : undefined,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          createdBy: data.createdBy
        } as ComboEmailAccount
      })
    } catch (error) {
      console.error('Error cargando correos del combo:', error)
      throw error
    }
  }

  const cargarCorreoPorId = async (
    plataforma: ComboPlatform,
    comboId: string,
    correo: string
  ): Promise<ComboEmailAccount | null> => {
    try {
      const correoRef = doc(db, 'combos', plataforma, 'combos', comboId, 'correos', correo)
      const correoDoc = await getDoc(correoRef)

      if (!correoDoc.exists()) {
        return null
      }

      const data = correoDoc.data()
      // Determinar precio: usar precio si existe, sino costo legacy
      const precio = data.precio !== undefined ? data.precio : (data.costo || 0)
      // Manejar migración: si no hay precios, usar costo legacy
      const precios = data.precios || {
        ps4Principal: precio,
        ps4Secundaria: precio,
        ps5Principal: precio,
        ps5Secundaria: precio
      }
      return {
        correo: correoDoc.id,
        nombre: data.nombre || '',
        precio,
        precios,
        costo: data.costo || precio, // Legacy: mantener para compatibilidad
        version: data.version || plataforma,
        codigoMaster: data.codigoMaster || '',
        codigosGenerados: data.codigosGenerados || [],
        fecha: data.fecha?.toDate() || new Date(),
        codigo: data.codigo || '',
        cuentas: data.cuentas || [],
        saldo: data.saldo !== undefined ? data.saldo : undefined,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        createdBy: data.createdBy
      } as ComboEmailAccount

    } catch (error) {
      console.error('Error cargando correo:', error)
      throw error
    }
  }

  // Función helper para eliminar recursivamente todos los undefined
  const removeUndefined = (obj: any): any => {
    if (obj === null || obj === undefined) {
      return null
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => removeUndefined(item)).filter(item => item !== undefined && item !== null)
    }
    
    if (typeof obj === 'object' && obj.constructor === Object) {
      const cleaned: Record<string, any> = {}
      for (const [key, value] of Object.entries(obj)) {
        if (value !== undefined) {
          const cleanedValue = removeUndefined(value)
          if (cleanedValue !== undefined && cleanedValue !== null) {
            cleaned[key] = cleanedValue
          }
        }
      }
      return cleaned
    }
    
    return obj
  }

  const crearCorreoCombo = async (
    plataforma: ComboPlatform,
    comboId: string,
    correo: string,
    datosCorreo: Omit<ComboEmailAccount, 'correo' | 'createdAt' | 'updatedAt'>
  ): Promise<void> => {
    try {
      // Limpiar cache al crear un correo
      clearCache(plataforma)
      
      const correoRef = doc(db, 'combos', plataforma, 'combos', comboId, 'correos', correo)
      const comboRef = doc(db, 'combos', plataforma, 'combos', comboId)

      // Construir el objeto de datos
      const correoData: Record<string, any> = {
        nombre: datosCorreo.nombre,
        precio: datosCorreo.precio,
        version: datosCorreo.version,
        fecha: Timestamp.fromDate(datosCorreo.fecha),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      }
      
      // Legacy: mantener precios y costo para compatibilidad
      if (datosCorreo.precios) {
        correoData.precios = datosCorreo.precios
      }
      correoData.costo = datosCorreo.precio // Legacy: usar precio único
      
      // Agregar campos opcionales solo si tienen valor (no undefined)
      if (datosCorreo.codigoMaster !== undefined && datosCorreo.codigoMaster !== null && datosCorreo.codigoMaster !== '') {
        correoData.codigoMaster = datosCorreo.codigoMaster
      }
      if (datosCorreo.codigosGenerados !== undefined && datosCorreo.codigosGenerados !== null && Array.isArray(datosCorreo.codigosGenerados)) {
        correoData.codigosGenerados = datosCorreo.codigosGenerados
      }
      if (datosCorreo.codigo !== undefined && datosCorreo.codigo !== null && datosCorreo.codigo !== '') {
        correoData.codigo = datosCorreo.codigo
      }
      if (datosCorreo.cuentas !== undefined && datosCorreo.cuentas !== null && Array.isArray(datosCorreo.cuentas)) {
        correoData.cuentas = datosCorreo.cuentas
      }

      // Agregar campos opcionales solo si tienen valor
      if (datosCorreo.saldo !== undefined && datosCorreo.saldo !== null) {
        correoData.saldo = datosCorreo.saldo
      }
      if (datosCorreo.createdBy !== undefined && datosCorreo.createdBy !== null && datosCorreo.createdBy !== '') {
        correoData.createdBy = datosCorreo.createdBy
      }

      // Limpiar recursivamente todos los undefined (incluyendo objetos anidados)
      const filteredData = removeUndefined(correoData)

      // Crear el correo
      await setDoc(correoRef, filteredData)

      // Actualizar los precios del combo en el documento principal
      const updateData: Record<string, any> = {
        ultimaActualizacionPrecio: Timestamp.now()
      }
      
      if (datosCorreo.precios) {
        updateData.precios = datosCorreo.precios
        // Legacy: mantener costo (usar el precio más bajo)
        updateData.costo = Math.min(
          datosCorreo.precios.ps4Principal,
          datosCorreo.precios.ps4Secundaria,
          datosCorreo.precios.ps5Principal,
          datosCorreo.precios.ps5Secundaria
        )
      } else if (datosCorreo.costo !== undefined) {
        updateData.costo = datosCorreo.costo
      }
      
      await setDoc(comboRef, updateData, { merge: true })
    } catch (error) {
      console.error('Error creando correo:', error)
      throw error
    }
  }

  const actualizarCorreoCombo = async (
    plataforma: ComboPlatform,
    comboId: string,
    correo: string,
    datos: Partial<Omit<ComboEmailAccount, 'correo' | 'createdAt' | 'updatedAt'>>
  ): Promise<void> => {
    try {
      // Limpiar cache al actualizar un correo
      clearCache(plataforma)
      
      const correoRef = doc(db, 'combos', plataforma, 'combos', comboId, 'correos', correo)
      const comboRef = doc(db, 'combos', plataforma, 'combos', comboId)

      // Construir objeto de datos actualizados
      const datosActualizados: Record<string, any> = {
        updatedAt: Timestamp.now()
      }

      // Agregar solo los campos que tienen valor
      if (datos.nombre !== undefined && datos.nombre !== null) {
        datosActualizados.nombre = datos.nombre
      }
      if (datos.precio !== undefined && datos.precio !== null) {
        datosActualizados.precio = datos.precio
        // Legacy: mantener costo para compatibilidad
        datosActualizados.costo = datos.precio
      }
      if (datos.precios !== undefined && datos.precios !== null) {
        datosActualizados.precios = datos.precios
      }
      if (datos.version !== undefined && datos.version !== null) {
        datosActualizados.version = datos.version
      }
      if (datos.codigoMaster !== undefined && datos.codigoMaster !== null && datos.codigoMaster !== '') {
        datosActualizados.codigoMaster = datos.codigoMaster
      }
      if (datos.codigo !== undefined && datos.codigo !== null && datos.codigo !== '') {
        datosActualizados.codigo = datos.codigo
      }
      if (datos.codigosGenerados !== undefined && datos.codigosGenerados !== null && Array.isArray(datos.codigosGenerados)) {
        datosActualizados.codigosGenerados = datos.codigosGenerados
      }
      if (datos.cuentas !== undefined && datos.cuentas !== null && Array.isArray(datos.cuentas)) {
        datosActualizados.cuentas = datos.cuentas
      }
      if (datos.fecha) {
        datosActualizados.fecha = Timestamp.fromDate(datos.fecha)
      }
      if (datos.saldo !== undefined && datos.saldo !== null) {
        datosActualizados.saldo = datos.saldo
      }
      if (datos.createdBy !== undefined && datos.createdBy !== null && datos.createdBy !== '') {
        datosActualizados.createdBy = datos.createdBy
      }

      // Limpiar recursivamente todos los undefined (incluyendo objetos anidados)
      const filteredData = removeUndefined(datosActualizados)

      await updateDoc(correoRef, filteredData)

      // Si se actualizan los precios o el costo, también actualizar en el documento del combo
      if (datos.precios) {
        const updateData: Record<string, any> = {
          precios: datos.precios,
          ultimaActualizacionPrecio: Timestamp.now()
        }
        // Legacy: mantener costo (usar el precio más bajo)
        updateData.costo = Math.min(
          datos.precios.ps4Principal,
          datos.precios.ps4Secundaria,
          datos.precios.ps5Principal,
          datos.precios.ps5Secundaria
        )
        await setDoc(comboRef, updateData, { merge: true })
      } else if (datos.costo !== undefined) {
        await setDoc(comboRef, {
          costo: datos.costo,
          ultimaActualizacionPrecio: Timestamp.now()
        }, { merge: true })
      }
    } catch (error) {
      console.error('Error actualizando correo:', error)
      throw error
    }
  }

  const eliminarCorreoCombo = async (
    plataforma: ComboPlatform,
    comboId: string,
    correo: string
  ): Promise<void> => {
    try {
      // Limpiar cache al eliminar un correo
      clearCache(plataforma)
      
      const correoRef = doc(db, 'combos', plataforma, 'combos', comboId, 'correos', correo)
      await deleteDoc(correoRef)
    } catch (error) {
      console.error('Error eliminando correo:', error)
      throw error
    }
  }

  const eliminarComboCompleto = async (
    plataforma: ComboPlatform,
    comboId: string
  ): Promise<void> => {
    try {
      // Limpiar cache al eliminar un combo
      clearCache(plataforma)
      
      // Primero eliminar todos los correos
      const correosRef = collection(db, 'combos', plataforma, 'combos', comboId, 'correos')
      const correosSnapshot = await getDocs(correosRef)

      const deletePromises = correosSnapshot.docs.map((doc) => deleteDoc(doc.ref))
      await Promise.all(deletePromises)

      // Luego eliminar el documento del combo
      const comboRef = doc(db, 'combos', plataforma, 'combos', comboId)
      await deleteDoc(comboRef)
    } catch (error) {
      console.error('Error eliminando combo completo:', error)
      throw error
    }
  }

  const crearCombo = async (
    plataforma: ComboPlatform,
    nombre: string,
    foto?: string,
    isOffert?: boolean,
    version?: ComboPlatform,
    precio?: number,
    juegos?: import('@/types/combo').ComboGame[],
    juegoReferenciado?: string
  ): Promise<string> => {
    try {
      // Limpiar cache al crear un combo
      clearCache(plataforma)
      
      const comboId = generarIdCombo(nombre)
      const comboRef = doc(db, 'combos', plataforma, 'combos', comboId)
      
      // Verificar si el combo ya existe
      const comboDoc = await getDoc(comboRef)
      if (comboDoc.exists()) {
        throw new Error(`El combo "${nombre}" ya existe en esta plataforma`)
      }
      
      // Siempre crear el documento con al menos estos campos
      const comboData: Record<string, any> = {
        createdAt: new Date(),
        nombre: nombre,
        version: version || plataforma,
        precio: precio || 0,
        juegos: juegos || [],
        activo: true // Por defecto activo al crear
      }
      
      if (foto && foto.trim()) comboData.foto = foto.trim()
      if (isOffert !== undefined) comboData.isOffert = isOffert
      if (juegoReferenciado) comboData.juegoReferenciado = juegoReferenciado
      
      // Legacy: mantener costo para compatibilidad
      comboData.costo = precio || 0
      
      await setDoc(comboRef, comboData)
      return comboId
    } catch (error) {
      console.error('Error creando combo:', error)
      throw error
    }
  }

  const actualizarCombo = async (
    plataforma: ComboPlatform,
    comboId: string,
    datos: {
      nombre?: string
      foto?: string
      version?: ComboPlatform
      activo?: boolean
      isOffert?: boolean
      tipoPromocion?: 'ninguna' | 'oferta' | 'promocion'
      precio?: number
      juegos?: import('@/types/combo').ComboGame[]
      juegoReferenciado?: string
    }
  ): Promise<void> => {
    try {
      const comboRef = doc(db, 'combos', plataforma, 'combos', comboId)
      const updateData: Record<string, any> = {}
      
      if (datos.nombre !== undefined) updateData.nombre = datos.nombre
      if (datos.foto !== undefined) updateData.foto = datos.foto
      if (datos.version !== undefined) updateData.version = datos.version
      if (datos.activo !== undefined) updateData.activo = datos.activo
      if (datos.tipoPromocion !== undefined) {
        updateData.tipoPromocion = datos.tipoPromocion
        // Actualizar también isOffert para compatibilidad
        updateData.isOffert = datos.tipoPromocion === 'oferta'
      }
      if (datos.isOffert !== undefined) updateData.isOffert = datos.isOffert
      if (datos.precio !== undefined) {
        updateData.precio = datos.precio
        // Legacy: mantener costo para compatibilidad
        updateData.costo = datos.precio
      }
      if (datos.juegos !== undefined) updateData.juegos = datos.juegos
      if (datos.juegoReferenciado !== undefined) updateData.juegoReferenciado = datos.juegoReferenciado
      
      await setDoc(comboRef, updateData, { merge: true })
      // Limpiar cache al actualizar
      clearCache(plataforma)
    } catch (error) {
      console.error('Error actualizando combo:', error)
      throw error
    }
  }

  const generarIdCombo = (nombre: string): string => {
    return nombre
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '') + '_combo'
  }

  const buscarCombos = (termino: string): ComboSummary[] => {
    if (!termino) return combos.value

    const terminoLower = termino.toLowerCase()
    return combos.value.filter(
      (combo) =>
        combo.nombre.toLowerCase().includes(terminoLower) ||
        combo.id.toLowerCase().includes(terminoLower)
    )
  }

  const buscarPorTelefono = async (
    telefono: string,
    plataforma: ComboPlatform = 'PS4 & PS5'
  ): Promise<TelefonoComboSearchResult[]> => {
    if (!telefono || telefono.trim().length < 3) {
      return []
    }

    try {
      const resultados: TelefonoComboSearchResult[] = []
      
      // Normalizar teléfono de búsqueda
      const telefonoInput = telefono.trim()
      const telefonoNormalizado = telefonoInput.replace(/\s+/g, '').toLowerCase()
      const numerosBusqueda = telefonoNormalizado.replace(/[^\d]/g, '')
      
      // Cargar todos los combos de la plataforma
      const plataformaRef = collection(db, 'combos', plataforma, 'combos')
      const querySnapshot = await getDocs(plataformaRef)

      // Iterar sobre cada combo
      for (const comboDoc of querySnapshot.docs) {
        const comboId = comboDoc.id
        const comboDocData = comboDoc.data()

        // Obtener todos los correos del combo
        const correosRef = collection(db, 'combos', plataforma, 'combos', comboId, 'correos')
        const correosSnapshot = await getDocs(correosRef)

        // Buscar en cada correo
        for (const correoDoc of correosSnapshot.docs) {
          const correoData = correoDoc.data()
          const cuentas = correoData.cuentas || []

          // Buscar en las cuentas del correo
          for (const cuenta of cuentas) {
            if (cuenta?.telefono) {
              const telefonoCuentaNormalizado = cuenta.telefono.replace(/\s+/g, '').toLowerCase()
              const numerosCuenta = telefonoCuentaNormalizado.replace(/[^\d]/g, '')
              
              const coincide = 
                telefonoCuentaNormalizado === telefonoNormalizado ||
                telefonoCuentaNormalizado.includes(telefonoNormalizado) ||
                telefonoNormalizado.includes(telefonoCuentaNormalizado) ||
                numerosCuenta.includes(numerosBusqueda) ||
                numerosBusqueda.includes(numerosCuenta) ||
                (numerosBusqueda.length >= 6 && numerosCuenta.includes(numerosBusqueda)) ||
                (numerosCuenta.length >= 6 && numerosBusqueda.includes(numerosCuenta))
              
              if (coincide) {
                const nombreFromId = comboId
                  .split('_')
                  .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(' ')
                  .replace(' Combo', '')

                let tipoPromocion: 'ninguna' | 'oferta' | 'promocion' = 'ninguna'
                if (comboDocData.tipoPromocion) {
                  tipoPromocion = comboDocData.tipoPromocion
                } else if (comboDocData.isOffert === true) {
                  tipoPromocion = 'oferta'
                }

                const precio = comboDocData.precio !== undefined ? comboDocData.precio : (comboDocData.costo !== undefined ? comboDocData.costo : (correoData.costo || 0))
                
                const comboSummary: ComboSummary = {
                  id: comboId,
                  nombre: comboDocData.nombre || correoData.nombre || nombreFromId,
                  precio,
                  costo: precio, // Legacy
                  version: comboDocData.version || correoData.version || plataforma,
                  foto: comboDocData.foto || '',
                  isOffert: comboDocData.isOffert || false,
                  tipoPromocion,
                  totalCorreos: 0,
                  correos: [],
                  stockAccounts: 0,
                  precios: {
                    ps4Principal: precio,
                    ps4Secundaria: precio,
                    ps5Principal: precio,
                    ps5Secundaria: precio
                  },
                  juegos: comboDocData.juegos || [],
                  juegoReferenciado: comboDocData.juegoReferenciado
                }

                const emailAccount: ComboEmailAccount = {
                  correo: correoDoc.id,
                  nombre: correoData.nombre || '',
                  precio,
                  precios: {
                    ps4Principal: precio,
                    ps4Secundaria: precio,
                    ps5Principal: precio,
                    ps5Secundaria: precio
                  },
                  costo: precio, // Legacy
                  version: correoData.version || plataforma,
                  codigoMaster: correoData.codigoMaster || '',
                  codigosGenerados: correoData.codigosGenerados || [],
                  fecha: correoData.fecha?.toDate() || new Date(),
                  codigo: correoData.codigo || '',
                  cuentas: cuentas,
                  saldo: correoData.saldo !== undefined ? correoData.saldo : undefined,
                  createdAt: correoData.createdAt?.toDate() || new Date(),
                  updatedAt: correoData.updatedAt?.toDate() || new Date(),
                  createdBy: correoData.createdBy
                }

                resultados.push({
                  combo: comboSummary,
                  correo: emailAccount,
                  cuenta: cuenta
                })
              }
            }
          }
        }
      }

      return resultados
    } catch (error) {
      console.error('Error buscando por teléfono:', error)
      throw error
    }
  }

  const buscarPorCorreo = async (
    correo: string,
    plataforma: ComboPlatform = 'PS4 & PS5'
  ): Promise<CorreoComboSearchResult[]> => {
    if (!correo || correo.trim().length < 3) {
      return []
    }

    try {
      const resultados: CorreoComboSearchResult[] = []
      
      // Normalizar correo de búsqueda
      const correoInput = correo.trim().toLowerCase()
      
      // Cargar todos los combos de la plataforma
      const plataformaRef = collection(db, 'combos', plataforma, 'combos')
      const querySnapshot = await getDocs(plataformaRef)

      // Iterar sobre cada combo
      for (const comboDoc of querySnapshot.docs) {
        const comboId = comboDoc.id
        const comboDocData = comboDoc.data()

        // Obtener todos los correos del combo
        const correosRef = collection(db, 'combos', plataforma, 'combos', comboId, 'correos')
        const correosSnapshot = await getDocs(correosRef)

        // Buscar en cada correo
        for (const correoDoc of correosSnapshot.docs) {
          const correoId = correoDoc.id.toLowerCase()
          const correoData = correoDoc.data()
          
          // Buscar coincidencias en el ID del correo (que es el email)
          if (correoId.includes(correoInput) || correoInput.includes(correoId)) {
            const nombreFromId = comboId
              .split('_')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ')
              .replace(' Combo', '')

            let tipoPromocion: 'ninguna' | 'oferta' | 'promocion' = 'ninguna'
            if (comboDocData.tipoPromocion) {
              tipoPromocion = comboDocData.tipoPromocion
            } else if (comboDocData.isOffert === true) {
              tipoPromocion = 'oferta'
            }

            const precio = comboDocData.precio !== undefined ? comboDocData.precio : (comboDocData.costo !== undefined ? comboDocData.costo : (correoData.costo || 0))
            
            const comboSummary: ComboSummary = {
              id: comboId,
              nombre: comboDocData.nombre || correoData.nombre || nombreFromId,
              precio,
              costo: precio, // Legacy
              version: comboDocData.version || correoData.version || plataforma,
              foto: comboDocData.foto || '',
              isOffert: comboDocData.isOffert || false,
              tipoPromocion,
              totalCorreos: 0,
              correos: [],
              stockAccounts: 0,
              precios: {
                ps4Principal: precio,
                ps4Secundaria: precio,
                ps5Principal: precio,
                ps5Secundaria: precio
              },
              juegos: comboDocData.juegos || [],
              juegoReferenciado: comboDocData.juegoReferenciado
            }

            const emailAccount: ComboEmailAccount = {
              correo: correoDoc.id,
              nombre: correoData.nombre || '',
              precio,
              precios: {
                ps4Principal: precio,
                ps4Secundaria: precio,
                ps5Principal: precio,
                ps5Secundaria: precio
              },
              costo: precio, // Legacy
              version: correoData.version || plataforma,
              codigoMaster: correoData.codigoMaster || '',
              codigosGenerados: correoData.codigosGenerados || [],
              fecha: correoData.fecha?.toDate() || new Date(),
              codigo: correoData.codigo || '',
              cuentas: correoData.cuentas || [],
              saldo: correoData.saldo !== undefined ? correoData.saldo : undefined,
              createdAt: correoData.createdAt?.toDate() || new Date(),
              updatedAt: correoData.updatedAt?.toDate() || new Date(),
              createdBy: correoData.createdBy
            }

            resultados.push({
              combo: comboSummary,
              correo: emailAccount
            })
          }
        }
      }

      return resultados
    } catch (error) {
      console.error('Error buscando por correo:', error)
      throw error
    }
  }

  return {
    combos,
    comboEmails,
    isLoadingCombos,
    isSyncingCombos,
    cargarCombos,
    sincronizarCombos,
    cargarCorreosCombo,
    cargarCorreoPorId,
    crearCombo,
    actualizarCombo,
    crearCorreoCombo,
    actualizarCorreoCombo,
    eliminarCorreoCombo,
    eliminarComboCompleto,
    buscarCombos,
    buscarPorTelefono,
    buscarPorCorreo,
    generarIdCombo,
    clearCache
  }
}

