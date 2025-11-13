<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { MapPin, Instagram, MessageCircle } from 'lucide-vue-next'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const socialLinks = {
  threads: 'https://x.com/zonagamersec?t=P_mNPwPKWfYibsbTnGWlrw&s=09',
  instagram: 'https://www.instagram.com/zonagamersecuador/',
  tiktok: 'https://www.tiktok.com/@zona.gamers.ecuad'
}

const locationLink = 'https://www.google.com/maps/place/Zona+Gamers+Ecuador/@0.350706,-78.1224294,16z/data=!4m10!1m2!2m1!1szona+gamers!3m6!1s0x91d59aa3d25cdce3:0x610fcd511e7ccd49!8m2!3d0.3489213!4d-78.1187615!15sCgt6b25hIGdhbWVyc1oNIgt6b25hIGdhbWVyc5IBEHZpZGVvX2dhbWVfc3RvcmWqAUMKDS9nLzExZjEwZ2Z4bWoQATIfEAEiG82cTG3s40qHiO7V6-OeMdzwKONrIdjvnqpnSDIPEAIiC3pvbmEgZ2FtZXJz4AEA!16s%2Fg%2F11f10gfxmj?hl=es&entry=ttu&g_ep=EgoyMDI1MTExMC4wIKXMDSoASAFQAw%3D%3D'

// Coordenadas de Zona Gamers Ecuador
const mapCenter: [number, number] = [0.3489213, -78.1187615]

const mapContainer = ref<HTMLElement | null>(null)
let map: L.Map | null = null

