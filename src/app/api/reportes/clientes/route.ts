import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { calcularDiasAtrasados } from '@/lib/prestamo-utils'

export async function GET() {
  const session = await getSession()
  if (!session || session.rol !== 'superadmin') {
    return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 })
  }

  try {
    const vendedores = await prisma.usuario.findMany({
      where: { rol: 'vendedor', activo: 1 },
      select: {
        id: true, cedula: true, nombre: true, apellido: true,
        clientes: {
          select: {
            id: true, cedula: true, nombre: true, apellido: true, telefono: true,
            prestamosCliente: {
              select: {
                estado: true, saldoPendiente: true, montoSolicitado: true,
                diasAtrasados: true, fechaInicio: true, fechaUltimoPago: true,
              },
            },
          },
          orderBy: { nombre: 'asc' },
        },
      },
      orderBy: { nombre: 'asc' },
    })

    const doc = await PDFDocument.create()
    const helvetica = await doc.embedFont(StandardFonts.Helvetica)
    const helveticaBold = await doc.embedFont(StandardFonts.HelveticaBold)
    const page = doc.addPage([595.28, 841.89])
    const { width, height } = page.getSize()
    const margin = 40
    let y = height - margin

    const drawHeader = () => {
      y -= 10
      page.drawText('Kredipay', { x: margin, y, size: 18, font: helveticaBold, color: rgb(0.2, 0.2, 0.4) })
      y -= 16
      page.drawText('Reporte de Clientes por Vendedor', { x: margin, y, size: 10, font: helvetica, color: rgb(0.4, 0.4, 0.4) })
      y -= 12
      const now = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      page.drawText(`Generado: ${now}`, { x: margin, y, size: 8, font: helvetica, color: rgb(0.6, 0.6, 0.6) })
      y -= 18
    }

    drawHeader()

    for (const v of vendedores) {
      if (y < 120) {
        doc.addPage([595.28, 841.89])
        y = height - margin
        drawHeader()
      }

      page.drawRectangle({ x: margin, y: y - 16, width: width - 2 * margin, height: 18, color: rgb(0.93, 0.94, 1) })
      page.drawText(`${v.nombre} ${v.apellido}`, { x: margin + 4, y: y - 12, size: 9, font: helveticaBold, color: rgb(0.36, 0.37, 0.94) })
      page.drawText(`Cédula: ${v.cedula}`, { x: 350, y: y - 12, size: 8, font: helvetica, color: rgb(0.36, 0.37, 0.94) })
      y -= 20

      if (v.clientes.length === 0) {
        page.drawText('Sin clientes asignados', { x: margin + 4, y: y - 8, size: 8, font: helvetica, color: rgb(0.6, 0.6, 0.6) })
        y -= 14
      } else {
        const colX = [0, 110, 210, 310, 390]
        const headers = ['Cliente', 'Cédula', 'Contacto', 'Saldo Pendiente', 'Estado']
        page.drawRectangle({ x: margin, y: y - 12, width: width - 2 * margin, height: 14, color: rgb(0.97, 0.97, 0.98) })
        headers.forEach((h, i) => {
          page.drawText(h, { x: margin + colX[i] + 4, y: y - 9, size: 7, font: helveticaBold, color: rgb(0.4, 0.4, 0.4) })
        })
        y -= 14

        for (const c of v.clientes) {
          if (y < 60) {
            doc.addPage([595.28, 841.89])
            y = height - margin
            drawHeader()
          }

          const activos = c.prestamosCliente.filter(p => p.estado === 'activo')
          const saldo = activos.reduce((s, p) => s + Number(p.saldoPendiente), 0)
          const maxAtraso = Math.max(0, ...activos.map(p => calcularDiasAtrasados(p)))

          page.drawText(`${c.nombre} ${c.apellido}`, { x: margin + colX[0] + 4, y: y - 8, size: 8, font: helvetica, color: rgb(0, 0, 0) })
          page.drawText(c.cedula, { x: margin + colX[1] + 4, y: y - 8, size: 8, font: helvetica, color: rgb(0, 0, 0) })
          page.drawText(c.telefono || '-', { x: margin + colX[2] + 4, y: y - 8, size: 8, font: helvetica, color: rgb(0, 0, 0) })
          page.drawText(saldo > 0 ? `$${saldo.toLocaleString('es-CO')}` : '$0', { x: margin + colX[3] + 4, y: y - 8, size: 8, font: helvetica, color: rgb(0, 0, 0) })
          page.drawText(maxAtraso > 0 ? `${maxAtraso}d atraso` : 'Al día', { x: margin + colX[4] + 4, y: y - 8, size: 8, font: helvetica, color: maxAtraso > 0 ? rgb(0.94, 0.27, 0.27) : rgb(0.06, 0.73, 0.51) })

          y -= 12
        }
      }

      y -= 8
    }

    const pdf = Buffer.from(await doc.save())
    return new NextResponse(pdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="reporte-clientes-${Date.now()}.pdf"`,
      },
    })
  } catch (error) {
    console.error('[REPORTE CLIENTES ERROR]', error)
    return NextResponse.json({ success: false, message: 'Error al generar reporte' }, { status: 500 })
  }
}
