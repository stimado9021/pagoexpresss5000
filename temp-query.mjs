"use strict";

import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;
const url = new URL(connectionString);
const adapter = new PrismaMariaDb({
  host: url.hostname,
  port: parseInt(url.port || '3306'),
  user: url.username,
  password: url.password,
  database: url.pathname.replace('/', ''),
  connectionLimit: 20,
  ssl: { rejectUnauthorized: false },
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const user = await prisma.usuario.findFirst({
    where: { email: 'judithyepes@gmail.com' },
    include: { tenant: true }
  });
  console.log(JSON.stringify(user, null, 2));
  await prisma.$disconnect();
}

main().catch(console.error);