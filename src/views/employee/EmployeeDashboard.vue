<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useRoles } from '@/composables/useRoles'
import { BarChart3, Gamepad2, Home } from 'lucide-vue-next'
import StatsOverview from '@/components/admin/StatsOverview.vue'

const router = useRouter()
const { signOut } = useAuth()
const { currentUserData } = useRoles()

const activeTab = ref<'stats'>('stats')

const handleLogout = async (): Promise<void> => {
  await signOut()
  router.push('/login')
}

const irAHome = (): void => {
  router.push('/')
}
</script>

<template>
  <div class="min-h-screen bg-base-200">
    <!-- Navbar -->
    <div class="navbar bg-base-100 shadow-lg border-b border-white/10">
      <div class="flex-1">
        <a class="btn btn-ghost text-xl font-bold">
          <BarChart3 :size="24" class="text-warning" />
          Panel de Empleado
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
              <div class="bg-warning text-warning-content rounded-full w-8">
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
              <span class="text-xs">Empleado</span>
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
            @click="router.push('/games')" 
            class="tab gap-2 transition-all hover:tab-active"
          >
            <Gamepad2 :size="18" />
            Consulta de Juegos
          </button>
        </div>
      </div>
    </div>

    <!-- Contenido por Tab -->
    <div class="container mx-auto p-6">
      <!-- Tab: Estadísticas -->
      <div v-if="activeTab === 'stats'">
        <div class="alert alert-info mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span><strong>Modo Solo Lectura:</strong> Como empleado, puedes consultar las estadísticas pero no modificar datos.</span>
        </div>
        <StatsOverview :read-only="true" />
      </div>
    </div>
  </div>
</template>

