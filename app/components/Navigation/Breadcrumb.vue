<script setup>
const props = defineProps({
  mode: {
    type: String,
    default: 'horizontal', // 'horizontal' ou 'vertical'
    validator: (value) => ['horizontal', 'vertical'].includes(value)
  },
  currentType: {
    type: String,
    default: 'group'
  },
  currentParentId: {
    type: [String, Number],
    default: null
  },
  selectedItemId: {
    type: [String, Number],
    default: null
  },
  selectedType: {
    type: String,
    default: null
  }
})

const emit = defineEmits(['navigate'])

// État pour le mode vertical
const expandedGroups = ref(new Set())
const expandedSubgroups = ref(new Set())

// Données hiérarchiques complètes pour le mode vertical
const hierarchyData = ref({
  groups: [],
  subgroups: [],
  projects: [],
  todos: []
})

// Chemin de navigation pour le mode horizontal
const navigationPath = ref([])

// Charger toutes les données hiérarchiques
async function loadHierarchyData() {
  try {
    const [groups, subgroups, projects] = await Promise.all([
      $fetch('/api/data?type=group'),
      $fetch('/api/data?type=subgroup'), 
      $fetch('/api/data?type=project')
    ])

    hierarchyData.value = {
      groups: groups || [],
      subgroups: subgroups || [],
      projects: projects || []
    }

    // Auto-expand based on current selection
    if (props.selectedItemId && props.selectedType) {
      await autoExpandPath()
    }
  } catch (error) {
    console.error('Erreur chargement hiérarchie:', error)
  }
}

// Construction du chemin de navigation (mode horizontal)
async function buildNavigationPath() {
  if (!props.currentParentId && props.currentType === 'group') {
    navigationPath.value = [{ name: 'Accueil', type: 'group', id: null }]
    return
  }

  const path = [{ name: 'Accueil', type: 'group', id: null }]
  
  try {
    if (props.currentType === 'subgroup' && props.currentParentId) {
      // On est dans un groupe, ajouter le groupe au chemin
      const group = hierarchyData.value.groups.find(g => g.id === props.currentParentId)
      if (group) {
        path.push({ 
          name: group.name || `Groupe #${group.id}`, 
          type: 'group', 
          id: group.id 
        })
      }
    } else if (props.currentType === 'project' && props.currentParentId) {
      // On est dans un sous-groupe, construire le chemin complet
      const subgroup = hierarchyData.value.subgroups.find(s => s.id === props.currentParentId)
      if (subgroup) {
        const group = hierarchyData.value.groups.find(g => g.id === subgroup.groupId)
        if (group) {
          path.push({ 
            name: group.name || `Groupe #${group.id}`, 
            type: 'group', 
            id: group.id 
          })
        }
        path.push({ 
          name: subgroup.name || `Sous-groupe #${subgroup.id}`, 
          type: 'subgroup', 
          id: subgroup.id 
        })
      }
    } else if (props.currentType === 'todo' && props.currentParentId) {
      // On est dans un projet, construire le chemin complet
      const project = hierarchyData.value.projects.find(p => p.id === props.currentParentId)
      if (project) {
        const subgroup = hierarchyData.value.subgroups.find(s => s.id === project.subgroupId)
        if (subgroup) {
          const group = hierarchyData.value.groups.find(g => g.id === subgroup.groupId)
          if (group) {
            path.push({ 
              name: group.name || `Groupe #${group.id}`, 
              type: 'group', 
              id: group.id 
            })
          }
          path.push({ 
            name: subgroup.name || `Sous-groupe #${subgroup.id}`, 
            type: 'subgroup', 
            id: subgroup.id 
          })
        }
        path.push({ 
          name: project.name || `Projet #${project.id}`, 
          type: 'project', 
          id: project.id 
        })
      }
    }
    
    navigationPath.value = path
  } catch (error) {
    console.error('Erreur construction chemin:', error)
    navigationPath.value = [{ name: 'Accueil', type: 'group', id: null }]
  }
}

