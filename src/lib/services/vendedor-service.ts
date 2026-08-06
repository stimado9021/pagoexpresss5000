import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'
import { generarPasswordAleatoria } from '@/lib/password'
import { sendCredenciales } from '@/lib/mail'
import type { ApiSession } from '@/lib/api-helpers'
import type { Resultado } from './types'

type DbClient = typeof prisma

export async function crearVendedor(
  session: ApiSession,
  data: Record<string, unknown>,
  db: DbClient = prisma
): Promise<Resultado<{ id: number }>> {
  if (session.rol === 'empresario') {
    const { checkTenantActive } = await import('@/lib/tenant')
    const active = await checkTenantActive(session.tenantId!)
    if (!active.ok) {
      return { ok: false, status: 403, message: active.message ?? 'Tenant inactivo' }
    }
    const limitCheck = await checkVendedorLimit(session.tenantId!, db)
    if (!limitCheck.ok) {
      return { ok: false, status: 403, message: limitCheck.message ?? 'Límite alcanzado' }
    }
  }

  const nombre = typeof data.nombre === 'string' ? data.nombre.trim() : ''
  const cedula = typeof data.cedula === 'string' ? data.cedula.trim() : ''
  if (!nombre || !cedula) {
    return { ok: false, status: 400, message: 'Nombre y cédula requeridos' }
  }

  const existing = await db.usuario.findUnique({ where: { cedula } })
  if (existing) {
    return { ok: false, status: 400, message: 'La cédula ya existe' }
  }

  const password = generarPasswordAleatoria()
  const passHash = await hashPassword(password)
  const vendedor = await db.usuario.create({
    data: {
      cedula,
      nombre,
      apellido: typeof data.apellido === 'string' ? data.apellido : '',
      telefono: typeof data.telefono === 'string' ? data.telefono : null,
      direccion: typeof data.direccion === 'string' ? data.direccion : null,
      email: typeof data.email === 'string' ? data.email : null,
      rol: 'vendedor',
      password: passHash,
      activo: 1,
      tenantId: session.tenantId!,
    },
  })

  if (vendedor.email) {
    await sendCredenciales({
      to: vendedor.email,
      nombre: `${vendedor.nombre} ${vendedor.apellido}`.trim(),
      correo: vendedor.email,
      password,
      rol: 'Vendedor',
    })
  }

  return { ok: true, message: 'Vendedor creado', data: { id: vendedor.id }, status: 201 }
}

export async function listarVendedores(
  session: ApiSession,
  options: { id?: number } = {},
  db: DbClient = prisma
): Promise<Resultado<unknown>> {
  const whereClause: Record<string, unknown> = { rol: 'vendedor' }
  if (session.rol !== 'superadmin') whereClause.tenantId = session.tenantId

  if (options.id) {
    whereClause.id = options.id
    const vendedor = await db.usuario.findFirst({
      where: whereClause,
      select: {
        id: true, cedula: true, nombre: true, apellido: true,
        telefono: true, email: true, direccion: true, activo: true,
        _count: { select: { clientes: true } },
        clientes: {
          select: {
            id: true, cedula: true, nombre: true, apellido: true,
            telefono: true, email: true, direccion: true, activo: true,
            createdAt: true,
            prestamosCliente: { select: { estado: true, montoSolicitado: true, montoPagado: true, saldoPendiente: true } },
          },
        },
      },
    })
    if (!vendedor) {
      return { ok: false, status: 404, message: 'Vendedor no encontrado' }
    }
    return { ok: true, data: vendedor }
  }

  const vendedores = await db.usuario.findMany({
    where: whereClause,
    select: {
      id: true, cedula: true, nombre: true, apellido: true,
      telefono: true, email: true, direccion: true, activo: true,
      _count: { select: { clientes: true } },
    },
    orderBy: { nombre: 'asc' },
  })

  return { ok: true, data: vendedores }
}

async function checkVendedorLimit(tenantId: number, db: DbClient): Promise<{ ok: boolean; message?: string }> {
  const { getTenantLimits } = await import('@/lib/tenant')
  const result = await getTenantLimits(tenantId)
  const limit = result?.limits?.['MAX_VENDEDORES'] ?? 2
  if (limit === -1) return { ok: true }
  const count = await db.usuario.count({
    where: { tenantId, rol: { in: ['vendedor', 'empresario'] } },
  })
  if (count >= limit) {
    return { ok: false, message: `Límite de ${limit} vendedores alcanzado. Actualiza tu plan.` }
  }
  return { ok: true }
}
