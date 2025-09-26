<script setup>

const props = defineProps({
  selectedItemId: {
    type: [String, Number],
    default: null
  },
  selectedType: {
    type: String,
    default: null
  },
  selectedParentId: {
    type: [String, Number],
    default: null
  }
})

// Fonction utilitaire pour éclaircir/foncer une couleur hex
function shadeColor(color, percent) {
  let R = parseInt(color.substring(1,3),16);
  let G = parseInt(color.substring(3,5),16);
  let B = parseInt(color.substring(5,7),16);
  R = Math.min(255, Math.max(0, R + Math.round(2.55 * percent)));
  G = Math.min(255, Math.max(0, G + Math.round(2.55 * percent)));
  B = Math.min(255, Math.max(0, B + Math.round(2.55 * percent)));
  return `rgb(${R},${G},${B})`;
}

const selectedColor = ref('#3366ff'); 

// Récupère la couleur de l'item sélectionné à chaque changement d'id/type
watch([() => props.selectedItemId, () => props.selectedType], async ([id, type]) => {
  if (!id || !type) return;
  try {
    const res = await $fetch(`/api/data?type=${type}&id=${id}`);
    let item = Array.isArray(res)
      ? res.find(e => e.id === id)
      : (res.id === id ? res : null);
    selectedColor.value = item?.color || '#3366ff';
  } catch {
    selectedColor.value = '#3366ff';
  }
});

const gradientColors = computed(() => [
  shadeColor(selectedColor.value, 0),
  shadeColor(selectedColor.value, 30),
  shadeColor(selectedColor.value, -30)
]);


const emit = defineEmits(['sidebarSelect'])

// État de navigation
const currentType = ref('group')
const currentParentId = ref(null)
const navigationHistory = ref([])
const isNavigatingFromCards = ref(false)



// Watcher pour synchroniser avec les props de la sidebar
watch([() => props.selectedItemId, () => props.selectedType], ([newId, newType]) => {

  if (newId && newType && !isNavigatingFromCards.value) {
    // Navigation depuis la sidebar seulement - déterminer le bon état
    switch (newType) {
      case 'group':
        currentType.value = 'subgroup'
        currentParentId.value = newId
        break
      case 'subgroup':
        currentType.value = 'project'
        currentParentId.value = newId
        break
      case 'project':
        currentType.value = 'todo'
        currentParentId.value = newId
        break
      default:
        currentType.value = 'group'
        currentParentId.value = null
    }
    navigationHistory.value = []
  }
  // Reset du flag après traitement
  isNavigatingFromCards.value = false
})

// Gestion de la navigation
function handleNavigate(payload) {
  isNavigatingFromCards.value = true
  
  navigationHistory.value.push({
    type: payload.currentType,
    parentId: payload.parentId,
    title: payload.item.name || payload.item.title || `${payload.currentType} #${payload.item.id}`,
    itemId: payload.item.id
  })
  
  currentType.value = payload.nextType
  currentParentId.value = payload.item.id
  
  emit('sidebarSelect', {
    item: payload.item,
    type: payload.currentType 
  })
}

</script>

<template>
    <div class="w-5/6 p-8 grid gap-2 items-start content-start relative">
      <div class="absolute w-full h-full left-0 top-0 grid grid-cols-3 items-center gradientParent opacity-50 pointer-events-none z-[0] overflow-hidden">
        <div
          v-for="(color, i) in gradientColors"
          :key="i"
          class="gradient-box h-[20vw] w-[20vw]"
          :style="{ backgroundColor: color }"
        ></div>
      </div>
      <div class="z-10 relative">
        <NavigationBreadcrumb 
            mode="horizontal"
            :currentType="currentType"
            :currentParentId="currentParentId"
            :selectedItemId="selectedItemId"
            :selectedType="selectedType"
            @navigate="handleNavigate"
          />

        <TachesGroup 
          :type="currentType" 
          :parentId="currentParentId"
          model="card"
          @navigate="handleNavigate"
        />
    </div>
  </div>
</template>

<style>
.gradient-box {
  border-radius: 50%;
  filter: blur(75px);
  mix-blend-mode: screen;
  animation: float 4s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-50px) scale(1.1); }
}
</style>