// Auto-expand les éléments du chemin actuel (mode vertical)
async function autoExpandPath() {
  if (!props.selectedItemId || !props.selectedType) return

  if (props.selectedType === 'project') {
    const project = hierarchyData.value.projects.find(p => p.id == props.selectedItemId)
    if (project) {
      const subgroup = hierarchyData.value.subgroups.find(s => s.id === project.subgroupId)
      if (subgroup) {
        expandedGroups.value.add(subgroup.groupId)
        expandedSubgroups.value.add(subgroup.id)
      }
    }
  } else if (props.selectedType === 'subgroup') {
    const subgroup = hierarchyData.value.subgroups.find(s => s.id == props.selectedItemId)
    if (subgroup) {
      expandedGroups.value.add(subgroup.groupId)
    }
  }
}

// Navigation handlers
function navigateToItem(item) {

  // Vérifier si l'élément a des enfants et toggle la visibilité en plus de la navigation
  if (item.type === 'group' && item.id) {
    const hasChildren = getSubgroupsForGroup(item.id).length > 0
    if (hasChildren) {
      toggleGroup(item.id)
    }
  } else if (item.type === 'subgroup') {
    const hasChildren = getProjectsForSubgroup(item.id).length > 0
    if (hasChildren) {
      toggleSubgroup(item.id)
    }
  }

  // Navigation dans tous les cas
  let nextType, parentId

  switch (item.type) {
    case 'group':
      if (item.id === null) {
        // Accueil - afficher les groupes
        nextType = 'group'
        parentId = null
      } else {
        nextType = 'subgroup'
        parentId = item.id
      }
      break
    case 'subgroup':
      nextType = 'project'
      parentId = item.id
      break
    case 'project':
      nextType = 'todo'
      parentId = item.id
      break
    default:
      nextType = 'group'
      parentId = null
  }

  emit('navigate', {
    item: { id: item.id, name: item.name },
    currentType: item.type,
    nextType,
    parentId: item.id === null ? null : item.id
  })
}

// Toggle expand/collapse pour le mode vertical
function toggleGroup(groupId) {
  if (expandedGroups.value.has(groupId)) {
    expandedGroups.value.delete(groupId)
    // Fermer aussi tous les sous-groupes de ce groupe
    hierarchyData.value.subgroups
      .filter(s => s.groupId === groupId)
      .forEach(s => expandedSubgroups.value.delete(s.id))
  } else {
    expandedGroups.value.add(groupId)
  }
}

function toggleSubgroup(subgroupId) {
  if (expandedSubgroups.value.has(subgroupId)) {
    expandedSubgroups.value.delete(subgroupId)
  } else {
    expandedSubgroups.value.add(subgroupId)
  }
}

// Filtres pour les données hiérarchiques
const getSubgroupsForGroup = (groupId) => {
  return hierarchyData.value.subgroups.filter(s => s.groupId === groupId)
}

const getProjectsForSubgroup = (subgroupId) => {
  return hierarchyData.value.projects.filter(p => p.subgroupId === subgroupId)
}

// Vérifier si un élément est sélectionné
function isSelected(item, type) {
  return props.selectedItemId == item.id && props.selectedType === type
}

// Watchers
watch([() => props.currentType, () => props.currentParentId, () => props.mode], async () => {
  if (props.mode === 'horizontal') {
    // S'assurer que les données sont chargées avant de construire le chemin
    if (!hierarchyData.value.groups.length) {
      await loadHierarchyData()
    }
    buildNavigationPath()
  }
})

watch([() => props.selectedItemId, () => props.selectedType], () => {
  if (props.mode === 'vertical') {
    autoExpandPath()
  }
})

// Lifecycle
onMounted(async () => {
  await loadHierarchyData()
  if (props.mode === 'horizontal') {
    buildNavigationPath()
  }
})
</script>

