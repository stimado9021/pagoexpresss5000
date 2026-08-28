import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { URL } from 'url';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL is not defined in environment');
  process.exit(1);
}

const url = new URL(DATABASE_URL);
const adapter = new PrismaMariaDb({
  host: url.hostname,
  port: parseInt(url.port || '3306'),
  user: url.username,
  password: url.password,
  database: url.pathname.replace('/', ''),
  connectionLimit: 10,
  acquireTimeout: 30000,
  ssl: { rejectUnauthorized: false },
});

const prisma = new PrismaClient({ adapter });

const PASSWORD = 'demo1234';

const NOMBRES_EMPRESA = [
  'Créditos Andina', 'Capital Mi Pueblo', 'Préstamos El Porvenir', 'Crédito Rápido Sureste',
  'Inversiones La Esperanza', 'Microcréditos Colombia', 'Capital Popular', 'Fondo de Crédito Camino',
  'Préstamos Crece Fácil', 'Capital Montañera', 'Crédito Familiar Andino', 'Financiar Crecimiento',
];
const NOMBRES = [
  'Juan', 'María', 'Carlos', 'Ana', 'Luis', 'Luisa', 'Pedro', 'Carmen', 'Diego', 'Sofía',
  'Andrés', 'Valentina', 'Jorge', 'Laura', 'Miguel', 'Paula', 'Fernando', 'Camila', 'Ricardo', 'Daniela',
  'Óscar', 'Mariana', 'Julián', 'Andrea', 'Hugo', 'Natalia', 'Raúl', 'Diana', 'Iván', 'Gloria',
];
const APELLIDOS = [
  'Gómez', 'Rodríguez', 'Martínez', 'López', 'Hernández', 'González', 'Pérez', 'Sánchez', 'Ramírez', 'Torres',
  'Flores', 'Rivera', 'Castro', 'Rojas', 'Mendoza', 'Ortiz', 'Vargas', 'Jiménez', 'Ríos', 'Morales',
  'Cabrera', 'Silva', 'Núñez', 'Cárdenas', 'Suárez', 'Mejía', 'Quintero', 'Acosta', 'Palacios', 'Beltrán',
];
const TASAS = [15, 18, 20, 22, 25];
const DIAS_PLAZO = [10, 15, 20, 25, 30, 45];

