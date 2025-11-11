<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useRoles } from '@/composables/useRoles'

const router = useRouter()
const { signOut } = useAuth()
const { currentUserData } = useRoles()

const handleLogout = async (): Promise<void> => {
  await signOut()
  router.push('/login')
}
</script>

<template>
  <div class="min-h-screen bg-base-200">
    <!-- Navbar -->
    <div class="navbar bg-base-100 shadow-lg">
      <div class="flex-1">
        <a class="btn btn-ghost text-xl">Panel de Empleado</a>
      </div>
      <div class="flex-none gap-2">
        <div class="dropdown dropdown-end">
          <div tabindex="0" role="button" class="btn btn-ghost">
            {{ currentUserData?.email }}
          </div>
          <ul
            tabindex="0"
            class="mt-3 z-[1] p-2 shadow menu menu-sm dropdown-content bg-base-100 rounded-box w-52"
          >
            <li><a @click="handleLogout">Cerrar Sesión</a></li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Contenido -->
    <div class="container mx-auto p-6">
      <div class="hero min-h-[60vh] bg-base-100 rounded-lg shadow-xl">
        <div class="hero-content text-center">
          <div class="max-w-md">
            <h1 class="text-4xl font-bold">
              ¡Bienvenido, {{ currentUserData?.displayName || 'Empleado' }}!
            </h1>
            <p class="py-6">
              Este es tu panel de empleado. Aquí podrás gestionar las tareas asignadas.
            </p>
            <div class="stats shadow">
              <div class="stat">
                <div class="stat-title">Rol</div>
                <div class="stat-value text-primary">Empleado</div>
                <div class="stat-desc">{{ currentUserData?.email }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Sección de funcionalidades futuras -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <div class="card bg-base-100 shadow-xl">
          <div class="card-body">
            <h2 class="card-title">Pedidos</h2>
            <p>Gestiona los pedidos de los clientes</p>
            <div class="badge badge-primary">Próximamente</div>
          </div>
        </div>

        <div class="card bg-base-100 shadow-xl">
          <div class="card-body">
            <h2 class="card-title">Inventario</h2>
            <p>Consulta el inventario disponible</p>
            <div class="badge badge-primary">Próximamente</div>
          </div>
        </div>

        <div class="card bg-base-100 shadow-xl">
          <div class="card-body">
            <h2 class="card-title">Reportes</h2>
            <p>Genera reportes de ventas</p>
            <div class="badge badge-primary">Próximamente</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

