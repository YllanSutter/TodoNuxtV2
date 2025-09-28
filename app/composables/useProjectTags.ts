import { ref } from 'vue'
import type { Ref, ComputedRef } from 'vue'
export interface Tag {
  id: string
  name: string
  color?: string
}
export function useProjectTags(item: {id?: string}, isProject: ComputedRef<boolean>) {
  const projectTags: Ref<Tag[]> = ref([])
  const allTags: Ref<Tag[]> = ref([])
  const isLoadingTags: Ref<boolean> = ref(false)
  async function loadProjectTags() {
    if (!isProject.value || !item.id) return
    try {
      isLoadingTags.value = true
      const projectTagsData = await $fetch('/api/data', {
        method: 'GET',
        query: { type: 'projectTag', parentId: item.id }
      })
      const allTagsData = await $fetch('/api/data', {
        method: 'GET',
        query: { type: 'tag' }
      })
      allTags.value = allTagsData
  const projectTagIds = (projectTagsData as Array<{tagId: string}>).map((pt: {tagId: string}) => pt.tagId)
  projectTags.value = (allTagsData as Tag[]).filter((tag: Tag) => projectTagIds.includes(tag.id))
    } catch (error) {
      projectTags.value = []
      allTags.value = []
    } finally {
      isLoadingTags.value = false
    }
  }
  return { projectTags, allTags, isLoadingTags, loadProjectTags }
}
