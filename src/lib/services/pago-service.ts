import { prisma } from '@/lib/prisma'
import { roundMoney, esMontoValido, nuevoSaldo, nuevoMontoPagado, montoRestanteAlEliminar } from '@/lib/money'
import { sendWhatsAppText, formatReceipt } from '@/lib/evolution-api'
import {
  agregarDias,
  atrasoDesdeCobertura,
  claveFecha,
  fechasCubiertas,
  iniciarDia,
  primeraFechaSinCubrir,
} from '@/lib/prestamo-utils'

import type { Resultado } from './types'

export type { Resultado }

type DbClient = typeof prisma

export type RegistrarPagoInput = {
  prestamoId: number
  monto: number
  vendedorId: number
  tenantId?: number
  observaciones?: string | null
  enviarWhatsApp?: boolean
  fechaCubierta?: string
}

export async function registrarPago(
  input: RegistrarPagoInput,
  db: DbClient = prisma
): Promise<Resultado<{ id: number }>> {
  const { prestamoId, monto, vendedorId, tenantId, observaciones, enviarWhatsApp = true, fechaCubierta } = input

  if (!prestamoId || !esMontoValido(monto)) {
    return { ok: false, status: 400, message: 'Datos inválidos: monto debe ser mayor a 0' }
  }

  const prestamo = await db.prestamo.findFirst({
    where: { id: prestamoId, ...(tenantId ? { tenantId } : {}) },
    include: {
      cliente: { select: { nombre: true, apellido: true, telefono: true } },
      pagos: { select: { fechaPago: true, diasCubiertos: true } },
    },
  })
  if (!prestamo) {
    return { ok: false, status: 404, message: 'Préstamo no encontrado' }
  }

  const saldoAnterior = Number(prestamo.saldoPendiente)
  const total = Number(prestamo.montoTotal)
  const saldoFinal = nuevoSaldo(saldoAnterior, monto)
  const pagadoFinal = nuevoMontoPagado(Number(prestamo.montoPagado), monto, total)
  const estado = saldoFinal <= 0 ? 'pagado' : 'activo'

  const cuotaDiaria = Number(prestamo.cuotaDiaria)
  const diasCubiertos = Math.max(1, Math.ceil(monto / cuotaDiaria))
  const hoy = iniciarDia(new Date())
  const cubiertas = fechasCubiertas(prestamo.pagos)
  const atrasoActual = atrasoDesdeCobertura(prestamo.fechaInicio, cubiertas, hoy)

  let inicioCobertura: Date
  if (fechaCubierta) {
    inicioCobertura = iniciarDia(fechaCubierta)
  } else if (atrasoActual > 0) {
    inicioCobertura = primeraFechaSinCubrir(prestamo.fechaInicio, cubiertas, hoy)
  } else {
    inicioCobertura = hoy
  }

  const fechasCubiertasNuevas: string[] = []
  for (let i = 0; i < diasCubiertos; i++) {
    fechasCubiertasNuevas.push(claveFecha(agregarDias(inicioCobertura, i)))
  }
  const cubiertasTotales = new Set(cubiertas)
  for (const k of fechasCubiertasNuevas) cubiertasTotales.add(k)
  const nuevosDiasAtrasados = atrasoDesdeCobertura(prestamo.fechaInicio, cubiertasTotales, hoy)

  const fechaCubiertaInicio = new Date(`${fechasCubiertasNuevas[0]}T00:00:00`)
  const ultimaFechaCubierta = new Date(`${fechasCubiertasNuevas[fechasCubiertasNuevas.length - 1]}T00:00:00`)

  const [pago] = await db.$transaction(async (tx) => {
    const pago = await tx.pago.create({
      data: {
        prestamoId,
        vendedorId,
        tenantId: tenantId ?? prestamo.tenantId,
        fechaPago: fechaCubiertaInicio,
        fechaEsperada: fechaCubiertaInicio,
        monto,
        diasCubiertos,
        esPagoAtrasado: fechasCubiertasNuevas[0] < claveFecha(hoy) ? 1 : 0,
        diasAtraso: atrasoActual,
        observaciones: observaciones ?? null,
      },
    })
    await tx.prestamo.update({
      where: { id: prestamoId },
      data: {
        montoPagado: pagadoFinal,
        saldoPendiente: saldoFinal,
        diasPagados: { increment: diasCubiertos },
        fechaUltimoPago: ultimaFechaCubierta,
        estado,
        diasAtrasados: nuevosDiasAtrasados,
      },
    })
    return [pago]
  })

  if (enviarWhatsApp && prestamo.cliente.telefono) {
    const receipt = formatReceipt({
      cliente: `${prestamo.cliente.nombre} ${prestamo.cliente.apellido}`,
      monto,
      fecha: new Date(),
      cuotaDiaria: Number(prestamo.cuotaDiaria),
      saldoPendiente: saldoFinal,
    })
    sendWhatsAppText(prestamo.cliente.telefono, receipt).catch(() => {})
  }

  return { ok: true, message: 'Pago registrado', data: { id: pago.id } }
}

export type EditarPagoInput = {
  pagoId: number
  usuarioId: number
  rol: string
  tenantId?: number
  monto?: number
  fechaPago?: Date
  motivo: string
}

