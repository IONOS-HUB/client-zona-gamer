<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import type { GameSummary } from "@/types/game";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-vue-next";
import GameCard from "@/components/ui/GameCard.vue";

interface Props {
  games: GameSummary[];
  title?: string;
  subtitle?: string;
  variant?: "primary" | "secondary";
}

const props = withDefaults(defineProps<Props>(), {
  title: "Ofertas Especiales",
  subtitle: "Aprovecha estos precios increíbles",
  variant: "primary",
});

const router = useRouter();
const currentIndex = ref(0);
const maxItems = 5;

const hasGames = computed(() => props.games.length > 0);

// Mostrar solo los primeros 10 juegos
const displayedGames = computed(() => props.games.slice(0, maxItems));
const hasMoreGames = computed(() => props.games.length > maxItems);

// Cantidad de items a mostrar en el carrusel (mejorado para móvil)
const itemsPerView = computed(() => {
  if (typeof window !== "undefined") {
    if (window.innerWidth >= 1536) return 6; // 2xl
    if (window.innerWidth >= 1280) return 5; // xl
    if (window.innerWidth >= 1024) return 4; // lg
    if (window.innerWidth >= 768) return 3; // md
    if (window.innerWidth >= 640) return 2; // sm
    return 1.5; // móvil: mostrar 1.5 items para indicar que hay más
  }
  return 1.5; // default móvil
});

const maxIndex = computed(() =>
  Math.max(0, displayedGames.value.length - Math.ceil(itemsPerView.value))
);

// Calcular gap dinámico según el tamaño de pantalla
const carouselGap = computed(() => {
  if (typeof window !== "undefined") {
    return window.innerWidth < 640 ? 12 : 16; // 0.75rem = 12px, 1rem = 16px
  }
  return 16;
});

const canGoLeft = computed(() => currentIndex.value > 0);
const canGoRight = computed(() => currentIndex.value < maxIndex.value);

const scrollLeft = () => {
  if (canGoLeft.value) {
    currentIndex.value = Math.max(0, currentIndex.value - 1);
  }
};

const scrollRight = () => {
  if (canGoRight.value) {
    currentIndex.value = Math.min(maxIndex.value, currentIndex.value + 1);
  }
};

const sectionClasses = computed(() => {
  return props.variant === "primary"
    ? "bg-gradient-to-br from-error/10 via-base-200/50 to-warning/10"
    : "bg-gradient-to-br from-success/10 via-base-200/50 to-info/10";
});

const badgeClasses = computed(() => {
  return props.variant === "primary" ? "badge-error" : "badge-success";
});

const handleVerMas = () => {
  router.push({
    name: "VerMas",
    query: {
      tipo: "ofertas",
      categoria: props.title,
    },
  });
};
</script>

<template>
  <section v-if="hasGames" class="mb-8 sm:mb-12 md:mb-16 animate-fadeInUp">
    <div
      :class="[
        'rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 border border-white/10 backdrop-blur-sm',
        sectionClasses,
      ]"
    >
      <!-- Header de la sección -->
      <div
        class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-8 gap-3 md:gap-4"
      >
        <div class="flex-1">
          <div class="flex items-center gap-2 md:gap-3 mb-2">
            <span :class="['badge badge-sm md:badge-lg font-bold', badgeClasses]">
              {{ games.length }} {{ games.length === 1 ? "Oferta" : "Ofertas" }}
            </span>
          </div>
          <h2
            class="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-gradient-animated mb-1 md:mb-2 leading-tight"
          >
            {{ title }}
          </h2>
          <p class="text-sm sm:text-base md:text-lg text-base-content/70 font-medium leading-relaxed">
            {{ subtitle }}
          </p>
        </div>

        <!-- Decoración -->
        <div class="hidden lg:flex items-center gap-3">
          <div class="relative">
            <div
              class="absolute inset-0 bg-error/20 blur-xl rounded-full"
            ></div>
            <Sparkles :size="64" class="text-error relative z-10" />
          </div>
        </div>
      </div>

      <!-- Carrusel Container -->
      <div class="relative overflow-hidden">
        <!-- Controles de navegación -->
        <div
          v-if="displayedGames.length > Math.ceil(itemsPerView) && displayedGames.length > 1"
          class="absolute top-1/2 -translate-y-1/2 left-1 sm:left-2 right-1 sm:right-2 flex justify-between items-center pointer-events-none z-10"
        >
          <button
            @click="scrollLeft"
            :disabled="!canGoLeft"
            :class="[
              'btn btn-circle btn-sm sm:btn-md bg-base-100/90 hover:bg-base-100 border-white/20 shadow-xl pointer-events-auto transition-all duration-300',
              canGoLeft ? 'opacity-100' : 'opacity-30',
            ]"
          >
            <ChevronLeft :size="18" class="sm:w-6 sm:h-6" />
          </button>
          <button
            @click="scrollRight"
            :disabled="!canGoRight"
            :class="[
              'btn btn-circle btn-sm sm:btn-md bg-base-100/90 hover:bg-base-100 border-white/20 shadow-xl pointer-events-auto transition-all duration-300',
              canGoRight ? 'opacity-100' : 'opacity-30',
            ]"
          >
            <ChevronRight :size="18" class="sm:w-6 sm:h-6" />
          </button>
        </div>

        <!-- Carrusel de juegos -->
        <div class="overflow-hidden -mx-2 sm:-mx-0">
          <div
            class="flex transition-transform duration-500 ease-out gap-3 sm:gap-4 px-2 sm:px-0"
            :style="{
              transform: `translateX(-${currentIndex * (100 / itemsPerView)}%)`,
            }"
          >
            <div
              v-for="game in displayedGames"
              :key="game.id"
              class="shrink-0"
              :style="{
                width: `calc(${100 / itemsPerView}% - ${
                  ((Math.ceil(itemsPerView) - 1) * carouselGap) / Math.ceil(itemsPerView)
                }px)`,
              }"
            >
              <GameCard :game="game" :show-add-to-cart="true" />
            </div>
          </div>
        </div>

        <!-- Indicadores de puntos -->
        <div v-if="maxIndex > 0" class="flex justify-center gap-1.5 sm:gap-2 mt-4 sm:mt-6">
          <button
            v-for="i in maxIndex + 1"
            :key="i"
            @click="currentIndex = i - 1"
            :class="[
              'h-1.5 sm:h-2 rounded-full transition-all duration-300 touch-manipulation',
              currentIndex === i - 1
                ? 'w-6 sm:w-8 bg-error'
                : 'w-1.5 sm:w-2 bg-base-content/30 hover:bg-base-content/50 active:bg-base-content/70',
            ]"
          />
        </div>
      </div>

      <!-- Botón Ver Más (si hay más de 5 juegos) -->
      <div v-if="hasMoreGames" class="mt-6 sm:mt-8 md:mt-10 flex justify-center">
        <button 
          @click="handleVerMas"
          class="btn btn-error btn-outline btn-sm sm:btn-md gap-2 touch-manipulation"
        >
          <span class="text-sm sm:text-base">Ver Todas las Ofertas</span>
          <ArrowRight :size="18" class="sm:w-6 sm:h-6" />
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.text-gradient-animated {
  background: linear-gradient(90deg, #ff6b6b, #feca57, #ff6b6b);
  background-size: 200% auto;
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: gradient-shift 3s ease infinite;
}

@keyframes gradient-shift {
  0%,
  100% {
    background-position: 0% center;
  }
  50% {
    background-position: 100% center;
  }
}

.animate-fadeInUp {
  animation: fadeInUp 0.6s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
