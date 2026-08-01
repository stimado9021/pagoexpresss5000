import 'dotenv/config'
import { URL } from 'url'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { PrismaClient } from '@prisma/client'

const u = new URL(process.env.DATABASE_URL)
const adapter = new PrismaMariaDb({
  host: u.hostname,
  port: parseInt(u.port || '3306'),
  user: u.username,
  password: u.password,
  database: u.pathname.replace('/', ''),
  connectionLimit: 5,
  acquireTimeout: 30000,
  ssl: { rejectUnauthorized: false },
})
const p = new PrismaClient({ adapter })

try {
  const tenants = await p.tenant.findMany({
    where: { slug: { not: 'platform' } },
    orderBy: { createdAt: 'desc' },
    include: {
      usuarios: { where: { rol: 'empresario' }, select: { id: true, nombre: true, apellido: true, email: true, cedula: true, rol: true } },
    },
  })
  for (const t of tenants) {
    console.log(`TENANT id=${t.id} slug=${t.slug} nombre=${t.nombre} createdAt=${t.createdAt.toISOString()}`)
    for (const u2 of t.usuarios) {
      console.log(`   USUARIO id=${u2.id} nombre=${u2.nombre} ${u2.apellido} email=${u2.email} cedula=${u2.cedula} rol=${u2.rol}`)
    }
  }
} catch (e) {
  console.error('ERROR:', e.message)
} finally {
  await p.$disconnect()
}
