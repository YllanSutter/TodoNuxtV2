<template>
  <div 
    ref="lineRef"
    :class="[
      'todo-line group flex items-center gap-2 px-2 rounded transition-colors hover:bg-white/5',
      isSelected ? 'bg-white/5' : '',
      isDragging ? 'opacity-50' : '',
      dropPosition === 'before' ? 'border-t-2 border-blue-400' : '',
      dropPosition === 'after' ? 'border-b-2 border-blue-400' : '',
      dropPosition === 'inside' ? '' : ''
    ]"
    :draggable="isDragEnabled"
    @dragstart="handleDragStart"
    @dragend="handleDragEnd"
    @dragover="handleDragOver"
    @dragleave="handleDragLeave"
    @drop="handleDrop"
    @click="handleClick"
  >
    <!-- Icône de déplacement -->
    <div
      class="drag-handle cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 p-1 pr-2 rounded border-r border-white/5 -mr-[10px]"
      title="Glisser pour déplacer"
      @mousedown="handleDragHandleMouseDown"
    >
      <Icon name="material-symbols:drag-indicator" class="w-4 h-4" />
    </div>
    <!-- Indentation et flèche collapse -->
    <div class="flex items-center border-l border-white/5 p-2 pr-0" :style="{ marginLeft: `${(item.level || 0) * 16}px` }">
      <!-- Flèche de collapse pour les parents -->
      <button
        v-if="hasChildren"
        @click.stop="toggleCollapse"
        class="w-4 h-4 flex items-center justify-center text-gray-400 hover:text-gray-200 transition-colors mr-1"
        :title="isCollapsed ? 'Développer' : 'Réduire'"
      >
        <Icon 
          :name="isCollapsed ? 'lucide:chevron-right' : 'lucide:chevron-down'" 
          class="w-3 h-3 transition-transform duration-200 cursor-pointer"
        />
      </button>
      
      <!-- Espace vide pour aligner les éléments sans enfants -->
      <div v-else class="w-4 mr-1"></div>
      
      <!-- Checkbox pour les tâches -->
      <div v-if="item.type === 'TASK'" class="w-[25px]">
        <div 
          @click="toggleCompleted"
          :class="[
            'w-5 h-5 rounded-full border-2 cursor-pointer transition-all duration-200 flex items-center justify-center',
            item.completed ? 'bg-success border-success' : 'border-[#ffffff10] hover:border-success'
          ]"
        >
          <Icon 
            v-if="item.completed"
            name="lucide:check" 
            class="w-3 h-3 text-white animate-bounce-finite"
          />
        </div>
      </div>
      
      <!-- Indicateur de type pour les autres types -->
      <span 
        v-else
        class="flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold text-white mr-1"
        :class="{
          'bg-purple-500': item.type === 'TITLE',
          'bg-gray-500': item.type === 'NOTE'
        }"
      >
        {{ item.type === 'TITLE' ? 'T' : 'N' }}
      </span>
    </div>

    <!-- Input de contenu -->
    <input
      ref="contentInput"
      v-model="localContent"
      type="text"
      :data-id="item.id"
      class="flex-1 bg-transparent border-none outline-none"
      :class="{
        'line-through opacity-60': item.completed,
        'font-bold text-lg': item.type === 'TITLE',
        'text-sm italic text-gray-600 dark:text-gray-400': item.type === 'NOTE'
      }"
      @input="handleInput"
      @keydown="handleKeyDown"
      @paste="handlePaste"
      @focus="handleFocus"
      @blur="handleBlur"
    />

    <!-- Actions -->
    <div class="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
      <!-- Sélecteur de type -->
      <button
        @click.stop="changeType('TASK')"
        :class="[item.type === 'TASK' ? 'text-success' : 'text-gray-400', 'hover:text-success cursor-pointer transition-all duration-300']"
        title="Tâche classique"
      >
        <Icon name="lucide:check-circle-2" class="w-4 h-4" />
      </button>
      <button
        @click.stop="changeType('TITLE')"
        :class="[item.type === 'TITLE' ? 'text-purple-500' : 'text-gray-400', 'hover:text-purple-500 cursor-pointer transition-all duration-300']"
        title="Titre"
      >
        <Icon name="lucide:type" class="w-4 h-4" />
      </button>
      <!-- Bouton de suppression -->
      <button
        @click.stop="deleteItem"
        class="hover:text-red-500 cursor-pointer transition-all duration-300"
        title="Supprimer"
      >
        <Icon name="material-symbols:delete-outline" class="w-4 h-4" />
      </button>
    </div>

    <!-- Alert Dialog pour la confirmation de suppression -->
    <AlertDialog v-model:open="showDeleteDialog">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
          <AlertDialogDescription>
            Êtes-vous sûr de vouloir supprimer cette tâche ?
            Cette action est irréversible.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel @click="showDeleteDialog = false">Annuler</AlertDialogCancel>
          <AlertDialogAction @click="confirmDeleteItem" class="text-white bg-red-600 hover:bg-red-700">
            Supprimer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>

