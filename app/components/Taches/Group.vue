<script setup>
// Props pour choisir le type de données à afficher
const props = defineProps({
  type: {
    type: String,
    default: 'group'
  }
})

const items = ref([])
const error = ref(null)

onMounted(async () => {
  try {
    items.value = await $fetch(`/api/data?type=${props.type}`)
  } catch (e) {
    error.value = e
  }
})
</script>

<template>
    <div>
        <div v-if="error">
            {{ error }}
        </div>
        <div v-else-if="!error && items && items.length > 0">
            <div v-for="item in items" :key="item.id">
                {{ item.name || item.title || item.id }}
            </div>
        </div>
        <div v-else>
            Aucun {{ type }} trouvé
        </div>
    </div>
</template>