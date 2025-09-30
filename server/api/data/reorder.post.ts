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
        // Préparer les updates
        const updatesTodo = items.map((item, index) =>
          prisma.todo.update({ where: { id: item.id }, data: { order: index + 1 } })
        )
        await prisma.$transaction(updatesTodo)
        break
        
      case 'project':
        items = await prisma.project.findMany({
          where: parentId ? { subgroupId: parentId } : {},
          orderBy: { order: 'asc' }
        })
        const updatesProject = items.map((item, index) =>
          prisma.project.update({ where: { id: item.id }, data: { order: index + 1 } })
        )
        await prisma.$transaction(updatesProject)
        break
        
      case 'subgroup':
        items = await prisma.subgroup.findMany({
          where: parentId ? { groupId: parentId } : {},
          orderBy: { order: 'asc' }
        })
        const updatesSubgroup = items.map((item, index) =>
          prisma.subgroup.update({ where: { id: item.id }, data: { order: index + 1 } })
        )
        await prisma.$transaction(updatesSubgroup)
        break
        
      case 'group':
        items = await prisma.group.findMany({
          orderBy: { order: 'asc' }
        })
        const updatesGroup = items.map((item, index) =>
          prisma.group.update({ where: { id: item.id }, data: { order: index + 1 } })
        )
        await prisma.$transaction(updatesGroup)
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