<script setup>
const props = defineProps({
  item: {
    type: Object,
    required: true
  },
  isSelected: {
    type: Boolean,
    default: false
  },
  hasMultipleSelection: {
    type: Boolean,
    default: false
  },
  parentId: {
    type: String,
    default: null
  },
  allItems: {
    type: Array,
    default: () => []
  },
  // Plus besoin de collapsedParents car on utilise les champs du modèle
})

const emit = defineEmits([
  'update',
  'delete', 
  'create-new-line',
  'select',
  'move',
  'paste-lines',
  'clear-selection',
  'refresh',
  'toggle-collapse'
])

// Refs
const lineRef = ref(null)
const contentInput = ref(null)

// State
const localContent = ref(props.item.content || '')
const isDragging = ref(false)
const isDragEnabled = ref(false)
const dropPosition = ref(null) // 'before', 'after', 'inside'
const updateTimeout = ref(null)
const showDeleteDialog = ref(false)

// Watchers
watch(() => props.item.content, (newContent) => {
  localContent.value = newContent || ''
})

// Computed properties for collapse functionality
const hasChildren = computed(() => {
  // Vérifier s'il y a des enfants directs dans allItems
  return props.allItems.some(item => item.parentId === props.item.id)
})

const isCollapsed = computed(() => {
  return !props.item.expanded
})

// Methods for collapse functionality
function toggleCollapse() {
  emit('toggle-collapse', props.item.id)
}

// Methods

async function changeType(newType) {
  if (props.item.type === newType) return
  try {
    await updateItem({ type: newType })
    // Mise à jour visuelle immédiate
    emit('update', { ...props.item, type: newType })
  } catch (error) {
    console.error('Erreur lors du changement de type:', error)
  }
}
function handleInput() {
  // Debounce update
  if (updateTimeout.value) {
    clearTimeout(updateTimeout.value)
  }
  
  updateTimeout.value = setTimeout(() => {
    if (localContent.value !== props.item.content) {
      updateItem({ content: localContent.value })
    }
  }, 500)
}

async function updateItem(data) {
  try {
    await $fetch('/api/data/update', {
      method: 'PUT',
      body: {
        id: props.item.id,
        type: 'todo',
        data
      }
    })
    
    emit('update', { ...props.item, ...data })
  } catch (error) {
    console.error('Erreur lors de la mise à jour:', error)
    // Revert local changes on error
    localContent.value = props.item.content || ''
  }
}

async function updateCompleted(event) {
  const completed = event.target.checked
  await updateItem({ completed })
}

