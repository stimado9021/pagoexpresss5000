import { prisma } from '@/lib/prisma'
import type { ApiSession } from '@/lib/api-helpers'
import type { Resultado } from './types'

type DbClient = typeof prisma

export async function listarHistorial(
  session: ApiSession,
  options: { tabla?: string; limit?: number; offset?: number } = {},
  db: DbClient = prisma
): Promise<Resultado<unknown>> {
  const tabla = options.tabla || 'pagos'
  const limit = Math.min(Math.max(options.limit ?? 100, 1), 500)
  const offset = Math.max(options.offset ?? 0, 0)

  const where: { accion: { in: string[] }; tablaAfectada?: string; tenantId?: number } = {
    accion: { in: ['editar_pago', 'eliminar_pago'] },
  }
  if (tabla) where.tablaAfectada = tabla
  if (session.rol === 'empresario') where.tenantId = session.tenantId ?? undefined

  const [total, registros] = await Promise.all([
    db.historial.count({ where }),
    db.historial.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        usuario: { select: { nombre: true, apellido: true, cedula: true, rol: true } },
      },
    }),
  ])

  return { ok: true, data: registros, total }
}

export async function purgarHistorial(days = 90, db: DbClient = prisma) {
  const cutoff = new Date(Date.now() - days * 86_400_000)
  const res = await db.historial.deleteMany({ where: { createdAt: { lt: cutoff } } })
  return res.count
}
