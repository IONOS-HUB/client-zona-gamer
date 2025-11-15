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
import { BarChart3, Users, Gamepad2, Home } from 'lucide-vue-next'
import StatsOverview from '@/components/admin/StatsOverview.vue'

const router = useRouter()
const { signOut } = useAuth()
const { currentUserData, createUserWithRole, loadUserData, updateUserRole, updateUserData, deleteUser } = useRoles()

// Estado para el tab activo
const activeTab = ref<'stats' | 'users'>('stats')

// Estados para crear usuario
const showCreateEmployee = ref(false)
const newEmployeeEmail = ref('')
const newEmployeePassword = ref('')
const newEmployeeName = ref('')
const newEmployeeRole = ref<UserRole>('employee')
const isCreating = ref(false)
const createError = ref('')
const createSuccess = ref('')

// Estados para la lista de empleados
const employees = ref<AppUser[]>([])
const isLoadingEmployees = ref(false)

// Estados para actualizar rol
const updatingRoleUserId = ref<string | null>(null)
const roleUpdateError = ref('')
const roleUpdateSuccess = ref('')

// Estados para editar usuario
const showEditEmployee = ref(false)
const editingEmployee = ref<AppUser | null>(null)
const editEmployeeName = ref('')
const editEmployeeEmail = ref('')
const isEditing = ref(false)
const editError = ref('')
const editSuccess = ref('')

// Estados para eliminar usuario
const showDeleteConfirm = ref(false)
const deletingEmployee = ref<AppUser | null>(null)
const isDeleting = ref(false)
const deleteError = ref('')
const deleteSuccess = ref('')

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

const handleRoleChange = async (userId: string, newRole: UserRole): Promise<void> => {
  if (userId === currentUserData.value?.uid) {
    roleUpdateError.value = 'No puedes cambiar tu propio rol'
    setTimeout(() => {
      roleUpdateError.value = ''
    }, 3000)
    return
  }

  updatingRoleUserId.value = userId
  roleUpdateError.value = ''
  roleUpdateSuccess.value = ''

  try {
    await updateUserRole(userId, newRole)
    
    // Actualizar la lista local
    const employeeIndex = employees.value.findIndex(emp => emp.uid === userId)
    if (employeeIndex !== -1 && employees.value[employeeIndex]) {
      employees.value[employeeIndex]!.role = newRole
    }
    
    const roleName = newRole === 'admin' ? 'Administrador' : 'Empleado'
    roleUpdateSuccess.value = `Rol actualizado a ${roleName} exitosamente`
    
    setTimeout(() => {
      roleUpdateSuccess.value = ''
    }, 3000)
  } catch (error) {
    console.error('Error actualizando rol:', error)
    roleUpdateError.value = 'Error al actualizar el rol'
    
    setTimeout(() => {
      roleUpdateError.value = ''
    }, 3000)
  } finally {
    updatingRoleUserId.value = null
  }
}