async function toggleCompleted() {
  const newCompleted = !props.item.completed
  
  try {
    // Optimistic update - mettre à jour localement d'abord
    emit('update', { ...props.item, completed: newCompleted })
    
    // Puis faire l'appel API
    await updateItem({ completed: newCompleted })
  } catch (error) {
    console.error('Erreur lors du toggle completed:', error)
    // En cas d'erreur, revenir à l'état précédent
    emit('update', { ...props.item, completed: !newCompleted })
  }
}

function deleteItem() {
  // Si la ligne est vide, supprimer directement
  if (localContent.value.trim() === '') {
    confirmDeleteItem()
  } else {
    // Sinon, demander confirmation
    showDeleteDialog.value = true
  }
}

async function confirmDeleteItem() {
  showDeleteDialog.value = false
  
  try {
    await $fetch('/api/data/delete', {
      method: 'DELETE',
      body: {
        id: props.item.id,
        type: 'todo'
      }
    })
    
    emit('delete', props.item.id)
  } catch (error) {
    console.error('Erreur lors de la suppression:', error)
  }
}

function handleKeyDown(event) {
  switch (event.key) {
    case 'Enter':
      event.preventDefault()
      createNewLine()
      break
      
    case 'Delete':
    case 'Backspace':
      if (localContent.value.trim() === '' && event.key === 'Backspace') {
        event.preventDefault()
        deleteItem()
      }
      break
      
    case 'ArrowUp':
      event.preventDefault()
      focusAdjacentItem(-1)
      break
      
    case 'ArrowDown':
      event.preventDefault()
      focusAdjacentItem(1)
      break
      
    case 'ArrowLeft':
      // Si c'est un parent et qu'on est au début de l'input
      if (hasChildren.value && contentInput.value.selectionStart === 0) {
        event.preventDefault()
        if (!isCollapsed.value) {
          toggleCollapse()
        }
      }
      break
      
    case 'ArrowRight':
      // Si c'est un parent et qu'on est au début de l'input
      if (hasChildren.value && contentInput.value.selectionStart === 0) {
        event.preventDefault()
        if (isCollapsed.value) {
          toggleCollapse()
        }
      }
      break
      
    case 'Tab':
      if (props.hasMultipleSelection) {
        return 
      }
      
      event.preventDefault()
      const levelDelta = event.shiftKey ? -1 : 1
      handleIndentation(levelDelta)
      break
      
    case 'c':
      if (event.ctrlKey) {
        copyToClipboard()
      }
      break
      
    case 'v':
      if (event.ctrlKey) {
        // Le paste sera géré par l'événement paste
      }
      break
      
    case 'a':
      if (event.ctrlKey) {
        event.preventDefault()
        emit('select', 'all')
      }
      break
  }
}

async function createNewLine() {
  try {
    // Calculer l'ordre pour insérer après la tâche actuelle
    // L'API gérera automatiquement le décalage des éléments existants
    const newOrder = Math.floor((props.item.order || 0)) + 1
    const currentLevel = props.item.level || 0
    
    // Calculer le parentId pour le nouvel élément (parentId de todo, pas de projet)
    let newTodoParentId = null // Par défaut, null pour les éléments de niveau 0
    
    if (currentLevel > 0) {
      // Si l'élément courant a un niveau > 0, le nouvel élément aura le même parent todo
      newTodoParentId = props.item.parentId
    }
    
    const newTodo = await $fetch('/api/data/add', {
      method: 'POST',
      body: {
        type: 'todo',
        parentId: props.parentId, // Parent du projet
        count: 1,
        data: {
          content: '',
          type: 'TASK',
          level: currentLevel,
          order: newOrder,
          parentId: newTodoParentId // Parent de la todo (null pour niveau 0, ou ID d'un autre todo)
        }
      }
    })
    
    emit('create-new-line', newTodo.data[0])
    
    // Focus on the new line after a short delay
    await nextTick()
    setTimeout(() => {
      const newLineInput = document.querySelector(`input[data-id="${newTodo.data[0].id}"]`)
      if (newLineInput) {
        newLineInput.focus()
      }
    }, 100)
  } catch (error) {
    console.error('Erreur lors de la création:', error)
  }
}

