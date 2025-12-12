import { createRouter, createWebHistory } from 'vue-router'
import type { RouteLocationNormalized, NavigationGuardNext } from 'vue-router'
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '@/config/firebase'
import { hasDayChanged } from '@/composables/useAuth'

// Lazy load views for code splitting
const HomeView = () => import('@/views/HomeView.vue')
const VerMasView = () => import('@/views/VerMasView.vue')
const LoginView = () => import('@/views/auth/LoginView.vue')
const AdminDashboard = () => import('@/views/admin/AdminDashboard.vue')
const EmployeeDashboard = () => import('@/views/employee/EmployeeDashboard.vue')
const NotFoundView = () => import('@/views/NotFoundView.vue')

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
      meta: { 
        requiresAuth: false,
        title: 'Zona Gamer - Juegos PS4 y PS5 Digital | Los Mejores Precios de Ecuador',
        description: 'Compra juegos digitales para PS4 y PS5 en Ecuador. Ofertas exclusivas, entrega inmediata y los mejores precios. Catálogo completo de juegos, DLCs y más.',
        keywords: 'juegos ps4, juegos ps5, juegos digitales, playstation, ecuador, ofertas, precios bajos, zona gamer, ps4 digital, ps5 digital',
        robots: 'index, follow'
      },
    },
    {
      path: '/ver-mas',
      name: 'VerMas',
      component: VerMasView,
      meta: { 
        requiresAuth: false,
        title: 'Catálogo Completo - Zona Gamer | Juegos PS4 y PS5',
        description: 'Explora nuestro catálogo completo de juegos digitales para PS4 y PS5. Filtra por precio, plataforma y encuentra las mejores ofertas.',
        keywords: 'catalogo juegos, juegos ps4, juegos ps5, ofertas, promociones, combos, zona gamer',
        robots: 'index, follow'
      },
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: { 
        requiresAuth: false,
        title: 'Iniciar Sesión - Zona Gamer',
        description: 'Inicia sesión en Zona Gamer para gestionar tu cuenta y realizar compras de juegos digitales para PS4 y PS5.',
        robots: 'noindex, nofollow'
      },
    },
    {
      path: '/admin',
      name: 'admin',
      component: AdminDashboard,
      meta: { 
        requiresAuth: true, 
        requiresRole: 'admin',
        title: 'Panel de Administración - Zona Gamer',
        description: 'Panel de control administrativo de Zona Gamer',
        robots: 'noindex, nofollow'
      },
    },
    {
      path: '/employee',
      name: 'employee',
      component: EmployeeDashboard,
      meta: { 
        requiresAuth: true, 
        requiresRole: 'employee',
        title: 'Panel de Empleado - Zona Gamer',
        description: 'Panel de control para empleados de Zona Gamer',
        robots: 'noindex, nofollow'
      },
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: NotFoundView,
      meta: { 
        requiresAuth: false,
        title: 'Página No Encontrada - Zona Gamer',
        description: 'La página que buscas no existe. Explora nuestro catálogo de juegos digitales para PS4 y PS5.',
        robots: 'noindex, follow'
      },
    },
  ],
  scrollBehavior(_to, _from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else {
      return { top: 0, behavior: 'smooth' }
    }
  }
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
    // Actualizar meta tags dinámicamente
    if (to.meta.title) {
      document.title = to.meta.title as string
    }
    
    if (to.meta.description) {
      const metaDescription = document.querySelector('meta[name="description"]') as HTMLMetaElement
      if (metaDescription) {
        metaDescription.setAttribute('content', to.meta.description as string)
      }
    }
    
    if (to.meta.robots) {
      const metaRobots = document.querySelector('meta[name="robots"]') as HTMLMetaElement
      if (metaRobots) {
        metaRobots.setAttribute('content', to.meta.robots as string)
      }
    }
    
    // Actualizar canonical URL
    const canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement
    if (canonical) {
      canonical.setAttribute('href', `https://zonagamer.com${to.path}`)
    }
    
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

    // Verificar si ha cambiado el día - si es así, cerrar sesión automáticamente
    if (hasDayChanged()) {
      // Limpiar la fecha de sesión
      localStorage.removeItem('zonagamer_session_date')
      // Cerrar sesión en Firebase
      await firebaseSignOut(auth)
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
