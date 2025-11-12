import { createRouter, createWebHistory } from 'vue-router'
import type { RouteLocationNormalized, NavigationGuardNext } from 'vue-router'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '@/config/firebase'
import HomeView from '@/views/HomeView.vue'
import LoginView from '@/views/auth/LoginView.vue'
import AdminDashboard from '@/views/admin/AdminDashboard.vue'
import EmployeeDashboard from '@/views/employee/EmployeeDashboard.vue'
import GamesManager from '@/views/admin/GamesManager.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
      meta: { requiresAuth: false },
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: { requiresAuth: false },
    },
    {
      path: '/admin',
      name: 'admin',
      component: AdminDashboard,
      meta: { requiresAuth: true, requiresRole: 'admin' },
    },
    {
      path: '/employee',
      name: 'employee',
      component: EmployeeDashboard,
      meta: { requiresAuth: true, requiresRole: 'employee' },
    },
    {
      path: '/games',
      name: 'games',
      component: GamesManager,
      meta: { requiresAuth: true, requiresRole: 'employee' },
    },
  ],
})

// Helper para esperar a que Firebase Auth inicialice
const getCurrentUser = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        unsubscribe()
        resolve(user)
      },
      reject
    )
  })
}

// Guard de navegación
router.beforeEach(
  async (
    to: RouteLocationNormalized,
    _from: RouteLocationNormalized,
    next: NavigationGuardNext
  ) => {
    // Esperar a que Firebase Auth inicialice
    const currentUser = await getCurrentUser()

    const requiresAuth = to.meta.requiresAuth
    const requiresRole = to.meta.requiresRole as string | undefined

    // Si la ruta no requiere autenticación, permitir acceso
    if (!requiresAuth) {
      next()
      return
    }

    // Si la ruta requiere autenticación pero no hay usuario
    if (!currentUser) {
      next('/login')
      return
    }

    // Si la ruta requiere un rol específico
    if (requiresRole) {
      try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid))

        if (!userDoc.exists()) {
          // Si no existe el documento, es un cliente, no tiene acceso
          next('/')
          return
        }

        const userData = userDoc.data()
        const userRole = userData.role

        // Verificar si el usuario tiene el rol requerido
        if (requiresRole === 'admin' && userRole !== 'admin') {
          next('/')
          return
        }

        if (requiresRole === 'employee' && userRole !== 'employee' && userRole !== 'admin') {
          next('/')
          return
        }

        next()
      } catch (error) {
        console.error('Error verificando rol:', error)
        next('/login')
      }
      return
    }

    next()
  }
)

export default router