export async function editarPago(
  input: EditarPagoInput,
  db: DbClient = prisma
): Promise<Resultado<void>> {
  const { pagoId, usuarioId, rol, tenantId, monto, fechaPago, motivo } = input

  const pagoOrig = await db.pago.findFirst({
    where: { id: pagoId, ...(tenantId ? { tenantId } : {}) },
    include: { prestamo: true },
  })
  if (!pagoOrig) {
    return { ok: false, status: 404, message: 'Pago no encontrado' }
  }
  if (rol === 'vendedor' && pagoOrig.vendedorId !== usuarioId) {
    return { ok: false, status: 403, message: 'No puedes editar pagos de otro vendedor' }
  }

  const prestamo = pagoOrig.prestamo
  const montoOrig = Number(pagoOrig.monto)
  const montoNuevo = monto !== undefined ? monto : montoOrig
  if (!esMontoValido(montoNuevo)) {
    return { ok: false, status: 400, message: 'Monto inválido' }
  }
  const fechaNueva = fechaPago ?? pagoOrig.fechaPago
  const diferencia = roundMoney(montoNuevo - montoOrig)

  const total = Number(prestamo.montoTotal)
  const nuevoMontoPagado = Math.min(Math.max(0, roundMoney(Number(prestamo.montoPagado) + diferencia)), total)
  const nuevoSaldoFinal = nuevoSaldo(Number(prestamo.saldoPendiente), -diferencia)
  const nuevosDiasPagados = Math.max(0, Math.floor(nuevoMontoPagado / Number(prestamo.cuotaDiaria)))

  await db.$transaction(async (tx) => {
    await tx.pago.update({
      where: { id: pagoId },
      data: {
        monto: montoNuevo,
        fechaPago: fechaNueva,
        diasCubiertos: Math.ceil(montoNuevo / Number(prestamo.cuotaDiaria)),
        observaciones: `${pagoOrig.observaciones || ''} | Editado: ${motivo}`.trim().replace(/^\| /, ''),
      },
    })
    await tx.prestamo.update({
      where: { id: prestamo.id },
      data: {
        montoPagado: nuevoMontoPagado,
        saldoPendiente: nuevoSaldoFinal,
        diasPagados: nuevosDiasPagados,
        estado: nuevoSaldoFinal <= 0 ? 'pagado' : 'activo',
      },
    })
    await tx.historial.create({
      data: {
        usuarioId,
        tenantId: tenantId ?? pagoOrig.tenantId,
        accion: 'editar_pago',
        tablaAfectada: 'pagos',
        registroId: pagoId,
        detalles: JSON.stringify({
          anterior: { monto: montoOrig, fecha: pagoOrig.fechaPago.toISOString() },
          nuevo: { monto: montoNuevo, fecha: fechaNueva.toISOString() },
          motivo,
        }),
      },
    })
  })

  return { ok: true, message: 'Pago actualizado' }
}

export type EliminarPagoInput = {
  pagoId: number
  usuarioId: number
  rol: string
  tenantId?: number
  motivo: string
}

export async function eliminarPago(
  input: EliminarPagoInput,
  db: DbClient = prisma
): Promise<Resultado<void>> {
  const { pagoId, usuarioId, rol, tenantId, motivo } = input

  const pagoOrig = await db.pago.findFirst({
    where: { id: pagoId, ...(tenantId ? { tenantId } : {}) },
    include: { prestamo: true },
  })
  if (!pagoOrig) {
    return { ok: false, status: 404, message: 'Pago no encontrado' }
  }
  if (rol === 'vendedor' && pagoOrig.vendedorId !== usuarioId) {
    return { ok: false, status: 403, message: 'No puedes eliminar pagos de otro vendedor' }
  }

  const prestamo = pagoOrig.prestamo
  const montoEliminado = Number(pagoOrig.monto)
  const nuevoMontoPagado = montoRestanteAlEliminar(Number(prestamo.montoPagado), montoEliminado)
  const nuevoSaldoFinal = roundMoney(Number(prestamo.saldoPendiente) + montoEliminado)
  const nuevosDiasPagados = Math.max(0, Math.floor(nuevoMontoPagado / Number(prestamo.cuotaDiaria)))

  await db.$transaction(async (tx) => {
    await tx.pago.delete({ where: { id: pagoId } })
    await tx.prestamo.update({
      where: { id: prestamo.id },
      data: {
        montoPagado: nuevoMontoPagado,
        saldoPendiente: nuevoSaldoFinal,
        diasPagados: nuevosDiasPagados,
        estado: 'activo',
      },
    })
    await tx.historial.create({
      data: {
        usuarioId,
        tenantId: tenantId ?? pagoOrig.tenantId,
        accion: 'eliminar_pago',
        tablaAfectada: 'pagos',
        registroId: pagoId,
        detalles: JSON.stringify({
          anterior: { monto: montoEliminado, fecha: pagoOrig.fechaPago.toISOString() },
          motivo,
        }),
      },
    })
  })

  return { ok: true, message: 'Pago eliminado' }
}

export type ListarPagosInput = {
  rol: string
  userId: number
  tenantId?: number
  prestamoId?: number
  limit: number
}

export async function listarPagos(
  input: ListarPagosInput,
  db: DbClient = prisma
): Promise<Resultado<unknown>> {
  const { rol, userId, tenantId, prestamoId, limit } = input

  const where: { prestamoId?: number | { in: number[] }; vendedorId?: number; tenantId?: number } = {}
  if (prestamoId) where.prestamoId = prestamoId
  if (rol === 'empresario' && tenantId) where.tenantId = tenantId
  if (rol === 'vendedor') where.vendedorId = userId
  if (rol === 'cliente') {
    const prestamos = await db.prestamo.findMany({ where: { clienteId: userId }, select: { id: true } })
    where.prestamoId = { in: prestamos.map((p) => p.id) }
  }

  const pagos = await db.pago.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      prestamo: {
        select: {
          clienteId: true,
          montoTotal: true,
          cliente: { select: { nombre: true, apellido: true, cedula: true } },
        },
      },
      vendedor: { select: { nombre: true, apellido: true } },
    },
  })

  return { ok: true, data: pagos }
}
