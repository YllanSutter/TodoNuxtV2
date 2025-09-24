<script setup>
const props = defineProps({
  item: {
    type: Object,
    required: true
  },
  type: {
    type: String,
    default: 'group'
  },
  model:{
    type: String
  }
})

const emit = defineEmits(['itemClick'])

function ChangeItem(item){
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
      nextType = 'task' // ou autre selon votre structure
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
  <UiCard @click="ChangeItem(item)">
    <UiCardHeader class="flex items-center gap-4">
      <div v-if="item.color" class="w-3 h-3 rounded-full" :style="{ backgroundColor: item.color }"></div>
      <UiCardTitle>{{ item.name || item.title || `${type} #${item.id}` }}</UiCardTitle>
      <UiCardDescription v-if="item.description">
        {{ item.description }}
      </UiCardDescription>
    </UiCardHeader>
    <UiCardContent>
      <div class="text-xs opacity-20">
        <p v-if="item.createdAt">
          Créé le: {{ new Date(item.createdAt).toLocaleDateString() }}
        </p>
        <p v-if="item.status">
          Status: <span class="capitalize">{{ item.status }}</span>
        </p>
      </div>
    </UiCardContent>
  </UiCard>
</template>