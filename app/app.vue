<script setup>
// État partagé pour la sélection
const selectedItemId = ref(null)
const selectedType = ref(null)
const selectedParentId = ref(null)

function handleSidebarSelection(payload) {
  selectedItemId.value = payload.item.id
  selectedType.value = payload.currentType || payload.type
  selectedParentId.value = payload.parentId
}

function handleBodyNavigation(payload) {
  selectedItemId.value = payload.item.id
  selectedType.value = payload.type
  selectedParentId.value = payload.parentId
}


</script>

<template>
  <div class="bg-zinc-950 h-svh text-white flex items-stretch capitalize">
    <ManagerSidebar
      :selectedItemId="selectedItemId"
      :selectedType="selectedType"
      :selectedParentId="selectedParentId"
      @itemSelect="handleSidebarSelection"
    />
    <ManagerBody
      :selectedItemId="selectedItemId"
      :selectedType="selectedType"
      :selectedParentId="selectedParentId"
      @sidebarSelect="handleBodyNavigation"
    />
  </div>
</template>