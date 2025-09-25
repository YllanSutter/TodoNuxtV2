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

// Fonction pour charger les données
async function loadData(type = props.type, parentId = props.parentId) {
  try {
    let url = `/api/data?type=${type}`
    if (parentId) {
      url += `&parentId=${parentId}`
    }
    items.value = await $fetch(url)
  } catch (e) {
    error.value = e
  }
}

// Gestionnaire de clic sur un item
function handleItemClick(payload) {
  emit('navigate', payload)
}

// Gestionnaire de mise à jour des todos
function handleTodoUpdate(updatedTodo) {
  const index = items.value.findIndex(item => item.id === updatedTodo.id)
  if (index !== -1) {
    items.value[index] = { ...items.value[index], ...updatedTodo }
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
        <h2 class="text-xl font-bold mb-1">Groupe de projets</h2>
        <p class="text-sm opacity-50 mb-8">Organisez vos projets par groupes thématiques</p>
        
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
        <TachesTodoContainer
          :items="items" 
          :parent-id="props.parentId"
          @update="handleTodoUpdate"
          @refresh="loadData"
        />
      </div>

      <div v-else>
        <div v-if="!error && items && items.length > 0">
          
        </div>
        <p v-else-if="error" class="text-red-500">{{ error }}</p>
        <p v-else class="text-gray-500">Aucun {{ type }} trouvé</p>
      </div>
    </div>
</template>