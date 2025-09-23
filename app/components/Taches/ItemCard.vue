<script setup>
const props = defineProps({
  item: {
    type: Object,
    required: true
  },
  type: {
    type: String,
    default: 'item'
  }
})
</script>

<template>
  <UiCard>
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