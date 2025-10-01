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
      description: () => '',
      color: () => `#${Math.floor(Math.random()*16777215).toString(16)}`
    },
    subgroup: {
      name: (index: number) => `Nouveau sous-groupe ${index}`,
      description: () => '',
      color: () => `#${Math.floor(Math.random()*16777215).toString(16)}`
    },
    project: {
      name: (index: number) => `Nouveau projet ${index}`,
      description: () => '',
      status: () => 'ACTIVE',
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
      description: () => ''
    },
    templateItem: {
      title: (index: number) => `Item template ${index}`,
      description: () => '',
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

    const results: any[] = []
    const itemCount = Math.max(1, parseInt(count as string) || 1)

    for (let i = 1; i <= itemCount; i++) {
      const itemData: Record<string, any> = {}
      // Ajouter les données par défaut du schéma
      if (defaultDataSchemas[type as string]) {
        const schema = defaultDataSchemas[type as string]
        for (const [key, valueFunction] of Object.entries(schema)) {
          if (typeof valueFunction === 'function') {
            itemData[key] = valueFunction(i)
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
      // Optimisation : si ajout à la fin, pas de recalcul d'ordre
      if (itemData.order !== undefined && parentId) {
        const parentField = parentFieldMap[type as string]
        // Chercher le max order actuel
        const maxOrderItem = await model.findFirst({
          where: { [parentField]: parentId },
          orderBy: { order: 'desc' }
        })
        if (maxOrderItem && itemData.order <= maxOrderItem.order) {
          // Il y a conflit, on décale
          const whereClause: any = {}
          whereClause[parentField] = parentId
          whereClause.order = { gte: itemData.order }
          const conflictingItems = await model.findMany({
            where: whereClause,
            orderBy: { order: 'asc' }
          })
          if (conflictingItems.length > 0) {
            const updates = conflictingItems.map((conflictItem: typeof conflictingItems[0]) =>
              model.update({
                where: { id: conflictItem.id },
                data: { order: conflictItem.order + 1 }
              })
            )
            await prisma.$transaction(updates)
            console.log(`Décalé ${conflictingItems.length} éléments pour éviter les conflits d'ordre (transaction)`)
          }
        }
        // Sinon, on ajoute à la fin, pas de recalcul
      }
      // Ajouter les timestamps
      itemData.createdAt = new Date()
      itemData.updatedAt = new Date()

      // Si on crée un projet et qu'un templateProjectId est fourni, dupliquer ses todos
      let createdProject: Awaited<ReturnType<typeof model.create>> | null = null
      if (type === 'project' && data.templateProjectId) {
        createdProject = await model.create({ data: itemData })
        // Récupérer les todos du projet template
        const templateTodos = await prisma.todo.findMany({ where: { projectId: data.templateProjectId }, orderBy: { order: 'asc' } })
        // Création des todos sans parentId
        const todosToCreate = templateTodos.map((todo, idx) => {
          const { id, projectId, createdAt, updatedAt, parentId, ...rest } = todo
          return {
            ...rest,
            projectId: createdProject.id,
            parentId: parentId ? parentId : null, // temporairement, sera corrigé ensuite
            createdAt: new Date(),
            updatedAt: new Date()
          }
        })
        // Création en batch
        await prisma.todo.createMany({ data: todosToCreate })
        // Si des parentId existent, on doit les corriger (car les ids ont changé)
        // On récupère les nouveaux todos pour faire la correspondance
        const newTodos = await prisma.todo.findMany({ where: { projectId: createdProject.id } })
        const idMap = new Map<string, string>()
        templateTodos.forEach((todo, idx) => {
          idMap.set(todo.id, newTodos[idx].id)
        })
        // Préparer les updates de parentId
        const updates: ReturnType<typeof prisma.todo.update>[] = []
        templateTodos.forEach((todo, idx) => {
          if (todo.parentId) {
            const newId = idMap.get(todo.id)
            const newParentId = idMap.get(todo.parentId)
            if (newId && newParentId) {
              updates.push(prisma.todo.update({
                where: { id: newId },
                data: { parentId: newParentId }
              }))
            }
          }
        })
        if (updates.length > 0) {
          await prisma.$transaction(updates)
        }
        results.push(createdProject)
      } else if (type === 'project') {
        // Crée le projet et une todo vide
        createdProject = await model.create({ data: itemData })
        await prisma.todo.create({
          data: {
            content: 'Nouvelle tâche',
            type: 'TASK',
            completed: false,
            order: 0,
            level: 0,
            projectId: createdProject.id,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        })
        results.push(createdProject)
      } else {
        try {
          // Utilisation de createMany même pour un seul élément
          const created = await model.createMany({ data: [itemData] })
          // On récupère l'élément créé pour le retourner
          const last = await model.findFirst({
            where: itemData,
            orderBy: { createdAt: 'desc' }
          })
          if (last) results.push(last)
        } catch (createError) {
          // Continuer avec les autres items même si un échoue
        }
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