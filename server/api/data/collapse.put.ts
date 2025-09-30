import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'PUT') {
    throw createError({
      statusCode: 405,
      statusMessage: 'Méthode non autorisée'
    })
  }

  const { id, expanded } = await readBody(event)
  if (!id || typeof expanded !== 'boolean') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Paramètres manquants'
    })
  }

  try {
    // Récupérer le parent
    const parent = await prisma.todo.findUnique({ where: { id } })
    if (!parent) {
      throw createError({ statusCode: 404, statusMessage: 'Parent introuvable' })
    }
    // Récupérer tous les enfants directs et indirects
    const allTodos = await prisma.todo.findMany({ where: { projectId: parent.projectId } })
    const childrenIds = []
    const stack = [parent.id]
    while (stack.length) {
      const currentId = stack.pop()
      for (const todo of allTodos) {
        if (todo.parentId === currentId) {
          childrenIds.push(todo.id)
          stack.push(todo.id)
        }
      }
    }
    // Préparer les updates (parent + enfants)
    const updates = [
      prisma.todo.update({ where: { id: parent.id }, data: { expanded } })
    ]
    for (const childId of childrenIds) {
      updates.push(prisma.todo.update({ where: { id: childId }, data: { expanded, visible: expanded } }))
    }
    await prisma.$transaction(updates)
    return { success: true, updated: updates.length }
  } catch (error) {
    console.error('Erreur lors du collapse/expand:', error)
    throw createError({ statusCode: 500, statusMessage: 'Erreur lors du collapse/expand' })
  }
})
