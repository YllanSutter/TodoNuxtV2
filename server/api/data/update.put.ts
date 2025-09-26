import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  const { id, type, data } = await readBody(event)

  if (!id || !type || !data) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ID, type et données requis'
    })
  }

  try {
    let result

    switch (type) {
      case 'group':
        result = await prisma.group.update({
          where: { id },
          data: {
            ...data,
            updatedAt: new Date()
          }
        })
        break

      case 'subgroup':
        result = await prisma.subgroup.update({
          where: { id },
          data: {
            ...data,
            updatedAt: new Date()
          }
        })
        break

      case 'project':
        // On extrait les tags si présents
        const { tagIds, ...projectData } = data
        result = await prisma.project.update({
          where: { id },
          data: {
            ...projectData,
            updatedAt: new Date()
          }
        })
        // Synchronisation des tags du projet
        if (Array.isArray(tagIds)) {
          // On supprime tous les liens existants
          await prisma.projectTag.deleteMany({ where: { projectId: id } })
          // On ajoute les nouveaux liens
          for (const tagId of tagIds) {
            await prisma.projectTag.create({ data: { projectId: id, tagId } })
          }
        }
        break

      case 'todo':
        result = await prisma.todo.update({
          where: { id },
          data: {
            ...data,
            updatedAt: new Date()
          }
        })
        break

      case 'tag':
        result = await prisma.tag.update({
          where: { id },
          data: {
            ...data,
            updatedAt: new Date()
          }
        })
        break

      case 'template':
        result = await prisma.template.update({
          where: { id },
          data: {
            ...data,
            updatedAt: new Date()
          }
        })
        break

      case 'templateItem':
        result = await prisma.templateItem.update({
          where: { id },
          data: {
            ...data,
            updatedAt: new Date()
          }
        })
        break

      default:
        throw createError({
          statusCode: 400,
          statusMessage: `Type '${type}' non supporté`
        })
    }

    return {
      success: true,
      data: result
    }
  } catch (error) {
    console.error('Erreur lors de la mise à jour:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Erreur lors de la mise à jour'
    })
  }
})