<script setup>
const props = defineProps({
  items: {
    type: Array,
    required: true
  },
  type: {
    type: String,
    default: 'group'
  },
  model: {
    type: String
  },
  selectedItemId: {
    type: [String, Number],
    default: null
  }
})

const emit = defineEmits(['itemClick'])

function ChangeItem(item) {
  // Détermine le type suivant selon la hiérarchie
  let nextType = ''
  switch(props.type) {
    case 'group':
      nextType = 'subgroup'
      break
    case 'subgroup':
      nextType = 'project'
      break
    default:
      nextType = 'task' 
  }
  
  emit('itemClick', {
    item,
    currentType: props.type,
    nextType,
    parentId: item.id
  })
}
</script>

<template>
  <UiBreadcrumb>
    <UiBreadcrumbList :class="[props.model === 'vertical' ? 'grid gap-2 text-sm px-2' : '']">
      <UiBreadcrumbItem v-for="(item, index) in items" :key="item.id">
        <UiBreadcrumbLink  
          @click="ChangeItem(item)"  
          class="flex gap-2 items-center cursor-pointer"
          :class="{
            'text-blue-600 font-medium': selectedItemId == item.id
          }"
        >
          <div 
            v-if="item.color && model === 'vertical'" 
            class="w-2 h-2 rounded-full" 
            :style="{ backgroundColor: item.color }"
          ></div>
          <!-- Indicateur de sélection -->
          <div 
            v-if="selectedItemId == item.id"
            class="w-2 h-2 rounded-full bg-blue-600"
          ></div>
          {{ item.name || item.title }}
        </UiBreadcrumbLink>
        <UiBreadcrumbSeparator v-if="index < items.length - 1" />
      </UiBreadcrumbItem>
    </UiBreadcrumbList>
  </UiBreadcrumb>
</template>