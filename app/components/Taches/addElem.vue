<script setup lang="ts">
    import { Button } from "@/components/ui/button"
    import { Input } from "@/components/ui/input"
    import { Label } from "@/components/ui/label"
    import {
    Popover,
    PopoverContent,
    PopoverTrigger,
    } from "@/components/ui/popover";

    interface Tag {
      id: string
      name: string
      color: string
    }

     const props = defineProps({
        type: {
            type: String,
            default: 'group'
        },
        parentId: {
            type: [String, Number],
            default: null
        }
     })

     const emit = defineEmits(['created'])

     // Formulaire réactif
     const formData = ref({
        name: '',
        color: '',
        selectedTags: [] as string[]
     })
     const isOpen = ref(false)
     const isLoading = ref(false)
     const availableTags = ref<Tag[]>([])
     const isLoadingTags = ref(false)

     // Computed pour savoir si on est en train de créer un projet
     const isProject = computed(() => props.type === 'project')
     const isTodo = computed(() => props.type === 'todo')

     // Charger les tags disponibles quand on ouvre le popover et que c'est un projet
     watch(isOpen, async (newValue) => {
       if (newValue && isProject.value) {
         await loadTags()
       }
     })

     async function loadTags() {
       try {
         isLoadingTags.value = true
         const response = await $fetch('/api/data', {
           method: 'GET',
           query: {
             type: 'tag'
           }
         })
         availableTags.value = response || []
       } catch (error) {
         console.error('Erreur lors du chargement des tags:', error)
         availableTags.value = []
       } finally {
         isLoadingTags.value = false
       }
     }

     function toggleTag(tagId: string) {
       const index = formData.value.selectedTags.indexOf(tagId)
       if (index > -1) {
         formData.value.selectedTags.splice(index, 1)
       } else {
         formData.value.selectedTags.push(tagId)
       }
     }

     async function createProjectTags(projectId: string, tagIds: string[]) {
       try {
         for (const tagId of tagIds) {
           await $fetch('/api/data/add', {
             method: 'POST',
             body: {
               type: 'projectTag',
               data: {
                 projectId,
                 tagId
               }
             }
           })
         }
         console.log(`${tagIds.length} tags liés au projet ${projectId}`)
       } catch (error) {
         console.error('Erreur lors de la création des liens projet-tag:', error)
         const errorMessage = error instanceof Error ? error.message : String(error)
         alert(`Erreur lors de la liaison des tags: ${errorMessage}`)
       }
     }

     async function createElem()
     {
        if (!formData.value.name.trim()) {
            alert('Le nom est requis')
            return
        }

        try {
            isLoading.value = true
            
            const data: any = {
                name: formData.value.name.trim()
            }
            
            if (formData.value.color && formData.value.color.trim()) {
                data.color = formData.value.color.trim()
            }

            const payload = {
                type: props.type,
                count: 1,
                parentId: props.parentId,
                data
            }
            
            console.log('Payload envoyé:', payload)

            const response = await fetch('/api/data/add', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            })
            
            if (!response.ok) {
                let errorMessage = `Erreur HTTP ${response.status}: ${response.statusText}`
                try {
                    const errorData = await response.text()
                    if (errorData) {
                        errorMessage += ` - ${errorData}`
                    }
                } catch (e) {
                    // Ignore si on ne peut pas lire la réponse
                }
                throw new Error(errorMessage)
            }
            
            const result = await response.json()
            // Si c'est un projet et qu'il y a des tags sélectionnés, créer les liens
            if (props.type === 'project' && formData.value.selectedTags.length > 0) {
              let projectId = null
              
              // L'API peut retourner result.data (array) ou directement un objet
              if (result.data && Array.isArray(result.data) && result.data[0]) {
                projectId = result.data[0].id
              } else if (result.data && result.data.id) {
                projectId = result.data.id
              } else if (result.id) {
                projectId = result.id
              }
              
              if (projectId) {
                await createProjectTags(projectId, formData.value.selectedTags)
              } else {
                console.error('Impossible de trouver l\'ID du projet créé')
              }
            }

            // Réinitialiser le formulaire
            formData.value.name = ''
            formData.value.color = ''
            formData.value.selectedTags = []
            isOpen.value = false
            
            // Émettre événement pour rafraîchir la liste
            emit('created', result)
            
        } catch (error) {
            console.error('Erreur complète lors de la création:', error)
            const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue lors de la création'
            alert(`Erreur: ${errorMessage}`)
        } finally {
            isLoading.value = false
        }
    }
