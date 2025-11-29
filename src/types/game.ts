export type GamePlatform = 'PS4 & PS5' | 'PS4' | 'PS5'

export type AccountType = 'Principal PS4' | 'Secundaria PS4' | 'Principal PS5' | 'Secundaria PS5'

export type PromocionType = 'ninguna' | 'oferta' | 'promocion'

export interface AccountOwner {
  nombre: string
  telefono: string
  tipo: AccountType
  saldo?: number // Saldo opcional de la cuenta
  hasStock?: boolean // Indica si esta cuenta representa stock disponible
}

// Estructura de precios para cada tipo de cuenta
export interface GamePrices {
  ps4Principal: number
  ps4Secundaria: number
  ps5Principal: number
  ps5Secundaria: number
}

// Cada correo dentro de un juego tiene toda esta información
export interface GameEmailAccount {
  correo: string // ID del documento
  nombre: string // Nombre del juego (repetido en cada correo)
  precios: GamePrices // Objeto con los 4 precios
  version: GamePlatform
  codigoMaster: string
  codigosGenerados: string[]
  fecha: Date
  codigo: string
  cuentas: AccountOwner[] // Array de dueños de cuentas
  saldo?: number // Saldo del correo (opcional)
  createdAt: Date
  updatedAt: Date
  createdBy?: string
  // Legacy: mantener costo para compatibilidad durante migración
  costo?: number
}

// Información resumida del juego (agrupando todos los correos)
export interface GameSummary {
  id: string // Nombre del juego (ej: a_way_out)
  nombre: string
  precios: GamePrices // Objeto con los 4 precios
  version: GamePlatform
  foto?: string // URL de la imagen del juego
  activo?: boolean // Si el juego está visible/activo en la tienda (por defecto true)
  isOffert?: boolean // Si el juego está en oferta (legacy - mantener por compatibilidad)
  tipoPromocion?: PromocionType // Tipo de promoción: ninguna, oferta o promocion
  totalCorreos: number
  correos: string[] // Lista de correos asociados
  stockAccounts?: number // Número de cuentas marcadas como stock
  descuento?: number // Porcentaje de descuento (0-100)
  precioOriginal?: number // Precio antes del descuento (legacy)
  rating?: number // Calificación (0-5)
  totalReviews?: number // Número de reseñas
  destacado?: boolean // Si debe aparecer en la sección de ofertas
  // Legacy: mantener costo para compatibilidad durante migración
  costo?: number
}

// Datos del documento principal del juego (a_way_out)
export interface GameDocument {
  nombre?: string
  foto?: string
  version?: GamePlatform // Categoría del juego: PS4, PS5, PS4 & PS5, etc.
  activo?: boolean // Si el juego está visible/activo en la tienda
  isOffert?: boolean // Legacy - mantener por compatibilidad
  tipoPromocion?: PromocionType
  precios?: GamePrices // Objeto con los 4 precios (actualizado por el último correo)
  ultimaActualizacionPrecio?: Date // Fecha del último correo que actualizó el precio
  // Legacy: mantener costo para compatibilidad durante migración
  costo?: number
}

export interface GameFilters {
  plataforma?: GamePlatform
  precioMin?: number
  precioMax?: number
  busqueda?: string
}

export interface TelefonoSearchResult {
  juego: GameSummary
  correo: GameEmailAccount
  cuenta: AccountOwner
}

export interface CorreoSearchResult {
  juego: GameSummary
  correo: GameEmailAccount
}

