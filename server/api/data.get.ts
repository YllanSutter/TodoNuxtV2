import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  const { type = 'group', parentId } = getQuery(event)
  
  // Map des modèles disponibles
  const modelMap: Record<string, any> = {
    group: prisma.group,
    subgroup: prisma.subgroup,
    project: prisma.project,
    todo: prisma.todo,
    tag: prisma.tag,
    projectTag: prisma.projectTag,
    template: prisma.template,
    templateItem: prisma.templateItem,
    appState: prisma.appState
  }
  
  // Map des relations parent-enfant selon votre schéma
  const parentFieldMap: Record<string, string> = {
    subgroup: 'groupId',
    project: 'subgroupId', // ou 'groupId' selon votre structure
    todo: 'projectId'
  }
  
  try {
    const model = modelMap[type as string]
    
    if (!model || typeof model.findMany !== 'function') {
      throw createError({
        statusCode: 400,
        statusMessage: `Type '${type}' non supporté`
      })
    }
    
    // Construire les conditions de filtrage
    const whereClause: any = {}
    
    if (parentId && parentFieldMap[type as string]) {
      const parentField = parentFieldMap[type as string]
      whereClause[parentField] = parseInt(parentId as string) || parentId
    }
    
    const data = await model.findMany({
      where: Object.keys(whereClause).length > 0 ? whereClause : undefined
    })
    
    return data || []
  } catch (error: any) {
    if (error.statusCode === 400) {
      throw error
    }
    
    console.error('Erreur Prisma:', error)
    return []
  }
})