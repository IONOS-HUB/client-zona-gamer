export type GamePlatform = 'PS4 & PS5' | 'PS4' | 'PS5'

export type AccountType = 'Principal PS4' | 'Secundaria PS4' | 'Principal PS5'

export type PromocionType = 'ninguna' | 'oferta' | 'promocion'

export interface AccountOwner {
  nombre: string
  telefono: string
  tipo: AccountType
  saldo?: number // Saldo opcional de la cuenta
}

// Cada correo dentro de un juego tiene toda esta información
export interface GameEmailAccount {
  correo: string // ID del documento
  nombre: string // Nombre del juego (repetido en cada correo)
  costo: number
  version: GamePlatform
  codigoMaster: string
  codigosGenerados: string[]
  fecha: Date
  codigo: string
  cuentas: AccountOwner[] // Array de dueños de cuentas
  createdAt: Date
  updatedAt: Date
  createdBy?: string
}

// Información resumida del juego (agrupando todos los correos)
export interface GameSummary {
  id: string // Nombre del juego (ej: a_way_out)
  nombre: string
  costo: number
  version: GamePlatform
  foto?: string // URL de la imagen del juego
  isOffert?: boolean // Si el juego está en oferta (legacy - mantener por compatibilidad)
  tipoPromocion?: PromocionType // Tipo de promoción: ninguna, oferta o promocion
  totalCorreos: number
  correos: string[] // Lista de correos asociados
  descuento?: number // Porcentaje de descuento (0-100)
  precioOriginal?: number // Precio antes del descuento
  rating?: number // Calificación (0-5)
  totalReviews?: number // Número de reseñas
  destacado?: boolean // Si debe aparecer en la sección de ofertas
}

// Datos del documento principal del juego (a_way_out)
export interface GameDocument {
  nombre?: string
  foto?: string
  version?: GamePlatform // Categoría del juego: PS4, PS5, PS4 & PS5, etc.
  isOffert?: boolean // Legacy - mantener por compatibilidad
  tipoPromocion?: PromocionType
  costo?: number // Precio actual del juego (actualizado por el último correo)
  ultimaActualizacionPrecio?: Date // Fecha del último correo que actualizó el precio
}

export interface GameFilters {
  plataforma?: GamePlatform
  precioMin?: number
  precioMax?: number
  busqueda?: string
}

