export interface Reporte {
  id?: string
  uid: string // UID del usuario que generó el mensaje
  email: string // Email del usuario que generó el mensaje
  nombreUsuario?: string // Nombre del usuario
  rol: 'admin' | 'employee' // Rol del usuario
  
  // Información del juego y correo
  juegoNombre: string
  juegoId: string
  plataforma: 'PS4 & PS5' | 'PS4' | 'PS5'
  correoUtilizado: string
  
  // Códigos usados
  codigosUsados: {
    codigo1: string
    codigo2: string
  }
  
  // Plataforma del mensaje generado
  plataformaMensaje: 'PS4' | 'PS5'
  
  // Información del cliente/usuario del correo (asignada al generar mensaje)
  clienteNombre?: string
  clienteTelefono?: string
  tipoCuenta?: 'Principal PS4' | 'Secundaria PS4' | 'Principal PS5' | 'Secundaria PS5'
  
  // Metadata
  fechaGeneracion: Date
  createdAt: Date
}

export interface ReporteFilters {
  uid?: string
  rol?: 'admin' | 'employee'
  fechaInicio?: Date
  fechaFin?: Date
  plataforma?: 'PS4 & PS5' | 'PS4' | 'PS5'
  busqueda?: string
}

