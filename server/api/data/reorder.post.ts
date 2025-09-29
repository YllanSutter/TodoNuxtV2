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
        const updatesTodo = items.map((item, index) => ({
          id: item.id,
          order: index + 1
        }))
        // Prisma ne supporte pas updateMany avec des ids différents, donc on fait un seul Promise.all
        await Promise.all(updatesTodo.map(u => prisma.todo.update({ where: { id: u.id }, data: { order: u.order } })))
        break
        
      case 'project':
        items = await prisma.project.findMany({
          where: parentId ? { subgroupId: parentId } : {},
          orderBy: { order: 'asc' }
        })
        const updatesProject = items.map((item, index) => ({
          id: item.id,
          order: index + 1
        }))
        await Promise.all(updatesProject.map(u => prisma.project.update({ where: { id: u.id }, data: { order: u.order } })))
        break
        
      case 'subgroup':
        items = await prisma.subgroup.findMany({
          where: parentId ? { groupId: parentId } : {},
          orderBy: { order: 'asc' }
        })
        const updatesSubgroup = items.map((item, index) => ({
          id: item.id,
          order: index + 1
        }))
        await Promise.all(updatesSubgroup.map(u => prisma.subgroup.update({ where: { id: u.id }, data: { order: u.order } })))
        break
        
      case 'group':
        items = await prisma.group.findMany({
          orderBy: { order: 'asc' }
        })
        const updatesGroup = items.map((item, index) => ({
          id: item.id,
          order: index + 1
        }))
        await Promise.all(updatesGroup.map(u => prisma.group.update({ where: { id: u.id }, data: { order: u.order } })))
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