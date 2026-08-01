import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { URL } from 'url';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
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
  ssl: { rejectUnauthorized: false },
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const users = await prisma.usuario.findMany({
    select: { id: true, cedula: true, nombre: true, apellido: true, rol: true, activo: true, password: true },
  });
  console.log(JSON.stringify(users, null, 2));
}

main().catch((e) => console.error(e)).finally(async () => { await prisma.$disconnect(); });