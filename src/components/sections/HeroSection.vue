<script setup lang="ts">
import { onMounted, onUnmounted, computed, ref } from 'vue'
import { MessageCircle, Gamepad2, Star } from 'lucide-vue-next'
import { useCartStore } from '@/stores/cart'
import type { GameSummary } from '@/types/game'

interface Props {
  games: GameSummary[]
}

const props = defineProps<Props>()
const cartStore = useCartStore()

// Referencias a las columnas del masonry
const columnRefs = ref<(HTMLElement | null)[]>([])
let scrollIntervals: (number | null)[] = []
let reorderInterval: number | null = null
const shuffledGames = ref<GameSummary[]>([])

// Obtener juegos limitados para el masonry (optimización: máximo 12 juegos)
const allFeaturedGames = computed(() => {
  const filtered = props.games.filter(game => game.activo !== false && game.foto)
  // Limitar a 12 juegos máximo para mejor rendimiento
  const maxGames = 12
  if (filtered.length === 0) return []
  
  // Si hay menos juegos, los repetimos hasta llegar al máximo
  if (filtered.length < maxGames) {
    const repeated: GameSummary[] = []
    while (repeated.length < maxGames) {
      repeated.push(...filtered)
    }
    return repeated.slice(0, maxGames)
  }
  
  // Si hay muchos juegos, solo tomar los primeros 12
  return filtered.slice(0, maxGames)
})

// Función para mezclar array aleatoriamente (Fisher-Yates)
const shuffleArray = (array: GameSummary[]): GameSummary[] => {
  const shuffled = array.filter((game): game is GameSummary => game !== undefined && game !== null)
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = shuffled[i]
    if (temp && shuffled[j]) {
      shuffled[i] = shuffled[j]
      shuffled[j] = temp
    }
  }
  return shuffled
}

// Reordenar juegos periódicamente
const reorderGames = () => {
  if (allFeaturedGames.value.length > 0) {
    shuffledGames.value = shuffleArray(allFeaturedGames.value)
  }
}

// Crear columnas para masonry con diferentes alturas y duplicar contenido para loop infinito
const masonryColumns = computed(() => {
  const games = shuffledGames.value.length > 0 ? shuffledGames.value : allFeaturedGames.value
  if (games.length === 0) return [[], [], []]
  
  // Dividir en 3 columnas para efecto masonry
  const columns: GameSummary[][] = [[], [], []]
  games.forEach((game, index) => {
    if (game) {
      const columnIndex = index % 3
      if (columnIndex >= 0 && columnIndex < columns.length) {
        columns[columnIndex]?.push(game)
      }
    }
  })
  
  // Duplicar cada columna para crear efecto de loop infinito
  // Optimización: solo duplicar 3 veces (suficiente para el loop sin sobrecargar)
  return columns.map(column => {
    if (column.length === 0) return []
    // Duplicar 3 veces: suficiente para el loop infinito sin sobrecargar el DOM
    return [...column, ...column, ...column]
  })
})

// Estado de pausa para cada columna
const isPaused = ref(false)

// Carrusel horizontal para móvil
const carouselIndex = ref(0)
const isCarouselPaused = ref(false)
let carouselInterval: number | null = null

// Iniciar carrusel horizontal para móvil
const startCarousel = () => {
  if (allFeaturedGames.value.length === 0) return
  
  const carousel = () => {
    if (isCarouselPaused.value) return
    
    carouselIndex.value = (carouselIndex.value + 1) % allFeaturedGames.value.length
  }
  
  carouselInterval = window.setInterval(carousel, 3000) // Cambiar cada 3 segundos
}

// Pausar carrusel
const pauseCarousel = () => {
  isCarouselPaused.value = true
}

// Reanudar carrusel
const resumeCarousel = () => {
  isCarouselPaused.value = false
}

// Detener carrusel
const stopCarousel = () => {
  if (carouselInterval) {
    clearInterval(carouselInterval)
    carouselInterval = null
  }
}

