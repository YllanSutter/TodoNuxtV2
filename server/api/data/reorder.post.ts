import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  const { type, parentId } = await readBody(event)

  if (!type) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Type requis'
    })
  }

  try {
    let items = []
    
    switch (type) {
      case 'todo':
        items = await prisma.todo.findMany({
          where: parentId ? { projectId: parentId } : {},
          orderBy: { order: 'asc' }
        })
        
        // Réorganiser les ordres
        const updatePromises = items.map((item, index) => 
          prisma.todo.update({
            where: { id: item.id },
            data: { order: index + 1 }
          })
        )
        
        await Promise.all(updatePromises)
        break
        
      case 'project':
        items = await prisma.project.findMany({
          where: parentId ? { subgroupId: parentId } : {},
          orderBy: { order: 'asc' }
        })
        
        const projectUpdatePromises = items.map((item, index) => 
          prisma.project.update({
            where: { id: item.id },
            data: { order: index + 1 }
          })
        )
        
        await Promise.all(projectUpdatePromises)
        break
        
      case 'subgroup':
        items = await prisma.subgroup.findMany({
          where: parentId ? { groupId: parentId } : {},
          orderBy: { order: 'asc' }
        })
        
        const subgroupUpdatePromises = items.map((item, index) => 
          prisma.subgroup.update({
            where: { id: item.id },
            data: { order: index + 1 }
          })
        )
        
        await Promise.all(subgroupUpdatePromises)
        break
        
      case 'group':
        items = await prisma.group.findMany({
          orderBy: { order: 'asc' }
        })
        
        const groupUpdatePromises = items.map((item, index) => 
          prisma.group.update({
            where: { id: item.id },
            data: { order: index + 1 }
          })
        )
        
        await Promise.all(groupUpdatePromises)
        break
        
      default:
        throw createError({
          statusCode: 400,
          statusMessage: `Type '${type}' non supporté`
        })
    }

    return {
      success: true,
      message: `Ordres réorganisés pour ${items.length} éléments`
    }
  } catch (error) {
    console.error('Erreur lors de la réorganisation:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Erreur lors de la réorganisation'
    })
  }
})