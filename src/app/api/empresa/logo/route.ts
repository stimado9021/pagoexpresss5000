import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { isValidLogoType, toLogoDataUrl, MAX_LOGO_BYTES } from '@/lib/logo'

export async function POST(request: Request) {
  const session = await getSession()
  if (!session || session.rol !== 'empresario' || !session.tenantId) {
    return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 })
  }

  try {
    const form = await request.formData()
    const action = form.get('action')

    if (action === 'remove') {
      const config = await prisma.configuracionTenant.findUnique({ where: { tenantId: session.tenantId } })
      if (config) {
        await prisma.configuracionTenant.update({
          where: { id: config.id },
          data: { logoUrl: null },
        })
      }
      return NextResponse.json({ success: true, message: 'Logo eliminado', logoUrl: null })
    }

    const file = form.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, message: 'Selecciona un archivo de imagen' }, { status: 400 })
    }
    if (!isValidLogoType(file.type)) {
      return NextResponse.json({ success: false, message: 'Formato no permitido (usa PNG, JPG o WebP)' }, { status: 400 })
    }
    if (file.size > MAX_LOGO_BYTES) {
      return NextResponse.json({ success: false, message: 'La imagen supera los 200 KB' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const dataUrl = toLogoDataUrl(file.type, buffer)
    if (!dataUrl) {
      return NextResponse.json({ success: false, message: 'No se pudo procesar la imagen' }, { status: 400 })
    }

    const config = await prisma.configuracionTenant.upsert({
      where: { tenantId: session.tenantId },
      update: { logoUrl: dataUrl },
      create: { tenantId: session.tenantId, logoUrl: dataUrl },
    })

    return NextResponse.json({ success: true, message: 'Logo guardado', logoUrl: config.logoUrl })
  } catch (error) {
    console.error('[EMPRESA LOGO ERROR]', error)
    return NextResponse.json({ success: false, message: 'Error del servidor' }, { status: 500 })
  }
}
