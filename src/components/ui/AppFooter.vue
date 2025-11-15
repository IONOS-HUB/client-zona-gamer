<script setup lang="ts">
import { Gamepad2, Facebook, Instagram, Send } from 'lucide-vue-next'
</script>

<template>
  <!-- Footer con background personalizado -->
  <footer class="relative bg-gradient-to-b from-base-300 to-base-200 text-base-content mt-20 overflow-hidden">
    <!-- Efectos decorativos -->
    <div class="absolute top-0 left-0 w-full h-1 bg-gradient-error"></div>
    <div class="absolute top-0 left-1/4 w-64 h-64 bg-error/5 rounded-full blur-3xl"></div>
    <div class="absolute bottom-0 right-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl"></div>
    
    <div class="container mx-auto px-10 py-16 relative z-10">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-12">
        <!-- Logo y descripción -->
        <div class="flex flex-col gap-4 animate-fadeInUp">
          <div class="relative group">
            <Gamepad2 :size="56" class="text-error group-hover:scale-110 transition-transform duration-300" :stroke-width="2" />
            <div class="absolute inset-0 blur-xl bg-error/30 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </div>
          <div>
            <p class="font-black text-2xl text-gradient mb-2">Zona Gamers</p>
            <p class="text-sm text-base-content/70">
              Tu tienda de juegos digitales de confianza en Ecuador
            </p>
          </div>
        </div>

        <!-- Información -->
        <div class="animate-fadeInUp delay-100">
          <h6 class="footer-title opacity-80 mb-4 font-bold text-lg">INFORMACIÓN</h6>
          <div class="flex flex-col gap-3">
            <a class="link link-hover text-sm hover:text-error hover:translate-x-2 transition-all duration-300">→ Sobre Nosotros</a>
            <a class="link link-hover text-sm hover:text-error hover:translate-x-2 transition-all duration-300">→ Cómo Comprar</a>
            <a class="link link-hover text-sm hover:text-error hover:translate-x-2 transition-all duration-300">→ Preguntas Frecuentes</a>
            <a class="link link-hover text-sm hover:text-error hover:translate-x-2 transition-all duration-300">→ Formas de Pago</a>
          </div>
        </div>

        <!-- Soporte -->
        <div class="animate-fadeInUp delay-200">
          <h6 class="footer-title opacity-80 mb-4 font-bold text-lg">SOPORTE</h6>
          <div class="flex flex-col gap-3">
            <a class="link link-hover text-sm hover:text-error hover:translate-x-2 transition-all duration-300">→ Contacto</a>
            <a class="link link-hover text-sm hover:text-error hover:translate-x-2 transition-all duration-300">→ Términos y Condiciones</a>
            <a class="link link-hover text-sm hover:text-error hover:translate-x-2 transition-all duration-300">→ Política de Privacidad</a>
            <a class="link link-hover text-sm hover:text-error hover:translate-x-2 transition-all duration-300">→ Garantías</a>
          </div>
        </div>

        <!-- Síguenos -->
        <div class="animate-fadeInUp delay-300">
          <h6 class="footer-title opacity-80 mb-4 font-bold text-lg">SÍGUENOS</h6>
          <div class="flex gap-4 mb-6">
            <a 
              href="#" 
              class="btn btn-circle btn-ghost hover:bg-error/20 hover:text-error hover:shadow-glow hover:scale-110 transition-all duration-300"
              aria-label="Facebook"
            >
              <Facebook :size="24" />
            </a>
            <a 
              href="#" 
              class="btn btn-circle btn-ghost hover:bg-error/20 hover:text-error hover:shadow-glow hover:scale-110 transition-all duration-300"
              aria-label="Instagram"
            >
              <Instagram :size="24" />
            </a>
            <a 
              href="#" 
              class="btn btn-circle btn-ghost hover:bg-error/20 hover:text-error hover:shadow-glow hover:scale-110 transition-all duration-300"
              aria-label="WhatsApp"
            >
              <Send :size="24" />
            </a>
          </div>
          <div class="glass-effect p-4 rounded-lg border border-white/10">
            <p class="text-xs text-base-content/70 mb-2 font-semibold">Atención al cliente 24/7</p>
            <p class="text-sm font-bold text-gradient-animated">WhatsApp: +593 99 999 9999</p>
          </div>
        </div>
      </div>
    </div>
  </footer>

  <!-- Copyright mejorado -->
  <div class="bg-base-100 text-base-content text-center py-6 border-t border-white/10">
    <p class="text-sm font-semibold">
      © 2024 <span class="text-gradient">Zona Gamers Ecuador</span> - Todos los derechos reservados
    </p>
    <p class="text-xs text-base-content/60 mt-2">
      Hecho con ❤️ para los gamers ecuatorianos
    </p>
  </div>
</template>