<template>
  <div v-if="mode === 'horizontal'" class="flex items-center gap-2 text-sm">
    <!-- Mode horizontal - breadcrumb classique -->
    <template v-for="(item, index) in navigationPath" :key="`nav-${index}`">
      <button
        @click="navigateToItem(item)"
        class="text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
        :class="{ 'text-gray-400': index === navigationPath.length - 1 }"
      >
        {{ item.name }}
      </button>
      <span v-if="index < navigationPath.length - 1" class="text-gray-500">
        <svg class="w-3 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
        </svg>
      </span>
    </template>
  </div>

  <div v-else class="space-y-1 text-sm">
    <!-- Mode vertical - arborescence complète -->
    
    <!-- Accueil -->
    <div 
      class="flex items-center gap-2 p-2 rounded cursor-pointer transition-colors"
      :class="!props.selectedItemId && !props.selectedType ? 'bg-blue-600/20 text-blue-400' : 'hover:bg-gray-700/50'"
      @click="navigateToItem({ name: 'Accueil', type: 'group', id: null })"
    >
      <svg class="w-3 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"></path>
      </svg>
      <span>Accueil</span>
    </div>

    <!-- Groupes -->
    <div v-for="group in hierarchyData.groups" :key="group.id" class="space-y-1 relative">
      <div class="absolute left-[18px] border-l border-white/5 h-full w-1"></div>
      <div 
        class="flex items-center gap-2 p-2 rounded cursor-pointer transition-colors"
        :class="isSelected(group, 'group') ? 'bg-blue-600/20 text-blue-400' : 'hover:bg-gray-700/50'"
        @click="navigateToItem({ ...group, type: 'group' })"
      >
        <button
          v-if="getSubgroupsForGroup(group.id).length > 0"
          @click.stop="toggleGroup(group.id)"
          class="flex-shrink-0 p-1 hover:bg-gray-600/50 rounded-full bg-gray-900 z-10 relative"
        >
          <svg 
            class="w-3 h-3 transition-transform"
            :class="expandedGroups.has(group.id) ? 'rotate-90' : ''"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
          </svg>
        </button>
        <div v-else class="w-3 flex-shrink-0"></div>
        <div class="flex items-center gap-2 flex-1">
          <div 
            class="w-3 h-3  rounded-full"
            :style="{ backgroundColor: group.color }"
          ></div>
          <span>{{ group.name || `Groupe #${group.id}` }}</span>
        </div>
      </div>

      <!-- Sous-groupes -->
      <div v-if="expandedGroups.has(group.id)" class="ml-6 space-y-1">
        <div v-for="subgroup in getSubgroupsForGroup(group.id)" :key="subgroup.id" class="space-y-1">
          <div 
            class="flex items-center gap-2 p-2 rounded cursor-pointer transition-colors"
            :class="isSelected(subgroup, 'subgroup') ? 'bg-white/5' : 'hover:bg-white/5'"
            @click="navigateToItem({ ...subgroup, type: 'subgroup' })"
          >
            <button
              v-if="getProjectsForSubgroup(subgroup.id).length > 0"
              @click.stop="toggleSubgroup(subgroup.id)"
              class="flex-shrink-0 p-1 hover:bg-gray-600/50 rounded-full bg-gray-900 z-10 relative"
            >
              <svg 
                class="w-3 h-3 transition-transform"
                :class="expandedSubgroups.has(subgroup.id) ? 'rotate-90' : ''"
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
              </svg>
            </button>
            <div v-else class="w-3 flex-shrink-0"></div>
            <div class="flex items-center gap-2 flex-1">
              <div 
                class="w-3 h-3  rounded-full"
                :style="{ backgroundColor: subgroup.color }"
              ></div>
              <span>{{ subgroup.name || `Sous-groupe #${subgroup.id}` }}</span>
            </div>
          </div>

          <!-- Projets -->
          <div v-if="expandedSubgroups.has(subgroup.id)" class="ml-10 space-y-1">
            <div 
              v-for="project in getProjectsForSubgroup(subgroup.id)" 
              :key="project.id"
              class="flex items-center gap-2 p-2 rounded cursor-pointer transition-colors"
              :class="isSelected(project, 'project') ? 'bg-white/5' : 'hover:bg-white/5'"
              @click="navigateToItem({ ...project, type: 'project' })"
            >
              <div class="w-3 flex justify-center">
                <div 
                  class="w-3 h-3 rounded-full"
                  :style="{ backgroundColor: project.color }"
                ></div>
              </div>
              <span>{{ project.name || `Projet #${project.id}` }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>