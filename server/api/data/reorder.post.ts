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
        if (items.length > 0) {
          // Build a single SQL UPDATE ... CASE to set different order values in one query
          const cases = items.map((item, index) => `WHEN '${item.id}' THEN ${index + 1}`).join(' ')
          const ids = items.map(i => `'${i.id}'`).join(',')
          const sql = `UPDATE "todos" SET "order" = CASE "id" ${cases} ELSE "order" END WHERE "id" IN (${ids});`
          await prisma.$executeRawUnsafe(sql)
        }
        break
        
      case 'project':
        items = await prisma.project.findMany({
          where: parentId ? { subgroupId: parentId } : {},
          orderBy: { order: 'asc' }
        })
        if (items.length > 0) {
          const cases = items.map((item, index) => `WHEN '${item.id}' THEN ${index + 1}`).join(' ')
          const ids = items.map(i => `'${i.id}'`).join(',')
          const sql = `UPDATE "projects" SET "order" = CASE "id" ${cases} ELSE "order" END WHERE "id" IN (${ids});`
          await prisma.$executeRawUnsafe(sql)
        }
        break
        
      case 'subgroup':
        items = await prisma.subgroup.findMany({
          where: parentId ? { groupId: parentId } : {},
          orderBy: { order: 'asc' }
        })
        if (items.length > 0) {
          const cases = items.map((item, index) => `WHEN '${item.id}' THEN ${index + 1}`).join(' ')
          const ids = items.map(i => `'${i.id}'`).join(',')
          const sql = `UPDATE "subgroups" SET "order" = CASE "id" ${cases} ELSE "order" END WHERE "id" IN (${ids});`
          await prisma.$executeRawUnsafe(sql)
        }
        break
        
      case 'group':
        items = await prisma.group.findMany({
          orderBy: { order: 'asc' }
        })
        if (items.length > 0) {
          const cases = items.map((item, index) => `WHEN '${item.id}' THEN ${index + 1}`).join(' ')
          const ids = items.map(i => `'${i.id}'`).join(',')
          const sql = `UPDATE "groups" SET "order" = CASE "id" ${cases} ELSE "order" END WHERE "id" IN (${ids});`
          await prisma.$executeRawUnsafe(sql)
        }
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