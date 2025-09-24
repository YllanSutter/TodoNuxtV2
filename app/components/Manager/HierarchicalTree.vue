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

const emit = defineEmits(['itemSelect'])

const hierarchicalData = ref([])
const loading = ref(true)

// Configuration hiérarchique modulable
const hierarchyConfig = [
  {
    type: 'group',
    children: [
      {
        type: 'subgroup',
        parentField: 'groupId',
        children: [
          {
            type: 'project',
            parentField: 'subgroupId',
            children: []
          }
        ]
      }
    ]
  }
]

// Fonction récursive pour charger les données hiérarchiques
async function loadHierarchicalData(items, config, level = 0) {
  const result = []
  
  for (const item of items) {
    const itemWithChildren = {
      ...item,
      type: config.type,
      level
    }
    
    // Charger les enfants pour chaque type configuré
    for (const childConfig of config.children) {
      const childrenKey = `${childConfig.type}s` // 'subgroups', 'projects', etc.
      itemWithChildren[childrenKey] = []
      
      try {
        const childrenData = await $fetch(`/api/data?type=${childConfig.type}&parentId=${item.id}`)
        if (childrenData.length > 0) {
          itemWithChildren[childrenKey] = await loadHierarchicalData(childrenData, childConfig, level + 1)
        }
      } catch (error) {
        console.error(`Erreur lors du chargement des ${childConfig.type}:`, error)
      }
    }
    
    result.push(itemWithChildren)
  }
  
  return result
}

// Charger toutes les données
async function loadAllData() {
  try {
    loading.value = true
    
    // Charger le niveau racine
    const rootData = await $fetch('/api/data?type=group')
    hierarchicalData.value = await loadHierarchicalData(rootData, hierarchyConfig[0])
  } catch (error) {
    console.error('Erreur lors du chargement des données:', error)
  } finally {
    loading.value = false
  }
}

// Fonction récursive pour rendre la hiérarchie
function renderHierarchy(items, config) {
  return items.map(item => ({
    ...item,
    childrenTypes: config.children.map(child => ({
      type: child.type,
      key: `${child.type}s`,
      config: child
    }))
  }))
}

function selectItem(item, type) {
  emit('itemSelect', {
    item,
    type,
    parentId: getParentId(item, type)
  })
}

function getParentId(item, type) {
  const config = findConfigByType(type)
  return config?.parentField ? item[config.parentField] : null
}

function findConfigByType(type, configs = hierarchyConfig) {
  for (const config of configs) {
    if (config.type === type) return config
    const childResult = findConfigByType(type, config.children)
    if (childResult) return childResult
  }
  return null
}

onMounted(() => {
  loadAllData()
})
</script>

<template>
  <div class="space-y-2">
    <div v-if="loading" class="text-sm opacity-50 px-2">
      Chargement...
    </div>
    
    <div v-else>
      <!-- Groupes -->
      <div v-for="group in hierarchicalData" :key="'group-' + group.id" class="space-y-1">
        <!-- Groupe principal -->
        <div 
          @click="selectItem(group, 'group')"
          class="flex gap-2 items-center px-2 py-1 text-sm cursor-pointer hover:bg-white/5 rounded"
          :class="{
            'bg-white/3 font-medium': selectedItemId == group.id && selectedType === 'group'
          }"
        >
          <div 
            v-if="group.color" 
            class="w-2 h-2 rounded-full" 
            :style="{ backgroundColor: group.color }"
          ></div>
          {{ group.name }}
        </div>
        
        <!-- Sous-groupes -->
        <div v-for="subgroup in group.subgroups" :key="'subgroup-' + subgroup.id" class="ml-4 space-y-1">
          <div 
            @click="selectItem(subgroup, 'subgroup')"
            class="flex gap-2 items-center px-2 py-1 text-sm cursor-pointer hover:bg-white/5 rounded"
            :class="{
              'bg-white/3 font-medium': selectedItemId == subgroup.id && selectedType === 'subgroup'
            }"
          >
            <div 
              v-if="subgroup.color" 
              class="w-2 h-2 rounded-full" 
              :style="{ backgroundColor: subgroup.color }"
            ></div>
            {{ subgroup.name }}
          </div>
          
          <!-- Projets -->
          <div v-for="project in subgroup.projects" :key="'project-' + project.id" class="ml-4">
            <div 
              @click="selectItem(project, 'project')"
              class="flex gap-2 items-center px-2 py-1 text-sm cursor-pointer hover:bg-white/5 rounded"
              :class="{
                'bg-white/3 font-medium': selectedItemId == project.id && selectedType === 'project'
              }"
            >
              <div 
                v-if="project.color" 
                class="w-2 h-2 rounded-full" 
                :style="{ backgroundColor: project.color }"
              ></div>
              {{ project.name }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>