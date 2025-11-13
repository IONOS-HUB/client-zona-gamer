<script setup lang="ts">
import { ref } from 'vue'
import { ChevronDown, MessageCircle } from 'lucide-vue-next'

interface FAQ {
  id: string
  question: string
  answer: string
}

const faqs: FAQ[] = [
  {
    id: '1',
    question: '¿Cómo funciona la compra de juegos digitales?',
    answer: 'Una vez que realices tu compra, recibirás las credenciales de acceso o el código de activación por correo electrónico de forma inmediata. Podrás descargar y jugar al instante.'
  },
  {
    id: '2',
    question: '¿Los juegos son legítimos y seguros?',
    answer: 'Sí, todos nuestros juegos son 100% legítimos y provienen directamente de distribuidores oficiales. Garantizamos la seguridad y autenticidad de todos nuestros productos.'
  },
  {
    id: '3',
    question: '¿Qué métodos de pago aceptan?',
    answer: 'Aceptamos múltiples métodos de pago incluyendo tarjetas de crédito/débito, PayPal, transferencias bancarias y otros métodos de pago locales según tu región.'
  },
  {
    id: '4',
    question: '¿Puedo reembolsar un juego si no me gusta?',
    answer: 'Debido a la naturaleza digital de nuestros productos, no ofrecemos reembolsos una vez que las credenciales han sido entregadas. Sin embargo, si hay algún problema técnico, nuestro equipo de soporte te ayudará a resolverlo.'
  },
  {
    id: '5',
    question: '¿Cuánto tiempo tarda la entrega?',
    answer: 'La entrega es instantánea. Una vez confirmado el pago, recibirás las credenciales o código de activación en tu correo electrónico en menos de 5 minutos.'
  },
  {
    id: '6',
    question: '¿Los juegos funcionan en todas las regiones?',
    answer: 'La mayoría de nuestros juegos son globales, pero algunos pueden tener restricciones regionales. Siempre indicamos esto en la descripción del producto antes de la compra.'
  },
  {
    id: '7',
    question: '¿Ofrecen soporte técnico?',
    answer: 'Sí, nuestro equipo de atención al cliente está disponible 24/7 para ayudarte con cualquier problema o consulta que puedas tener.'
  },
  {
    id: '8',
    question: '¿Puedo comprar juegos como regalo?',
    answer: 'Sí, puedes comprar juegos como regalo. Al realizar la compra, tendrás la opción de enviar las credenciales a otra dirección de correo electrónico.'
  }
]

const openItems = ref<Set<string>>(new Set())

const toggleItem = (id: string): void => {
  if (openItems.value.has(id)) {
    openItems.value.delete(id)
  } else {
    openItems.value.add(id)
  }
}
</script>

<template>
  <div class="w-full bg-base-200 py-12 md:py-16">
    <div class="container mx-auto px-4 md:px-6">
      <!-- Header -->
      <div class="text-center mb-12">
        <h2 class="text-4xl md:text-5xl font-black text-gradient mb-4">Preguntas Frecuentes</h2>
        <p class="text-base-content/70 text-lg">Encuentra respuestas a las dudas más comunes</p>
      </div>

      <!-- FAQ Items -->
      <div class="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          v-for="faq in faqs"
          :key="faq.id"
          class="bg-base-100 rounded-lg border border-white/10 overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300"
        >
          <!-- Question -->
          <button
            @click="toggleItem(faq.id)"
            class="w-full px-6 py-4 flex items-center justify-between gap-4 text-left hover:bg-base-200 transition-colors duration-200"
          >
            <span class="text-lg font-semibold text-white flex-1">{{ faq.question }}</span>
            <ChevronDown
              :size="24"
              class="text-base-content/60 flex-shrink-0 transition-transform duration-300"
              :class="{ 'rotate-180': openItems.has(faq.id) }"
            />
          </button>

          <!-- Answer -->
          <div
            class="overflow-hidden transition-all duration-300"
            :class="openItems.has(faq.id) ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'"
          >
            <div class="px-6 pb-4 text-base-content/80 leading-relaxed">
              {{ faq.answer }}
            </div>
          </div>
        </div>
      </div>

      <!-- Contacto adicional -->
      <div class="text-center mt-12">
        <p class="text-base-content/70 mb-4">¿No encuentras la respuesta que buscas?</p>
        <button class="btn btn-error gap-2 shadow-glow">
          <MessageCircle :size="20" />
          Contactar Soporte
        </button>
      </div>
    </div>
  </div>
</template>

