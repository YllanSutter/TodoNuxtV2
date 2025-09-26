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

// Calcule la luminosité d'une couleur hex
function getLum(hex) {
  let c = hex.substring(1);
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const r = parseInt(c.substring(0,2),16);
  const g = parseInt(c.substring(2,4),16);
  const b = parseInt(c.substring(4,6),16);
  return 0.2126*r + 0.7152*g + 0.0722*b;
}
// Calcule l'opacité idéale
function getOpacity(hex) {
  const lum = getLum(hex);
  // Plus la couleur est lumineuse, plus l'opacité baisse
  return Math.max(0.05, Math.min(0.15, 0.15 - (lum-128)/512));
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

const gradientBlobs = computed(() => {
  const base = selectedColor.value;
  const op = getOpacity(base);
  // Amplitude plus forte et centrage
  return [
    {
      color: shadeColor(base, 0),
      style: {
        left: `calc(35% + ${(mouse.value.x-0.5)*40}%)`,
        top: `calc(35% + ${(mouse.value.y-0.5)*40}%)`,
        opacity: op,
        width: '42vw',
        height: '42vw',
        zIndex: 1
      }
    },
    {
      color: shadeColor(base, 30),
      style: {
        left: `calc(55% + ${(mouse.value.x-0.5)*30}%)`,
        top: `calc(40% + ${(mouse.value.y-0.5)*30}%)`,
        opacity: op*0.8,
        width: '38vw',
        height: '38vw',
        zIndex: 2
      }
    },
    {
      color: shadeColor(base, -30),
      style: {
        left: `calc(35% + ${(mouse.value.x-0.5)*50}%)`,
        top: `calc(25% + ${(mouse.value.y-0.5)*50}%)`,
        opacity: op*0.7,
        width: '40vw',
        height: '40vw',
        zIndex: 3
      }
    }
  ];
});

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

// Suivi de la souris
const mouse = ref({x: 0.5, y: 0.5});
function handleMouseMove(e) {
  const rect = e.currentTarget.getBoundingClientRect();
  mouse.value.x = (e.clientX - rect.left) / rect.width;
  mouse.value.y = (e.clientY - rect.top) / rect.height;
}

</script>

<template>
  <div class="w-5/6 p-8 grid gap-2 items-start content-start relative" @mousemove="handleMouseMove">
    <div v-if="props.selectedType !== 'project'" class="fixed w-full h-full left-0 top-0 pointer-events-none z-[0] overflow-hidden">
      <div v-for="(blob, i) in gradientBlobs" :key="i"
        class="gradient-blob"
        :style="{ backgroundColor: blob.color, ...blob.style, position: 'absolute', borderRadius: '50%', filter: 'blur(75px)', mixBlendMode: 'screen'}"
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
.gradient-blob {
  pointer-events: none;
}
</style>