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
      <div v-if="model === 'card'">
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
          />
          <TachesAddElem :type="props.type" :parentId="props.parentId"/>
        </div>
        
        <TachesAddElem :type="props.type" :parentId="props.parentId" v-else/>
        
      </div>

      <div v-else>
        <div v-if="!error && items && items.length > 0">
          <TachesItemBreadcrumb
            :items="items"
            :model="model"
            :type="type"
            @itemClick="handleItemClick"
          />
          
        </div>
        <p v-else-if="error" class="text-red-500">{{ error }}</p>
        <p v-else class="text-gray-500">Aucun {{ type }} trouvé</p>
      </div>
    </div>
</template>