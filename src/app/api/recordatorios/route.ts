import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { sendWhatsAppText, formatRecordatorio } from '@/lib/evolution-api'
import { calcularDiasAtrasados } from '@/lib/prestamo-utils'

export async function POST() {
  const session = await getSession()
  if (!session || session.rol !== 'superadmin') {
    return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 })
  }

  try {
    const prestamos = await prisma.prestamo.findMany({
      where: { estado: 'activo' },
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

    const enviados = results.filter(r => r.enviado).length
    return NextResponse.json({
      success: true,
      message: `Recordatorios enviados a ${enviados} de ${results.length} clientes`,
      data: results,
    })
  } catch (error) {
    console.error('[RECORDATORIOS ERROR]', error)
    return NextResponse.json({ success: false, message: 'Error del servidor' }, { status: 500 })
  }
}
