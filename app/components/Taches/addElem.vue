<script setup lang="ts">
    import { Button } from "@/components/ui/button"
    import { Input } from "@/components/ui/input"
    import { Label } from "@/components/ui/label"
    import {
    Popover,
    PopoverContent,
    PopoverTrigger,
    } from "@/components/ui/popover";

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
        color: ''
     })
     const isOpen = ref(false)
     const isLoading = ref(false)

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
            console.log('Résultat de création:', result)

            // Réinitialiser le formulaire
            formData.value.name = ''
            formData.value.color = ''
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
                <Button variant="outline">
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
                        <div class="grid grid-cols-3 items-center gap-4">
                            <Label for="color">Couleur</Label>
                            <Input
                                id="color"
                                v-model="formData.color"
                                type="color"
                                placeholder="#ff3366"
                                class="col-span-2 h-8"
                            />
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