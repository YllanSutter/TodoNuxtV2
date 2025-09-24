<script setup>
const props = defineProps({
  item: {
    type: Object,
    required: true
  },
  itemType: {
    type: String,
    required: true
  },
  childItems: {
    type: Array,
    default: () => []
  },
  depth: {
    type: Number,
    default: 0
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

const emit = defineEmits(['itemSelect'])

// Configuration pour chaque niveau hiérarchique
const hierarchyConfig = {
  group: {
    childType: 'subgroup',
    childKey: 'subgroups'
  },
  subgroup: {
    childType: 'project',
    childKey: 'projects'
  },
  project: {
    childType: null,
    childKey: null
  }
}

function selectItem(item, type) {
  emit('itemSelect', {
    item,
    type,
    parentId: type === 'group' ? null : (type === 'subgroup' ? item.groupId : item.subgroupId)
  })
}

function getChildrenConfig(type) {
  return hierarchyConfig[type] || { childType: null, childKey: null }
}
</script>

<template>
  <div class="space-y-1">
    <!-- Item principal -->
    <div 
      @click="selectItem(item, itemType)"
      class="flex gap-2 items-center px-2 py-1 text-sm cursor-pointer hover:bg-white/5 rounded"
      :class="{
        'text-blue-400 font-medium': selectedItemId == item.id && selectedType === itemType
      }"
      :style="{ marginLeft: depth * 16 + 'px' }"
    >
      <div 
        v-if="item.color" 
        class="w-2 h-2 rounded-full" 
        :style="{ backgroundColor: item.color }"
      ></div>
      {{ item.name || `${itemType} #${item.id}` }}
    </div>
    
    <!-- Enfants récursifs -->
    <template v-if="childItems && childItems.length > 0">
      <TreeNode
        v-for="child in childItems"
        :key="`${getChildrenConfig(itemType).childType}-${child.id}`"
        :item="child"
        :itemType="getChildrenConfig(itemType).childType"
        :childItems="child[getChildrenConfig(itemType).childKey] || []"
        :depth="depth + 1"
        :selectedItemId="selectedItemId"
        :selectedType="selectedType"
        @itemSelect="(payload) => emit('itemSelect', payload)"
      />
    </template>
  </div>
</template>