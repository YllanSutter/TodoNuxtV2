<template>
  <div class="todo-container">


    <!-- Liste des todos -->
    <div 
      ref="todoListRef"
      class="todo-list  grid items-start content-start relative mb-4"
      @click="handleContainerClick"
      @mousedown="handleMouseDown"
      @mousemove="handleMouseMove"
      @mouseup="handleMouseUp"
      @mouseleave="handleMouseLeave"
    >
      <!-- Zone de sélection -->
      <div 
        v-if="selectionBox.active"
        class="absolute bg-blue-200/30 border border-blue-400 pointer-events-none z-10"
        :style="{
          left: selectionBox.left + 'px',
          top: selectionBox.top + 'px',
          width: selectionBox.width + 'px',
          height: selectionBox.height + 'px'
        }"
      ></div>
      
      <TachesTodoLine
        v-for="item in sortedItems"
        :key="item.id"
        :item="item"
        :is-selected="selectedItems.includes(item.id)"
        :has-multiple-selection="selectedItems.length > 1"
        :parent-id="parentId"
        :all-items="sortedItems"
        @update="handleUpdate"
        @delete="handleDelete"
        @create-new-line="handleCreateNewLine"
        @select="handleSelect"
        @move="handleMove"
        @paste-lines="handlePasteLines"
        @clear-selection="handleClearSelection"
        @refresh="handleRefresh"
      />
    </div>
          <!-- Header avec actions en lot -->
     
     <Alert v-if="selectedItems.length > 0" class="mb-4 text-xs">
            
        <AlertTitle class="w-full opacity-50 flex items-center"><Icon name="material-symbols:checklist" class="h-2 w-2 mr-2" />{{ selectedItems.length }} élément(s) sélectionné(s)</AlertTitle>

        <AlertDescription class="flex items-center gap-2 mt-2">
            <UiButton size="xs" variant="outline" @click="decreaseIndent" class="p-1 text-xs opacity-50 hover:opacity-100">
            <Icon name="material-symbols:format-indent-decrease" class="h-2 w-2" />
            Désindenter
            </UiButton>
            <UiButton size="xs" variant="outline" @click="increaseIndent" class="p-1 text-xs opacity-50 hover:opacity-100">
            <Icon name="material-symbols:format-indent-increase" class="h-2 w-2" />
            Indenter
            </UiButton>
            <UiButton size="xs" variant="outline" @click="copySelectedItems" class="p-1 text-xs opacity-50 hover:opacity-100">
            <Icon name="material-symbols:content-copy" class="h-2 w-2" />
            Copier
            </UiButton>
            <UiButton size="xs" variant="outline" @click="deleteSelectedItems" class="p-1 text-xs opacity-50 hover:opacity-100">
            <Icon name="material-symbols:delete-outline" class="h-2 w-2" />
            Supprimer
            </UiButton>
            <UiButton size="xs" variant="ghost" @click="clearSelection" class="p-1 text-xs opacity-50 hover:opacity-100">
            <Icon name="material-symbols:close" class="h-4 w-4" />
            Désélectionner
            </UiButton>
        </AlertDescription>
      </Alert>
        <!-- Bouton d'ajout -->
        <div class="mt-4">
        <TachesAddElem :type="'todo'" :parent-id="parentId" @created="handleItemCreated" />
        </div>

    <!-- Alert Dialog pour la confirmation de suppression -->
    <AlertDialog v-model:open="showDeleteDialog">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
          <AlertDialogDescription>
            Êtes-vous sûr de vouloir supprimer {{ selectedItems.length }} élément(s) ?
            Cette action est irréversible.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel @click="showDeleteDialog = false">Annuler</AlertDialogCancel>
          <AlertDialogAction @click="confirmDeleteSelectedItems" class="text-white bg-red-600 hover:bg-red-700">
            Supprimer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    </div>

</template>

