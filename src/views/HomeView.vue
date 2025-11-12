<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useGames } from '@/composables/useGames'
import type { GamePlatform, GameSummary } from '@/types/game'

const router = useRouter()
const { currentUser, signOut } = useAuth()
const { games, isLoadingGames, cargarJuegos } = useGames()

const plataformaSeleccionada = ref<GamePlatform>('PS4 & PS5')
const searchTerm = ref('')

const juegosFiltrados = computed(() => {
  if (!searchTerm.value) return games.value
  
  const termino = searchTerm.value.toLowerCase()
  return games.value.filter(juego => 
    juego.nombre.toLowerCase().includes(termino)
  )
})

const formatearPrecio = (precio: number): string => {
  return new Intl.NumberFormat('es-US', {
    style: 'currency',
    currency: 'USD'
  }).format(precio)
}

const handlePlataformaChange = async (): Promise<void> => {
  await cargarJuegos(plataformaSeleccionada.value)
}

const handleLogout = async (): Promise<void> => {
  await signOut()
}

const irALogin = (): void => {
  router.push('/login')
}

onMounted(() => {
  cargarJuegos(plataformaSeleccionada.value)
})
</script>

<template>
  <div class="min-h-screen bg-base-200">
    <!-- Navbar -->
    <div class="navbar bg-base-100 shadow-lg sticky top-0 z-50">
      <div class="flex-1">
        <a class="btn btn-ghost text-xl">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
          </svg>
          Zona Gamer
        </a>
      </div>
      <div class="flex-none gap-2">
        <div v-if="currentUser" class="dropdown dropdown-end">
          <div tabindex="0" role="button" class="btn btn-ghost btn-circle avatar placeholder">
            <div class="bg-neutral text-neutral-content rounded-full w-10">
              <span class="text-xl">{{ currentUser?.email?.[0]?.toUpperCase() || 'U' }}</span>
            </div>
          </div>
          <ul
            tabindex="0"
            class="mt-3 z-1 p-2 shadow menu menu-sm dropdown-content bg-base-100 rounded-box w-52"
          >
            <li><a>{{ currentUser.email }}</a></li>
            <li><a @click="handleLogout">Cerrar Sesión</a></li>
          </ul>
        </div>
        <button v-else class="btn btn-primary" @click="irALogin">
          Iniciar Sesión
        </button>
      </div>
    </div>

    <!-- Hero Section -->
    <div class="hero bg-linear-to-r from-primary to-secondary text-primary-content py-16">
      <div class="hero-content text-center">
        <div class="max-w-2xl">
          <h1 class="text-5xl font-bold mb-4">
            🎮 Catálogo de Juegos Digitales
          </h1>
          <p class="text-lg opacity-90">
            Encuentra los mejores juegos para tu plataforma favorita
          </p>
        </div>
      </div>
    </div>

    <!-- Controles -->
    <div class="container mx-auto px-6 py-8">
      <div class="flex flex-col md:flex-row gap-4 mb-8">
        <!-- Selector de Plataforma -->
        <select 
          v-model="plataformaSeleccionada" 
          class="select select-bordered w-full md:w-64"
          @change="handlePlataformaChange"
        >
          <option value="PS4 & PS5">🎮 PS4 & PS5</option>
          <option value="PS4">🎮 PS4</option>
          <option value="PS5">🎮 PS5</option>
          <option value="Xbox">🎮 Xbox</option>
          <option value="Nintendo Switch">🎮 Nintendo Switch</option>
        </select>

        <!-- Buscador -->
        <input
          v-model="searchTerm"
          type="text"
          placeholder="Buscar juegos..."
          class="input input-bordered flex-1"
        />

        <!-- Contador -->
        <div class="stats shadow">
          <div class="stat py-3 px-6">
            <div class="stat-title">Juegos</div>
            <div class="stat-value text-primary text-2xl">{{ juegosFiltrados.length }}</div>
          </div>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="isLoadingGames" class="flex justify-center items-center min-h-[400px]">
        <div class="text-center">
          <span class="loading loading-spinner loading-lg text-primary"></span>
          <p class="mt-4 text-lg">Cargando juegos...</p>
        </div>
      </div>

      <!-- No hay juegos -->
      <div v-else-if="juegosFiltrados.length === 0" class="text-center py-16">
        <div class="text-6xl mb-4">🎮</div>
        <h2 class="text-2xl font-bold mb-2">No se encontraron juegos</h2>
        <p class="text-gray-500">Intenta con otra búsqueda o plataforma</p>
      </div>

      <!-- Grid de Juegos -->
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        <div 
          v-for="juego in juegosFiltrados" 
          :key="juego.id"
          class="card bg-base-100 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
        >
          <!-- Imagen del juego -->
          <figure class="relative aspect-3/4 bg-base-300">
            <img 
              v-if="juego.foto" 
              :src="juego.foto" 
              :alt="juego.nombre"
              class="w-full h-full object-cover"
              loading="lazy"
            />
            <div v-else class="w-full h-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-24 w-24 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            
            <!-- Badge de plataforma -->
            <div class="absolute top-2 right-2">
              <div class="badge badge-primary badge-sm">{{ juego.version }}</div>
            </div>

            <!-- Badge de disponibilidad -->
            <div class="absolute top-2 left-2">
              <div class="badge badge-success badge-sm">
                {{ juego.totalCorreos }} disponibles
              </div>
            </div>
          </figure>

          <div class="card-body p-4">
            <!-- Nombre del juego -->
            <h2 class="card-title text-base line-clamp-2 min-h-12">
              {{ juego.nombre }}
            </h2>

            <!-- Precio y acción -->
            <div class="card-actions justify-between items-center mt-2">
              <div class="text-2xl font-bold text-primary">
                {{ formatearPrecio(juego.costo) }}
              </div>
              <button class="btn btn-sm btn-primary">
                Ver más
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <footer class="footer footer-center p-10 bg-base-100 text-base-content mt-16">
      <aside>
        <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
        </svg>
        <p class="font-bold">
          Zona Gamer
        </p>
        <p>Tu tienda de juegos digitales de confianza</p>
        <p class="text-sm opacity-70">© 2024 - Todos los derechos reservados</p>
      </aside>
    </footer>
  </div>
</template>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  line-clamp: 2;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
