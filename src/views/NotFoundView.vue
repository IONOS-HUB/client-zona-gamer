<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const goHome = (): void => {
  router.push('/')
}

const goBack = (): void => {
  router.back()
}
</script>

<template>
  <div class="min-h-screen bg-base-200 flex items-center justify-center px-4">
    <div class="text-center">
      <!-- Número 404 animado -->
      <div class="mb-8">
        <h1 class="text-9xl font-bold text-primary animate-pulse">404</h1>
      </div>

      <!-- Icono de gamepad -->
      <div class="mb-6">
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          class="h-32 w-32 mx-auto text-base-content opacity-50" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            stroke-linecap="round" 
            stroke-linejoin="round" 
            stroke-width="2" 
            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
          />
        </svg>
      </div>

      <!-- Mensaje -->
      <div class="mb-8">
        <h2 class="text-4xl font-bold mb-4">Página no encontrada</h2>
        <p class="text-lg text-base-content opacity-70 mb-2">
          ¡Oops! Parece que este juego no está en nuestro catálogo.
        </p>
        <p class="text-base text-base-content opacity-60">
          La página que buscas no existe o ha sido movida.
        </p>
      </div>

      <!-- Botones de acción -->
      <div class="flex flex-col sm:flex-row gap-4 justify-center">
        <button @click="goBack" class="btn btn-outline btn-primary">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Volver Atrás
        </button>
        <button @click="goHome" class="btn btn-primary">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Ir al Inicio
        </button>
      </div>
    </div>
  </div>
</template>

