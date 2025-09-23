<script setup>
// Props pour choisir le type de données à afficher
const props = defineProps({
  type: {
    type: String,
    default: 'group'
  },
  model: {
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
      <!-- Affichage conditionnel selon le model -->
      <div v-if="model === 'card'">
        <h2 class="text-xl font-bold mb-1">Groupe de projets</h2>
        <p class="text-sm opacity-50 mb-8">Organisez vos projets par groupes thématiques</p>
        
        <div v-if="!error && items && items.length > 0" class="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
          <TachesItemCard 
            v-for="item in items" 
            :key="item.id"
            :item="item"
            :type="type"
          />
        </div>
        
        <UiCard v-else class="">
          <UiCardContent class="text-center py-8">
            <p class="">Aucun {{ type }} trouvé</p>
          </UiCardContent>
        </UiCard>
      </div>

      <!-- Breadcrumb pour les autres models -->
      <div v-else>
        <UiBreadcrumb v-if="!error && items && items.length > 0">
          <UiBreadcrumbList :class="[props.model === 'vertical' ? 'grid gap-2 text-sm px-2' : '']">
            <UiBreadcrumbItem v-for="(item, index) in items" :key="item.id">
              <UiBreadcrumbLink href="#" class="flex gap-2 items-center">
                <div v-if="item.color && model === 'vertical' " class="w-2 h-2 rounded-full" :style="{ backgroundColor: item.color }"></div>
                {{ item.name || item.title || `${type} #${item.id}` }}
              </UiBreadcrumbLink>
              <UiBreadcrumbSeparator v-if="index < items.length - 1" />
            </UiBreadcrumbItem>
          </UiBreadcrumbList>
        </UiBreadcrumb>
        
        <p v-else-if="error" class="text-red-500">{{ error }}</p>
        <p v-else class="text-gray-500">Aucun {{ type }} trouvé</p>
      </div>
    </div>
</template>