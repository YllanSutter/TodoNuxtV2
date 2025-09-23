import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  try {
    const groups = await prisma.group.findMany()
    return groups
  } catch (error) {
    console.error('Erreur Prisma:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Erreur lors de la récupération des groupes'
    })
  }
})