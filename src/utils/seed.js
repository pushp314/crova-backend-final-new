import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function clearDatabase() {
  try {
    // Order matters if you have relations (delete children first)
    await prisma.order.deleteMany()
    await prisma.product.deleteMany()
    await prisma.user.deleteMany()
    
    console.log("✅ All data erased successfully")
  } catch (error) {
    console.error("❌ Error erasing data:", error)
  } finally {
    await prisma.$disconnect()
  }
}

clearDatabase()
