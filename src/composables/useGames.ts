import { ref } from 'vue'
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp
} from 'firebase/firestore'
import { db } from '@/config/firebase'
import type { GameEmailAccount, GameSummary, GamePlatform, AccountOwner, TelefonoSearchResult, CorreoSearchResult } from '@/types/game'

const games = ref<GameSummary[]>([])
const gameEmails = ref<GameEmailAccount[]>([])
const isLoadingGames = ref(false)

export function useGames() {
  const cargarJuegos = async (plataforma: GamePlatform = 'PS4 & PS5'): Promise<void> => {
    isLoadingGames.value = true
    try {
      const plataformaRef = collection(db, 'games', plataforma, 'juegos')
      const querySnapshot = await getDocs(plataformaRef)

      const juegosMap = new Map<string, GameSummary>()

      // Iterar sobre cada documento de juego (ej: a_way_out)
      for (const juegoDoc of querySnapshot.docs) {
        const juegoId = juegoDoc.id
        const juegoDocData = juegoDoc.data()
        
        // Obtener todos los correos dentro de este juego
      const correosRef = collection(db, 'games', plataforma, 'juegos', juegoId, 'correos')
      const correosSnapshot = await getDocs(correosRef)

      const correos: string[] = []
      let juegoData: any = null
      let stockCount = 0

      correosSnapshot.docs.forEach((correoDoc) => {
        const data = correoDoc.data()
        correos.push(correoDoc.id)
        if (!juegoData) {
          juegoData = data
        }
        if (Array.isArray(data.cuentas)) {
          data.cuentas.forEach((cuenta: AccountOwner) => {
            if (cuenta?.hasStock) {
              stockCount++
            }
          })
        }
      })

      // Convertir ID del juego a nombre legible (ej: a_way_out -> A Way Out)
      const nombreFromId = juegoId
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')

      // Determinar tipo de promoción (migrar de isOffert si existe)
      let tipoPromocion: 'ninguna' | 'oferta' | 'promocion' = 'ninguna'
      if (juegoDocData.tipoPromocion) {
        tipoPromocion = juegoDocData.tipoPromocion
      } else if (juegoDocData.isOffert === true) {
        tipoPromocion = 'oferta' // Migración automática
      }

      // Usar el costo del documento principal si existe, sino del primer correo
      const costoJuego = juegoDocData.costo !== undefined ? juegoDocData.costo : (juegoData?.costo || 0)
      
      // Usar la version del documento principal si existe, sino usar la plataforma actual o del primer correo
      const versionJuego = juegoDocData.version || juegoData?.version || plataforma

      juegosMap.set(juegoId, {
        id: juegoId,
        nombre: juegoDocData.nombre || juegoData?.nombre || nombreFromId,
        costo: costoJuego, // Precio del documento principal (último correo subido)
        version: versionJuego, // Categoría del juego (PS4, PS5, PS4 & PS5, etc.)
        foto: juegoDocData.foto || '', // Foto del documento principal
        isOffert: juegoDocData.isOffert || false, // Legacy
        tipoPromocion, // Nuevo campo de tipo de promoción
        totalCorreos: correos.length,
        correos,
        stockAccounts: stockCount
      })
      }

      games.value = Array.from(juegosMap.values()).sort((a, b) => 
        a.nombre.localeCompare(b.nombre)
      )
    } catch (error) {
      console.error('Error cargando juegos:', error)
      throw error
    } finally {
      isLoadingGames.value = false
    }
  }

  const cargarCorreosJuego = async (
    plataforma: GamePlatform,
    juegoId: string
  ): Promise<GameEmailAccount[]> => {
    try {
      const correosRef = collection(db, 'games', plataforma, 'juegos', juegoId, 'correos')
      const querySnapshot = await getDocs(correosRef)

      return querySnapshot.docs.map((doc) => {
        const data = doc.data()
        return {
          correo: doc.id,
          nombre: data.nombre || '',
          costo: data.costo || 0,
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
        } as GameEmailAccount
      })
    } catch (error) {
      console.error('Error cargando correos del juego:', error)
      throw error
    }
  }

  const cargarCorreoPorId = async (
    plataforma: GamePlatform,
    juegoId: string,
    correo: string
  ): Promise<GameEmailAccount | null> => {
    try {
      const correoRef = doc(db, 'games', plataforma, 'juegos', juegoId, 'correos', correo)
      const correoDoc = await getDoc(correoRef)

      if (!correoDoc.exists()) {
        return null
      }

      const data = correoDoc.data()
      return {
        correo: correoDoc.id,
        nombre: data.nombre || '',
        costo: data.costo || 0,
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
      } as GameEmailAccount
    } catch (error) {
      console.error('Error cargando correo:', error)
      throw error
    }
  }

  const crearCorreoJuego = async (
    plataforma: GamePlatform,
    juegoId: string,
    correo: string,
    datosCorreo: Omit<GameEmailAccount, 'correo' | 'createdAt' | 'updatedAt'>
  ): Promise<void> => {
    try {
      const correoRef = doc(db, 'games', plataforma, 'juegos', juegoId, 'correos', correo)
      const juegoRef = doc(db, 'games', plataforma, 'juegos', juegoId)

      // Construir el objeto de datos, filtrando campos undefined
      const correoData: Record<string, any> = {
        nombre: datosCorreo.nombre,
        costo: datosCorreo.costo,
        version: datosCorreo.version,
        codigoMaster: datosCorreo.codigoMaster,
        codigosGenerados: datosCorreo.codigosGenerados,
        fecha: Timestamp.fromDate(datosCorreo.fecha),
        codigo: datosCorreo.codigo,
        cuentas: datosCorreo.cuentas,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      }

      // Agregar campos opcionales solo si tienen valor
      if (datosCorreo.saldo !== undefined) {
        correoData.saldo = datosCorreo.saldo
      }
      if (datosCorreo.createdBy) {
        correoData.createdBy = datosCorreo.createdBy
      }

      // Crear el correo
      await setDoc(correoRef, correoData)

      // Actualizar el precio del juego en el documento principal
      // El último correo subido actualiza el precio del juego
      await setDoc(juegoRef, {
        costo: datosCorreo.costo,
        ultimaActualizacionPrecio: Timestamp.now()
      }, { merge: true })
    } catch (error) {
      console.error('Error creando correo:', error)
      throw error
    }
  }

  const actualizarCorreoJuego = async (
    plataforma: GamePlatform,
    juegoId: string,
    correo: string,
    datos: Partial<Omit<GameEmailAccount, 'correo' | 'createdAt' | 'updatedAt'>>
  ): Promise<void> => {
    try {
      const correoRef = doc(db, 'games', plataforma, 'juegos', juegoId, 'correos', correo)
      const juegoRef = doc(db, 'games', plataforma, 'juegos', juegoId)

      // Filtrar campos undefined (Firebase no los acepta)
      const datosLimpios: Record<string, any> = {}
      Object.keys(datos).forEach(key => {
        const value = datos[key as keyof typeof datos]
        if (value !== undefined) {
          datosLimpios[key] = value
        }
      })

      const datosActualizados: Record<string, any> = {
        ...datosLimpios,
        updatedAt: Timestamp.now()
      }

      if (datos.fecha) {
        datosActualizados.fecha = Timestamp.fromDate(datos.fecha)
      }

      await updateDoc(correoRef, datosActualizados)

      // Si se actualiza el costo, también actualizar el precio del juego
      if (datos.costo !== undefined) {
        await setDoc(juegoRef, {
          costo: datos.costo,
          ultimaActualizacionPrecio: Timestamp.now()
        }, { merge: true })
      }
    } catch (error) {
      console.error('Error actualizando correo:', error)
      throw error
    }
  }

  const eliminarCorreoJuego = async (
    plataforma: GamePlatform,
    juegoId: string,
    correo: string
  ): Promise<void> => {
    try {
      const correoRef = doc(db, 'games', plataforma, 'juegos', juegoId, 'correos', correo)
      await deleteDoc(correoRef)
    } catch (error) {
      console.error('Error eliminando correo:', error)
      throw error
    }
  }

  const eliminarJuegoCompleto = async (
    plataforma: GamePlatform,
    juegoId: string
  ): Promise<void> => {
    try {
      // Primero eliminar todos los correos
      const correosRef = collection(db, 'games', plataforma, 'juegos', juegoId, 'correos')
      const correosSnapshot = await getDocs(correosRef)

      const deletePromises = correosSnapshot.docs.map((doc) => deleteDoc(doc.ref))
      await Promise.all(deletePromises)

      // Luego eliminar el documento del juego
      const juegoRef = doc(db, 'games', plataforma, 'juegos', juegoId)
      await deleteDoc(juegoRef)
    } catch (error) {
      console.error('Error eliminando juego completo:', error)
      throw error
    }
  }

  const crearJuego = async (
    plataforma: GamePlatform,
    nombre: string,
    foto?: string,
    isOffert?: boolean,
    version?: GamePlatform
  ): Promise<string> => {
    try {
      const juegoId = generarIdJuego(nombre)
      const juegoRef = doc(db, 'games', plataforma, 'juegos', juegoId)
      
      // Verificar si el juego ya existe
      const juegoDoc = await getDoc(juegoRef)
      if (juegoDoc.exists()) {
        throw new Error(`El juego "${nombre}" ya existe en esta plataforma`)
      }
      
      // Siempre crear el documento con al menos estos campos para asegurar que se cree en Firestore
      const juegoData: Record<string, any> = {
        createdAt: new Date(),
        nombre: nombre,
        version: version || plataforma // Si no se especifica, usar la plataforma
      }
      
      if (foto && foto.trim()) juegoData.foto = foto.trim()
      if (isOffert !== undefined) juegoData.isOffert = isOffert
      
      await setDoc(juegoRef, juegoData)
      return juegoId
    } catch (error) {
      console.error('Error creando juego:', error)
      throw error
    }
  }

  const actualizarJuego = async (
    plataforma: GamePlatform,
    juegoId: string,
    datos: {
      nombre?: string
      foto?: string
      version?: GamePlatform
      isOffert?: boolean
      tipoPromocion?: 'ninguna' | 'oferta' | 'promocion'
    }
  ): Promise<void> => {
    try {
      const juegoRef = doc(db, 'games', plataforma, 'juegos', juegoId)
      const updateData: Record<string, any> = {}
      
      if (datos.nombre !== undefined) updateData.nombre = datos.nombre
      if (datos.foto !== undefined) updateData.foto = datos.foto
      if (datos.version !== undefined) updateData.version = datos.version
      if (datos.tipoPromocion !== undefined) {
        updateData.tipoPromocion = datos.tipoPromocion
        // Actualizar también isOffert para compatibilidad
        updateData.isOffert = datos.tipoPromocion === 'oferta'
      }
      if (datos.isOffert !== undefined) updateData.isOffert = datos.isOffert
      
      await setDoc(juegoRef, updateData, { merge: true })
    } catch (error) {
      console.error('Error actualizando juego:', error)
      throw error
    }
  }

  const actualizarFotoJuego = async (
    plataforma: GamePlatform,
    juegoId: string,
    fotoUrl: string
  ): Promise<void> => {
    try {
      const juegoRef = doc(db, 'games', plataforma, 'juegos', juegoId)
      await setDoc(juegoRef, { foto: fotoUrl }, { merge: true })
    } catch (error) {
      console.error('Error actualizando foto:', error)
      throw error
    }
  }

  const generarIdJuego = (nombre: string): string => {
    return nombre
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
  }

  const buscarJuegos = (termino: string): GameSummary[] => {
    if (!termino) return games.value

    const terminoLower = termino.toLowerCase()
    return games.value.filter(
      (juego) =>
        juego.nombre.toLowerCase().includes(terminoLower) ||
        juego.id.toLowerCase().includes(terminoLower)
    )
  }

  const filtrarJuegosPorPrecio = (min?: number, max?: number): GameSummary[] => {
    return games.value.filter((juego) => {
      if (min !== undefined && juego.costo < min) return false
      if (max !== undefined && juego.costo > max) return false
      return true
    })
  }

  const buscarPorTelefono = async (
    telefono: string,
    plataforma: GamePlatform = 'PS4 & PS5'
  ): Promise<TelefonoSearchResult[]> => {
    if (!telefono || telefono.trim().length < 3) {
      return []
    }

    try {
      const resultados: TelefonoSearchResult[] = []
      
      // Normalizar teléfono de búsqueda: eliminar espacios, mantener números y +
      const telefonoInput = telefono.trim()
      const telefonoNormalizado = telefonoInput.replace(/\s+/g, '').toLowerCase()
      // Extraer solo los números (sin el +593 si está presente)
      const numerosBusqueda = telefonoNormalizado.replace(/[^\d]/g, '')
      
      // Cargar todos los juegos de la plataforma
      const plataformaRef = collection(db, 'games', plataforma, 'juegos')
      const querySnapshot = await getDocs(plataformaRef)

      // Iterar sobre cada juego
      for (const juegoDoc of querySnapshot.docs) {
        const juegoId = juegoDoc.id
        const juegoDocData = juegoDoc.data()

        // Obtener todos los correos del juego
        const correosRef = collection(db, 'games', plataforma, 'juegos', juegoId, 'correos')
        const correosSnapshot = await getDocs(correosRef)

        // Buscar en cada correo
        for (const correoDoc of correosSnapshot.docs) {
          const correoData = correoDoc.data()
          const cuentas = correoData.cuentas || []

          // Buscar en las cuentas del correo
          for (const cuenta of cuentas) {
            if (cuenta?.telefono) {
              // Normalizar teléfono de la cuenta de la misma manera
              const telefonoCuentaNormalizado = cuenta.telefono.replace(/\s+/g, '').toLowerCase()
              const numerosCuenta = telefonoCuentaNormalizado.replace(/[^\d]/g, '')
              
              // Buscar coincidencias:
              // 1. Coincidencia exacta normalizada
              // 2. Los números de búsqueda están contenidos en los números de la cuenta
              // 3. Los números de la cuenta están contenidos en los números de búsqueda
              // 4. Coincidencia parcial (al menos 6 dígitos coinciden)
              const coincide = 
                telefonoCuentaNormalizado === telefonoNormalizado ||
                telefonoCuentaNormalizado.includes(telefonoNormalizado) ||
                telefonoNormalizado.includes(telefonoCuentaNormalizado) ||
                numerosCuenta.includes(numerosBusqueda) ||
                numerosBusqueda.includes(numerosCuenta) ||
                (numerosBusqueda.length >= 6 && numerosCuenta.includes(numerosBusqueda)) ||
                (numerosCuenta.length >= 6 && numerosBusqueda.includes(numerosCuenta))
              
              if (coincide) {
                // Crear el objeto GameSummary para el resultado
                const nombreFromId = juegoId
                  .split('_')
                  .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(' ')

                let tipoPromocion: 'ninguna' | 'oferta' | 'promocion' = 'ninguna'
                if (juegoDocData.tipoPromocion) {
                  tipoPromocion = juegoDocData.tipoPromocion
                } else if (juegoDocData.isOffert === true) {
                  tipoPromocion = 'oferta'
                }

                const juegoSummary: GameSummary = {
                  id: juegoId,
                  nombre: juegoDocData.nombre || correoData.nombre || nombreFromId,
                  costo: juegoDocData.costo !== undefined ? juegoDocData.costo : (correoData.costo || 0),
                  version: juegoDocData.version || correoData.version || plataforma,
                  foto: juegoDocData.foto || '',
                  isOffert: juegoDocData.isOffert || false,
                  tipoPromocion,
                  totalCorreos: 0,
                  correos: [],
                  stockAccounts: 0
                }

                // Crear el objeto GameEmailAccount
                const emailAccount: GameEmailAccount = {
                  correo: correoDoc.id,
                  nombre: correoData.nombre || '',
                  costo: correoData.costo || 0,
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
                  juego: juegoSummary,
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
    plataforma: GamePlatform = 'PS4 & PS5'
  ): Promise<CorreoSearchResult[]> => {
    if (!correo || correo.trim().length < 3) {
      return []
    }

    try {
      const resultados: CorreoSearchResult[] = []
      
      // Normalizar correo de búsqueda: convertir a minúsculas y eliminar espacios
      const correoInput = correo.trim().toLowerCase()
      
      // Cargar todos los juegos de la plataforma
      const plataformaRef = collection(db, 'games', plataforma, 'juegos')
      const querySnapshot = await getDocs(plataformaRef)

      // Iterar sobre cada juego
      for (const juegoDoc of querySnapshot.docs) {
        const juegoId = juegoDoc.id
        const juegoDocData = juegoDoc.data()

        // Obtener todos los correos del juego
        const correosRef = collection(db, 'games', plataforma, 'juegos', juegoId, 'correos')
        const correosSnapshot = await getDocs(correosRef)

        // Buscar en cada correo
        for (const correoDoc of correosSnapshot.docs) {
          const correoId = correoDoc.id.toLowerCase()
          const correoData = correoDoc.data()
          
          // Buscar coincidencias en el ID del correo (que es el email)
          // Permitir búsqueda parcial
          if (correoId.includes(correoInput) || correoInput.includes(correoId)) {
            // Crear el objeto GameSummary para el resultado
            const nombreFromId = juegoId
              .split('_')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ')

            let tipoPromocion: 'ninguna' | 'oferta' | 'promocion' = 'ninguna'
            if (juegoDocData.tipoPromocion) {
              tipoPromocion = juegoDocData.tipoPromocion
            } else if (juegoDocData.isOffert === true) {
              tipoPromocion = 'oferta'
            }

            const juegoSummary: GameSummary = {
              id: juegoId,
              nombre: juegoDocData.nombre || correoData.nombre || nombreFromId,
              costo: juegoDocData.costo !== undefined ? juegoDocData.costo : (correoData.costo || 0),
              version: juegoDocData.version || correoData.version || plataforma,
              foto: juegoDocData.foto || '',
              isOffert: juegoDocData.isOffert || false,
              tipoPromocion,
              totalCorreos: 0,
              correos: [],
              stockAccounts: 0
            }

            // Crear el objeto GameEmailAccount
            const emailAccount: GameEmailAccount = {
              correo: correoDoc.id,
              nombre: correoData.nombre || '',
              costo: correoData.costo || 0,
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
              juego: juegoSummary,
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
    games,
    gameEmails,
    isLoadingGames,
    cargarJuegos,
    cargarCorreosJuego,
    cargarCorreoPorId,
    crearJuego,
    actualizarJuego,
    crearCorreoJuego,
    actualizarCorreoJuego,
    eliminarCorreoJuego,
    eliminarJuegoCompleto,
    actualizarFotoJuego,
    buscarJuegos,
    filtrarJuegosPorPrecio,
    buscarPorTelefono,
    buscarPorCorreo,
    generarIdJuego
  }
}
