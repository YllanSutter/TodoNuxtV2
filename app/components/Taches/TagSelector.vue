<script setup>
const props = defineProps({
  modelValue: Array,
  allTags: Array,
})
const emit = defineEmits(['update:modelValue'])
function toggleTag(tagId) {
  const tags = [...props.modelValue]
  const index = tags.indexOf(tagId)
  if (index > -1) {
    tags.splice(index, 1)
  } else {
    tags.push(tagId)
  }
  emit('update:modelValue', tags)
}
</script>
<template>
  <div v-if="allTags.length === 0" class="text-sm text-muted-foreground">
    Aucun tag disponible. Créez d'abord des tags.
  </div>
  <div v-else class="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
    <button v-for="tag in allTags" :key="tag.id" @click="toggleTag(tag.id)" :class="[
      'px-2 py-1 text-xs rounded-full border transition-colors duration-300 cursor-pointer',
      modelValue.includes(tag.id)
        ? 'bg-primary text-white border-primary'
        : 'bg-background text-muted-foreground border-border hover:bg-white/10'
    ]" :style="{
      backgroundColor: modelValue.includes(tag.id) ? tag.color : undefined,
      borderColor: modelValue.includes(tag.id) ? tag.color : undefined
    }" type="button">
      {{ tag.name }}
    </button>
  </div>
  <div v-if="modelValue.length > 0" class="text-xs text-muted-foreground">
    {{ modelValue.length }} tag(s) sélectionné(s)
  </div>
</template>