<script setup>
const props = defineProps({
  items: {
    type: Array,
    default: () => []
  },
  parentId: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['update', 'refresh'])

// Refs
const todoListRef = ref(null)

// State
const localItems = ref([...props.items])
const selectedItems = ref([])
const showDeleteDialog = ref(false)

// Selection box state
const selectionBox = ref({
  active: false,
  startX: 0,
  startY: 0,
  left: 0,
  top: 0,
  width: 0,
  height: 0
})

const isMouseDown = ref(false)
const dragStartedOnInput = ref(false)
const justFinishedSelection = ref(false)

// Computed
const sortedItems = computed(() => {
  return localItems.value.sort((a, b) => {
    // Tri par order puis par createdAt
    if (a.order !== b.order) {
      return a.order - b.order
    }
    return new Date(a.createdAt) - new Date(b.createdAt)
  })
})

// Watchers
watch(() => props.items, (newItems) => {
  localItems.value = [...newItems]
}, { deep: true })

// Methods
function handleUpdate(updatedItem) {
  const index = localItems.value.findIndex(item => item.id === updatedItem.id)
  if (index !== -1) {
    localItems.value[index] = { ...localItems.value[index], ...updatedItem }
  }
  emit('update', updatedItem)
}

function handleRefresh() {
  emit('refresh')
}

function handleDelete(itemId) {
  localItems.value = localItems.value.filter(item => item.id !== itemId)
  selectedItems.value = selectedItems.value.filter(id => id !== itemId)
  emit('refresh')
}

function handleCreateNewLine(newItem) {
  localItems.value.push(newItem)
  emit('refresh')
}

function handleItemCreated(newItem) {
  if (Array.isArray(newItem)) {
    localItems.value.push(...newItem)
  } else {
    localItems.value.push(newItem)
  }
  emit('refresh')
}

// Mouse selection methods
function handleMouseDown(event) {
  // Bloquer seulement les boutons et drag handles
  const isButton = event.target.tagName === 'BUTTON' || event.target.closest('button')
  const isDragHandle = event.target.classList.contains('drag-handle') || event.target.closest('.drag-handle')
  
  // Marquer si on a commencé sur un input pour gérer différemment
  dragStartedOnInput.value = event.target.tagName === 'INPUT'
  
  if (isButton || isDragHandle) {
    return
  }
  
  isMouseDown.value = true
  
  const rect = todoListRef.value.getBoundingClientRect()
  selectionBox.value.startX = event.clientX - rect.left
  selectionBox.value.startY = event.clientY - rect.top
  
  // Si on commence sur un input, on garde le focus pour l'instant
  // Le preventDefault sera appliqué seulement si un drag commence vraiment
  
  // Ne pas démarrer la sélection immédiatement
  selectionBox.value.active = false
}

function handleMouseMove(event) {
  if (!isMouseDown.value) return
  
  const rect = todoListRef.value.getBoundingClientRect()
  const currentX = event.clientX - rect.left
  const currentY = event.clientY - rect.top
  
  // Calculer le mouvement vertical et horizontal séparément
  const verticalMovement = Math.abs(currentY - selectionBox.value.startY)
  const horizontalMovement = Math.abs(currentX - selectionBox.value.startX)
  
  // Estimer la hauteur d'une tâche (approximativement 40px avec padding)
  const taskHeight = 30
  
  // Conditions pour déclencher la sélection :
  // 1. Mouvement vertical d'au moins une tâche de hauteur
  // 2. Le mouvement vertical doit être dominant par rapport au mouvement horizontal
  const minVerticalThreshold = taskHeight
  const isVerticalMovementDominant = verticalMovement > horizontalMovement * 0.5
  
  if (verticalMovement > minVerticalThreshold && isVerticalMovementDominant) {
    // Si on a commencé sur un input, on perd le focus pour permettre la sélection
    if (dragStartedOnInput.value && document.activeElement && document.activeElement.tagName === 'INPUT') {
      document.activeElement.blur()
    }
    selectionBox.value.active = true
  }
  
  if (selectionBox.value.active) {
    // Calculer les dimensions du rectangle de sélection
    const left = Math.min(selectionBox.value.startX, currentX)
    const top = Math.min(selectionBox.value.startY, currentY)
    const width = Math.abs(currentX - selectionBox.value.startX)
    const height = Math.abs(currentY - selectionBox.value.startY)
    
    selectionBox.value.left = left
    selectionBox.value.top = top
    selectionBox.value.width = width
    selectionBox.value.height = height
    
    // Sélectionner les items dans la zone
    updateSelectionFromBox()
  }
}

function handleMouseUp(event) {
  const wasSelecting = selectionBox.value.active
  const wasOnInput = dragStartedOnInput.value
  
  if (wasSelecting) {
    // Finaliser la sélection seulement si au moins 2 éléments sont sélectionnés
    if (selectedItems.value.length < 2) {
      selectedItems.value = []
    }
    // Marquer qu'on vient de finir une sélection
    justFinishedSelection.value = true
    setTimeout(() => {
      justFinishedSelection.value = false
    }, 200)
  } else if (wasOnInput && event.target.tagName === 'INPUT') {
    // Si on avait cliqué sur un input mais pas fait de drag, restaurer le focus
    setTimeout(() => {
      event.target.focus()
    }, 10)
  }
  
  // Arrêter le processus de sélection mais garder les items sélectionnés
  isMouseDown.value = false
  dragStartedOnInput.value = false
  selectionBox.value.active = false
}

function handleMouseLeave() {
  // Si on sort de la zone pendant une sélection, finaliser la sélection
  if (selectionBox.value.active && selectedItems.value.length < 2) {
    selectedItems.value = []
  }
  
  isMouseDown.value = false
  dragStartedOnInput.value = false
  selectionBox.value.active = false
}

function updateSelectionFromBox() {
  const newSelection = []
  
  // Obtenir tous les éléments TodoLine
  const todoLines = todoListRef.value.querySelectorAll('.todo-line')
  
  todoLines.forEach((element) => {
    const rect = element.getBoundingClientRect()
    const containerRect = todoListRef.value.getBoundingClientRect()
    
    // Positions relatives à la todo-list
    const elementTop = rect.top - containerRect.top + todoListRef.value.scrollTop
    const elementBottom = rect.bottom - containerRect.top + todoListRef.value.scrollTop
    const elementLeft = rect.left - containerRect.left + todoListRef.value.scrollLeft
    const elementRight = rect.right - containerRect.left + todoListRef.value.scrollLeft
    
    // Zone de sélection
    const boxRight = selectionBox.value.left + selectionBox.value.width
    const boxBottom = selectionBox.value.top + selectionBox.value.height
    
    // Vérifier intersection
    const intersects = !(
      elementRight < selectionBox.value.left ||
      elementLeft > boxRight ||
      elementBottom < selectionBox.value.top ||
      elementTop > boxBottom
    )
    
    if (intersects) {
      // Trouver l'ID depuis l'input ou depuis l'attribut data
      let itemId = element.querySelector('input[data-id]')?.getAttribute('data-id')
      
      // Si pas trouvé, chercher dans les props du composant Vue
      if (!itemId) {
        // Récupérer l'ID depuis la liste des items
        const elementIndex = Array.from(todoLines).indexOf(element)
        if (elementIndex >= 0 && sortedItems.value[elementIndex]) {
          itemId = sortedItems.value[elementIndex].id
        }
      }
      
      if (itemId && !newSelection.includes(itemId)) {
        newSelection.push(itemId)
      }
    }
  })
  
  selectedItems.value = newSelection
}

function handleSelect(selection) {
  if (selection === 'all') {
    selectedItems.value = localItems.value.map(item => item.id)
  } else if (typeof selection === 'string') {
    const index = selectedItems.value.indexOf(selection)
    if (index === -1) {
      selectedItems.value.push(selection)
    } else {
      selectedItems.value.splice(index, 1)
    }
  }
}

function handleContainerClick(event) {
  // La désélection se fait maintenant via le focus sur les inputs
  // On garde juste la logique pour éviter les interférences avec le drag
  if (justFinishedSelection.value) {
    // Ne rien faire pendant la période de grâce après sélection
    return
  }
}

function clearSelection() {
  selectedItems.value = []
}

function handleClearSelection() {
  selectedItems.value = []
}

function decreaseIndent() {
  handleMultipleIndentation(-1)
}

function increaseIndent() {
  handleMultipleIndentation(1)
}

async function copySelectedItems() {
  const itemsToCopy = localItems.value.filter(item => selectedItems.value.includes(item.id))
  const textLines = itemsToCopy.map(item => 
    `${'  '.repeat(item.level || 0)}${item.content}`
  ).join('\n')
  
  try {
    await navigator.clipboard.writeText(textLines)
    console.log('Items copiés dans le presse-papiers')
  } catch (error) {
    console.error('Erreur lors de la copie:', error)
  }
}

function deleteSelectedItems() {
  // Ouvrir le dialog de confirmation
  showDeleteDialog.value = true
}

async function confirmDeleteSelectedItems() {
  showDeleteDialog.value = false
  
  try {
    // Supprimer chaque item sélectionné
    const deletePromises = selectedItems.value.map(itemId => 
      $fetch('/api/data/delete', {
        method: 'DELETE',
        body: {
          id: itemId,
          type: 'todo'
        }
      })
    )

    await Promise.all(deletePromises)
    
    // Retirer les items de la liste locale
    localItems.value = localItems.value.filter(item => !selectedItems.value.includes(item.id))
    selectedItems.value = []
    
    emit('refresh')
  } catch (error) {
    console.error('Erreur lors de la suppression en lot:', error)
  }
}

function findChildrenItems(parentItem, items) {
  const children = []
  const parentLevel = parentItem.level || 0
  const parentIndex = items.findIndex(item => item.id === parentItem.id)
  
  // Parcourir les items après le parent pour trouver ses enfants
  for (let i = parentIndex + 1; i < items.length; i++) {
    const currentItem = items[i]
    const currentLevel = currentItem.level || 0
    
    // Si le niveau est inférieur ou égal au parent, on sort (fin des enfants)
    if (currentLevel <= parentLevel) {
      break
    }
    
    // Si c'est un enfant direct ou indirect, l'ajouter
    children.push(currentItem)
  }
  
  return children
}

async function handleMove(moveData) {
  if (moveData.draggedItem && moveData.targetItem) {
    // Gestion du drag & drop
    const { draggedItem, targetItem, position } = moveData
    
    try {
      let newOrder = targetItem.order
      let newLevel = targetItem.level
      
      switch (position) {
        case 'before':
          newOrder = targetItem.order - 0.5
          newLevel = targetItem.level
          break
        case 'after':
          newOrder = targetItem.order + 0.5
          newLevel = targetItem.level
          break
        case 'inside':
          newOrder = targetItem.order + 0.1
          newLevel = (targetItem.level || 0) + 1
          break
      }
      
      // Trouver tous les enfants de l'élément déplacé
      const draggedChildren = findChildrenItems(draggedItem, sortedItems.value)
      const levelDifference = newLevel - (draggedItem.level || 0)
      
      // Déplacer l'élément parent
      await $fetch('/api/data/update', {
        method: 'PUT',
        body: {
          id: draggedItem.id,
          type: 'todo',
          data: {
            order: newOrder,
            level: newLevel
          }
        }
      })
      
      // Déplacer tous les enfants en conservant leur structure hiérarchique
      if (draggedChildren.length > 0) {
        const updatePromises = draggedChildren.map((child, index) => {
          const childNewOrder = newOrder + 0.01 * (index + 1)
          const childNewLevel = (child.level || 0) + levelDifference
          
          return $fetch('/api/data/update', {
            method: 'PUT',
            body: {
              id: child.id,
              type: 'todo',
              data: {
                order: childNewOrder,
                level: childNewLevel
              }
            }
          })
        })
        
        await Promise.all(updatePromises)
      }
      
      // Recalculer les ordres pour éviter les conflits
      await reorderItems()
      emit('refresh')
    } catch (error) {
      console.error('Erreur lors du déplacement:', error)
    }
  } else if (moveData.item && moveData.direction) {
    // Gestion du déplacement clavier
    handleKeyboardMove(moveData.item, moveData.direction)
  }
}

async function handleKeyboardMove(item, direction) {
  const currentIndex = sortedItems.value.findIndex(i => i.id === item.id)
  const targetIndex = currentIndex + direction
  
  if (targetIndex >= 0 && targetIndex < sortedItems.value.length) {
    const targetItem = sortedItems.value[targetIndex]
    
    try {
      await $fetch('/api/data/update', {
        method: 'PUT',
        body: {
          id: item.id,
          type: 'todo',
          data: {
            order: targetItem.order + (direction > 0 ? 0.5 : -0.5)
          }
        }
      })
      
      await reorderItems()
      emit('refresh')
    } catch (error) {
      console.error('Erreur lors du déplacement clavier:', error)
    }
  }
}

async function handlePasteLines(pasteData) {
  const { lines, afterItem, baseLevel } = pasteData
  
  try {
    const newItems = lines.map((line, index) => {
      const leadingSpaces = line.match(/^(\s*)/)[1].length
      const indentLevel = Math.floor(leadingSpaces / 2) // 2 espaces = 1 niveau
      
      return {
        content: line.trim(),
        type: 'TASK',
        completed: false,
        level: baseLevel + indentLevel,
        order: afterItem.order + index + 1
      }
    })
    
    const response = await $fetch('/api/data/add', {
      method: 'POST',
      body: {
        type: 'todo',
        parentId: props.parentId,
        count: newItems.length,
        data: newItems[0] // Le premier item comme modèle
      }
    })
    
    // Mettre à jour chaque nouvel item avec ses données spécifiques
    const updatePromises = response.data.map((createdItem, index) => 
      $fetch('/api/data/update', {
        method: 'PUT',
        body: {
          id: createdItem.id,
          type: 'todo',
          data: newItems[index]
        }
      })
    )
    
    await Promise.all(updatePromises)
    
    localItems.value.push(...response.data)
    emit('refresh')
  } catch (error) {
    console.error('Erreur lors du collage:', error)
  }
}

async function reorderItems() {
  // Utiliser l'endpoint de réorganisation
  try {
    await $fetch('/api/data/reorder', {
      method: 'POST',
      body: {
        type: 'todo',
        parentId: props.parentId
      }
    })
  } catch (error) {
    console.error('Erreur lors de la réorganisation:', error)
  }
}

async function handleMultipleIndentation(levelDelta) {
  if (selectedItems.value.length === 0) return

  try {
    // Récupérer tous les items sélectionnés
    const itemsToUpdate = localItems.value.filter(item => selectedItems.value.includes(item.id))
    
    // Trier les items par ordre pour traiter correctement la hiérarchie
    const sortedItemsToUpdate = itemsToUpdate.sort((a, b) => (a.order || 0) - (b.order || 0))
    
    // Collecter tous les enfants à mettre à jour aussi
    const allItemsToUpdate = new Set()
    
    for (const item of sortedItemsToUpdate) {
      allItemsToUpdate.add(item)
      
      // Trouver les enfants de cet item
      const children = findChildrenItemsForMultiple(item, localItems.value)
      children.forEach(child => allItemsToUpdate.add(child))
    }
    
    // Mettre à jour chaque item avec son nouveau niveau et parentId
    const updatePromises = Array.from(allItemsToUpdate).map((item) => {
      const newLevel = Math.max(0, (item.level || 0) + levelDelta)
      const newParentId = findNewParentIdForMultiple(item, newLevel, localItems.value)
      
      return $fetch('/api/data/update', {
        method: 'PUT',
        body: {
          id: item.id,
          type: 'todo',
          data: { 
            level: newLevel,
            parentId: newParentId
          }
        }
      })
    })

    await Promise.all(updatePromises)
    
    // Mettre à jour les items locaux
    Array.from(allItemsToUpdate).forEach(item => {
      const newLevel = Math.max(0, (item.level || 0) + levelDelta)
      const newParentId = findNewParentIdForMultiple(item, newLevel, localItems.value)
      const index = localItems.value.findIndex(i => i.id === item.id)
      if (index !== -1) {
        localItems.value[index].level = newLevel
        localItems.value[index].parentId = newParentId
      }
    })
    
    emit('refresh')
  } catch (error) {
    console.error('Erreur lors de l\'indentation multiple:', error)
  }
}

function findChildrenItemsForMultiple(parentItem, allItems) {
  const children = []
  const parentLevel = parentItem.level || 0
  const parentIndex = allItems.findIndex(item => item.id === parentItem.id)
  
  if (parentIndex === -1) return children
  
  // Parcourir les items après le parent pour trouver ses enfants
  for (let i = parentIndex + 1; i < allItems.length; i++) {
    const currentItem = allItems[i]
    const currentLevel = currentItem.level || 0
    
    // Si le niveau est inférieur ou égal au parent, on sort (fin des enfants)
    if (currentLevel <= parentLevel) {
      break
    }
    
    // Si c'est un enfant direct ou indirect, l'ajouter
    children.push(currentItem)
  }
  
  return children
}

function findNewParentIdForMultiple(item, targetLevel, allItems) {
  // Si on déindente au niveau 0, pas de parent
  if (targetLevel === 0) {
    return null
  }
  
  const currentIndex = allItems.findIndex(i => i.id === item.id)
  if (currentIndex === -1) return null
  
  // Chercher en remontant un élément avec le niveau parent (targetLevel - 1)
  const parentLevel = targetLevel - 1
  
  for (let i = currentIndex - 1; i >= 0; i--) {
    const potentialParent = allItems[i]
    const potentialParentLevel = potentialParent.level || 0
    
    if (potentialParentLevel === parentLevel) {
      return potentialParent.id
    }
  }
  
  return null
}

// Keyboard shortcuts
function handleKeyDown(event) {
  // Gestion de Tab/Shift+Tab pour l'indentation multiple
  if (event.key === 'Tab' && selectedItems.value.length > 0) {
    event.preventDefault()
    handleMultipleIndentation(event.shiftKey ? -1 : 1)
    return
  }

  // Gestion de Delete pour supprimer les éléments sélectionnés (sans Ctrl)
  if ((event.key === 'Delete' || event.key === 'Backspace') && selectedItems.value.length > 0) {
    // Vérifier qu'on n'est pas dans un input en train d'éditer
    const activeElement = document.activeElement
    const isInInput = activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')
    
    if (!isInInput) {
      event.preventDefault()
      deleteSelectedItems()
      return
    }
  }

  if (event.ctrlKey || event.metaKey) {
    switch (event.key) {
      case 'a':
        event.preventDefault()
        handleSelect('all')
        break
      case 'c':
        if (selectedItems.value.length > 0) {
          event.preventDefault()
          copySelectedItems()
        }
        break
    }
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown)
})
</script>

<style scoped>
.todo-container {
  user-select: none;
}
</style>