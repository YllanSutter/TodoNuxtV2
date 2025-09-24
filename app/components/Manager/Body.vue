<script setup>
const props = defineProps({
  selectedItemId: {
    type: [String, Number],
    default: null
  },
  selectedType: {
    type: String,
    default: null
  },
  selectedParentId: {
    type: [String, Number],
    default: null
  }
})

const emit = defineEmits(['sidebarSelect'])

// État de navigation
const currentType = ref('group')
const currentParentId = ref(null)
const navigationHistory = ref([])
const isNavigatingFromCards = ref(false)



// Watcher pour synchroniser avec les props de la sidebar
watch([() => props.selectedItemId, () => props.selectedType], ([newId, newType]) => {

  if (newId && newType && !isNavigatingFromCards.value) {
    // Navigation depuis la sidebar seulement - déterminer le bon état
    switch (newType) {
      case 'group':
        currentType.value = 'subgroup'
        currentParentId.value = newId
        break
      case 'subgroup':
        currentType.value = 'project'
        currentParentId.value = newId
        break
      case 'project':
        currentType.value = 'todo'
        currentParentId.value = newId
        break
      default:
        currentType.value = 'group'
        currentParentId.value = null
    }
    navigationHistory.value = []
  }
  // Reset du flag après traitement
  isNavigatingFromCards.value = false
})

// Gestion de la navigation
function handleNavigate(payload) {
  // Flag pour indiquer que la navigation vient des cards
  isNavigatingFromCards.value = true
  
  // Ajouter l'item cliqué à l'historique (pas l'état actuel)
  navigationHistory.value.push({
    type: payload.currentType,
    parentId: payload.parentId,
    title: payload.item.name || payload.item.title || `${payload.currentType} #${payload.item.id}`,
    itemId: payload.item.id
  })
  
  currentType.value = payload.nextType
  // Le currentParentId devient l'ID de l'élément sur lequel on a cliqué
  currentParentId.value = payload.item.id
  
  emit('sidebarSelect', {
    item: payload.item,
    type: payload.currentType  // Utiliser currentType pour mettre en surbrillance l'item cliqué
  })
}

</script>

<template>
    <div class="w-5/6 p-8 grid gap-2 items-start content-start">
        <NavigationBreadcrumb 
            mode="horizontal"
            :currentType="currentType"
            :currentParentId="currentParentId"
            :selectedItemId="selectedItemId"
            :selectedType="selectedType"
            @navigate="handleNavigate"
          />

        <TachesGroup 
          :type="currentType" 
          :parentId="currentParentId"
          model="card"
          @navigate="handleNavigate"
        />
    </div>
</template>