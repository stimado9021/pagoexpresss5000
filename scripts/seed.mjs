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

async function main() {
  const now = new Date();

  const superadminCedula = '9090909090';
  const superadminPassword = 'master9021';
  const hashedPassword = await bcrypt.hash(superadminPassword, 12);

  const planSeeds = [
    {
      slug: 'independiente',
      data: {
        nombre: 'Independiente',
        precioMensual: 39.00,
        precioAnual: 390.00,
        intervalo: 'MONTHLY',
        description: 'Para prestamistas que están comenzando a formalizar su cartera.',
        activo: true,
        trialDays: 14,
      },
      limietes: [
        { recurso: 'MAX_VENDEDORES', valor: 2 },
        { recurso: 'MAX_CLIENTES', valor: 4 },
        { recurso: 'MAX_PRESTAMOS', valor: -1 },
        { recurso: 'REPORTES_AVANZADOS', valor: 0 },
        { recurso: 'API_ACCESS', valor: 0 },
        { recurso: 'CUSTOM_BRANDING', valor: 0 },
      ],
    },
    {
      slug: 'empresarial',
      data: {
        nombre: 'Empresarial',
        precioMensual: 99.00,
        precioAnual: 990.00,
        intervalo: 'MONTHLY',
        description: 'Para empresas de crédito con equipo de cobro y agentes en campo.',
        activo: true,
        trialDays: 14,
      },
      limietes: [
        { recurso: 'MAX_VENDEDORES', valor: 15 },
        { recurso: 'MAX_CLIENTES', valor: 1500 },
        { recurso: 'MAX_PRESTAMOS', valor: -1 },
        { recurso: 'REPORTES_AVANZADOS', valor: 1 },
        { recurso: 'API_ACCESS', valor: 0 },
        { recurso: 'CUSTOM_BRANDING', valor: 1 },
      ],
    },
    {
      slug: 'corporativo',
      data: {
        nombre: 'Corporativo',
        precioMensual: 249.00,
        precioAnual: 2490.00,
        intervalo: 'MONTHLY',
        description: 'Para redes de prestamistas y operaciones de alto volumen.',
        activo: true,
        trialDays: 14,
      },
      limietes: [
        { recurso: 'MAX_VENDEDORES', valor: -1 },
        { recurso: 'MAX_CLIENTES', valor: -1 },
        { recurso: 'MAX_PRESTAMOS', valor: -1 },
        { recurso: 'REPORTES_AVANZADOS', valor: 1 },
        { recurso: 'API_ACCESS', valor: 1 },
        { recurso: 'CUSTOM_BRANDING', valor: 1 },
      ],
    },
  ]

  for (const seed of planSeeds) {
    const existing = await prisma.plan.findUnique({ where: { slug: seed.slug } })
    if (existing) {
      await prisma.plan.update({ where: { slug: seed.slug }, data: seed.data })
      for (const l of seed.limietes) {
        await prisma.planLimites.upsert({
          where: { planId_recurso: { planId: existing.id, recurso: l.recurso } },
          update: { valor: l.valor },
          create: { planId: existing.id, recurso: l.recurso, valor: l.valor },
        })
      }
      console.log('Plan actualizado:', seed.slug)
    } else {
      await prisma.plan.create({
        data: { ...seed.data, slug: seed.slug, limietes: { create: seed.limietes } },
      })
      console.log('Plan creado:', seed.slug)
    }
  }

  let tenant = await prisma.tenant.findUnique({ where: { slug: 'platform' } });
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        nombre: 'Kredipay Platform',
        slug: 'platform',
        subdominio: 'platform',
        status: 'ACTIVE',
        trialStartsAt: now,
        trialEndsAt: new Date(now.getTime() + 999 * 365 * 24 * 60 * 60 * 1000),
      },
    });
    console.log('Tenant created:', tenant.nombre, '| id:', tenant.id);
  }

  const existing = await prisma.usuario.findUnique({ where: { cedula: superadminCedula } });
  if (existing) {
    await prisma.usuario.update({ where: { id: existing.id }, data: { rol: 'superadmin' } });
    console.log(`Superadmin with cedula ${superadminCedula} already exists. Rol -> superadmin`);
  } else {
    await prisma.usuario.create({
      data: {
        cedula: superadminCedula,
        nombre: 'Admin',
        apellido: 'Master',
        rol: 'superadmin',
        activo: 1,
        password: hashedPassword,
        tenantId: tenant.id,
      },
    });
    console.log('Superadmin user created');
  }

  let configTenant = await prisma.configuracionTenant.findUnique({ where: { tenantId: tenant.id } });
  if (!configTenant) {
    await prisma.configuracionTenant.create({
      data: {
        tenantId: tenant.id,
        nombreEmpresa: 'Kredipay Platform',
      },
    });
    console.log('Platform config created');
  }

  console.log('Seed completed successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });