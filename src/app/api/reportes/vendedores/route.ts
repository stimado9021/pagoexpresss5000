import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

export async function GET() {
  const session = await getSession()
  if (!session || session.rol !== 'superadmin') {
    return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 })
  }

  try {
    const vendedores = await prisma.usuario.findMany({
      where: { rol: 'vendedor', activo: 1 },
      select: {
        id: true, cedula: true, nombre: true, apellido: true, telefono: true, email: true,
        _count: { select: { clientes: true } },
        prestamosCreados: { select: { montoSolicitado: true, montoPagado: true, estado: true } },
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
      page.drawText('PagoExpress', { x: margin, y, size: 18, font: helveticaBold, color: rgb(0.2, 0.2, 0.4) })
      y -= 16
      page.drawText('Reporte de Vendedores', { x: margin, y, size: 10, font: helvetica, color: rgb(0.4, 0.4, 0.4) })
      y -= 12
      const now = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      page.drawText(`Generado: ${now}`, { x: margin, y, size: 8, font: helvetica, color: rgb(0.6, 0.6, 0.6) })
      y -= 18
    }

    drawHeader()

    const drawTableHeader = () => {
      page.drawRectangle({ x: margin, y: y - 16, width: width - 2 * margin, height: 16, color: rgb(0.93, 0.94, 1) })
      const cols = [0, 90, 190, 290, 390]
      const titles = ['Vendedor', 'Cédula', 'Contacto', 'Clientes', 'Total Prestado']
      titles.forEach((t, i) => {
        page.drawText(t, { x: margin + cols[i], y: y - 12, size: 8, font: helveticaBold, color: rgb(0.36, 0.37, 0.94) })
      })
      y -= 18
    }

    drawTableHeader()

    for (let i = 0; i < vendedores.length; i++) {
      if (y < 80) {
        const newPage = doc.addPage([595.28, 841.89])
        y = height - margin
        drawHeader()
        drawTableHeader()
      }

      const v = vendedores[i]
      if (i % 2 === 0) {
        page.drawRectangle({ x: margin, y: y - 12, width: width - 2 * margin, height: 14, color: rgb(0.97, 0.97, 0.98) })
      }

      const totalPrestado = v.prestamosCreados.reduce((s, p) => s + Number(p.montoSolicitado), 0)
      const contacto = v.telefono || v.email || '-'

      const cols = [0, 90, 190, 290, 390]
      const vals = [
        `${v.nombre} ${v.apellido}`,
        v.cedula,
        contacto,
        String(v._count.clientes),
        `$${totalPrestado.toLocaleString('es-CO')}`,
      ]
      vals.forEach((val, ci) => {
        page.drawText(val, { x: margin + cols[ci], y: y - 9, size: 8, font: helvetica, color: rgb(0, 0, 0) })
      })
      y -= 14
    }

    const pdf = Buffer.from(await doc.save())
    return new NextResponse(pdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="reporte-vendedores-${Date.now()}.pdf"`,
      },
    })
  } catch (error) {
    console.error('[REPORTE VENDEDORES ERROR]', error)
    return NextResponse.json({ success: false, message: 'Error al generar reporte' }, { status: 500 })
  }
}
