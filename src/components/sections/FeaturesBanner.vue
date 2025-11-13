<script setup lang="ts">
import { CloudDownload, Shield, MessageCircle, Star } from 'lucide-vue-next'
</script>

<template>
  <div class="w-full bg-base-200 py-8 md:py-12 my-16">
    <div class="container mx-auto px-4 md:px-6">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
        <!-- Súper rápido -->
        <div class="flex flex-col items-center text-center space-y-3">
          <div class="relative">
            <div class="absolute inset-0 blur-xl bg-orange-500/30"></div>
            <CloudDownload :size="48" class="text-orange-500 relative z-10" :stroke-width="2" />
          </div>
          <h3 class="text-lg font-bold text-white">Súper rápido</h3>
          <p class="text-sm text-base-content/70">Descarga digital instantánea</p>
        </div>

        <!-- Fiable y seguro -->
        <div class="flex flex-col items-center text-center space-y-3">
          <div class="relative">
            <div class="absolute inset-0 blur-xl bg-orange-500/30"></div>
            <Shield :size="48" class="text-orange-500 relative z-10" :stroke-width="2" />
          </div>
          <h3 class="text-lg font-bold text-white">Fiable y seguro</h3>
          <p class="text-sm text-base-content/70">Más de 20,000 juegos</p>
        </div>

        <!-- Atención al cliente -->
        <div class="flex flex-col items-center text-center space-y-3">
          <div class="relative">
            <div class="absolute inset-0 blur-xl bg-orange-500/30"></div>
            <MessageCircle :size="48" class="text-orange-500 relative z-10" :stroke-width="2" />
          </div>
          <h3 class="text-lg font-bold text-white">Atención al cliente</h3>
          <p class="text-sm text-base-content/70">Agente disponible 24/7</p>
        </div>

        <!-- Trustpilot Rating -->
        <div class="flex flex-col items-center text-center space-y-3">
          <div class="flex items-center gap-2 mb-2">
            <Star :size="20" class="text-green-500 fill-green-500" />
            <span class="text-white font-semibold text-sm">Trustpilot</span>
          </div>
          <div class="flex gap-1 mb-2 relative">
            <Star 
              v-for="i in 5" 
              :key="i"
              :size="20"
              :class="[
                i <= 4 ? 'text-green-500 fill-green-500' : 'text-green-500'
              ]"
            />
            <!-- Estrella parcial para la quinta -->
            <div v-if="true" class="absolute right-0 top-0 w-5 h-5 overflow-hidden">
              <Star :size="20" class="text-green-500 fill-green-500" style="width: 70%;" />
            </div>
          </div>
          <p class="text-sm text-white">
            TrustScore <span class="font-bold">4.7</span> 
            <span class="underline">785.912</span> opiniones
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

