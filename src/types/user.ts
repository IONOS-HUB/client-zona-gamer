export type UserRole = 'admin' | 'employee' | 'client'

export interface AppUser {
  uid: string
  email: string
  role: UserRole
  displayName?: string
  createdAt: Date
  createdBy?: string
}

