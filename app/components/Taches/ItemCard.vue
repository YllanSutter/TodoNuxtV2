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
    model: {
      type: String
    }
  })

  // State pour les tags du projet
  const projectTags = ref([])
  const isLoadingTags = ref(false)

  // Computed pour savoir si c'est un projet
  const isProject = computed(() => props.type === 'project')

  // Définir allTags en tant que ref pour l'exposer à l'instance
  const allTags = ref([])

  // Formulaire réactif
  const formData = ref({
    name: '',
    color: '',
    selectedTags: []
  })

  function toggleTag(tagId) {
    const index = formData.value.selectedTags.indexOf(tagId)
    if (index > -1) {
      formData.value.selectedTags.splice(index, 1)
    } else {
      formData.value.selectedTags.push(tagId)
    }
  }

  // Charger les tags du projet et tous les tags si c'est un projet
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
      const allTagsData = await $fetch('/api/data', {
        method: 'GET',
        query: {
          type: 'tag'
        }
      })
      allTags.value = allTagsData;
      const projectTagIds = projectTagsData.map(pt => pt.tagId)
      projectTags.value = allTagsData.filter(tag => projectTagIds.includes(tag.id))
    } catch (error) {
      console.error('Erreur lors du chargement des tags du projet:', error)
      projectTags.value = []
      allTags.value = []
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

  // Popover state pour édition
  const isPopoverOpen = ref(false)

  const emit = defineEmits(['itemClick', 'updated', 'deleted'])

  const showDeleteConfirm = ref(false)

  function ChangeItem(item) {
    // Détermine le type suivant selon la hiérarchie
    let nextType = ''
    switch (props.type) {
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

  async function handleUpdate() {
    try {
      const response = await $fetch('/api/data/update', {
        method: 'PUT',
        body: {
          type: props.type,
          id: props.item.id,
          data: {
            name: props.item.name,
            color: props.item.color,
            status: props.item.status,
            description: props.item.description
          }
        }
      })
      emit('updated', response)
    } catch (error) {
      alert('Erreur lors de la mise à jour')
      console.error(error)
    }
  }

  function handleDelete() {
    showDeleteConfirm.value = true
  }

  async function confirmDelete() {
    try {
      await $fetch('/api/data/delete', {
        method: 'DELETE',
        body: {
          type: props.type,
          id: props.item.id
        }
      })
      emit('deleted', props.item.id)
      showDeleteConfirm.value = false
    } catch (error) {
      alert('Erreur lors de la suppression')
      console.error(error)
    }
  }
</script>

<template>
  <UiCard @click="(e) => { e.stopPropagation(); ChangeItem(item); }"
    class="transition-all duration-300 hover:bg-white/5 cursor-pointer relative">
    <!-- Tags pour les projets -->
    <div v-if="isProject && (projectTags.length > 0 || isLoadingTags)" class="absolute -top-3 left-2">
      <div v-if="isLoadingTags" class="text-xs text-muted-foreground">
        Chargement des tags...
      </div>
      <div v-else class="flex flex-wrap gap-1">
        <span v-for="tag in projectTags" :key="tag.id"
          class="px-2 py-[2px] text-[10px] rounded-full text-white uppercase" :style="{ backgroundColor: tag.color }">
          {{ tag.name }}
        </span>
      </div>
    </div>

    <UiCardHeader class="flex items-center gap-4 justify-between">
      <div class="left flex items-center gap-2">
        <div v-if="item.color" class="w-3 h-3 rounded-full" :style="{ backgroundColor: item.color }"></div>
        <UiCardTitle>{{ item.name || item.title || `${type} #${item.id}` }}</UiCardTitle>
        <UiCardDescription v-if="item.description">
          {{ item.description }}
        </UiCardDescription>
      </div>
      <Popover v-model:open="isPopoverOpen">
        <PopoverTrigger as-child>
          <Button variant="ghost" @click.stop class="self-end">
            <Icon name="tabler:dots"></Icon>
          </Button>
        </PopoverTrigger>
        <PopoverContent class="w-80 grid gap-2" @click.stop>
          <!-- Section Tags (seulement pour les projets) -->
          <div v-if="isProject" class="grid gap-2 mb-4">
            <div v-if="isLoadingTags" class="text-sm text-muted-foreground">
              Chargement des tags...
            </div>
            <div v-else-if="allTags.length === 0" class="text-sm text-muted-foreground">
              Aucun tag disponible. Créez d'abord des tags.
            </div>
            <div v-else class="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
              <button v-for="tag in allTags" :key="tag.id" @click="toggleTag(tag.id)" :class="[
                              'px-2 py-1 text-xs rounded-full border transition-colors duration-300',
                              formData.selectedTags.includes(tag.id)
                                  ? 'bg-primary text-white border-primary'
                                  : 'bg-background text-muted-foreground border-border hover:bg-white/10'
                          ]" :style="{
                              backgroundColor: formData.selectedTags.includes(tag.id) ? tag.color : undefined,
                              borderColor: formData.selectedTags.includes(tag.id) ? tag.color : undefined
                          }" type="button">
                {{ tag.name }}
              </button>
            </div>
            <div v-if="formData.selectedTags.length > 0" class="text-xs text-muted-foreground">
              {{ formData.selectedTags.length }} tag(s) sélectionné(s)
            </div>
          </div>
          <div class="grid grid-cols-3 items-center gap-4">
            <Label for="name">Nom</Label>
            <Input id="name" v-model="item.name" type="text" :placeholder="`Nom du ${props.type}`"
              class="col-span-2 h-8" />
          </div>
          <div class="grid grid-cols-3 items-center gap-4">
            <Label for="description">Description</Label>
            <Input id="description" v-model="item.description" type="text" :placeholder="`Description du ${props.type}`"
              class="col-span-2 h-8" />
          </div>
          <div v-if="props.type !== 'todo'" class="grid grid-cols-3 items-center gap-4">
            <Label for="color">Couleur</Label>
            <Input id="color" v-model="item.color" type="color" placeholder="#ff3366" class="col-span-2 h-8" />
          </div>
          <!-- Tags pour les projets -->

          <div v-if="props.type === 'project'" class="grid grid-cols-3 items-center gap-4">
            <Label for="status">Status</Label>
            <Select v-model="item.status">
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup class="lowercase">
                  <SelectLabel class="border-b border-white/10">Status</SelectLabel>
                  <SelectItem v-for="statut in projectStatusList" :key="statut" :value="statut">
                    {{ statut }}
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div class="flex gap-2 pt-4 justify-end">
            <Button variant="outline" @click="handleDelete">Supprimer</Button>
            <Button @click="handleUpdate">Enregistrer</Button>
          </div>
          <AlertDialog v-model:open="showDeleteConfirm">
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                <AlertDialogDescription>
                  Voulez-vous vraiment supprimer cet élément et ses enfants ? Cette action est irréversible.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel @click="showDeleteConfirm = false">Annuler</AlertDialogCancel>
                <AlertDialogAction @click="confirmDelete">Supprimer</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
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