const formatearFecha = (fecha: Date | string): string => {
  const date = typeof fecha === 'string' ? new Date(fecha) : fecha
  return new Intl.DateTimeFormat('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).format(date)
}

const iniciarEdicion = (employee: AppUser): void => {
  editingEmployee.value = employee
  editEmployeeName.value = employee.displayName || ''
  editEmployeeEmail.value = employee.email
  editError.value = ''
  editSuccess.value = ''
  showEditEmployee.value = true
}

const handleEditEmployee = async (): Promise<void> => {
  if (!editingEmployee.value) return

  isEditing.value = true
  editError.value = ''
  editSuccess.value = ''

  try {
    await updateUserData(
      editingEmployee.value.uid,
      editEmployeeName.value
    )

    // Actualizar en la lista local
    const employeeIndex = employees.value.findIndex(emp => emp.uid === editingEmployee.value?.uid)
    if (employeeIndex !== -1 && employees.value[employeeIndex]) {
      employees.value[employeeIndex]!.displayName = editEmployeeName.value
    }

    editSuccess.value = 'Usuario actualizado exitosamente'
    
    setTimeout(() => {
      showEditEmployee.value = false
      editSuccess.value = ''
      editingEmployee.value = null
    }, 1500)
  } catch (error) {
    console.error('Error actualizando usuario:', error)
    editError.value = 'Error al actualizar el usuario'
  } finally {
    isEditing.value = false
  }
}

const iniciarEliminacion = (employee: AppUser): void => {
  if (employee.uid === currentUserData.value?.uid) {
    deleteError.value = 'No puedes eliminar tu propia cuenta'
    setTimeout(() => {
      deleteError.value = ''
    }, 3000)
    return
  }
  
  deletingEmployee.value = employee
  deleteError.value = ''
  showDeleteConfirm.value = true
}

const handleDeleteEmployee = async (): Promise<void> => {
  if (!deletingEmployee.value) return

  isDeleting.value = true
  deleteError.value = ''
  deleteSuccess.value = ''

  try {
    await deleteUser(deletingEmployee.value.uid)

    // Remover de la lista local
    employees.value = employees.value.filter(emp => emp.uid !== deletingEmployee.value?.uid)

    deleteSuccess.value = 'Usuario eliminado exitosamente'
    showDeleteConfirm.value = false
    deletingEmployee.value = null

    setTimeout(() => {
      deleteSuccess.value = ''
    }, 3000)
  } catch (error) {
    console.error('Error eliminando usuario:', error)
    deleteError.value = 'Error al eliminar el usuario'
  } finally {
    isDeleting.value = false
  }
}

const cancelarEliminacion = (): void => {
  showDeleteConfirm.value = false
  deletingEmployee.value = null
  deleteError.value = ''
}

const handleLogout = async (): Promise<void> => {
  await signOut()
  router.push('/login')
}

onMounted(() => {
  loadEmployees()
})

const irAHome = (): void => {
  router.push('/')
}
</script>

<template>
  <div class="min-h-screen bg-base-200">
    <!-- Navbar -->
    <div class="navbar bg-base-100 shadow-lg border-b border-white/10">
      <div class="flex-1">
        <a class="btn btn-ghost text-xl font-bold">
          <BarChart3 :size="24" class="text-primary" />
          Panel de Administración
        </a>
      </div>
      <div class="flex-none gap-2">
        <button @click="irAHome" class="btn btn-ghost gap-2">
          <Home :size="20" />
          <span class="hidden md:inline">Ir a la Tienda</span>
        </button>
        <div class="dropdown dropdown-end">
          <div tabindex="0" role="button" class="btn btn-ghost gap-2">
            <div class="avatar placeholder">
              <div class="bg-primary text-primary-content rounded-full w-8">
                <span class="text-xs">{{ currentUserData?.email?.charAt(0).toUpperCase() }}</span>
              </div>
            </div>
            <span class="hidden md:inline">{{ currentUserData?.email }}</span>
          </div>
          <ul
            tabindex="0"
            class="mt-3 z-100 p-2 shadow-lg menu menu-sm dropdown-content bg-base-100 rounded-box w-52 border border-white/10"
          >
            <li class="menu-title">
              <span class="text-xs">Administrador</span>
            </li>
            <div class="divider my-1"></div>
            <li><a @click="handleLogout" class="text-error">Cerrar Sesión</a></li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Tabs de Navegación -->
    <div class="bg-base-100 border-b border-white/10 sticky top-0 z-50">
      <div class="container mx-auto">
        <div class="tabs tabs-boxed bg-transparent gap-2 p-4">
          <button 
            @click="activeTab = 'stats'" 
            :class="['tab gap-2 transition-all', activeTab === 'stats' ? 'tab-active' : '']"
          >
            <BarChart3 :size="18" />
            Estadísticas
          </button>
          <button 
            @click="activeTab = 'users'" 
            :class="['tab gap-2 transition-all', activeTab === 'users' ? 'tab-active' : '']"
          >
            <Users :size="18" />
            Gestión de Usuarios
          </button>
          <button 
            @click="router.push('/games')" 
            class="tab gap-2 transition-all hover:tab-active"
          >
            <Gamepad2 :size="18" />
            Gestión de Juegos
          </button>
        </div>
      </div>
    </div>

    <!-- Contenido por Tab -->
    <div class="container mx-auto p-6">
      <!-- Tab: Estadísticas -->
      <div v-if="activeTab === 'stats'">
        <StatsOverview :read-only="false" />
      </div>

      <!-- Tab: Gestión de Usuarios -->
      <div v-if="activeTab === 'users'">
        <div class="flex justify-between items-center mb-6">
          <div>
            <h1 class="text-3xl font-bold">Gestión de Usuarios</h1>
            <p class="text-base-content/60 mt-1">Administra los usuarios del sistema</p>
          </div>
          <button class="btn btn-primary gap-2" @click="showCreateEmployee = true">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Crear Usuario
          </button>
        </div>

      <!-- Mensaje de éxito de creación -->
      <div v-if="createSuccess" class="alert alert-success mb-4">
        <div class="flex-1">
          <span>{{ createSuccess }}</span>
        </div>
        <div class="flex gap-2">
          <button
            class="btn btn-sm btn-primary"
            @click="loadEmployees()"
          >
            Recargar Página
          </button>
          <button
            class="btn btn-sm btn-ghost"
            @click="createSuccess = ''"
          >
            ✕
          </button>
        </div>
      </div>

      <!-- Mensaje de éxito de actualización de rol -->
      <div v-if="roleUpdateSuccess" class="alert alert-success mb-4">
        <div class="flex-1">
          <span>{{ roleUpdateSuccess }}</span>
        </div>
      </div>

      <!-- Mensaje de error de actualización de rol -->
      <div v-if="roleUpdateError" class="alert alert-error mb-4">
        <div class="flex-1">
          <span>{{ roleUpdateError }}</span>
        </div>
      </div>

      <!-- Mensaje de éxito de edición -->
      <div v-if="editSuccess" class="alert alert-success mb-4">
        <div class="flex-1">
          <span>{{ editSuccess }}</span>
        </div>
      </div>

      <!-- Mensaje de éxito de eliminación -->
      <div v-if="deleteSuccess" class="alert alert-success mb-4">
        <div class="flex-1">
          <span>{{ deleteSuccess }}</span>
        </div>
      </div>

      <!-- Mensaje de error de eliminación -->
      <div v-if="deleteError" class="alert alert-error mb-4">
        <div class="flex-1">
          <span>{{ deleteError }}</span>
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
                  <th>Tipo</th>
                  <th>Fecha de Creación</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="employee in employees" :key="employee.uid">
                  <td>{{ employee.displayName || 'Sin nombre' }}</td>
                  <td>
                    {{ employee.email }}
                    <span 
                      v-if="employee.uid === currentUserData?.uid" 
                      class="badge badge-sm badge-outline ml-2"
                    >
                      Tú
                    </span>
                  </td>
                  <td>
                    <select 
                      :value="employee.role"
                      @change="(e) => handleRoleChange(employee.uid, (e.target as HTMLSelectElement).value as UserRole)"
                      class="select select-bordered select-sm w-full max-w-xs"
                      :disabled="updatingRoleUserId === employee.uid || employee.uid === currentUserData?.uid"
                    >
                      <option value="employee">Empleado</option>
                      <option value="admin">Administrador</option>
                    </select>
                    <span v-if="updatingRoleUserId === employee.uid" class="loading loading-spinner loading-sm ml-2"></span>
                  </td>
                  <td>{{ formatearFecha(employee.createdAt) }}</td>
                  <td>
                    <div class="flex gap-2">
                      <button
                        class="btn btn-sm btn-primary"
                        @click="iniciarEdicion(employee)"
                        :disabled="updatingRoleUserId === employee.uid"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Editar
                      </button>
                      <button
                        class="btn btn-sm btn-error"
                        @click="iniciarEliminacion(employee)"
                        :disabled="updatingRoleUserId === employee.uid || employee.uid === currentUserData?.uid"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Borrar
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
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

    <!-- Modal para editar usuario -->
    <dialog :class="['modal', { 'modal-open': showEditEmployee }]">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">Editar Usuario</h3>
        
        <form @submit.prevent="handleEditEmployee" class="space-y-4">
          <div class="form-control">
            <label class="label">
              <span class="label-text">Nombre</span>
            </label>
            <input
              v-model="editEmployeeName"
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
              v-model="editEmployeeEmail"
              type="email"
              placeholder="empleado@email.com"
              class="input input-bordered"
              required
              disabled
            />
            <label class="label">
              <span class="label-text-alt text-xs text-warning">
                El email no se puede modificar desde esta interfaz
              </span>
            </label>
          </div>

          <div v-if="editError" class="alert alert-error">
            <span>{{ editError }}</span>
          </div>

          <div v-if="editSuccess" class="alert alert-success">
            <span>{{ editSuccess }}</span>
          </div>

          <div class="modal-action">
            <button
              type="button"
              class="btn"
              @click="showEditEmployee = false"
              :disabled="isEditing"
            >
              Cancelar
            </button>
            <button
              type="submit"
              class="btn btn-primary"
              :disabled="isEditing"
            >
              <span v-if="isEditing" class="loading loading-spinner"></span>
              {{ isEditing ? 'Guardando...' : 'Guardar Cambios' }}
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="showEditEmployee = false">close</button>
      </form>
    </dialog>

    <!-- Modal de confirmación para eliminar usuario -->
    <dialog :class="['modal', { 'modal-open': showDeleteConfirm }]">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">Confirmar Eliminación</h3>
        
        <div class="py-4">
          <p class="text-base mb-4">
            ¿Estás seguro de que deseas eliminar al usuario?
          </p>
          
          <div v-if="deletingEmployee" class="bg-base-200 p-4 rounded-lg">
            <p class="font-semibold">{{ deletingEmployee.displayName || 'Sin nombre' }}</p>
            <p class="text-sm text-gray-500">{{ deletingEmployee.email }}</p>
            <p class="text-sm">
              <span class="badge badge-sm" :class="deletingEmployee.role === 'admin' ? 'badge-error' : 'badge-info'">
                {{ deletingEmployee.role === 'admin' ? 'Administrador' : 'Empleado' }}
              </span>
            </p>
          </div>

          <div class="alert alert-warning mt-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>Esta acción no se puede deshacer</span>
          </div>

          <div v-if="deleteError" class="alert alert-error mt-4">
            <span>{{ deleteError }}</span>
          </div>
        </div>

        <div class="modal-action">
          <button
            type="button"
            class="btn"
            @click="cancelarEliminacion"
            :disabled="isDeleting"
          >
            Cancelar
          </button>
          <button
            type="button"
            class="btn btn-error"
            @click="handleDeleteEmployee"
            :disabled="isDeleting"
          >
            <span v-if="isDeleting" class="loading loading-spinner"></span>
            {{ isDeleting ? 'Eliminando...' : 'Eliminar Usuario' }}
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="cancelarEliminacion">close</button>
      </form>
    </dialog>
  </div>
</template>