function handleDragHandleMouseDown(event) {
  event.stopPropagation()
  isDragEnabled.value = true
  
  // Désactiver le drag après un délai plus long si pas de dragstart
  setTimeout(() => {
    if (!isDragging.value) {
      isDragEnabled.value = false
    }
  }, 1000)
}

function copyToClipboard() {
  const textToCopy = `${'  '.repeat(props.item.level || 0)}${props.item.content}`
  navigator.clipboard.writeText(textToCopy)
}

function handlePaste(event) {
  event.preventDefault()
  const clipboardData = event.clipboardData || window.clipboardData
  const pastedData = clipboardData.getData('text')
  
  if (pastedData.includes('\n')) {
    // Multi-line paste
    const lines = pastedData.split('\n').filter(line => line.trim())
    emit('paste-lines', {
      lines,
      afterItem: props.item,
      baseLevel: props.item.level || 0
    })
  } else {
    // Single line paste
    const currentPos = contentInput.value.selectionStart
    const newContent = localContent.value.slice(0, currentPos) + pastedData + localContent.value.slice(contentInput.value.selectionEnd)
    localContent.value = newContent
    handleInput()
  }
}

function handleClick(event) {
  if (event.ctrlKey || event.metaKey) {
    emit('select', props.item.id)
  }
}

function handleFocus() {
  // Désélectionner quand on focus sur un input pour éditer
  emit('clear-selection')
}

function handleBlur() {
  // Save changes when losing focus
  if (updateTimeout.value) {
    clearTimeout(updateTimeout.value)
    if (localContent.value !== props.item.content) {
      updateItem({ content: localContent.value })
    }
  }
}

// Drag & Drop
function handleDragStart(event) {
  isDragging.value = true
  event.dataTransfer.setData('text/plain', JSON.stringify({
    id: props.item.id,
    content: props.item.content,
    level: props.item.level,
    type: props.item.type
  }))
  event.dataTransfer.effectAllowed = 'move'
}

function handleDragEnd(event) {
  isDragging.value = false
  isDragEnabled.value = false
}

function handleDragOver(event) {
  event.preventDefault()
  event.dataTransfer.dropEffect = 'move'
  
  const rect = lineRef.value.getBoundingClientRect()
  const y = event.clientY - rect.top
  const height = rect.height
  
  if (y < height * 0.25) {
    dropPosition.value = 'before'
  } else if (y > height * 0.75) {
    dropPosition.value = 'after'
  } else {
    dropPosition.value = 'inside'
  }
}

function handleDragLeave() {
  dropPosition.value = null
}

function handleDrop(event) {
  event.preventDefault()
  isDragging.value = false
  
  try {
    const draggedData = JSON.parse(event.dataTransfer.getData('text/plain'))
    
    emit('move', {
      draggedItem: draggedData,
      targetItem: props.item,
      position: dropPosition.value
    })
  } catch (error) {
    console.error('Erreur lors du drop:', error)
  } finally {
    dropPosition.value = null
  }
}

// Indentation management
async function handleIndentation(levelDelta) {
  const newLevel = Math.max(0, (props.item.level || 0) + levelDelta)
  
  // Calculer le nouveau parentId
  const newParentId = findNewParentId(newLevel)
  
  // Trouver tous les enfants de cet élément
  const childrenItems = findChildrenItems()
  
  // Mettre à jour l'élément courant
  const updateData = { 
    level: newLevel,
    parentId: newParentId 
  }
  
  await updateItem(updateData)
  
  // Si l'élément a des enfants, les indenter aussi
  if (childrenItems.length > 0) {
    await updateChildrenIndentation(childrenItems, levelDelta)
    
    // Attendre la prochaine tick pour que les mises à jour soient appliquées
    await nextTick()
    
    // Demander un refresh du container pour synchroniser toutes les données
    emit('refresh')
  }
}

