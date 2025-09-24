<script setup>
const props = defineProps({
  selectedItemId: {
    type: [String, Number],
    default: null
  },
  selectedType: {
    type: String,
    default: null
  }
})

const emit = defineEmits(['sidebarSelect'])

// État de navigation
const currentType = ref('group')
const currentParentId = ref(null)
const navigationHistory = ref([])
const isNavigatingFromCards = ref(false)

// Titres dynamiques selon le type
const titles = {
  group: {
    title: 'Groupes de projets',
    description: 'Organisez vos projets par groupes thématiques'
  },
  subgroup: {
    title: 'Sous-groupes',
    description: 'Explorez les sous-catégories de ce groupe'
  },
  project: {
    title: 'Projets',
    description: 'Gérez vos projets individuels'
  }
}

// Chemin hiérarchique pour la sélection sidebar
const hierarchicalPath = ref([])

// Fonction pour construire le chemin hiérarchique complet
async function buildHierarchicalPath(itemId, itemType) {
  if (!itemId || !itemType) {
    hierarchicalPath.value = []
    return
  }

  try {
    const path = []
    
    if (itemType === 'project') {
      // Récupérer le projet
      const projectData = await $fetch(`/api/data?type=project`)
      const project = projectData.find(p => p.id == itemId)
      
      if (project) {
        // Récupérer le sous-groupe parent
        const subgroupData = await $fetch(`/api/data?type=subgroup`)
        const subgroup = subgroupData.find(s => s.id == project.subgroupId)
        
        if (subgroup) {
          // Récupérer le groupe parent
          const groupData = await $fetch(`/api/data?type=group`)
          const group = groupData.find(g => g.id == subgroup.groupId)
          
          if (group) {
            path.push({
              id: group.id,
              name: group.name,
              type: 'group'
            })
          }
          
          path.push({
            id: subgroup.id,
            name: subgroup.name,
            type: 'subgroup'
          })
        }
        
        path.push({
          id: project.id,
          name: project.name,
          type: 'project'
        })
      }
    } else if (itemType === 'subgroup') {
      // Récupérer le sous-groupe
      const subgroupData = await $fetch(`/api/data?type=subgroup`)
      const subgroup = subgroupData.find(s => s.id == itemId)
      
      if (subgroup) {
        // Récupérer le groupe parent
        const groupData = await $fetch(`/api/data?type=group`)
        const group = groupData.find(g => g.id == subgroup.groupId)
        
        if (group) {
          path.push({
            id: group.id,
            name: group.name || `Groupe #${group.id}`,
            type: 'group'
          })
        }
        
        path.push({
          id: subgroup.id,
          name: subgroup.name || `Sous-groupe #${subgroup.id}`,
          type: 'subgroup'
        })
      }
    } else if (itemType === 'group') {
      // Récupérer le groupe
      const groupData = await $fetch(`/api/data?type=group`)
      const group = groupData.find(g => g.id == itemId)
      
      if (group) {
        path.push({
          id: group.id,
          name: group.name || `Groupe #${group.id}`,
          type: 'group'
        })
      }
    }
    
    hierarchicalPath.value = path
  } catch (error) {
    console.error('Erreur lors de la construction du chemin:', error)
    hierarchicalPath.value = []
  }
}

// Fonction pour naviguer vers un élément du chemin
function navigateToPathItem(pathItem) {
  currentType.value = pathItem.type
  currentParentId.value = pathItem.type === 'group' ? null : 
    (pathItem.type === 'subgroup' ? pathItem.groupId : pathItem.subgroupId)
  
  // Émettre la sélection
  emit('sidebarSelect', {
    item: { id: pathItem.id, name: pathItem.name },
    type: pathItem.type
  })
}

// Watcher pour synchroniser avec les props de la sidebar
watch([() => props.selectedItemId, () => props.selectedType], ([newId, newType]) => {
  if (newId && newType && !isNavigatingFromCards.value) {
    // Navigation depuis la sidebar seulement
    currentType.value = newType
    buildHierarchicalPath(newId, newType)
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

function goBack() {
  if (navigationHistory.value.length > 0) {
    const previous = navigationHistory.value.pop()
    currentType.value = previous.type
    currentParentId.value = previous.parentId
    
    // Synchroniser avec la sidebar
    emit('sidebarSelect', {
      item: { id: previous.itemId || previous.parentId, name: previous.title },
      type: previous.type
    })
  }
}

function goHome() {
  currentType.value = 'group'
  currentParentId.value = null
  navigationHistory.value = []
  
  // Réinitialiser la sélection de la sidebar
  emit('sidebarSelect', {
    item: { id: null, name: '' },
    type: null
  })
}
</script>

<template>
    <div class="w-5/6 p-8 grid gap-2 items-start content-start">
        <!-- Breadcrumb de navigation -->
        <div v-if="navigationHistory.length > 0 || (selectedItemId && selectedType)" class="mb-6">
          <UiBreadcrumb>
            <UiBreadcrumbList>
              <UiBreadcrumbItem>
                <UiBreadcrumbLink @click="goHome" href="#" class="cursor-pointer hover:text-blue-200">
                  Accueil
                </UiBreadcrumbLink>
                <UiBreadcrumbSeparator v-if="navigationHistory.length > 0 || hierarchicalPath.length > 0" />
              </UiBreadcrumbItem>
              <template v-if="navigationHistory.length > 0">
                <UiBreadcrumbItem v-for="(nav, index) in navigationHistory" :key="'nav-' + index">
                  <UiBreadcrumbLink 
                    v-if="index < navigationHistory.length - 1"
                    @click="() => {
                      navigationHistory.splice(index + 1)
                      currentType = nav.type
                      currentParentId = nav.parentId
                      
                      // Synchroniser avec la sidebar
                      emit('sidebarSelect', {
                        item: { id: nav.itemId || nav.parentId, name: nav.title },
                        type: nav.type
                      })
                    }" 
                    href="#" 
                    class="cursor-pointer hover:text-blue-200"
                  >
                    {{ nav.title }}
                  </UiBreadcrumbLink>
                  <span v-else class="text-gray-500">{{ nav.title }}</span>
                  <UiBreadcrumbSeparator v-if="index < navigationHistory.length - 1" />
                </UiBreadcrumbItem>
              </template>
              
              <template v-else-if="hierarchicalPath.length > 0">
                <UiBreadcrumbItem v-for="(pathItem, index) in hierarchicalPath" :key="'path-' + pathItem.id">
                  <UiBreadcrumbLink 
                    v-if="index < hierarchicalPath.length - 1"
                    @click="navigateToPathItem(pathItem)" 
                    href="#" 
                    class="cursor-pointer hover:text-blue-200"
                  >
                    {{ pathItem.name }}
                  </UiBreadcrumbLink>
                  <span v-else class="text-gray-500">{{ pathItem.name }}</span>
                  <UiBreadcrumbSeparator v-if="index < hierarchicalPath.length - 1" />
                </UiBreadcrumbItem>
              </template>
            </UiBreadcrumbList>
          </UiBreadcrumb>
        </div>
        <TachesGroup 
          :type="currentType" 
          :parentId="currentParentId"
          model="card"
          @navigate="handleNavigate"
        />
    </div>
</template>