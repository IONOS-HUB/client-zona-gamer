<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useRoles } from '@/composables/useRoles'

const router = useRouter()
const { signIn } = useAuth()
const { loadUserData, hasAdminAccess, hasEmployeeAccess } = useRoles()

const email = ref('')
const password = ref('')
const error = ref('')
const isLoading = ref(false)

const handleLogin = async (): Promise<void> => {
  if (!email.value || !password.value) {
    error.value = 'Por favor completa todos los campos'
    return
  }

  isLoading.value = true
  error.value = ''

  try {
    await signIn({ email: email.value, password: password.value })
    
    // Esperar a que se carguen los datos del usuario
    await loadUserData()
    
    // Dar un momento para que se actualice el estado
    await new Promise((resolve) => setTimeout(resolve, 100))

    // Redirigir según el rol
    if (hasAdminAccess.value) {
      await router.push('/admin')
    } else if (hasEmployeeAccess.value) {
      await router.push('/employee')
    } else {
      await router.push('/')
    }
  } catch (err: any) {
    console.error('Error al iniciar sesión:', err)
    error.value = 'Email o contraseña incorrectos'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-base-200">
    <div class="card w-96 bg-base-100 shadow-xl">
      <div class="card-body">
        <h2 class="card-title text-center justify-center text-2xl mb-4">
          Zona Gamer - Login
        </h2>

        <form @submit.prevent="handleLogin" class="space-y-4">
          <div class="form-control">
            <label class="label">
              <span class="label-text">Email</span>
            </label>
            <input
              v-model="email"
              type="email"
              placeholder="tu@email.com"
              class="input input-bordered"
              required
            />
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text">Contraseña</span>
            </label>
            <input
              v-model="password"
              type="password"
              placeholder="••••••••"
              class="input input-bordered"
              required
            />
          </div>

          <div v-if="error" class="alert alert-error">
            <span>{{ error }}</span>
          </div>

          <div class="form-control mt-6">
            <button
              type="submit"
              class="btn btn-primary"
              :disabled="isLoading"
            >
              <span v-if="isLoading" class="loading loading-spinner"></span>
              {{ isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión' }}
            </button>
          </div>

          <div class="divider">O</div>

          <button
            type="button"
            class="btn btn-ghost btn-block"
            @click="router.push('/')"
          >
            Volver al inicio
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

