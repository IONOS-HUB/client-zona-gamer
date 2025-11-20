import { ref } from 'vue'
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  getDocs,
  where,
  Timestamp,
  limit as firestoreLimit
} from 'firebase/firestore'
import { db } from '@/config/firebase'
import type { Reporte, ReporteFilters } from '@/types/reporte'

const reportes = ref<Reporte[]>([])
const isLoadingReportes = ref(false)

export function useReportes() {
  /**
   * Crear un nuevo reporte cuando se genera un mensaje
   */
  const crearReporte = async (
    uid: string,
    email: string,
    nombreUsuario: string | undefined | null,
    rol: 'admin' | 'employee',
    juegoNombre: string,
    juegoId: string,
    plataforma: 'PS4 & PS5' | 'PS4' | 'PS5',
    correoUtilizado: string,
    codigosUsados: { codigo1: string; codigo2: string },
    plataformaMensaje: 'PS4' | 'PS5'
  ): Promise<void> => {
    try {
      const reportesRef = collection(db, 'reportes')
      
      const nuevoReporte = {
        uid,
        email,
        nombreUsuario: nombreUsuario || email || 'Usuario',
        rol,
        juegoNombre,
        juegoId,
        plataforma,
        correoUtilizado,
        codigosUsados,
        plataformaMensaje,
        fechaGeneracion: Timestamp.now(),
        createdAt: Timestamp.now()
      }

      await addDoc(reportesRef, nuevoReporte)
      console.log('✅ Reporte creado exitosamente')
    } catch (error) {
      console.error('❌ Error creando reporte:', error)
      throw error
    }
  }

  /**
   * Cargar todos los reportes con filtros opcionales
   */
  const cargarReportes = async (
    filtros?: ReporteFilters,
    limite: number = 100
  ): Promise<void> => {
    isLoadingReportes.value = true
    try {
      const reportesRef = collection(db, 'reportes')
      
      // Construir query base
      let q = query(reportesRef, orderBy('fechaGeneracion', 'desc'), firestoreLimit(limite))

      // Aplicar filtro de uid si existe
      if (filtros?.uid) {
        q = query(reportesRef, where('uid', '==', filtros.uid), orderBy('fechaGeneracion', 'desc'), firestoreLimit(limite))
      }
      // Aplicar filtro de rol si existe (solo si no hay filtro de uid)
      else if (filtros?.rol) {
        q = query(reportesRef, where('rol', '==', filtros.rol), orderBy('fechaGeneracion', 'desc'), firestoreLimit(limite))
      }

      const querySnapshot = await getDocs(q)
      
      let reportesTemp = querySnapshot.docs.map((doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          uid: data.uid,
          email: data.email,
          nombreUsuario: data.nombreUsuario,
          rol: data.rol,
          juegoNombre: data.juegoNombre,
          juegoId: data.juegoId,
          plataforma: data.plataforma,
          correoUtilizado: data.correoUtilizado,
          codigosUsados: data.codigosUsados,
          plataformaMensaje: data.plataformaMensaje,
          fechaGeneracion: data.fechaGeneracion?.toDate() || new Date(),
          createdAt: data.createdAt?.toDate() || new Date()
        } as Reporte
      })

      // Filtros adicionales en el cliente
      if (filtros?.fechaInicio) {
        reportesTemp = reportesTemp.filter(
          r => r.fechaGeneracion >= filtros.fechaInicio!
        )
      }

      if (filtros?.fechaFin) {
        reportesTemp = reportesTemp.filter(
          r => r.fechaGeneracion <= filtros.fechaFin!
        )
      }

      if (filtros?.plataforma) {
        reportesTemp = reportesTemp.filter(
          r => r.plataforma === filtros.plataforma
        )
      }

      if (filtros?.busqueda) {
        const busqueda = filtros.busqueda.toLowerCase()
        reportesTemp = reportesTemp.filter(r =>
          r.juegoNombre.toLowerCase().includes(busqueda) ||
          r.correoUtilizado.toLowerCase().includes(busqueda) ||
          r.email.toLowerCase().includes(busqueda) ||
          r.nombreUsuario?.toLowerCase().includes(busqueda)
        )
      }

      // Asignar al ref reactivo
      reportes.value = reportesTemp
      
      console.log('📊 Reportes cargados:', reportes.value.length)
    } catch (error) {
      console.error('Error cargando reportes:', error)
      throw error
    } finally {
      isLoadingReportes.value = false
    }
  }

  /**
   * Obtener estadísticas de reportes
   */
  const obtenerEstadisticas = () => {
    const totalReportes = reportes.value.length
    const porUsuario = reportes.value.reduce((acc, reporte) => {
      acc[reporte.uid] = (acc[reporte.uid] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const porPlataforma = reportes.value.reduce((acc, reporte) => {
      acc[reporte.plataformaMensaje] = (acc[reporte.plataformaMensaje] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const porRol = reportes.value.reduce((acc, reporte) => {
      acc[reporte.rol] = (acc[reporte.rol] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      totalReportes,
      porUsuario,
      porPlataforma,
      porRol
    }
  }

  return {
    reportes,
    isLoadingReportes,
    crearReporte,
    cargarReportes,
    obtenerEstadisticas
  }
}