function findNewParentId(targetLevel) {
  // Si on déindente au niveau 0, pas de parent
  if (targetLevel === 0) {
    return null
  }
  
  const allItems = props.allItems
  const currentIndex = allItems.findIndex(item => item.id === props.item.id)
  
  if (currentIndex === -1) {
    return null
  }
  
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

function findChildrenItems() {
  const allItems = props.allItems
  const children = []
  const currentLevel = props.item.level || 0
  const currentIndex = allItems.findIndex(item => item.id === props.item.id)
  
  if (currentIndex === -1) {
    return []
  }
  
  // Parcourir les éléments suivants pour trouver les enfants
  for (let i = currentIndex + 1; i < allItems.length; i++) {
    const item = allItems[i]
    const itemLevel = item.level || 0
    
    // Si le niveau est inférieur ou égal au niveau courant, on arrête
    if (itemLevel <= currentLevel) {
      break
    }
    
    // C'est un enfant (direct ou indirect)
    children.push(item)
  }
  
  return children
}

async function updateChildrenIndentation(children, levelDelta) {
  try {
    // Utiliser les données locales au lieu d'un appel API
    const allItems = props.allItems
    
    const updatePromises = children.map((child) => {
      const newChildLevel = Math.max(0, (child.level || 0) + levelDelta)
      
      // Calculer le nouveau parentId pour cet enfant
      let newChildParentId = null
      if (newChildLevel > 0) {
        const childIndex = allItems.findIndex(item => item.id === child.id)
        if (childIndex !== -1) {
          const parentLevel = newChildLevel - 1
          
          // Chercher en remontant un élément avec le niveau parent
          for (let i = childIndex - 1; i >= 0; i--) {
            const potentialParent = allItems[i]
            const potentialParentLevel = (potentialParent.level || 0) + (potentialParent.id === props.item.id ? levelDelta : 0)
            
            if (potentialParentLevel === parentLevel) {
              newChildParentId = potentialParent.id
              break
            }
          }
        }
      }
      
      return $fetch('/api/data/update', {
        method: 'PUT',
        body: {
          id: child.id,
          type: 'todo',
          data: { 
            level: newChildLevel,
            parentId: newChildParentId
          }
        }
      }).then(() => {
        // Émettre la mise à jour pour chaque enfant individuellement
        const updatedChild = { 
          ...child, 
          level: newChildLevel,
          parentId: newChildParentId
        }
        emit('update', updatedChild)
        return updatedChild
      })
    })
    
    await Promise.all(updatePromises)
  } catch (error) {
    console.error('Erreur lors de la mise à jour des enfants:', error)
  }
}

// Focus management
function focus() {
  contentInput.value?.focus()
}

function focusAdjacentItem(direction) {
  // Trouve tous les inputs de todo dans le container parent
  const container = lineRef.value?.closest('.todo-list')
  if (!container) return
  
  const allInputs = container.querySelectorAll('.todo-line input[type="text"]')
  const currentInput = contentInput.value
  const currentIndex = Array.from(allInputs).indexOf(currentInput)
  
  if (currentIndex === -1) return
  
  const targetIndex = currentIndex + direction
  if (targetIndex >= 0 && targetIndex < allInputs.length) {
    allInputs[targetIndex].focus()
  }
}

defineExpose({
  focus
})
</script>

<style scoped>
.todo-line {
  position: relative;
}

.todo-line:hover .flex-shrink-0:last-child {
  opacity: 1;
}

.flex-shrink-0:last-child {
  opacity: 0;
  transition: opacity 0.2s;
}

.drag-handle span {
  opacity: 0;
  transition: opacity 0.2s;
}

.todo-line:hover .drag-handle span {
  opacity: 1;
}

/* Animation bounce subtile */
@keyframes bounce-finite {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-3px);
  }
}

.animate-bounce-finite {
  animation: bounce-finite 0.3s ease-in-out;
}
</style>