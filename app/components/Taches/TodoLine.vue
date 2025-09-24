<template>
  <div 
    ref="lineRef"
    :class="[
      'todo-line flex items-center gap-2 py-1 px-2 rounded transition-colors hover:bg-white/5',
      isSelected ? 'bg-white/5' : '',
      isDragging ? 'opacity-50' : '',
      dropPosition === 'before' ? 'border-t-2 border-blue-400' : '',
      dropPosition === 'after' ? 'border-b-2 border-blue-400' : '',
      dropPosition === 'inside' ? '' : ''
    ]"
    :style="{ paddingLeft: `${(item.level || 0) * 20 + 8}px` }"
    :draggable="isDragEnabled"
    @dragstart="handleDragStart"
    @dragover="handleDragOver"
    @dragleave="handleDragLeave"
    @drop="handleDrop"
    @click="handleClick"
  >
    <!-- Checkbox pour les tâches -->
    <input 
      v-if="item.type === 'TASK'"
      type="checkbox" 
      :checked="item.completed"
      @change="updateCompleted"
      class="flex-shrink-0"
      @click.stop
    />
    
    <!-- Indicateur de type pour les autres types -->
    <span 
      v-else
      class="flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold text-white"
      :class="{
        'bg-purple-500': item.type === 'TITLE',
        'bg-gray-500': item.type === 'NOTE'
      }"
    >
      {{ item.type === 'TITLE' ? 'T' : 'N' }}
    </span>

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
      <!-- Icône de déplacement -->
      <div
        class="drag-handle cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 p-1 rounded"
        title="Glisser pour déplacer"
        @mousedown="handleDragHandleMouseDown"
      >
        <Icon name="material-symbols:drag-indicator" class="w-4 h-4" />
      </div>
      
      <!-- Bouton de suppression -->
      <button
        @click.stop="deleteItem"
        class="text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 p-1 rounded"
        title="Supprimer"
      >
        <Icon name="material-symbols:delete-outline" class="w-4 h-4" />
      </button>
    </div>
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
  }
})

const emit = defineEmits([
  'update',
  'delete', 
  'create-new-line',
  'select',
  'move',
  'paste-lines',
  'clear-selection'
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

// Watchers
watch(() => props.item.content, (newContent) => {
  localContent.value = newContent || ''
})

// Methods
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

async function deleteItem() {
  if (localContent.value.trim() === '' || confirm('Êtes-vous sûr de vouloir supprimer cette ligne ?')) {
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
      
    case 'Tab':
      // Si plusieurs éléments sont sélectionnés, laisser le container gérer l'indentation
      if (props.hasMultipleSelection) {
        return // Ne pas preventDefault, laisser l'événement remonter
      }
      
      event.preventDefault()
      const levelDelta = event.shiftKey ? -1 : 1
      const newLevel = Math.max(0, (props.item.level || 0) + levelDelta)
      updateItem({ level: newLevel })
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
    const newTodo = await $fetch('/api/data/add', {
      method: 'POST',
      body: {
        type: 'todo',
        parentId: props.parentId,
        count: 1,
        data: {
          content: '',
          type: 'TASK',
          level: props.item.level || 0,
          order: (props.item.order || 0) + 1
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
  
  // Désactiver le drag après un court délai si pas de dragstart
  setTimeout(() => {
    isDragEnabled.value = false
  }, 100)
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

.drag-handle {
  opacity: 0;
  transition: opacity 0.2s;
}

.todo-line:hover .drag-handle {
  opacity: 1;
}
</style>