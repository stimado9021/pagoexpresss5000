import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { URL } from 'url'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { PrismaClient } from '@prisma/client'

const u = new URL(process.env.DATABASE_URL)
const adapter = new PrismaMariaDb({
  host: u.hostname,
  port: parseInt(u.port || '3306'),
  user: u.username,
  password: u.password,
  database: u.pathname.replace('/', ''),
  connectionLimit: 5,
  acquireTimeout: 30000,
  ssl: { rejectUnauthorized: false },
})
const p = new PrismaClient({ adapter })

const PASSWORD = 'demo1234'
const SLUG = 'prestamos-el-porvenir-jl2o'
const FECHA = new Date(2026, 7, 3, 9, 0, 0)

const NOMBRES = ['Juan', 'María', 'Carlos', 'Ana', 'Luis', 'Luisa', 'Pedro', 'Carmen', 'Diego', 'Sofía', 'Andrés', 'Valentina', 'Jorge', 'Laura', 'Miguel', 'Paula', 'Fernando', 'Camila', 'Ricardo', 'Daniela', 'Óscar', 'Mariana', 'Julián', 'Andrea', 'Hugo', 'Natalia', 'Raúl', 'Diana', 'Iván', 'Gloria']
const APELLIDOS = ['Gómez', 'Rodríguez', 'Martínez', 'López', 'Hernández', 'González', 'Pérez', 'Sánchez', 'Ramírez', 'Torres', 'Flores', 'Rivera', 'Castro', 'Rojas', 'Mendoza', 'Ortiz', 'Vargas', 'Jiménez', 'Ríos', 'Morales', 'Cabrera', 'Silva', 'Núñez', 'Cárdenas', 'Suárez', 'Mejía', 'Quintero', 'Acosta', 'Palacios', 'Beltrán']
const TASAS = [15, 18, 20, 22, 25]
const DIAS_PLAZO = [10, 15, 20, 25, 30, 45]

function rnd(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)] }

let cedula = 5000001000
let idx = 0
function cedulaUnica() {
  idx += 1
  return String(cedula + idx * 7)
}

function prestamoData(tenantId, clienteId, vendedorId) {
  const montoSolicitado = rnd(10, 500) * 10000
  const tasaInteres = pick(TASAS)
  const interesTotal = Math.round((montoSolicitado * tasaInteres) / 100)
  const montoTotal = montoSolicitado + interesTotal
  const diasPlazo = pick(DIAS_PLAZO)
  const cuotaDiaria = Math.ceil(montoTotal / diasPlazo)
  return {
    tenantId, clienteId, vendedorId, montoSolicitado, tasaInteres, interesTotal, montoTotal,
    cuotaDiaria, diasPlazo, montoPagado: 0, saldoPendiente: montoTotal, estado: 'activo',
    fechaInicio: FECHA,
    fechaFinEsperada: new Date(FECHA.getTime() + diasPlazo * 24 * 60 * 60 * 1000),
    fechaUltimoPago: null, diasPagados: 0, diasAtrasados: 0, createdAt: FECHA,
  }
}

function planPagos() {
  const r = Math.random()
  if (r < 0.3) return 1
  if (r < 0.55) return 2
  if (r < 0.7) return 3
  return 0
}

async function main() {
  const tenant = await p.tenant.findUnique({ where: { slug: SLUG } })
  if (!tenant) { console.error('Tenant no encontrado'); process.exit(1) }

  const hashed = await bcrypt.hash(PASSWORD, 12)
  const vendedores = await p.usuario.findMany({ where: { tenantId: tenant.id, rol: 'vendedor' }, select: { id: true } })
  const clientesExistentes = await p.usuario.findMany({ where: { tenantId: tenant.id, rol: 'cliente' }, select: { vendedorId: true } })
  const porVendedor = {}
  for (const c of clientesExistentes) porVendedor[c.vendedorId] = (porVendedor[c.vendedorId] || 0) + 1

  let nuevos = 0
  let contador = 0
  for (const v of vendedores) {
    const faltan = Math.max(0, 5 - (porVendedor[v.id] || 0))
    for (let i = 0; i < faltan; i++) {
      contador += 1
      const data = prestamoData(tenant.id, '__cliente__', v.id)
      await p.$transaction(async (tx) => {
        const cliente = await tx.usuario.create({
          data: {
            cedula: cedulaUnica(), nombre: pick(NOMBRES), apellido: pick(APELLIDOS),
            email: `${SLUG}-c${contador}@demo.com`, telefono: `3${String(rnd(100000000, 999999999))}`,
            rol: 'cliente', activo: 1, password: hashed, tenantId: tenant.id, vendedorId: v.id,
          },
        })
        const prestamo = await tx.prestamo.create({ data: { ...data, clienteId: cliente.id } })
        const n = planPagos()
        const fechas = [FECHA, new Date(2026, 7, 4, 10, 0, 0), new Date(2026, 7, 5, 11, 0, 0)]
        let montoAcumulado = 0
        let diasAcumulados = 0
        let ultimaFecha = null
        for (let k = 0; k < n; k++) {
          const monto = Math.min(prestamo.cuotaDiaria, data.montoTotal - montoAcumulado)
          if (monto <= 0) break
          const fp = fechas[Math.min(k, fechas.length - 1)]
          await tx.pago.create({
            data: { tenantId: tenant.id, prestamoId: prestamo.id, vendedorId: v.id, fechaPago: fp,
              fechaEsperada: data.fechaInicio, monto, diasCubiertos: 1, esPagoAtrasado: 0, diasAtraso: 0,
              observaciones: null, createdAt: fp },
          })
          montoAcumulado += monto
          diasAcumulados += 1
          ultimaFecha = fp
        }
        if (montoAcumulado > 0) {
          await tx.prestamo.update({
            where: { id: prestamo.id },
            data: { montoPagado: montoAcumulado, saldoPendiente: Math.max(0, data.montoTotal - montoAcumulado),
              diasPagados: diasAcumulados, fechaUltimoPago: ultimaFecha,
              estado: data.montoTotal - montoAcumulado <= 0 ? 'pagado' : 'activo' },
          })
        }
      })
      nuevos += 1
      console.log(`  cliente ${contador} del vendedor ${v.id} creado`)
    }
  }
  console.log(`\nCompletados ${nuevos} clientes para tenant ${SLUG}.`)
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => p.$disconnect())
