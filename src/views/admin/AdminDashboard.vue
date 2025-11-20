<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useRoles } from '@/composables/useRoles'
import { BarChart3, Users, Gamepad2, Home, Phone, Mail, FileText } from 'lucide-vue-next'

// Importar componentes refactorizados
import StatsOverview from '@/components/admin/StatsOverview.vue'
import UsersManagement from '@/components/admin/UsersManagement.vue'
import TelefonoSearch from '@/components/admin/TelefonoSearch.vue'
import CorreoSearch from '@/components/admin/CorreoSearch.vue'
import GamesManagementSection from '@/components/admin/GamesManagementSection.vue'
import ReportesSection from '@/components/admin/ReportesSection.vue'

import type { GameSummary } from '@/types/game'

const router = useRouter()
const { signOut } = useAuth()
const { currentUserData, loadUserData } = useRoles()

// Estado para el tab activo
const activeTab = ref<'stats' | 'users' | 'telefono' | 'correo' | 'games' | 'reportes'>('stats')

// Referencias a componentes
const gamesManagementRef = ref<InstanceType<typeof GamesManagementSection> | null>(null)

const handleLogout = async (): Promise<void> => {
  await signOut()
  router.push('/login')
}

const irAHome = (): void => {
  router.push('/')
}

const handleVerDetallesJuego = (juegoId: string): void => {
  // Cambiar al tab de juegos
  activeTab.value = 'games'
  
  // TODO: Implementar lógica para abrir juego específico en GamesManagementSection
  // Necesitaríamos exponer una función desde GamesManagementSection para navegar a un juego específico
}

const handleGameClickFromStats = async (juego: GameSummary): Promise<void> => {
  // Cambiar al tab de juegos
  activeTab.value = 'games'
  
  // Pequeño delay para asegurar que el componente se monte
  setTimeout(() => {
    if (gamesManagementRef.value) {
      gamesManagementRef.value.verCorreosJuego(juego)
    }
  }, 100)
}

onMounted(async () => {
  await loadUserData()
  
  // Si hay un juego para abrir desde el state del router
  const openGame = window.history.state?.openGame as GameSummary | undefined
  
  if (openGame) {
    handleGameClickFromStats(openGame)
  }
})
</script>

<template>
  <div class="min-h-screen bg-base-200">
    <!-- Navbar -->
    <div class="navbar bg-base-100 shadow-lg border-b border-white/10">
      <div class="flex-1">
        <a class="btn btn-ghost text-xl font-bold">
          <BarChart3 :size="24" class="text-primary" />
          Panel de Administración
        </a>
      </div>
      <div class="flex-none gap-2">
        <button @click="irAHome" class="btn btn-ghost gap-2">
          <Home :size="20" />
          <span class="hidden md:inline">Ir a la Tienda</span>
        </button>
        <div class="dropdown dropdown-end">
          <div tabindex="0" role="button" class="btn btn-ghost gap-2">
            <div class="avatar placeholder">
              <div class="bg-primary text-primary-content rounded-full w-8">
                <span class="text-xs">{{ currentUserData?.email?.charAt(0).toUpperCase() }}</span>
              </div>
            </div>
            <span class="hidden md:inline">{{ currentUserData?.email }}</span>
          </div>
          <ul
            tabindex="0"
            class="mt-3 z-100 p-2 shadow-lg menu menu-sm dropdown-content bg-base-100 rounded-box w-52 border border-white/10"
          >
            <li class="menu-title">
              <span class="text-xs">Administrador</span>
            </li>
            <div class="divider my-1"></div>
            <li><a @click="handleLogout" class="text-error">Cerrar Sesión</a></li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Tabs de Navegación -->
    <div class="bg-base-100 border-b border-white/10 sticky top-0 z-50">
      <div class="container mx-auto">
        <div class="tabs tabs-boxed bg-transparent gap-2 p-4">
          <button 
            @click="activeTab = 'stats'" 
            :class="['tab gap-2 transition-all', activeTab === 'stats' ? 'tab-active' : '']"
          >
            <BarChart3 :size="18" />
            Estadísticas
          </button>
          <button 
            @click="activeTab = 'users'" 
            :class="['tab gap-2 transition-all', activeTab === 'users' ? 'tab-active' : '']"
          >
            <Users :size="18" />
            Gestión de Usuarios
          </button>
          <button 
            @click="activeTab = 'telefono'" 
            :class="['tab gap-2 transition-all', activeTab === 'telefono' ? 'tab-active' : '']"
          >
            <Phone :size="18" />
            Búsqueda por Teléfono
          </button>
          <button 
            @click="activeTab = 'correo'" 
            :class="['tab gap-2 transition-all', activeTab === 'correo' ? 'tab-active' : '']"
          >
            <Mail :size="18" />
            Búsqueda por Correo
          </button>
          <button 
            @click="activeTab = 'games'" 
            :class="['tab gap-2 transition-all', activeTab === 'games' ? 'tab-active' : '']"
          >
            <Gamepad2 :size="18" />
            Gestión de Juegos
          </button>
          <button 
            @click="activeTab = 'reportes'" 
            :class="['tab gap-2 transition-all', activeTab === 'reportes' ? 'tab-active' : '']"
          >
            <FileText :size="18" />
            Reportes
          </button>
        </div>
      </div>
    </div>

    <!-- Contenido por Tab -->
    <div class="container mx-auto p-6">
      <!-- Tab: Estadísticas -->
      <div v-if="activeTab === 'stats'">
        <StatsOverview 
          :read-only="false" 
          :on-game-click="handleGameClickFromStats"
        />
      </div>

      <!-- Tab: Gestión de Usuarios -->
      <div v-if="activeTab === 'users'">
        <UsersManagement />
      </div>

      <!-- Tab: Búsqueda por Teléfono -->
      <div v-if="activeTab === 'telefono'">
        <TelefonoSearch @ver-detalles-juego="handleVerDetallesJuego" />
      </div>

      <!-- Tab: Búsqueda por Correo -->
      <div v-if="activeTab === 'correo'">
        <CorreoSearch @ver-detalles-juego="handleVerDetallesJuego" />
      </div>

      <!-- Tab: Gestión de Juegos -->
      <div v-if="activeTab === 'games'">
        <GamesManagementSection ref="gamesManagementRef" />
      </div>

      <!-- Tab: Reportes -->
      <div v-if="activeTab === 'reportes'">
        <ReportesSection />
      </div>
    </div>
  </div>
</template>
