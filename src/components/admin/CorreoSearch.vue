<script setup lang="ts">
import { ref } from 'vue'
import { useGames } from '@/composables/useGames'
import type { CorreoSearchResult, GamePlatform, AccountOwner } from '@/types/game'
import { Mail, Search, Phone } from 'lucide-vue-next'

const { buscarPorCorreo } = useGames()

const emit = defineEmits<{
  verDetallesJuego: [juegoId: string]
}>()

const correoBusqueda = ref('')
const resultadosCorreo = ref<CorreoSearchResult[]>([])
const isLoadingCorreo = ref(false)
const plataformaCorreo = ref<GamePlatform>('PS4 & PS5')

const buscarCorreo = async (): Promise<void> => {
  if (!correoBusqueda.value || correoBusqueda.value.trim().length < 3) {
    resultadosCorreo.value = []
    return
  }

  isLoadingCorreo.value = true
  try {
    resultadosCorreo.value = await buscarPorCorreo(correoBusqueda.value.trim(), plataformaCorreo.value)
  } catch (error) {
    console.error('Error buscando correo:', error)
  } finally {
    isLoadingCorreo.value = false
  }
}

const contarStockCuentas = (cuentas: AccountOwner[]): number => {
  if (!cuentas) return 0
  return cuentas.filter(cuenta => cuenta?.hasStock).length
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
          <Mail :size="32" class="text-primary" />
          Búsqueda por Correo
        </h1>
        <p class="text-base-content/60 mt-1">Busca juegos por dirección de correo electrónico</p>
      </div>
    </div>

    <!-- Formulario de búsqueda -->
    <div class="card bg-base-100 shadow-xl mb-6">
      <div class="card-body">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="form-control md:col-span-2">
            <label class="label">
              <span class="label-text font-semibold">Correo Electrónico</span>
            </label>
            <div class="relative">
              <input
                v-model="correoBusqueda"
                type="email"
                placeholder="Ej: zonagae.cu.4@gmail.com"
                class="input input-bordered w-full pl-10"
                @keyup.enter="buscarCorreo"
                autocomplete="off"
              />
              <Mail :size="20" class="absolute left-3 top-3 text-base-content/40" />
            </div>
          </div>
          <div class="form-control">
            <label class="label">
              <span class="label-text font-semibold">Plataforma</span>
            </label>
            <select v-model="plataformaCorreo" class="select select-bordered">
              <option value="PS4 & PS5">PS4 & PS5</option>
              <option value="PS4">PS4</option>
              <option value="PS5">PS5</option>
            </select>
          </div>
        </div>
        <div class="card-actions justify-end mt-4">
          <button 
            @click="buscarCorreo" 
            class="btn btn-primary gap-2"
            :disabled="isLoadingCorreo || !correoBusqueda || correoBusqueda.trim().length < 3"
          >
            <Search :size="18" />
            {{ isLoadingCorreo ? 'Buscando...' : 'Buscar' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Resultados -->
    <div v-if="isLoadingCorreo" class="flex justify-center p-8">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <div v-else-if="resultadosCorreo.length === 0 && correoBusqueda && correoBusqueda.trim().length >= 3" class="card bg-base-100 shadow-xl">
      <div class="card-body text-center">
        <p class="text-base-content/60">No se encontraron juegos con ese correo electrónico</p>
      </div>
    </div>

    <div v-else-if="resultadosCorreo.length > 0" class="space-y-4">
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title">
            Resultados encontrados ({{ resultadosCorreo.length }})
          </h2>
        </div>
      </div>

      <div v-for="(resultado, index) in resultadosCorreo" :key="index" class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <div class="flex justify-between items-start mb-4">
            <div>
              <h3 class="card-title text-lg">
                <Mail :size="20" class="text-primary" />
                {{ resultado.correo.correo }}
              </h3>
              <p class="text-base-content/60 mt-1">
                Código: {{ resultado.correo.codigo }}
              </p>
            </div>
            <div class="badge badge-lg badge-primary">
              {{ resultado.correo.cuentas.length }} cuenta{{ resultado.correo.cuentas.length !== 1 ? 's' : '' }}
            </div>
          </div>

          <div class="divider"></div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 class="font-semibold mb-2">Información del Juego</h4>
              <div class="space-y-1 text-sm">
                <p><span class="font-medium">Juego:</span> {{ resultado.juego.nombre }}</p>
                <p><span class="font-medium">Precio:</span> {{ formatearPrecio(resultado.juego.costo) }}</p>
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
                <p><span class="font-medium">Códigos generados:</span> {{ resultado.correo.codigosGenerados.length + 1 }}</p>
                <p v-if="resultado.correo.saldo !== undefined">
                  <span class="font-medium">Saldo:</span> 
                  <span class="badge badge-success">{{ formatearPrecio(resultado.correo.saldo) }}</span>
                </p>
                <p v-if="contarStockCuentas(resultado.correo.cuentas) > 0">
                  <span class="badge badge-primary badge-sm">Stock: {{ contarStockCuentas(resultado.correo.cuentas) }}</span>
                </p>
              </div>
            </div>
          </div>

          <!-- Lista de cuentas -->
          <div v-if="resultado.correo.cuentas.length > 0" class="mt-4">
            <div class="divider"></div>
            <h4 class="font-semibold mb-2">Cuentas asociadas ({{ resultado.correo.cuentas.length }})</h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div 
                v-for="(cuenta, cuentaIndex) in resultado.correo.cuentas" 
                :key="cuentaIndex"
                class="card bg-base-200 shadow-sm"
              >
                <div class="card-body p-3">
                  <div class="flex justify-between items-start">
                    <div class="flex-1">
                      <p class="font-medium text-sm">{{ cuenta.nombre }}</p>
                      <p class="text-xs text-base-content/60 mt-1">
                        <Phone :size="12" class="inline mr-1" />
                        {{ cuenta.telefono }}
                      </p>
                      <div class="mt-1">
                        <span class="badge badge-xs" :class="{
                          'badge-primary': cuenta.tipo.includes('Principal'),
                          'badge-secondary': cuenta.tipo.includes('Secundaria')
                        }">
                          {{ cuenta.tipo }}
                        </span>
                        <span v-if="cuenta.hasStock" class="badge badge-xs badge-success ml-1">Stock</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

