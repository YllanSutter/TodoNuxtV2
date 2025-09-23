import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  const { type = 'group' } = getQuery(event)
  
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
  
  try {
    const model = modelMap[type as string]
    
    if (!model || typeof model.findMany !== 'function') {
      throw createError({
        statusCode: 400,
        statusMessage: `Type '${type}' non supporté`
      })
    }
    
    const data = await model.findMany()
    return data || []
  } catch (error: any) {
    if (error.statusCode === 400) {
      throw error
    }
    
    console.error('Erreur Prisma:', error)
    return []
  }
})