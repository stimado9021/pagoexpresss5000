import { prisma } from '@/lib/prisma'
import { sendWhatsAppText, formatRecordatorio } from '@/lib/evolution-api'
import { calcularDiasAtrasados } from '@/lib/prestamo-utils'
import type { ApiSession } from '@/lib/api-helpers'
import type { Resultado } from './types'

type DbClient = typeof prisma

const alcance: Record<
  string,
  (session: ApiSession) => { estado: 'activo'; tenantId?: number; vendedorId?: number }
> = {
  superadmin: () => ({ estado: 'activo' }),
  empresario: (s) => ({ estado: 'activo', tenantId: s.tenantId ?? undefined }),
  vendedor: (s) => ({ estado: 'activo', vendedorId: s.userId }),
}

export async function enviarRecordatorios(
  session: ApiSession,
  db: DbClient = prisma
): Promise<Resultado<unknown[]>> {
  const builder = alcance[session.rol]
  if (!builder) {
    return { ok: false, status: 403, message: 'Rol no autorizado' }
  }

  const prestamos = await db.prestamo.findMany({
    where: builder(session),
    include: {
      cliente: { select: { id: true, nombre: true, apellido: true, telefono: true } },
    },
  })

  const results: { cliente: string; telefono: string | null; enviado: boolean; motivo: string }[] = []

  for (const p of prestamos) {
    if (!p.cliente.telefono) continue

    const diasAtraso = calcularDiasAtrasados(p)
    const saldo = Number(p.saldoPendiente)
    const cuota = Number(p.cuotaDiaria)

    let motivo = ''
    if (diasAtraso >= 3) {
      motivo = `atraso de ${diasAtraso} días`
    } else if (diasAtraso === 1) {
      motivo = 'cuota recién vencida'
    } else if (diasAtraso === 0 && p.diasPagados === 0 && Number(p.montoPagado) === 0) {
      motivo = 'primer pago pendiente'
    }
    if (!motivo) continue

    const mensaje = formatRecordatorio({
      cliente: `${p.cliente.nombre} ${p.cliente.apellido}`,
      diasAtraso,
      cuotaDiaria: cuota,
      saldoPendiente: saldo,
    })

    const enviado = await sendWhatsAppText(p.cliente.telefono, mensaje)
    results.push({
      cliente: `${p.cliente.nombre} ${p.cliente.apellido}`,
      telefono: p.cliente.telefono,
      enviado,
      motivo,
    })
  }

  const enviados = results.filter((r) => r.enviado).length
  return {
    ok: true,
    message: `Recordatorios enviados a ${enviados} de ${results.length} clientes`,
    data: results,
  }
}
