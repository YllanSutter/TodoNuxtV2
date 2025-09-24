import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  const { id, type } = await readBody(event)

  if (!id || !type) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ID et type requis'
    })
  }

  try {
    let result

    switch (type) {
      case 'group':
        // Supprimer un groupe supprime automatiquement tous ses enfants (cascade)
        result = await prisma.group.delete({
          where: { id }
        })
        break

      case 'subgroup':
        // Supprimer un sous-groupe supprime automatiquement tous ses enfants (cascade)
        result = await prisma.subgroup.delete({
          where: { id }
        })
        break

      case 'project':
        // Supprimer un projet supprime automatiquement tous ses enfants (cascade)
        result = await prisma.project.delete({
          where: { id }
        })
        break

      case 'todo':
        // Supprimer un todo supprime automatiquement tous ses enfants (cascade)
        result = await prisma.todo.delete({
          where: { id }
        })
        break

      case 'tag':
        result = await prisma.tag.delete({
          where: { id }
        })
        break

      case 'template':
        result = await prisma.template.delete({
          where: { id }
        })
        break

      case 'templateItem':
        result = await prisma.templateItem.delete({
          where: { id }
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
      deletedId: id,
      type
    }
  } catch (error) {
    console.error('Erreur lors de la suppression:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Erreur lors de la suppression'
    })
  }
})