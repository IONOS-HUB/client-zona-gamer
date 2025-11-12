import { ref, computed } from 'vue'
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore'
import { db } from '@/config/firebase'
import { useCurrentUser } from 'vuefire'
import type { AppUser, UserRole } from '@/types/user'

const currentUserData = ref<AppUser | null>(null)
const isLoadingUserData = ref(false)

export function useRoles() {
  const firebaseUser = useCurrentUser()

  const loadUserData = async (): Promise<void> => {
    if (!firebaseUser.value) {
      currentUserData.value = null
      return
    }

    isLoadingUserData.value = true
    try {
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.value.uid))
      
      if (userDoc.exists()) {
        const data = userDoc.data()
        currentUserData.value = {
          uid: firebaseUser.value.uid,
          email: firebaseUser.value.email || '',
          role: data.role || 'client',
          displayName: data.displayName,
          createdAt: data.createdAt?.toDate() || new Date(),
          createdBy: data.createdBy,
        }
      } else {
        // Si no existe el documento, es un cliente por defecto
        currentUserData.value = {
          uid: firebaseUser.value.uid,
          email: firebaseUser.value.email || '',
          role: 'client',
          createdAt: new Date(),
        }
      }
    } catch (error) {
      console.error('Error cargando datos del usuario:', error)
      currentUserData.value = null
    } finally {
      isLoadingUserData.value = false
    }
  }

  const createUserWithRole = async (
    uid: string,
    email: string,
    role: UserRole,
    createdBy: string,
    displayName?: string
  ): Promise<void> => {
    const userData: AppUser = {
      uid,
      email,
      role,
      displayName,
      createdAt: new Date(),
      createdBy,
    }

    await setDoc(doc(db, 'users', uid), userData)
  }

  const updateUserRole = async (uid: string, newRole: UserRole): Promise<void> => {
    try {
      const userRef = doc(db, 'users', uid)
      await setDoc(userRef, { role: newRole }, { merge: true })
    } catch (error) {
      console.error('Error actualizando rol del usuario:', error)
      throw error
    }
  }

  const updateUserData = async (
    uid: string,
    displayName?: string,
    email?: string
  ): Promise<void> => {
    try {
      const userRef = doc(db, 'users', uid)
      const updateData: Partial<AppUser> = {}
      
      if (displayName !== undefined) {
        updateData.displayName = displayName
      }
      if (email !== undefined) {
        updateData.email = email
      }
      
      await setDoc(userRef, updateData, { merge: true })
    } catch (error) {
      console.error('Error actualizando datos del usuario:', error)
      throw error
    }
  }

  const deleteUser = async (uid: string): Promise<void> => {
    try {
      const userRef = doc(db, 'users', uid)
      await deleteDoc(userRef)
    } catch (error) {
      console.error('Error eliminando usuario:', error)
      throw error
    }
  }

  const isAdmin = computed(() => currentUserData.value?.role === 'admin')
  const isEmployee = computed(() => currentUserData.value?.role === 'employee')
  const isClient = computed(() => currentUserData.value?.role === 'client')
  const hasAdminAccess = computed(() => isAdmin.value)
  const hasEmployeeAccess = computed(() => isAdmin.value || isEmployee.value)

  return {
    currentUserData,
    isLoadingUserData,
    loadUserData,
    createUserWithRole,
    updateUserRole,
    updateUserData,
    deleteUser,
    isAdmin,
    isEmployee,
    isClient,
    hasAdminAccess,
    hasEmployeeAccess,
  }
}

