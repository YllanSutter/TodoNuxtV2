import { ref } from 'vue'
import type { Ref, ComputedRef } from 'vue'
export interface Subgroup {
  id: string
  name?: string
  groupId: string
}
export function useSubgroups(item: {subgroupId?: string, parentId?: string}, isProject: ComputedRef<boolean>) {
  const subgroupList: Ref<Subgroup[]> = ref([])
  const selectedSubgroup: Ref<string|null> = ref(null)
  async function loadSubgroups() {
    if (!isProject.value) {
      subgroupList.value = []
      selectedSubgroup.value = null
      return
    }
    let subgroups = []
    let currentSubgroupId = isProject.value ? item.subgroupId : item.parentId
    if (!item.subgroupId) {
      try {
        subgroups = await $fetch<any>('/api/data', {
          method: 'GET',
          query: { type: 'subgroup' }
        })
      } catch (e) {}
      subgroupList.value = Array.isArray(subgroups) ? subgroups : []
      selectedSubgroup.value = null
      return
    }
    let groupId = null
    try {
      let subgroup = await $fetch('/api/data', {
        method: 'GET',
        query: { type: 'subgroup', id: currentSubgroupId }
      })
      if (Array.isArray(subgroup)) {
        subgroup = subgroup.find(sg => sg.id === currentSubgroupId)
      }
      if (subgroup && subgroup.groupId) {
        groupId = subgroup.groupId
      }
    } catch (e) {}
    if (groupId) {
      try {
        subgroups = await $fetch<any>('/api/data', {
          method: 'GET',
          query: { type: 'subgroup', groupId: groupId }
        })
      } catch (e) {}
    } else {
      subgroupList.value = []
  selectedSubgroup.value = currentSubgroupId ?? null
      return
    }
    if (Array.isArray(subgroups) && groupId) {
      subgroupList.value = subgroups.filter(sg => sg.groupId === groupId)
    } else {
      subgroupList.value = Array.isArray(subgroups) ? subgroups : []
    }
  selectedSubgroup.value = currentSubgroupId ?? null
  }
  return { subgroupList, selectedSubgroup, loadSubgroups }
}
