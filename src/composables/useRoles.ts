import { ref, computed } from 'vue'
import { doc, getDoc, setDoc } from 'firebase/firestore'
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
    isAdmin,
    isEmployee,
    isClient,
    hasAdminAccess,
    hasEmployeeAccess,
  }
}

