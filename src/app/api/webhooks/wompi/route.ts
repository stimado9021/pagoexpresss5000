import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyEventSignature, parseReference, isWompiConfigured } from '@/lib/wompi'

function daysForInterval(intervalo: string): number {
  return intervalo === 'ANUAL' ? 365 : 30
}

type Transaction = {
  id?: string
  reference?: string
  status?: string
  amount_in_cents?: number
  currency?: string
  customer_email?: string
}

export async function POST(request: NextRequest) {
  const raw = await request.text()

  let event: {
    event?: string
    data?: { transaction?: Transaction }
    signature?: { properties?: string[]; checksum?: string }
    timestamp?: number
  }
  try {
    event = JSON.parse(raw)
  } catch {
    return NextResponse.json({ success: false, message: 'JSON inválido' }, { status: 400 })
  }

  if (isWompiConfigured() && !verifyEventSignature(event)) {
    return NextResponse.json({ success: false, message: 'Firma inválida' }, { status: 401 })
  }

  try {
    if (event.event === 'transaction.updated') {
      const txn = event.data?.transaction
      if (txn?.status === 'APPROVED' && txn.reference) {
        const parsed = parseReference(txn.reference)
        if (parsed) {
          await procesarPagoAprobado(txn, parsed.tenantId, parsed.planId, parsed.intervalo)
        }
      }
    }

    return NextResponse.json({ success: true, received: true })
  } catch (error) {
    console.error('[WOMPI WEBHOOK ERROR]', error)
    return NextResponse.json({ success: false, message: 'Error procesando el webhook' }, { status: 500 })
  }
}

async function procesarPagoAprobado(
  txn: Transaction,
  tenantId: number,
  planId: number,
  intervalo: 'MONTHLY' | 'ANUAL'
) {
  const suscripcion = await prisma.suscripcion.findUnique({
    where: { tenantId },
    include: { tenant: true },
  })

  if (suscripcion?.wompiCustomerId === txn.id) return

  const now = new Date()
  const base = suscripcion?.pagadoHasta && suscripcion.pagadoHasta > now ? suscripcion.pagadoHasta : now
  const pagadoHasta = new Date(base.getTime() + daysForInterval(intervalo) * 24 * 60 * 60 * 1000)
  const nuevoCiclo = (suscripcion?.cicloActual ?? 0) + 1

  const empresario = await prisma.usuario.findFirst({
    where: { tenantId, rol: 'empresario' },
  })

  await prisma.$transaction(async (tx) => {
    await tx.suscripcion.upsert({
      where: { tenantId },
      update: {
        planId,
        intervalo,
        wompiCustomerId: txn.id,
        estado: 'ACTIVE',
        cicloActual: nuevoCiclo,
        renovacionProxima: pagadoHasta,
        pagadoHasta,
      },
      create: {
        tenantId,
        planId,
        intervalo,
        wompiCustomerId: txn.id,
        estado: 'ACTIVE',
        cicloActual: 1,
        renovacionProxima: pagadoHasta,
        pagadoHasta,
      },
    })

    await tx.tenant.update({
      where: { id: tenantId },
      data: {
        planId,
        status: 'ACTIVE',
        planStartsAt: suscripcion?.tenant.planStartsAt ?? now,
        planExpiresAt: pagadoHasta,
      },
    })

    if (empresario) {
      await tx.historial.create({
        data: {
          usuarioId: empresario.id,
          tenantId,
          accion: 'CHECKOUT_COMPLETED',
          tablaAfectada: 'suscripciones',
          detalles: JSON.stringify({
            proveedor: 'wompi',
            transactionId: txn.id,
            amount: txn.amount_in_cents ?? null,
            currency: txn.currency ?? null,
            reference: txn.reference,
            intervalo,
          }),
        },
      })
    }
  })
}
