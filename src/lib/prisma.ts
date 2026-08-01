import 'server-only'
import { PrismaClient } from '@prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { getSession } from './session'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL!
  const url = new URL(connectionString)
  const adapter = new PrismaMariaDb({
    host: url.hostname,
    port: parseInt(url.port || '3306'),
    user: url.username,
    password: url.password,
    database: url.pathname.replace('/', ''),
    connectionLimit: 10,
    acquireTimeout: 30000,
    ssl: {
      rejectUnauthorized: false,
    },
  })
  return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}