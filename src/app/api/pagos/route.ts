import { NextResponse } from 'next/server'
import { requireRole, requireSession, isErrorResponse, apiResponse, ROLES } from '@/lib/api-helpers'
import { registrarPago, editarPago, eliminarPago, listarPagos } from '@/lib/services/pago-service'

async function checkTenantActivo(tenantId?: number): Promise<NextResponse | null> {
  if (!tenantId) return null
  const { checkTenantActive } = await import('@/lib/tenant')
  const active = await checkTenantActive(tenantId)
  if (!active.ok) {
    return NextResponse.json({ success: false, message: active.message }, { status: 403 })
  }
  return null
}

export async function POST(request: Request) {
  try {
    const session = await requireRole(ROLES.SUPERADMIN, ROLES.EMPRESARIO, ROLES.VENDEDOR)
    if (isErrorResponse(session)) return session

    const tenantError = await checkTenantActivo(session.tenantId)
    if (tenantError) return tenantError

    const data = await request.json()
    if (!data || typeof data !== 'object') {
      return NextResponse.json({ success: false, message: 'Datos inválidos' }, { status: 400 })
    }
    const prestamoId = parseInt(data.prestamo_id)
    const monto = Number(data.monto)
    if (!prestamoId || isNaN(prestamoId)) {
      return NextResponse.json({ success: false, message: 'prestamo_id es requerido' }, { status: 400 })
    }
    if (!monto || isNaN(monto) || monto <= 0) {
      return NextResponse.json({ success: false, message: 'monto debe ser un número positivo' }, { status: 400 })
    }
    return apiResponse(
      await registrarPago({
        prestamoId,
        monto,
        vendedorId: session.userId,
        tenantId: session.tenantId,
        observaciones: data.observaciones ?? null,
        enviarWhatsApp: data.enviarWhatsApp !== false,
        fechaCubierta: data.fechaCubierta ?? undefined,
      })
    )
  } catch (error) {
    console.error('[PAGOS POST ERROR]', error)
    return NextResponse.json({ success: false, message: 'Error al registrar pago' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const session = await requireRole(ROLES.SUPERADMIN, ROLES.EMPRESARIO, ROLES.VENDEDOR)
  if (isErrorResponse(session)) return session

  try {
    const data = await request.json()
    const motivo = (data.motivo || '').trim()
    if (!motivo) {
      return NextResponse.json({ success: false, message: 'El motivo es obligatorio' }, { status: 400 })
    }

    return apiResponse(
      await editarPago({
        pagoId: parseInt(data.pago_id),
        usuarioId: session.userId,
        rol: session.rol,
        tenantId: session.tenantId,
        monto: data.monto !== undefined ? Number(data.monto) : undefined,
        fechaPago: data.fechaPago ? new Date(data.fechaPago) : undefined,
        motivo,
      })
    )
  } catch (error) {
    console.error('[PAGOS PUT ERROR]', error)
    return NextResponse.json({ success: false, message: 'Error al editar pago' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const session = await requireRole(ROLES.SUPERADMIN, ROLES.EMPRESARIO, ROLES.VENDEDOR)
  if (isErrorResponse(session)) return session

  try {
    const data = await request.json()
    const motivo = (data.motivo || '').trim()
    if (!motivo) {
      return NextResponse.json({ success: false, message: 'El motivo es obligatorio' }, { status: 400 })
    }

    return apiResponse(
      await eliminarPago({
        pagoId: parseInt(data.pago_id),
        usuarioId: session.userId,
        rol: session.rol,
        tenantId: session.tenantId,
        motivo,
      })
    )
  } catch (error) {
    console.error('[PAGOS DELETE ERROR]', error)
    return NextResponse.json({ success: false, message: 'Error al eliminar pago' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  const session = await requireSession()
  if (isErrorResponse(session)) return session

  const { searchParams } = new URL(request.url)
  const prestamoId = searchParams.get('prestamo_id')
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50'), 1), 200)

  try {
    const response = apiResponse(
      await listarPagos({
        rol: session.rol,
        userId: session.userId,
        tenantId: session.tenantId,
        prestamoId: prestamoId ? parseInt(prestamoId) : undefined,
        limit,
      })
    )
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    return response
  } catch (error) {
    console.error('[PAGOS GET ERROR]', error)
    return NextResponse.json({ success: false, message: 'Error del servidor' }, { status: 500 })
  }
}