// Auto-scroll independiente para cada columna (ascensor) - Optimizado
const startAutoScroll = () => {
  const scrollSpeed = 0.5 // píxeles por frame
  // Direcciones alternadas: abajo, arriba, abajo (para 3 columnas)
  const scrollDirections = [1, -1, 1] // Direcciones: abajo, arriba, abajo
  
  // Usar requestAnimationFrame para mejor rendimiento
  let animationFrameId: number | null = null
  
  // Esperar un momento para que el DOM esté completamente renderizado
  setTimeout(() => {
    columnRefs.value.forEach((column, index) => {
      if (!column) return
      
      let scrollPosition = 0
      const direction = scrollDirections[index] || 1
      const columnContent = column.querySelector('.masonry-column-content') as HTMLElement
      
      if (!columnContent) return
      
      // Calcular altura de UNA copia del contenido original (sin duplicar) - Optimizado
      const getOriginalHeight = () => {
        const items = columnContent.querySelectorAll('.masonry-item')
        if (items.length === 0) return 0
        
        // Como duplicamos 3 veces, dividimos el total por 3
        const itemsPerCopy = Math.floor(items.length / 3)
        if (itemsPerCopy === 0) return 0
        
        let height = 0
        
        // Calcular altura solo de los primeros items (más eficiente)
        for (let i = 0; i < itemsPerCopy; i++) {
          const item = items[i] as HTMLElement
          if (item && item.offsetHeight > 0) {
            height += item.offsetHeight + 12 // 12px es el gap (0.75rem)
          }
        }
        
        return height
      }
      
      // Esperar a que los items se rendericen - Optimizado con menos reintentos
      const initScroll = () => {
        const maxRetries = 10
        let retries = 0
        
        const checkReady = () => {
          const items = columnContent.querySelectorAll('.masonry-item')
          if (items.length === 0 || retries >= maxRetries) {
            if (retries < maxRetries) {
              retries++
              setTimeout(checkReady, 100)
            }
            return
          }
          
          // Verificar que al menos el primer item tenga altura
          const firstItem = items[0] as HTMLElement
          if (firstItem && firstItem.offsetHeight === 0) {
            if (retries < maxRetries) {
              retries++
              setTimeout(checkReady, 100)
            }
            return
          }
          
          const originalHeight = getOriginalHeight()
          
          if (originalHeight === 0) {
            if (retries < maxRetries) {
              retries++
              setTimeout(checkReady, 100)
            }
            return
          }
          
          const containerHeight = column.clientHeight
          
          // Asegurar que el segmento sea al menos tan alto como el contenedor
          const segmentHeight = Math.max(originalHeight, containerHeight)
          
          // Usar requestAnimationFrame en lugar de setInterval para mejor rendimiento
          const animate = () => {
            if (!column || !columnContent || isPaused.value) {
              animationFrameId = requestAnimationFrame(animate)
              return
            }
            
            scrollPosition += scrollSpeed * direction
            
            // Loop infinito: reiniciamos cuando llegamos al final de una copia
            if (direction > 0) {
              if (scrollPosition >= segmentHeight) {
                scrollPosition = scrollPosition - segmentHeight
              }
            } else {
              if (scrollPosition <= -segmentHeight) {
                scrollPosition = scrollPosition + segmentHeight
              }
            }
            
            columnContent.style.transform = `translateY(${scrollPosition}px)`
            animationFrameId = requestAnimationFrame(animate)
          }
          
          animationFrameId = requestAnimationFrame(animate)
          scrollIntervals[index] = animationFrameId as unknown as number
        }
        
        // Esperar menos tiempo para iniciar más rápido
        setTimeout(checkReady, 300)
      }
      
      initScroll()
    })
  }, 100)
}

// Pausar scroll al hacer hover
const pauseScroll = () => {
  isPaused.value = true
}

// Reanudar scroll al salir del hover
const resumeScroll = () => {
  isPaused.value = false
}

// Detener auto-scroll
const stopAutoScroll = () => {
  scrollIntervals.forEach((animationFrameId) => {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId as unknown as number)
    }
  })
  scrollIntervals = []
}

