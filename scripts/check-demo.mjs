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
    where: { slug: { in: ['credito-rapido-sureste-vtsi', 'credito-rapido-sureste-bwal', 'prestamos-el-porvenir-jl2o'] } },
    orderBy: { id: 'asc' },
    include: { _count: { select: { usuarios: true, prestamos: true, pagos: true } } },
  })
  for (const t of tenants) {
    const byRol = await p.usuario.groupBy({
      by: ['rol'],
      where: { tenantId: t.id },
      _count: true,
    })
    const resumen = byRol.map((r) => `${r.rol}:${r._count}`).join(' ')
    console.log(`TENANT id=${t.id} slug=${t.slug}`)
    console.log(`   usuarios=${t._count.usuarios} prestamos=${t._count.prestamos} pagos=${t._count.pagos} | ${resumen}`)
  }
} catch (e) {
  console.error('ERROR:', e.message)
} finally {
  await p.$disconnect()
}
