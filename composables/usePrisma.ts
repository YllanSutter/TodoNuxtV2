import { PrismaClient } from '../app/generated/prisma'

let prisma: PrismaClient

export const usePrisma = () => {
  if (!prisma) {
    prisma = new PrismaClient()
  }
  return prisma
}