import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

const recent = await prisma.pago.findMany({
  take: 10,
  orderBy: { fechaPago: 'desc' },
  include: { prestamo: { include: { cliente: { select: { nombre: true, apellido: true } } } } }
})

console.log('=== PAGOS RECIENTES ===')
const now = new Date()
console.log('Hora servidor (local):', now.toString())
console.log('Hora servidor (ISO):', now.toISOString())
console.log('')

for (const p of recent) {
  const fp = new Date(p.fechaPago)
  const diffHours = (now.getTime() - fp.getTime()) / (1000 * 60 * 60)
  const todayStr = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0')
  const pagoStr = fp.getFullYear() + '-' + String(fp.getMonth()+1).padStart(2,'0') + '-' + String(fp.getDate()).padStart(2,'0')
  const esHoy = todayStr === pagoStr

  console.log('Pago #' + p.id + ' | monto: $' + p.monto + ' | fechaPago (DB raw): ' + p.fechaPago)
  console.log('  fechaPago (Date obj): ' + fp.toString())
  console.log('  fechaPago (ISO): ' + fp.toISOString())
  console.log('  hace: ' + diffHours.toFixed(1) + ' horas')
  console.log('  hoyStr: ' + todayStr + ' | pagoStr: ' + pagoStr + ' | esHoy: ' + esHoy)
  console.log('  cliente: ' + p.prestamo.cliente.nombre + ' ' + p.prestamo.cliente.apellido)
  console.log('')
}

await prisma.$disconnect()
