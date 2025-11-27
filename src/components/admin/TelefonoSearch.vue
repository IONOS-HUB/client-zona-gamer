<script setup lang="ts">
import { ref } from 'vue'
import { useGames } from '@/composables/useGames'
import type { TelefonoSearchResult, GamePlatform } from '@/types/game'
import { Phone, Search } from 'lucide-vue-next'

const { buscarPorTelefono } = useGames()

const emit = defineEmits<{
  verDetallesJuego: [juegoId: string]
}>()

const telefonoBusqueda = ref('')
const resultadosTelefono = ref<TelefonoSearchResult[]>([])
const isLoadingTelefono = ref(false)
const plataformaTelefono = ref<GamePlatform>('PS4 & PS5')

const buscarTelefono = async (): Promise<void> => {
  if (!telefonoBusqueda.value || telefonoBusqueda.value.trim().length < 3) {
    resultadosTelefono.value = []
    return
  }

  isLoadingTelefono.value = true
  try {
    resultadosTelefono.value = await buscarPorTelefono(telefonoBusqueda.value.trim(), plataformaTelefono.value)
  } catch (error) {
    console.error('Error buscando teléfono:', error)
  } finally {
    isLoadingTelefono.value = false
  }
}

const formatearPrecio = (precio: number): string => {
  return new Intl.NumberFormat('es-EC', {
    style: 'currency',
    currency: 'USD'
  }).format(precio)
}

const formatearFecha = (fecha: Date | string): string => {
  const date = typeof fecha === 'string' ? new Date(fecha) : fecha
  return new Intl.DateTimeFormat('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).format(date)
}
</script>

<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <div>
        <h1 class="text-3xl font-bold flex items-center gap-3">
          <Phone :size="32" class="text-primary" />
          Búsqueda por Teléfono
        </h1>
        <p class="text-base-content/60 mt-1">Busca cuentas por número de teléfono</p>
      </div>
    </div>

    <!-- Formulario de búsqueda -->
    <div class="card bg-base-100 shadow-xl mb-6">
      <div class="card-body">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="form-control md:col-span-2">
            <label class="label">
              <span class="label-text font-semibold">Número de Teléfono</span>
            </label>
            <div class="relative">
              <input
                v-model="telefonoBusqueda"
                type="text"
                placeholder="Ej: +593 99 358 6097 o 993586097"
                class="input input-bordered w-full pl-10"
                @keyup.enter="buscarTelefono"
                autocomplete="off"
              />
              <Phone :size="20" class="absolute left-3 top-3 text-base-content/40" />
            </div>
          </div>
          <div class="form-control">
            <label class="label">
              <span class="label-text font-semibold">Plataforma</span>
            </label>
            <select v-model="plataformaTelefono" class="select select-bordered">
              <option value="PS4 & PS5">PS4 & PS5</option>
              <option value="PS4">PS4</option>
              <option value="PS5">PS5</option>
            </select>
          </div>
        </div>
        <div class="card-actions justify-end mt-4">
          <button 
            @click="buscarTelefono" 
            class="btn btn-primary gap-2"
            :disabled="isLoadingTelefono || !telefonoBusqueda || telefonoBusqueda.trim().length < 3"
          >
            <Search :size="18" />
            {{ isLoadingTelefono ? 'Buscando...' : 'Buscar' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Resultados -->
    <div v-if="isLoadingTelefono" class="flex justify-center p-8">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <div v-else-if="resultadosTelefono.length === 0 && telefonoBusqueda && telefonoBusqueda.trim().length >= 3" class="card bg-base-100 shadow-xl">
      <div class="card-body text-center">
        <p class="text-base-content/60">No se encontraron cuentas con ese número de teléfono</p>
      </div>
    </div>

    <div v-else-if="resultadosTelefono.length > 0" class="space-y-4">
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title">
            Resultados encontrados ({{ resultadosTelefono.length }})
          </h2>
        </div>
      </div>

      <div v-for="(resultado, index) in resultadosTelefono" :key="index" class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <div class="flex justify-between items-start mb-4">
            <div>
              <h3 class="card-title text-lg">{{ resultado.cuenta.nombre }}</h3>
              <p class="text-base-content/60 mt-1">
                <Phone :size="16" class="inline mr-1" />
                {{ resultado.cuenta.telefono }}
              </p>
            </div>
            <div class="badge badge-lg" :class="{
              'badge-primary': resultado.cuenta.tipo.includes('Principal'),
              'badge-secondary': resultado.cuenta.tipo.includes('Secundaria')
            }">
              {{ resultado.cuenta.tipo }}
            </div>
          </div>

          <div class="divider"></div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 class="font-semibold mb-2">Información del Juego</h4>
              <div class="space-y-1 text-sm">
                <p><span class="font-medium">Juego:</span> {{ resultado.juego.nombre }}</p>
                <p><span class="font-medium">Precio:</span> {{ formatearPrecio(Math.min(resultado.juego.precios.ps4Principal, resultado.juego.precios.ps4Secundaria, resultado.juego.precios.ps5Principal, resultado.juego.precios.ps5Secundaria)) }}</p>
                <p><span class="font-medium">Versión:</span> {{ resultado.juego.version }}</p>
                <button 
                  @click="emit('verDetallesJuego', resultado.juego.id)"
                  class="btn btn-sm btn-ghost mt-2"
                >
                  Ver detalles del juego →
                </button>
              </div>
            </div>
            <div>
              <h4 class="font-semibold mb-2">Información del Correo</h4>
              <div class="space-y-1 text-sm">
                <p><span class="font-medium">Correo:</span> <span class="font-mono text-xs">{{ resultado.correo.correo }}</span></p>
                <p><span class="font-medium">Fecha:</span> {{ formatearFecha(resultado.correo.fecha) }}</p>
                <p><span class="font-medium">Código:</span> {{ resultado.correo.codigo }}</p>
                <p v-if="resultado.cuenta.saldo !== undefined">
                  <span class="font-medium">Saldo de la cuenta:</span> 
                  <span class="badge badge-success">{{ formatearPrecio(resultado.cuenta.saldo) }}</span>
                </p>
                <p v-if="resultado.cuenta.hasStock">
                  <span class="badge badge-primary badge-sm">Cuenta con Stock</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

