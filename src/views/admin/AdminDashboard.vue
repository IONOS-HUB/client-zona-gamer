<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useRoles } from '@/composables/useRoles'
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '@/config/firebase'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/config/firebase'
import type { AppUser, UserRole } from '@/types/user'

const router = useRouter()
const { signOut } = useAuth()
const { currentUserData, createUserWithRole, loadUserData } = useRoles()

const showCreateEmployee = ref(false)
const newEmployeeEmail = ref('')
const newEmployeePassword = ref('')
const newEmployeeName = ref('')
const newEmployeeRole = ref<UserRole>('employee')
const isCreating = ref(false)
const createError = ref('')
const createSuccess = ref('')

const employees = ref<AppUser[]>([])
const isLoadingEmployees = ref(false)

const loadEmployees = async (): Promise<void> => {
  isLoadingEmployees.value = true
  try {
    const q = query(collection(db, 'users'), where('role', 'in', ['employee', 'admin']))
    const querySnapshot = await getDocs(q)
    employees.value = querySnapshot.docs.map((doc) => doc.data() as AppUser)
  } catch (error) {
    console.error('Error cargando usuarios:', error)
  } finally {
    isLoadingEmployees.value = false
  }
}

const handleCreateEmployee = async (): Promise<void> => {
  if (!newEmployeeEmail.value || !newEmployeePassword.value) {
    createError.value = 'Por favor completa todos los campos'
    return
  }

  isCreating.value = true
  createError.value = ''
  createSuccess.value = ''

  try {
    // Guardar email del admin actual para re-autenticar después
    const adminEmail = currentUserData.value?.email || auth.currentUser?.email
    
    if (!adminEmail) {
      createError.value = 'No se pudo obtener el email del administrador'
      return
    }

    // Crear usuario en Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      newEmployeeEmail.value,
      newEmployeePassword.value
    )

    const employeeUid = userCredential.user.uid

    // Crear documento de usuario con el rol seleccionado
    await createUserWithRole(
      employeeUid,
      newEmployeeEmail.value,
      newEmployeeRole.value,
      currentUserData.value?.uid || '',
      newEmployeeName.value
    )

    // IMPORTANTE: Al crear un nuevo usuario con createUserWithEmailAndPassword,
    // Firebase automáticamente loguea a ese usuario. Para mantener la sesión del admin,
    // necesitamos volver a loguear al admin.
    // Nota: En producción, esto debería hacerse con Cloud Functions o Admin SDK
    
    const roleName = newEmployeeRole.value === 'admin' ? 'Administrador' : 'Empleado'
    createSuccess.value = `${roleName} creado exitosamente. Refresca la página para mantener tu sesión.`
    newEmployeeEmail.value = ''
    newEmployeePassword.value = ''
    newEmployeeName.value = ''
    newEmployeeRole.value = 'employee'
    showCreateEmployee.value = false

    // Recargar lista de empleados
    await loadEmployees()
    
  } catch (error: any) {
    console.error('Error creando empleado:', error)
    if (error.code === 'auth/email-already-in-use') {
      createError.value = 'Este email ya está en uso'
    } else {
      createError.value = 'Error al crear el empleado'
    }
  } finally {
    isCreating.value = false
  }
}

const handleLogout = async (): Promise<void> => {
  await signOut()
  router.push('/login')
}

onMounted(() => {
  loadEmployees()
})
</script>

<template>
  <div class="min-h-screen bg-base-200">
    <!-- Navbar -->
    <div class="navbar bg-base-100 shadow-lg">
      <div class="flex-1">
        <a class="btn btn-ghost text-xl">Panel de Administración</a>
      </div>
      <div class="flex-none gap-2">
        <div class="dropdown dropdown-end">
          <div tabindex="0" role="button" class="btn btn-ghost">
            {{ currentUserData?.email }}
          </div>
          <ul
            tabindex="0"
            class="mt-3 z-[1] p-2 shadow menu menu-sm dropdown-content bg-base-100 rounded-box w-52"
          >
            <li><a @click="handleLogout">Cerrar Sesión</a></li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Contenido -->
    <div class="container mx-auto p-6">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-3xl font-bold">Bienvenido, Admin</h1>
        <button class="btn btn-primary" @click="showCreateEmployee = true">
          + Crear Usuario
        </button>
      </div>

      <!-- Mensaje de éxito -->
      <div v-if="createSuccess" class="alert alert-success mb-4">
        <div class="flex-1">
          <span>{{ createSuccess }}</span>
        </div>
        <div class="flex gap-2">
          <button class="btn btn-sm btn-primary" @click="() => window.location.reload()">
            Recargar Página
          </button>
          <button class="btn btn-sm btn-ghost" @click="createSuccess = ''">✕</button>
        </div>
      </div>

      <!-- Lista de usuarios -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title">Usuarios del Sistema</h2>
          
          <div v-if="isLoadingEmployees" class="flex justify-center p-8">
            <span class="loading loading-spinner loading-lg"></span>
          </div>

          <div v-else-if="employees.length === 0" class="text-center p-8">
            <p class="text-gray-500">No hay usuarios registrados</p>
          </div>

          <div v-else class="overflow-x-auto">
            <table class="table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Email</th>
                  <th>Rol</th>
                  <th>Fecha de Creación</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="employee in employees" :key="employee.uid">
                  <td>{{ employee.displayName || 'Sin nombre' }}</td>
                  <td>{{ employee.email }}</td>
                  <td>
                    <span 
                      :class="[
                        'badge', 
                        employee.role === 'admin' ? 'badge-error' : 'badge-info'
                      ]"
                    >
                      {{ employee.role === 'admin' ? 'Administrador' : 'Empleado' }}
                    </span>
                  </td>
                  <td>{{ new Date(employee.createdAt).toLocaleDateString() }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal para crear usuario -->
    <dialog :class="['modal', { 'modal-open': showCreateEmployee }]">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">Crear Nuevo Usuario</h3>
        
        <form @submit.prevent="handleCreateEmployee" class="space-y-4">
          <div class="form-control">
            <label class="label">
              <span class="label-text">Nombre</span>
            </label>
            <input
              v-model="newEmployeeName"
              type="text"
              placeholder="Nombre del empleado"
              class="input input-bordered"
            />
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text">Email</span>
            </label>
            <input
              v-model="newEmployeeEmail"
              type="email"
              placeholder="empleado@email.com"
              class="input input-bordered"
              required
            />
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text">Contraseña</span>
            </label>
            <input
              v-model="newEmployeePassword"
              type="password"
              placeholder="••••••••"
              class="input input-bordered"
              required
            />
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text">Rol</span>
            </label>
            <select v-model="newEmployeeRole" class="select select-bordered">
              <option value="employee">Empleado</option>
              <option value="admin">Administrador</option>
            </select>
            <label class="label">
              <span class="label-text-alt text-xs">
                Los administradores tienen acceso completo al sistema
              </span>
            </label>
          </div>

          <div v-if="createError" class="alert alert-error">
            <span>{{ createError }}</span>
          </div>

          <div class="modal-action">
            <button
              type="button"
              class="btn"
              @click="showCreateEmployee = false"
              :disabled="isCreating"
            >
              Cancelar
            </button>
            <button
              type="submit"
              class="btn btn-primary"
              :disabled="isCreating"
            >
              <span v-if="isCreating" class="loading loading-spinner"></span>
              {{ isCreating ? 'Creando...' : 'Crear Usuario' }}
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="showCreateEmployee = false">close</button>
      </form>
    </dialog>
  </div>
</template>

