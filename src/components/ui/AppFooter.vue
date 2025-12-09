<script setup lang="ts">
import { Send, Facebook, Instagram } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import logo from '/Images/logo/logo.png'

const router = useRouter()

// Número de WhatsApp
const whatsappNumber = '593992249152'
const whatsappUrl = `https://wa.me/${whatsappNumber}`

// Links de redes sociales
const socialLinks = {
  instagram: 'https://www.instagram.com/zonagamersecuador/',
  threads: 'https://x.com/zonagamersec?t=P_mNPwPKWfYibsbTnGWlrw&s=09',
  tiktok: 'https://www.tiktok.com/@zona.gamers.ecuad'
}

// Función para hacer scroll a una sección
const scrollToSection = (sectionId: string): void => {
  const element = document.getElementById(sectionId)
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' })
  } else {
    // Si estamos en otra página, ir a home y luego hacer scroll
    if (router.currentRoute.value.path !== '/') {
      router.push('/').then(() => {
        setTimeout(() => {
          const el = document.getElementById(sectionId)
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
        }, 300)
      })
    }
  }
}

</script>

<template>
  <!-- Footer con background personalizado -->
  <footer class="relative bg-linear-to-b from-base-300 to-base-200 text-base-content mt-20 overflow-hidden">
    <!-- Efectos decorativos -->
    <div class="absolute top-0 left-0 w-full h-1 bg-gradient-error"></div>
    <div class="absolute top-0 left-1/4 w-64 h-64 bg-error/5 rounded-full blur-3xl"></div>
    <div class="absolute bottom-0 right-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl"></div>
    
    <div class="container mx-auto px-10 py-16 relative z-10">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-12">
        <!-- Logo y descripción -->
        <div class="flex flex-col gap-4 animate-fadeInUp">
          <a href="/" class="cursor-pointer">
            <img :src="logo" alt="Zona Gamers" class="max-w-[200px]" />
          </a>
        </div>

        <!-- Información -->
        <div class="animate-fadeInUp delay-100">
          <h6 class="footer-title opacity-80 mb-4 font-bold text-lg">INFORMACIÓN</h6>
          <div class="flex flex-col gap-3">
            <a 
              @click.prevent="scrollToSection('contacto')" 
              class="link link-hover text-sm hover:text-error hover:translate-x-2 transition-all duration-300 cursor-pointer"
            >
              → Sobre Nosotros
            </a>
            <a 
              @click.prevent="scrollToSection('faq')" 
              class="link link-hover text-sm hover:text-error hover:translate-x-2 transition-all duration-300 cursor-pointer"
            >
              → Preguntas Frecuentes
            </a>
            <a 
              @click.prevent="scrollToSection('faq')" 
              class="link link-hover text-sm hover:text-error hover:translate-x-2 transition-all duration-300 cursor-pointer"
            >
              → Formas de Pago
            </a>
          </div>
        </div>

        <!-- Soporte -->
        <div class="animate-fadeInUp delay-200">
          <h6 class="footer-title opacity-80 mb-4 font-bold text-lg">SOPORTE</h6>
          <div class="flex flex-col gap-3">
            <a 
              @click.prevent="scrollToSection('contacto')" 
              class="link link-hover text-sm hover:text-error hover:translate-x-2 transition-all duration-300 cursor-pointer"
            >
              → Contacto
            </a>
            <a 
              @click.prevent="scrollToSection('faq')" 
              class="link link-hover text-sm hover:text-error hover:translate-x-2 transition-all duration-300 cursor-pointer"
            >
              → Garantías
            </a>
          </div>
        </div>

        <!-- Síguenos -->
        <div class="animate-fadeInUp delay-300">
          <h6 class="footer-title opacity-80 mb-4 font-bold text-lg">SÍGUENOS</h6>
          <div class="flex gap-4 mb-6">
            <a 
              :href="socialLinks.threads" 
              target="_blank"
              rel="noopener noreferrer"
              class="btn btn-circle btn-ghost hover:bg-error/20 hover:text-error hover:shadow-glow hover:scale-110 transition-all duration-300"
              aria-label="Threads / X"
              title="Síguenos en Threads / X"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </a>
            <a 
              :href="socialLinks.instagram" 
              target="_blank"
              rel="noopener noreferrer"
              class="btn btn-circle btn-ghost hover:bg-error/20 hover:text-error hover:shadow-glow hover:scale-110 transition-all duration-300"
              aria-label="Instagram"
              title="Síguenos en Instagram"
            >
              <Instagram :size="24" />
            </a>
            <a 
              :href="whatsappUrl" 
              target="_blank"
              rel="noopener noreferrer"
              class="btn btn-circle btn-ghost hover:bg-error/20 hover:text-error hover:shadow-glow hover:scale-110 transition-all duration-300"
              aria-label="WhatsApp"
              title="Contáctanos por WhatsApp"
            >
              <Send :size="24" />
            </a>
          </div>
          <div class="glass-effect p-4 rounded-lg border border-white/10">
            <p class="text-xs text-base-content/70 mb-2 font-semibold">Atención al cliente 24/7</p>
            <a 
              :href="whatsappUrl" 
              target="_blank"
              rel="noopener noreferrer"
              class="text-sm font-bold text-gradient-animated hover:underline cursor-pointer block"
            >
              WhatsApp: +593 99 224 9152
            </a>
          </div>
        </div>
      </div>
    </div>
  </footer>

  <!-- Copyright mejorado -->
  <div class="bg-base-100 text-base-content text-center py-6 border-t border-white/10">
    <p class="text-sm font-semibold">
      © 2025 <span class="text-gradient">Zona Gamers Ecuador</span> - Todos los derechos reservados
    </p>
    <p class="text-xs text-base-content/60 mt-2">
      Hecho con ❤️ para los gamers ecuatorianos
    </p>
  </div>
</template>

