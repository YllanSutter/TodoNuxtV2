<script setup>

// Props pour choisir le type de données à afficher
const props = defineProps({
  type: {
    type: String,
    default: 'group'
  },
  model: {
    type: String,
    default: 'group'
  },
  parentId: {
    type: [String, Number],
    default: null
  }
})

const emit = defineEmits(['navigate'])

const items = ref([])
const error = ref(null)
const project = ref(null)
const selectedProjectId = ref(null)

// Fonction pour charger les données
async function loadData(type = props.type, parentId = props.parentId) {
  try {
    let url = `/api/data?type=${type}`
    if (parentId) {
      url += `&parentId=${parentId}`
    }
    const result = await $fetch(url)
    items.value = result

    // Si on est en mode todo, récupérer le projet lié à l'id sélectionné (selectedProjectId)
    if (type === 'todo') {
      let projectId = selectedProjectId.value || (items.value[0]?.projectId)
      if (projectId) {
        try {
          const allProjects = await $fetch(`/api/data?type=project`)
          if (Array.isArray(allProjects)) {
            project.value = allProjects.find(p => p.id === projectId) || null
          } else {
            project.value = null
          }
        } catch (e) {
          project.value = null
        }
      } else {
        project.value = null
      }
    } else {
      project.value = null
    }
  } catch (e) {
    error.value = e
    console.log('[Group.vue] erreur chargement items:', e)
  }
}

// Gestionnaire de clic sur un item
function handleItemClick(payload) {
  if (props.type === 'project' && payload?.projectId) {
    selectedProjectId.value = payload.projectId
    loadData('todo', props.parentId)
  }
  emit('navigate', payload)
}

// (plus besoin de loadProjectById, tout passe par selectedProjectId)

// Gestionnaire de mise à jour des todos
function handleTodoUpdate(updatedTodo) {
  const index = items.value.findIndex(item => item.id === updatedTodo.id)
  if (index !== -1) {
    items.value[index] = { ...items.value[index], ...updatedTodo }
  }
}


// Gestionnaire de sélection d'une todo depuis TodoContainer
function handleTodoSelect(projectId) {
  if (props.type === 'todo' && projectId) {
    selectedProjectId.value = projectId
    loadData('todo', props.parentId)
  }
}

// Gestionnaire de création d'élément
function handleElementCreated(result) {
  console.log('Élément créé, rechargement des données...')
  loadData() // Recharger les données après création
}

function handleElementUpdated(result) {
  console.log('Élément update, rechargement des données...')
  loadData() // Recharger les données après création
}

function handleElementDeleted(result) {
  console.log('Élément supprimé, rechargement des données...')
  loadData() // Recharger les données après création
}

onMounted(() => {
  loadData()
})

// Watcher pour recharger les données quand les props changent
watch([() => props.type, () => props.parentId], () => {
  loadData()
})
</script>

<template>
    <div>
      <!-- Affichage conditionnel selon le model -->
      <div v-if="model === 'card' && (type != 'todo' || items.length == 0)">
        <h2 class="text-xl font-bold mt-3 capitalize mb-6">{{ type }}</h2>
        
        <div v-if="!error && items && items.length > 0" class="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
          <TachesItemCard 
            v-for="item in items" 
            :key="item.id"
            :item="item"
            :model="model"
            :type="type"
            @itemClick="handleItemClick"
            @updated="handleElementUpdated"
            @deleted="handleElementDeleted"
            @refresh="loadData"
          />
          <TachesAddElem :type="props.type" :parentId="props.parentId" @created="handleElementCreated"/>
        </div>
        
        <TachesAddElem :type="props.type" :parentId="props.parentId" @created="handleElementCreated" v-else/>
        
      </div>

      <div v-else-if="type == 'todo'" class="mt-10">
        <!-- Affichage des infos du projet -->
        <div v-if="project" class="mb-6 p-4 rounded bg-white/5 border border-white/10">
          <h2 class="text-lg font-bold mb-2">Projet : {{ project.name }}</h2>
          <p v-if="project.description" class="text-sm opacity-70 mb-1">{{ project.description }}</p>
          <div class="flex gap-4 text-xs opacity-50">
            <span v-if="project.status">Statut : <span class="capitalize">{{ project.status }}</span></span>
            <span v-if="project.createdAt">Créé le : {{ new Date(project.createdAt).toLocaleDateString() }}</span>
          </div>
        </div>
        <TachesTodoContainer
          :items="items" 
          :parent-id="props.parentId"
          @update="handleTodoUpdate"
          @refresh="loadData"
          @select="handleTodoSelect"
        />
// Gestionnaire de sélection d'une todo depuis TodoContainer
function handleTodoSelect(todoId) {
  if (props.type === 'todo' && todoId) {
    selectedTodoId.value = todoId
    loadData('todo', props.parentId)
  }
}
      </div>

      <div v-else>
        <div v-if="!error && items && items.length > 0">
          
        </div>
        <p v-else-if="error" class="text-red-500">{{ error }}</p>
        <p v-else class="text-gray-500">Aucun {{ type }} trouvé</p>
      </div>
    </div>
</template>