onMounted(() => {
  if (mapContainer.value) {
    // Inicializar el mapa
    map = L.map(mapContainer.value, {
      center: mapCenter,
      zoom: 16,
      zoomControl: true
    })

    // Agregar capa de OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map)

    // Agregar marcador personalizado
    const icon = L.divIcon({
      className: 'custom-marker',
      html: `
        <div style="
          background-color: #dc2626;
          width: 40px;
          height: 40px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="
            transform: rotate(45deg);
            color: white;
            font-size: 20px;
          ">📍</div>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 40],
      popupAnchor: [0, -40]
    })

    // Agregar marcador con popup
    const marker = L.marker(mapCenter, { icon }).addTo(map)
    marker.bindPopup(`
      <div style="text-align: center; padding: 8px;">
        <strong style="color: #dc2626; font-size: 16px;">Zona Gamers Ecuador</strong><br>
        <span style="color: #666; font-size: 14px;">Simón Bolívar 615, Ibarra</span>
      </div>
    `).openPopup()

    // Ajustar el mapa después de que se renderice
    setTimeout(() => {
      map?.invalidateSize()
    }, 100)
  }
})

onUnmounted(() => {
  if (map) {
    map.remove()
    map = null
  }
})
</script>

<template>
  <section class="relative py-16 bg-gradient-to-b from-base-200 via-base-300 to-base-200 overflow-hidden">
    <!-- Efectos decorativos -->
    <div class="absolute top-0 left-0 w-full h-1 bg-gradient-error"></div>
    <div class="absolute top-1/4 left-0 w-64 h-64 bg-error/5 rounded-full blur-3xl pointer-events-none"></div>
    <div class="absolute bottom-1/4 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>

    <div class="container mx-auto px-4 relative z-10">
      <div class="text-center mb-12 animate-fadeInUp">
        <h2 class="text-4xl md:text-5xl font-black text-gradient-animated mb-4">
          Contacto y Ubicación
        </h2>
        <p class="text-lg text-base-content/70">
          Síguenos en nuestras redes sociales y visítanos en nuestra ubicación
        </p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12">
        <!-- Sección de Contacto / Redes Sociales -->
        <div class="animate-fadeInLeft">
          <div class="glass-effect p-8 rounded-2xl border border-white/10 shadow-lg hover:shadow-xl transition-all duration-300 h-full">
            <div class="flex items-center gap-4 mb-6">
              <div class="p-3 bg-error/10 rounded-xl">
                <MessageCircle :size="32" class="text-error" />
              </div>
              <div>
                <h3 class="text-2xl font-black text-gradient mb-1">Redes Sociales</h3>
                <p class="text-sm text-base-content/60">Conéctate con nosotros</p>
              </div>
            </div>

            <div class="space-y-4">
              <!-- Threads (X/Twitter) -->
              <a
                :href="socialLinks.threads"
                target="_blank"
                rel="noopener noreferrer"
                class="flex items-center gap-4 p-4 bg-base-200 rounded-xl border border-white/5 hover:border-error/50 hover:bg-error/10 transition-all duration-300 group"
              >
                <div class="p-2 bg-base-300 rounded-lg group-hover:bg-error/20 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-white group-hover:text-error transition-colors" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </div>
                <div class="flex-1">
                  <p class="font-bold text-white group-hover:text-error transition-colors">Threads / X</p>
                  <p class="text-xs text-base-content/60">@zonagamersec</p>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-base-content/40 group-hover:text-error group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </a>

              <!-- Instagram -->
              <a
                :href="socialLinks.instagram"
                target="_blank"
                rel="noopener noreferrer"
                class="flex items-center gap-4 p-4 bg-base-200 rounded-xl border border-white/5 hover:border-error/50 hover:bg-error/10 transition-all duration-300 group"
              >
                <div class="p-2 bg-base-300 rounded-lg group-hover:bg-error/20 transition-colors">
                  <Instagram :size="24" class="text-white group-hover:text-error transition-colors" />
                </div>
                <div class="flex-1">
                  <p class="font-bold text-white group-hover:text-error transition-colors">Instagram</p>
                  <p class="text-xs text-base-content/60">@zonagamersecuador</p>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-base-content/40 group-hover:text-error group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </a>

              <!-- TikTok -->
              <a
                :href="socialLinks.tiktok"
                target="_blank"
                rel="noopener noreferrer"
                class="flex items-center gap-4 p-4 bg-base-200 rounded-xl border border-white/5 hover:border-error/50 hover:bg-error/10 transition-all duration-300 group"
              >
                <div class="p-2 bg-base-300 rounded-lg group-hover:bg-error/20 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-white group-hover:text-error transition-colors" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                  </svg>
                </div>
                <div class="flex-1">
                  <p class="font-bold text-white group-hover:text-error transition-colors">TikTok</p>
                  <p class="text-xs text-base-content/60">@zona.gamers.ecuad</p>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-base-content/40 group-hover:text-error group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        <!-- Sección de Ubicación -->
        <div class="animate-fadeInRight">
          <div class="glass-effect p-8 rounded-2xl border border-white/10 shadow-lg hover:shadow-xl transition-all duration-300 h-full">
            <div class="flex items-center gap-4 mb-6">
              <div class="p-3 bg-error/10 rounded-xl">
                <MapPin :size="32" class="text-error" />
              </div>
              <div>
                <h3 class="text-2xl font-black text-gradient mb-1">Nuestra Ubicación</h3>
                <p class="text-sm text-base-content/60">Visítanos en nuestra tienda</p>
              </div>
            </div>

            <div class="space-y-4">
              <div class="bg-base-200 rounded-xl p-4 border border-white/5">
                <p class="text-sm text-base-content/60 mb-2">Dirección:</p>
                <p class="font-bold text-white text-lg mb-4">
                  Simón Bolívar 615, Ibarra, Ecuador
                </p>
              </div>

              <div class="relative group">
                <!-- Mapa de Leaflet -->
                <div 
                  ref="mapContainer"
                  class="aspect-video rounded-xl overflow-hidden border border-white/10 hover:border-error/50 transition-all duration-300"
                  style="min-height: 300px; z-index: 1;"
                ></div>
                
                <!-- Overlay con botón para Google Maps -->
                <a
                  :href="locationLink"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="absolute bottom-4 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"
                >
                  <div class="flex items-center gap-2 px-4 py-2 bg-error rounded-lg shadow-lg hover:bg-error/90 transition-colors">
                    <MapPin :size="18" class="text-white" />
                    <span class="text-white font-semibold text-sm">Ver en Google Maps</span>
                  </div>
                </a>
              </div>

              <div class="flex items-center gap-2 text-sm text-base-content/60">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Ubicación verificada</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* Estilos para el mapa de Leaflet */
:deep(.leaflet-container) {
  background-color: #1a1a1a;
  height: 100%;
  width: 100%;
  border-radius: 0.75rem;
}

:deep(.leaflet-popup-content-wrapper) {
  background-color: #1f2937;
  color: white;
  border-radius: 0.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
}

:deep(.leaflet-popup-tip) {
  background-color: #1f2937;
}

:deep(.leaflet-control-zoom) {
  border: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

:deep(.leaflet-control-zoom a) {
  background-color: #1f2937;
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

:deep(.leaflet-control-zoom a:hover) {
  background-color: #dc2626;
  border-color: #dc2626;
}

:deep(.leaflet-tile-container img) {
  filter: brightness(0.8) contrast(1.1);
}

/* Asegurar que el contenedor del mapa tenga altura */
.map-container {
  min-height: 300px;
}
</style>