function rnd(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function slugify(s) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
function slugAleatorio(nombre) {
  return `${slugify(nombre)}-${Math.random().toString(36).slice(2, 6)}`;
}

let contadorCedula = 0;
function cedulaAleatoria() {
  contadorCedula += 1;
  return String(5000000000 + contadorCedula * 7);
}

const FECHA_CREACION = new Date(2026, 7, 3, 9, 0, 0);

function crearPrestamoAleatorio(tenantId, clienteId, vendedorId) {
  const montoSolicitado = rnd(10, 500) * 10000;
  const tasaInteres = pick(TASAS);
  const interesTotal = Math.round((montoSolicitado * tasaInteres) / 100);
  const montoTotal = montoSolicitado + interesTotal;
  const diasPlazo = pick(DIAS_PLAZO);
  const cuotaDiaria = Math.ceil(montoTotal / diasPlazo);

  return {
    tenantId,
    clienteId,
    vendedorId,
    montoSolicitado,
    tasaInteres,
    interesTotal,
    montoTotal,
    cuotaDiaria,
    diasPlazo,
    montoPagado: 0,
    saldoPendiente: montoTotal,
    estado: 'activo',
    fechaInicio: FECHA_CREACION,
    fechaFinEsperada: new Date(FECHA_CREACION.getTime() + diasPlazo * 24 * 60 * 60 * 1000),
    fechaUltimoPago: null,
    diasPagados: 0,
    diasAtrasados: 0,
    createdAt: FECHA_CREACION,
  };
}

function planPagosAleatorio() {
  const r = Math.random();
  if (r < 0.3) return 1;
  if (r < 0.55) return 2;
  if (r < 0.7) return 3;
  return 0;
}

async function crearPagos(prestamoId, prestamo, vendedorId, tenantId) {
  const n = planPagosAleatorio();
  if (n === 0) return 0;

  let montoAcumulado = 0;
  let diasAcumulados = 0;
  let ultimaFecha = FECHA_CREACION;
  const fechas = [FECHA_CREACION, new Date(2026, 7, 4, 10, 0, 0), new Date(2026, 7, 5, 11, 0, 0)];

  for (let i = 0; i < n; i++) {
    const diasCubiertos = 1;
    const monto = Math.min(prestamo.cuotaDiaria * diasCubiertos, prestamo.montoTotal - montoAcumulado);
    if (monto <= 0) break;

    const fechaPago = fechas[Math.min(i, fechas.length - 1)];
    await prisma.pago.create({
      data: {
        tenantId,
        prestamoId,
        vendedorId,
        fechaPago,
        fechaEsperada: prestamo.fechaInicio,
        monto,
        diasCubiertos,
        esPagoAtrasado: 0,
        diasAtraso: 0,
        observaciones: null,
        createdAt: fechaPago,
      },
    });

    montoAcumulado += monto;
    diasAcumulados += diasCubiertos;
    ultimaFecha = fechaPago;
  }

  if (montoAcumulado > 0) {
    await prisma.prestamo.update({
      where: { id: prestamoId },
      data: {
        montoPagado: montoAcumulado,
        saldoPendiente: Math.max(0, prestamo.montoTotal - montoAcumulado),
        diasPagados: diasAcumulados,
        fechaUltimoPago: ultimaFecha,
        estado: prestamo.montoTotal - montoAcumulado <= 0 ? 'pagado' : 'activo',
      },
    });
  }
  return n;
}

async function main() {
  const hashed = await bcrypt.hash(PASSWORD, 12);
  const plan = await prisma.plan.findFirst({ where: { slug: 'empresarial', activo: true } });
  if (!plan) {
    console.error('No se encontró el plan empresarial. Ejecuta primero: npm run seed');
    process.exit(1);
  }

  const ahora = new Date();
  const resumen = [];

  for (let t = 0; t < 3; t++) {
    const nombreEmpresa = pick(NOMBRES_EMPRESA);
    const slug = slugAleatorio(nombreEmpresa);
    const planExpiresAt = new Date(ahora.getTime() + 30 * 24 * 60 * 60 * 1000);

    const tenant = await prisma.tenant.create({
      data: {
        nombre: nombreEmpresa,
        slug,
        subdominio: `${slug}.pagoexpress-next.vercel.app`,
        planId: plan.id,
        status: 'ACTIVE',
        trialStartsAt: FECHA_CREACION,
        trialEndsAt: planExpiresAt,
        planStartsAt: FECHA_CREACION,
        planExpiresAt,
        createdAt: FECHA_CREACION,
      },
    });

    await prisma.configuracionTenant.create({
      data: { tenantId: tenant.id, nombreEmpresa: nombreEmpresa },
    });

    await prisma.suscripcion.create({
      data: {
        tenantId: tenant.id,
        planId: plan.id,
        estado: 'ACTIVE',
        cicloActual: 1,
        renovacionProxima: planExpiresAt,
        pagadoHasta: planExpiresAt,
        createdAt: FECHA_CREACION,
      },
    });

    const empresario = await prisma.usuario.create({
      data: {
        cedula: cedulaAleatoria(),
        nombre: pick(NOMBRES),
        apellido: pick(APELLIDOS),
        email: `${slug}@demo.com`,
        telefono: `3${String(rnd(100000000, 999999999))}`,
        rol: 'empresario',
        activo: 1,
        password: hashed,
        tenantId: tenant.id,
      },
    });

    const vendedores = [];
    for (let v = 0; v < 3; v++) {
      const vendedor = await prisma.usuario.create({
        data: {
          cedula: cedulaAleatoria(),
          nombre: pick(NOMBRES),
          apellido: pick(APELLIDOS),
          email: `${slug}-v${v + 1}@demo.com`,
          telefono: `3${String(rnd(100000000, 999999999))}`,
          rol: 'vendedor',
          activo: 1,
          password: hashed,
          tenantId: tenant.id,
        },
      });
      vendedores.push(vendedor);
    }

    let totalClientes = 0;
    let totalPrestamos = 0;
    let totalPagos = 0;
    let totalMonto = 0;

    for (const vendedor of vendedores) {
      for (let c = 0; c < 5; c++) {
        const cliente = await prisma.usuario.create({
          data: {
            cedula: cedulaAleatoria(),
            nombre: pick(NOMBRES),
            apellido: pick(APELLIDOS),
            email: `${slug}-c${vendedores.indexOf(vendedor) * 5 + c + 1}@demo.com`,
            telefono: `3${String(rnd(100000000, 999999999))}`,
            rol: 'cliente',
            activo: 1,
            password: hashed,
            tenantId: tenant.id,
            vendedorId: vendedor.id,
          },
        });

        const prestamoData = crearPrestamoAleatorio(tenant.id, cliente.id, vendedor.id);
        const prestamo = await prisma.prestamo.create({ data: prestamoData });

        totalPagos += await crearPagos(prestamo.id, prestamoData, vendedor.id, tenant.id);
        totalClientes += 1;
        totalPrestamos += 1;
        totalMonto += prestamoData.montoTotal;
      }
    }

    resumen.push({
      empresa: nombreEmpresa,
      slug,
      empresarioCedula: empresario.cedula,
      clientes: totalClientes,
      prestamos: totalPrestamos,
      pagos: totalPagos,
      cartera: totalMonto,
    });

    console.log(
      `Tenant creado: ${nombreEmpresa} (${slug}) | empresario cedula: ${empresario.cedula} | ` +
        `3 vendedores, ${totalClientes} clientes, ${totalPrestamos} préstamos, ${totalPagos} pagos`
    );
  }

  console.log('\n────────────────────────────────────────');
  console.log('Seed demo completado.');
  console.log(`Contraseña para todos los usuarios: ${PASSWORD}`);
  console.log('\nAcceso de empresarios:');
  for (const r of resumen) {
    console.log(`  ${r.empresa} -> cedula ${r.empresarioCedula}`);
  }
  console.log('\nTotal general:', resumen.reduce((a, r) => a + r.clientes, 0), 'clientes,',
    resumen.reduce((a, r) => a + r.prestamos, 0), 'préstamos,',
    resumen.reduce((a, r) => a + r.pagos, 0), 'pagos.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
