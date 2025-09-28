<script setup>
const props = defineProps({
  modelValue: [String, Number],
  subgroupList: Array,
})
const emit = defineEmits(['update:modelValue'])
const value = computed({
  get: () => props.modelValue,
  set: v => emit('update:modelValue', v)
})
</script>
<template>
  <Select v-model="value">
    <SelectTrigger class="cursor-pointer lowercase">
      <SelectValue placeholder="Sélectionner un sous-groupe" />
    </SelectTrigger>
    <SelectContent>
      <SelectGroup class="lowercase">
        <SelectLabel class="border-b border-white/10">Sous-groupe</SelectLabel>
        <SelectItem v-for="sg in subgroupList" :key="sg.id" :value="sg.id">
          {{ sg.name || `Sous-groupe #${sg.id}` }}
        </SelectItem>
      </SelectGroup>
    </SelectContent>
  </Select>
</template>