</script>

<template>
    <UiCard>
        <UiCardContent class="text-center py-8 text-white/10">
    
            <Popover v-model:open="isOpen">
                <PopoverTrigger as-child>
                <Button variant="outline" class="text-white bg-transparent">
                    Ajouter {{ props.type }}
                </Button>
                </PopoverTrigger>
                <PopoverContent class="w-80">
                <div class="grid gap-4">
                    <div class="space-y-2">
                    <h4 class="font-medium leading-none">
                        Nouveau {{ props.type }}
                    </h4>
                    <p class="text-sm text-muted-foreground">
                        Remplissez les informations pour créer un nouvel élément.
                    </p>
                    </div>
                    <div class="grid gap-2">
                        <div class="grid grid-cols-3 items-center gap-4">
                            <Label for="name">Nom</Label>
                            <Input
                                id="name"
                                v-model="formData.name"
                                type="text"
                                :placeholder="`Nom du ${props.type}`"
                                class="col-span-2 h-8"
                                @keyup.enter="createElem"
                            />
                        </div>
                        <div v-if="props.type !== 'todo'" class="grid grid-cols-3 items-center gap-4">
                            <Label for="color">Couleur</Label>
                            <Input
                                id="color"
                                v-model="formData.color"
                                type="color"
                                placeholder="#ff3366"
                                class="col-span-2 h-8"
                            />
                        </div>
                        
                        <!-- Section Tags (seulement pour les projets) -->
                        <div v-if="isProject" class="grid gap-2">
                            <div v-if="isLoadingTags" class="text-sm text-muted-foreground">
                                Chargement des tags...
                            </div>
                            <div v-else-if="availableTags.length === 0" class="text-sm text-muted-foreground">
                                Aucun tag disponible. Créez d'abord des tags.
                            </div>
                            <div v-else class="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                                <button
                                    v-for="tag in availableTags"
                                    :key="tag.id"
                                    @click="toggleTag(tag.id)"
                                    :class="[
                                        'px-2 py-1 text-xs rounded-full border transition-colors duration-300',
                                        formData.selectedTags.includes(tag.id)
                                            ? 'bg-primary text-white border-primary'
                                            : 'bg-background text-muted-foreground border-border hover:bg-white/10'
                                    ]"
                                    :style="{
                                        backgroundColor: formData.selectedTags.includes(tag.id) ? tag.color : undefined,
                                        borderColor: formData.selectedTags.includes(tag.id) ? tag.color : undefined
                                    }"
                                    type="button"
                                >
                                    {{ tag.name }}
                                </button>
                            </div>
                            <div v-if="formData.selectedTags.length > 0" class="text-xs text-muted-foreground">
                                {{ formData.selectedTags.length }} tag(s) sélectionné(s)
                            </div>
                        </div>

                        <div class="flex gap-2 pt-2">
                            <Button variant="outline" @click="isOpen = false" :disabled="isLoading">
                                Annuler
                            </Button>
                            <Button @click="createElem" :disabled="isLoading || !formData.name.trim()">
                                {{ isLoading ? 'Création...' : `Créer ${props.type}` }}
                            </Button>
                        </div>
                    </div>
                </div>
                </PopoverContent>
            </Popover>
        </UiCardContent>
    </UiCard>
</template>