const handleWhatsApp = () => {
  const mensaje = '¡Hola! Me gustaría obtener información sobre sus juegos disponibles.'
  const numeroWhatsApp = '593998480376'
  const urlWhatsApp = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensaje)}`
  window.open(urlWhatsApp, '_blank')
}

const handleExploreCatalog = () => {
  window.location.href = '/ver-mas'
}

const handleAddToCart = (game: GameSummary | undefined) => {
  if (!game) return
  
  cartStore.addToCart(game, 1, 'Principal PS4')
}

// Handler para resize
let resizeHandler: (() => void) | null = null

onMounted(() => {
  // Inicializar con juegos mezclados
  reorderGames()
  
  // Reordenar juegos cada 15 segundos
  reorderInterval = window.setInterval(() => {
    reorderGames()
  }, 15000)
  
  // Iniciar auto-scroll después de un pequeño delay para que el DOM esté listo
  setTimeout(() => {
    // Iniciar masonry en tablet y desktop (768px+)
    if (window.innerWidth >= 768) {
      startAutoScroll()
    } else {
      // En móvil pequeño, iniciar carrusel horizontal
      startCarousel()
    }
  }, 500)
  
  // Escuchar cambios de tamaño de ventana
  resizeHandler = () => {
    if (window.innerWidth >= 768) {
      stopCarousel()
      startAutoScroll()
    } else {
      stopAutoScroll()
      startCarousel()
    }
  }
  
  window.addEventListener('resize', resizeHandler)
})

onUnmounted(() => {
  stopAutoScroll()
  stopCarousel()
  if (reorderInterval) {
    clearInterval(reorderInterval)
    reorderInterval = null
  }
  if (resizeHandler) {
    window.removeEventListener('resize', resizeHandler)
    resizeHandler = null
  }
})
</script>

<template>
  <section class="relative min-h-screen flex items-center overflow-hidden bg-linear-gradient(to bottom, #1a1a1a, #2a2a2a) py-20 md:py-0" style="min-height: 100vh; min-height: 100dvh;">
    <!-- Fondo animado gamer -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <!-- Gradientes de fondo -->
      <div class="absolute top-0 right-0 w-64 h-64 md:w-96 md:h-96 bg-error/10 rounded-full blur-3xl animate-pulse"></div>
      <div class="absolute bottom-0 left-0 w-64 h-64 md:w-96 md:h-96 bg-primary/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-linear-gradient(to right, transparent, #ef4444/5, transparent)"></div>
      
      <!-- Elementos gamer animados (ocultos en móvil) -->
      <div class="hidden md:block absolute top-20 right-20 w-32 h-32 opacity-10 animate-float">
        <svg viewBox="0 0 24 24" fill="currentColor" class="text-error">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
      </div>
      <div class="hidden md:block absolute bottom-32 right-40 w-24 h-24 opacity-10 animate-float-delayed">
        <svg viewBox="0 0 24 24" fill="currentColor" class="text-warning">
          <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
        </svg>
      </div>
      <div class="hidden md:block absolute top-40 left-20 w-20 h-20 opacity-10 animate-spin-slow">
        <svg viewBox="0 0 24 24" fill="currentColor" class="text-primary">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
        </svg>
      </div>
      
      <!-- Grid pattern -->
      <div class="absolute inset-0 opacity-5" style="background-image: linear-gradient(#ef4444 1px, transparent 1px), linear-gradient(90deg, #ef4444 1px, transparent 1px); background-size: 50px 50px;"></div>
    </div>

    <div class="container mx-auto px-4 md:px-6 relative z-10 py-8 md:py-0">
      <div class="grid lg:grid-cols-2 gap-6 md:gap-8 lg:gap-12 items-center">
        <!-- Lado Izquierdo: Contenido -->
        <div class="space-y-6 md:space-y-8 animate-fadeInLeft text-center lg:text-left">
         

          <!-- Título Principal -->
          <div class="space-y-2 sm:space-y-3 md:space-y-4 pt-32">
            <h1 class="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black leading-tight">
              <span class="text-white">Tu Tienda</span>
              <br />
              <span class="text-gradient-hero font-bold">Gamer</span>
              <br />
              <span class="text-white">De Confianza</span>
            </h1>
            <p class="text-sm sm:text-base md:text-lg lg:text-xl text-base-content/70 max-w-xl mx-auto lg:mx-0">
              Encuentra los mejores juegos para PlayStation 4 y 5. 
              <br class="hidden sm:block" />
              Cuentas verificadas, entrega inmediata y los mejores precios del mercado.
            </p>
          </div>

          <!-- Estadísticas -->
          <div class="flex flex-wrap justify-center lg:justify-start gap-3 sm:gap-4 md:gap-6">
            <div class="flex items-center gap-2 sm:gap-3 bg-base-100/30 backdrop-blur-sm px-3 sm:px-4 py-2 sm:py-3 rounded-xl">
              <div class="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full bg-error/20 flex items-center justify-center shrink-0">
                <Gamepad2 :size="18" class="text-error sm:w-5 sm:h-5 md:w-6 md:h-6" />
              </div>
              <div>
                <p class="text-lg sm:text-xl md:text-2xl font-bold text-white">{{ games.length }}+</p>
                <p class="text-xs text-base-content/60">Juegos Disponibles</p>
              </div>
            </div>
            <div class="flex items-center gap-2 sm:gap-3 bg-base-100/30 backdrop-blur-sm px-3 sm:px-4 py-2 sm:py-3 rounded-xl">
              <div class="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full bg-warning/20 flex items-center justify-center shrink-0">
                <Star :size="18" class="text-warning sm:w-5 sm:h-5 md:w-6 md:h-6" />
              </div>
              <div>
                <p class="text-lg sm:text-xl md:text-2xl font-bold text-white">100%</p>
                <p class="text-xs text-base-content/60">Verificado</p>
              </div>
            </div>
          </div>

          <!-- CTAs -->
          <div class="flex flex-col sm:flex-row gap-2 sm:gap-3 md:gap-4 max-w-lg mx-auto lg:mx-0">
            <button 
              @click="handleWhatsApp"
              class="btn btn-success btn-sm sm:btn-md md:btn-lg gap-2 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
            >
              <MessageCircle :size="18" class="sm:w-5 sm:h-5 md:w-6 md:h-6" />
              <span class="text-xs sm:text-sm md:text-base">Contactar por WhatsApp</span>
            </button>
            <button 
              @click="handleExploreCatalog"
              class="btn btn-outline btn-sm sm:btn-md md:btn-lg gap-2 hover:btn-error transition-all duration-300"
            >
              <Gamepad2 :size="18" class="sm:w-5 sm:h-5 md:w-6 md:h-6" />
              <span class="text-xs sm:text-sm md:text-base">Explorar Catálogo</span>
            </button>
          </div>
        </div>

          <!-- Lado Derecho: Masonry (Desktop/Tablet) / Carrusel Horizontal (Móvil) -->
        <div class="relative h-[300px] sm:h-[400px] md:h-[500px] lg:h-[600px] xl:h-[700px] animate-fadeInRight mt-8 lg:mt-0 overflow-hidden" v-if="allFeaturedGames.length > 0">
          <!-- Masonry para Desktop y Tablet (oculto solo en móvil pequeño) -->
          <div 
            class="hidden md:block masonry-container-wrapper h-full w-full overflow-hidden"
            @mouseenter="pauseScroll"
            @mouseleave="resumeScroll"
          >
            <div class="masonry-container h-full">
            <div 
              v-for="(column, colIndex) in masonryColumns" 
              :key="colIndex"
              :ref="(el) => { if (el) columnRefs[colIndex] = el as HTMLElement }"
              class="masonry-column-wrapper"
            >
              <div class="masonry-column-content">
                <div
                  v-for="(game, gameIndex) in column"
                  :key="`${game.id}-${gameIndex}`"
                  class="masonry-item"
                  :style="{ 
                    animationDelay: `${(colIndex * 0.2) + (gameIndex * 0.1)}s`
                  }"
                >
                <div class="relative w-full group cursor-pointer" @click="handleAddToCart(game)">
                  <!-- Imagen -->
                  <div class="relative w-full overflow-hidden rounded-lg sm:rounded-xl">
                    <img 
                      v-if="game?.foto"
                      :src="game.foto" 
                      :alt="game.nombre"
                      class="w-full h-auto object-contain transform group-hover:scale-105 transition-transform duration-500"
                    />
                    <!-- Overlay con gradiente -->
                    <div class="absolute inset-0 bg-linear-gradient(to top, rgba(0,0,0,0.8), transparent) opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    
                    <!-- Badge de oferta -->
                    <div 
                      v-if="game?.descuento && game.descuento > 0"
                      class="absolute top-2 right-2 z-10 bg-error text-white px-2 py-1 rounded-full font-bold text-xs shadow-lg"
                    >
                      -{{ game.descuento }}%
                    </div>
                    
                    <!-- Información en hover -->
                    <div class="absolute bottom-0 left-0 right-0 p-3 sm:p-4 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                      <h3 class="text-sm sm:text-base font-bold text-white mb-1 line-clamp-2">{{ game.nombre }}</h3>
                      <div class="flex items-center gap-1.5 flex-wrap">
                        <span class="badge badge-error badge-xs sm:badge-sm">{{ game.version }}</span>
                        <span v-if="game?.tipoPromocion && game.tipoPromocion !== 'ninguna'" class="badge badge-warning badge-xs sm:badge-sm">
                          {{ game.tipoPromocion }}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              </div>
            </div>
            </div>
          </div>

          <!-- Carrusel Horizontal para Móvil (visible solo en móvil pequeño) -->
          <div 
            class="md:hidden carousel-container h-full w-full overflow-hidden relative"
            @mouseenter="pauseCarousel"
            @mouseleave="resumeCarousel"
            @touchstart="pauseCarousel"
            @touchend="resumeCarousel"
          >
            <div class="carousel-wrapper h-full flex items-center">
              <div 
                class="carousel-track flex transition-transform duration-500 ease-in-out"
                :style="{ transform: `translateX(-${carouselIndex * 100}%)` }"
              >
                <div
                  v-for="(game, index) in allFeaturedGames"
                  :key="game.id"
                  class="carousel-slide shrink-0 w-full h-full px-4 flex items-center justify-center"
                >
                  <div class="relative w-full max-w-[200px] mx-auto group cursor-pointer" @click="handleAddToCart(game)">
                    <!-- Imagen -->
                    <div class="relative w-full overflow-hidden rounded-xl shadow-2xl">
                      <img 
                        v-if="game?.foto"
                        :src="game.foto" 
                        :alt="game.nombre"
                        class="w-full h-auto object-contain"
                      />
                      <!-- Overlay con gradiente -->
                      <div class="absolute inset-0 bg-linear-gradient(to top, rgba(0,0,0,0.7), transparent)"></div>
                      
                      <!-- Badge de oferta -->
                      <div 
                        v-if="game?.descuento && game.descuento > 0"
                        class="absolute top-2 right-2 z-10 bg-error text-white px-2 py-1 rounded-full font-bold text-xs shadow-lg"
                      >
                        -{{ game.descuento }}%
                      </div>
                      
                      <!-- Información -->
                      <div class="absolute bottom-0 left-0 right-0 p-3">
                        <h3 class="text-sm font-bold text-white mb-1 line-clamp-2">{{ game.nombre }}</h3>
                        <div class="flex items-center gap-1.5 flex-wrap">
                          <span class="badge badge-error badge-xs">{{ game.version }}</span>
                          <span v-if="game?.tipoPromocion && game.tipoPromocion !== 'ninguna'" class="badge badge-warning badge-xs">
                            {{ game.tipoPromocion }}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Indicadores del carrusel -->
            <div class="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
              <button
                v-for="(game, index) in allFeaturedGames"
                :key="game.id"
                @click="carouselIndex = index"
                class="w-2 h-2 rounded-full transition-all duration-300"
                :class="index === carouselIndex ? 'bg-error w-6' : 'bg-base-content/30'"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.text-gradient-hero {
  background: linear-gradient(135deg, #ef4444 0%, #f97316 50%, #eab308 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: gradient-shift 3s ease infinite;
  background-size: 200% 200%;
}

@keyframes gradient-shift {
  0%, 100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}

.animate-fadeInLeft {
  animation: fadeInLeft 0.8s ease-out;
}

.animate-fadeInRight {
  animation: fadeInRight 0.8s ease-out;
}

@keyframes fadeInLeft {
  from {
    opacity: 0;
    transform: translateX(-50px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes fadeInRight {
  from {
    opacity: 0;
    transform: translateX(50px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* Responsive animation adjustments */
@media (max-width: 640px) {
  @keyframes fadeInLeft {
    from {
      opacity: 0;
      transform: translateX(-20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes fadeInRight {
    from {
      opacity: 0;
      transform: translateX(20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
}

.line-clamp-2 {
  display: -webkit-box;
  line-clamp: 2;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Animaciones para fondo gamer */
.animate-float {
  animation: float 6s ease-in-out infinite;
}

.animate-float-delayed {
  animation: float 6s ease-in-out infinite;
  animation-delay: 2s;
}

.animate-spin-slow {
  animation: spin-slow 20s linear infinite;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0) rotate(0deg);
  }
  25% {
    transform: translateY(-20px) rotate(5deg);
  }
  50% {
    transform: translateY(0) rotate(0deg);
  }
  75% {
    transform: translateY(20px) rotate(-5deg);
  }
}

@keyframes spin-slow {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.delay-1000 {
  animation-delay: 1s;
}

/* Mejoras responsive adicionales */
@media (max-width: 640px) {
  section {
    min-height: 100vh;
    min-height: 100dvh; /* Dynamic viewport height for mobile */
    padding-top: 1rem;
    padding-bottom: 1rem;
  }
  
  /* Asegurar que el contenido no se corte */
  .container {
    padding-top: 1rem;
    padding-bottom: 1rem;
  }
}

/* Aspect ratio helper */
.aspect-3\/4 {
  aspect-ratio: 3 / 4;
}

/* Touch improvements for mobile */
@media (hover: none) and (pointer: coarse) {
  button:active {
    transform: scale(0.98);
  }
}

/* Masonry Layout Styles */
.masonry-container-wrapper {
  position: relative;
  overflow: hidden;
}

.masonry-container {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
  padding: 0.5rem;
  height: 100%;
  overflow: hidden;
  /* Rotación de 45 grados para el contenedor (al otro lado) */
  transform: rotate(45deg);
  transform-origin: center center;
  /* Ajustar tamaño para compensar la rotación (√2 ≈ 1.4142) */
  width: 141.42%;
  height: 141.42%;
  position: absolute;
  left: 50%;
  top: 50%;
  margin-left: -70.71%;
  margin-top: -70.71%;
}

/* Carrusel horizontal para móvil */
.carousel-container {
  position: relative;
}

.carousel-wrapper {
  height: 100%;
  overflow: hidden;
}

.carousel-track {
  height: 100%;
  will-change: transform;
}

.carousel-slide {
  height: 100%;
}

/* En móvil pequeño: ocultar masonry, mostrar carrusel */
@media (max-width: 767px) {
  .masonry-container-wrapper {
    display: none;
  }
}

.masonry-column-wrapper {
  height: 100%;
  overflow: hidden;
  position: relative;
}

.masonry-column-content {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  transition: transform 0.1s linear;
  will-change: transform;
  /* El contenido se duplica 6 veces, así que siempre hay suficiente */
  /* No necesitamos min-height porque el contenido ya es suficiente */
}

.masonry-item {
  width: 100%;
  border-radius: 0.5rem;
  overflow: hidden;
  animation: fadeInUp 0.6s ease-out both;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
  transition: transform 0.3s ease, box-shadow 0.3s ease, opacity 0.5s ease;
  display: flex;
  flex-direction: column;
  /* Rotar cada item de vuelta a -45 grados para que se vea recto */
  transform: rotate(-45deg);
  transform-origin: center center;
}

.masonry-item:hover {
  transform: rotate(-45deg) translateY(-4px) scale(1.05);
  box-shadow: 0 10px 15px -3px rgba(239, 68, 68, 0.3);
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Scrollbar styling para masonry */
.masonry-container::-webkit-scrollbar {
  width: 6px;
}

.masonry-container::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
}

.masonry-container::-webkit-scrollbar-thumb {
  background: rgba(239, 68, 68, 0.5);
  border-radius: 10px;
}

.masonry-container::-webkit-scrollbar-thumb:hover {
  background: rgba(239, 68, 68, 0.7);
}

/* Responsive masonry */
@media (max-width: 1024px) {
  .masonry-container {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem;
    /* Ajustar rotación y tamaño en tablet */
    width: 141.42%;
    height: 141.42%;
    margin-left: -70.71%;
    margin-top: -70.71%;
  }
}

/* Estilos adicionales para móvil ya están en el media query anterior */
</style>
