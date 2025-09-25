import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') {
    throw createError({
      statusCode: 405,
      statusMessage: 'Méthode non autorisée'
    })
  }

  const { type, count = 1, data = {}, parentId } = await readBody(event)
  
  console.log('API reçu:', { type, count, data, parentId })
  
  if (!type) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Le paramètre "type" est requis'
    })
  }

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
    project: 'subgroupId',
    todo: 'projectId',
    templateItem: 'templateId',
    projectTag: 'projectId'
  }

  // Champs autorisés pour chaque type
  const allowedFields: Record<string, string[]> = {
    group: ['name', 'description', 'color', 'order'],
    subgroup: ['name', 'description', 'color', 'order', 'groupId'],
    project: ['name', 'description', 'status', 'color', 'order', 'subgroupId', 'templateId'],
    todo: ['content', 'type', 'completed', 'order', 'level', 'projectId', 'parentId'],
    tag: ['name', 'color'],
    projectTag: ['projectId', 'tagId'],
    template: ['name', 'description'],
    templateItem: ['content', 'type', 'order', 'level', 'templateId', 'parentId']
  }

  // Schémas de données par défaut
  const defaultDataSchemas: Record<string, any> = {
    group: {
      name: (index: number) => `Nouveau groupe ${index}`,
      description: (index: number) => `Description du groupe ${index}`,
      color: () => `#${Math.floor(Math.random()*16777215).toString(16)}`
    },
    subgroup: {
      name: (index: number) => `Nouveau sous-groupe ${index}`,
      description: (index: number) => `Description du sous-groupe ${index}`,
      color: () => `#${Math.floor(Math.random()*16777215).toString(16)}`
    },
    project: {
      name: (index: number) => `Nouveau projet ${index}`,
      description: (index: number) => `Description du projet ${index}`,
      status: () => 'DRAFT',
      color: () => `#${Math.floor(Math.random()*16777215).toString(16)}`
    },
    todo: {
      content: (index: number) => `Nouvelle tâche ${index}`,
      type: () => 'TASK',
      completed: () => false,
      order: (index: number) => index,
      level: () => 0
    },
    tag: {
      name: (index: number) => `Tag ${index}`,
      color: () => `#${Math.floor(Math.random()*16777215).toString(16)}`
    },
    template: {
      name: (index: number) => `Template ${index}`,
      description: (index: number) => `Description du template ${index}`
    },
    templateItem: {
      title: (index: number) => `Item template ${index}`,
      description: (index: number) => `Description de l'item ${index}`,
      order: (index: number) => index
    },
    projectTag: {
      // Pas de données par défaut, on utilise directement projectId et tagId
    }
  }

  try {
    const model = modelMap[type as string]
    
    if (!model || typeof model.create !== 'function') {
      throw createError({
        statusCode: 400,
        statusMessage: `Type '${type}' non supporté`
      })
    }

    const results = []
    const itemCount = Math.max(1, parseInt(count as string) || 1)

    // Créer les données pour chaque item
    for (let i = 1; i <= itemCount; i++) {
      const itemData: any = {}
      
      // Ajouter les données par défaut du schéma
      if (defaultDataSchemas[type as string]) {
        const schema = defaultDataSchemas[type as string]
        for (const [key, valueFunction] of Object.entries(schema)) {
          if (typeof valueFunction === 'function') {
            itemData[key] = (valueFunction as Function)(i)
          }
        }
      }

      // Ajouter le parentId si nécessaire
      if (parentId && parentFieldMap[type as string]) {
        const parentField = parentFieldMap[type as string]
        itemData[parentField] = parentId
      }

      // Fusionner avec les données personnalisées (en filtrant les champs autorisés)
      if (allowedFields[type as string]) {
        const allowed = allowedFields[type as string]
        for (const [key, value] of Object.entries(data)) {
          if (allowed.includes(key)) {
            itemData[key] = value
          }
        }
      } else {
        Object.assign(itemData, data)
      }

      // Gestion spéciale de l'ordre pour éviter les conflits
      if (itemData.order !== undefined && parentId) {
        const desiredOrder = itemData.order
        
        // Trouver tous les éléments du même parent avec un ordre >= à l'ordre désiré
        const whereClause: any = {}
        if (parentFieldMap[type as string]) {
          whereClause[parentFieldMap[type as string]] = parentId
        }
        whereClause.order = { gte: desiredOrder }
        
        const conflictingItems = await model.findMany({
          where: whereClause,
          orderBy: { order: 'asc' }
        })
        
        // Si des conflits existent, décaler tous les éléments de +1
        if (conflictingItems.length > 0) {
          for (const conflictItem of conflictingItems) {
            await model.update({
              where: { id: conflictItem.id },
              data: { order: conflictItem.order + 1 }
            })
          }
          console.log(`Décalé ${conflictingItems.length} éléments pour éviter les conflits d'ordre`)
        }
      }

      // Ajouter les timestamps
      itemData.createdAt = new Date()
      itemData.updatedAt = new Date()

      console.log(`Tentative de création item ${i}:`, itemData)
      
      try {
        const result = await model.create({
          data: itemData
        })
        console.log(`Item ${i} créé avec succès:`, result)
        results.push(result)
      } catch (createError) {
        console.error(`Erreur lors de la création de l'item ${i}:`, createError)
        console.error('Données qui ont causé l\'erreur:', itemData)
        // Continuer avec les autres items même si un échoue
      }
    }

    return {
      success: true,
      count: results.length,
      data: results,
      message: `${results.length} ${type}(s) créé(s) avec succès`
    }

  } catch (error: any) {
    console.error('Erreur lors de la création:', error)
    
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Erreur interne du serveur'
    })
  }
})