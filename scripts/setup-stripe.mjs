import 'dotenv/config';
import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { URL } from 'url';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL is not defined in environment');
  process.exit(1);
}

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
if (!STRIPE_SECRET_KEY) {
  console.error('STRIPE_SECRET_KEY no está definida en el .env');
  console.error('Copia una clave de prueba (sk_test_...) en STRIPE_SECRET_KEY y vuelve a ejecutar este script.');
  process.exit(1);
}

const url = new URL(DATABASE_URL);
const adapter = new PrismaMariaDb({
  host: url.hostname,
  port: parseInt(url.port || '3306'),
  user: url.username,
  password: url.password,
  database: url.pathname.replace('/', ''),
  connectionLimit: 5,
  acquireTimeout: 30000,
  ssl: { rejectUnauthorized: false },
});

const prisma = new PrismaClient({ adapter });
const stripe = new Stripe(STRIPE_SECRET_KEY, { typescript: true });

async function ensurePrice(plan, nombreSufijo, cantidad, nombreCompleto) {
  const existing = plan[`stripePrice${nombreSufijo}Id`];
  if (existing && existing.startsWith('price_')) {
    console.log(`  ${plan.nombre} (${nombreSufijo}) ya tiene: ${existing}`);
    return existing;
  }

  const product = await stripe.products.create({
    name: `PagoExpress ${plan.nombre} ${nombreSufijo === 'Mensual' ? 'Mensual' : 'Anual'}`,
    description: plan.description || undefined,
    metadata: { planSlug: plan.slug, intervalo: nombreSufijo === 'Mensual' ? 'MONTHLY' : 'ANUAL' },
  });

  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: Math.round(Number(cantidad) * 100),
    currency: 'usd',
    recurring: {
      interval: nombreSufijo === 'Mensual' ? 'month' : 'year',
    },
    metadata: { planSlug: plan.slug },
  });

  console.log(`  ${plan.nombre} (${nombreSufijo}): creado ${price.id}`);
  return price.id;
}

async function main() {
  const plans = await prisma.plan.findMany({ where: { activo: true } });
  if (plans.length === 0) {
    console.error('No hay planes activos. Ejecuta primero npm run seed');
    process.exit(1);
  }

  for (const plan of plans) {
    console.log(`Procesando plan: ${plan.nombre} (${plan.slug})`);
    const mensualId = await ensurePrice(plan, 'Mensual', plan.precioMensual, `PagoExpress ${plan.nombre} Mensual`);
    const anualId = await ensurePrice(plan, 'Anual', plan.precioAnual ?? plan.precioMensual * 10, `PagoExpress ${plan.nombre} Anual`);
    await prisma.plan.update({
      where: { id: plan.id },
      data: { stripePriceMensualId: mensualId, stripePriceAnualId: anualId },
    });
    console.log(`  Guardado en la tabla planes (id ${plan.id}).`);
  }

  console.log('\nListo. Los Price IDs están guardados y el checkout ya funciona.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
