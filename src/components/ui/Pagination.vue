<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  currentPage: number
  totalPages: number
}

interface Emits {
  (e: 'page-change', page: number): void
  (e: 'next'): void
  (e: 'prev'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const pageNumbers = computed(() => {
  const pages: number[] = []
  const maxPages = 5
  
  if (props.totalPages <= maxPages) {
    for (let i = 1; i <= props.totalPages; i++) {
      pages.push(i)
    }
  } else {
    if (props.currentPage <= 3) {
      for (let i = 1; i <= 5; i++) {
        pages.push(i)
      }
    } else if (props.currentPage >= props.totalPages - 2) {
      for (let i = props.totalPages - 4; i <= props.totalPages; i++) {
        pages.push(i)
      }
    } else {
      for (let i = props.currentPage - 2; i <= props.currentPage + 2; i++) {
        pages.push(i)
      }
    }
  }
  
  return pages
})

const handlePrevPage = () => {
  if (props.currentPage > 1) {
    emit('prev')
  }
}

const handleNextPage = () => {
  if (props.currentPage < props.totalPages) {
    emit('next')
  }
}

const handleGoToPage = (page: number) => {
  emit('page-change', page)
}
</script>

<template>
  <div v-if="totalPages > 1" class="flex justify-center items-center gap-2">
    <button 
      @click="handlePrevPage"
      :disabled="currentPage === 1"
      class="btn btn-sm btn-outline btn-error"
      :class="{ 'btn-disabled': currentPage === 1 }"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
    </button>
    
    <div class="flex gap-1">
      <button
        v-for="page in pageNumbers"
        :key="page"
        @click="handleGoToPage(page)"
        class="btn btn-sm"
        :class="page === currentPage ? 'btn-error' : 'btn-outline btn-error'"
      >
        {{ page }}
      </button>
    </div>
    
    <button 
      @click="handleNextPage"
      :disabled="currentPage === totalPages"
      class="btn btn-sm btn-outline btn-error"
      :class="{ 'btn-disabled': currentPage === totalPages }"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
      </svg>
    </button>
    
    <span class="text-sm text-base-content/60 ml-4">
      Página {{ currentPage }} de {{ totalPages }}
    </span>
  </div>
</template>

