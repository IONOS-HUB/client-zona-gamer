<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const goToLogin = (): void => {
  router.push('/login')
}
</script>

<template>
  <div class="min-h-screen bg-base-200">
    <!-- Navbar -->
    <div class="navbar bg-base-100 shadow-lg">
      <div class="flex-1">
        <a class="btn btn-ghost text-xl">🎮 Zona Gamer</a>
      </div>
      <div class="flex-none">
        <button class="btn btn-primary" @click="goToLogin">
          Iniciar Sesión
        </button>
      </div>
    </div>

    <!-- Hero Section -->
    <div class="hero min-h-[80vh]">
      <div class="hero-content text-center">
        <div class="max-w-md">
          <h1 class="text-5xl font-bold mb-8">Bienvenido a Zona Gamer</h1>
          <p class="py-6 text-lg">
            Tu tienda de videojuegos favorita. Encuentra los mejores títulos
            para todas las plataformas al mejor precio.
          </p>
          <div class="flex flex-col gap-4">
            <button class="btn btn-primary btn-lg">
              Ver Catálogo
            </button>
            <button class="btn btn-outline btn-lg">
              Ofertas Especiales
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Sección de características -->
    <div class="container mx-auto px-6 py-12">
      <h2 class="text-3xl font-bold text-center mb-8">¿Por qué elegir Zona Gamer?</h2>
      
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="card bg-base-100 shadow-xl">
          <div class="card-body items-center text-center">
            <div class="text-5xl mb-4">🎯</div>
            <h3 class="card-title">Amplio Catálogo</h3>
            <p>Miles de juegos para todas las plataformas</p>
          </div>
        </div>

        <div class="card bg-base-100 shadow-xl">
          <div class="card-body items-center text-center">
            <div class="text-5xl mb-4">💰</div>
            <h3 class="card-title">Mejores Precios</h3>
            <p>Ofertas y descuentos constantes</p>
          </div>
        </div>

        <div class="card bg-base-100 shadow-xl">
          <div class="card-body items-center text-center">
            <div class="text-5xl mb-4">🚀</div>
            <h3 class="card-title">Entrega Rápida</h3>
            <p>Recibe tus juegos en tiempo récord</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <footer class="footer footer-center p-10 bg-base-100 text-base-content">
      <div>
        <p class="font-bold text-xl">Zona Gamer</p>
        <p>Tu tienda de videojuegos de confianza desde 2025</p>
        <p>Copyright © 2025 - Todos los derechos reservados</p>
      </div>
    </footer>
  </div>
</template>
