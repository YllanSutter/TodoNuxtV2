<script setup>
// État partagé pour la sélection
const selectedItemId = ref(null)
const selectedType = ref(null)

function handleSidebarSelection(payload) {
  selectedItemId.value = payload.item.id
  selectedType.value = payload.type
}

function handleBodyNavigation(payload) {
  selectedItemId.value = payload.item.id
  selectedType.value = payload.type
}
</script>

<template>
  <div class="bg-zinc-950 h-svh text-white flex items-stretch">
    <ManagerSidebar
      :selectedItemId="selectedItemId"
      :selectedType="selectedType"
      @itemSelect="handleSidebarSelection"
    />
    <ManagerBody
      :selectedItemId="selectedItemId"
      :selectedType="selectedType"
      @sidebarSelect="handleBodyNavigation"
    />
  </div>
</template>
