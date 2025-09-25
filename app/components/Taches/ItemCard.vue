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

// State pour les tags du projet
const projectTags = ref([])
const isLoadingTags = ref(false)

// Computed pour savoir si c'est un projet
const isProject = computed(() => props.type === 'project')

// Charger les tags du projet si c'est un projet
async function loadProjectTags() {
  if (!isProject.value || !props.item.id) return
  
  try {
    isLoadingTags.value = true
    // Récupérer les ProjectTag liés à ce projet
    const projectTagsData = await $fetch('/api/data', {
      method: 'GET',
      query: {
        type: 'projectTag',
        parentId: props.item.id
      }
    })
    
    // Récupérer tous les tags et filtrer ceux qui correspondent
    const allTags = await $fetch('/api/data', {
      method: 'GET',
      query: {
        type: 'tag'
      }
    })
    
    // Filtrer les tags qui sont liés à ce projet
    const projectTagIds = projectTagsData.map(pt => pt.tagId)
    projectTags.value = allTags.filter(tag => projectTagIds.includes(tag.id))
  } catch (error) {
    console.error('Erreur lors du chargement des tags du projet:', error)
    projectTags.value = []
  } finally {
    isLoadingTags.value = false
  }
}

// Charger les tags au montage si c'est un projet
onMounted(() => {
  if (isProject.value) {
    loadProjectTags()
  }
})

// Watcher pour recharger les tags si l'item change
watch(() => props.item.id, () => {
  if (isProject.value) {
    loadProjectTags()
  }
})

// Liste des statuts de projet (enum du schema.prisma)
const projectStatusList = [
  'DRAFT',
  'ACTIVE',
  'ON_HOLD',
  'COMPLETED',
  'ARCHIVED'
]

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
      nextType = 'todo' // ou autre selon votre structure
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
  <UiCard @click="(e) => { e.stopPropagation(); ChangeItem(item); }" class="transition-all duration-300 hover:bg-white/5 cursor-pointer relative">
     <!-- Tags pour les projets -->
      <div v-if="isProject && (projectTags.length > 0 || isLoadingTags)" class="absolute -top-3 left-2">
        <div v-if="isLoadingTags" class="text-xs text-muted-foreground">
          Chargement des tags...
        </div>
        <div v-else class="flex flex-wrap gap-1">
          <span
            v-for="tag in projectTags"
            :key="tag.id"
            class="px-2 py-[2px] text-[10px] rounded-full text-white uppercase"
            :style="{ backgroundColor: tag.color }"
          >
            {{ tag.name }}
          </span>
        </div>
      </div>
   
    <UiCardHeader class="flex items-center gap-4">
      <div v-if="item.color" class="w-3 h-3 rounded-full" :style="{ backgroundColor: item.color }"></div>
      <UiCardTitle>{{ item.name || item.title || `${type} #${item.id}` }}</UiCardTitle>
      <UiCardDescription v-if="item.description">
        {{ item.description }}
      </UiCardDescription>
      <Popover>
        <PopoverTrigger as-child>
        <Button variant="ghost" @click.stop>
          <Icon  name="tabler:dots"></Icon>
        </Button>
        </PopoverTrigger>
        <PopoverContent class="w-80" @click.stop>
            <div class="grid grid-cols-3 items-center gap-4">
                <Label for="name">Nom</Label>
                <Input
                    id="name"
                    v-model="item.name"
                    type="text"
                    :placeholder="`Nom du ${props.type}`"
                    class="col-span-2 h-8"
                />
            </div>
            <div v-if="props.type !== 'todo'" class="grid grid-cols-3 items-center gap-4">
                <Label for="color">Couleur</Label>
                <Input
                    id="color"
                    v-model="item.color"
                    type="color"
                    placeholder="#ff3366"
                    class="col-span-2 h-8"
                />
            </div>
            <div v-if="props.type === 'project'" class="grid grid-cols-3 items-center gap-4">
                <Label for="status">Status</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup class="lowercase">
                      <SelectLabel class="border-b border-white/10">Status</SelectLabel>
                      <SelectItem v-for="statut in projectStatusList" :value="statut">
                         {{ statut }}
                      </SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
            </div>
        </PopoverContent>
      </Popover>
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