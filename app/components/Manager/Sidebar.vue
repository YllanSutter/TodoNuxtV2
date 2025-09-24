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

const emit = defineEmits(['itemSelect'])

function handleItemSelect(payload) {
  emit('itemSelect', payload)
}

function handleNavigate(payload) {
  emit('itemSelect', payload);
}
</script>

<template>
    <div class="border-r border-white/10 w-1/6">
        <h2 class="p-4 border-b border-white/10">Project Manager</h2>
        <div class="p-4 grid gap-4">
            <div>
                <h3 class="text-sm opacity-70 mb-2">Hiérarchie complète</h3>
                <NavigationBreadcrumb 
                  mode="vertical"
                  :selectedItemId="selectedItemId"
                  :selectedType="selectedType"
                  @navigate="handleNavigate"
                />
            </div>
        </div>
    </div>
</template>