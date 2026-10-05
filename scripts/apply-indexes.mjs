import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
const url = new URL(process.env.DATABASE_URL);
const adapter = new PrismaMariaDb({
  host: url.hostname, port: parseInt(url.port||"3306"), user: url.username, password: url.password, database: url.pathname.replace("/",""), ssl:{rejectUnauthorized:false}
});
const prisma=new PrismaClient({adapter});
async function safe(sql){ try{ await prisma.$executeRawUnsafe(sql); console.log("OK", sql.slice(0,80)); } catch(e){ console.log("SKIP", sql.slice(0,60), e.message.slice(0,120)); } }
try{
  await safe(`CREATE INDEX idx_usuarios_tenant_rol ON usuarios(tenant_id, rol)`);
  await safe(`CREATE INDEX idx_usuarios_tenant_rol_activo ON usuarios(tenant_id, rol, activo)`);
  await safe(`CREATE INDEX idx_prestamos_tenant_estado ON prestamos(tenant_id, estado)`);
  await safe(`CREATE INDEX idx_prestamos_tenant_estado_created ON prestamos(tenant_id, estado, created_at)`);
  await safe(`CREATE INDEX idx_prestamos_tenant_vendedor ON prestamos(tenant_id, vendedor_id)`);
  await safe(`CREATE INDEX idx_prestamos_vendedor_estado ON prestamos(vendedor_id, estado)`);
  await safe(`CREATE INDEX idx_pagos_tenant_vendedor_fecha ON pagos(tenant_id, vendedor_id, fecha_pago)`);
  await safe(`CREATE INDEX idx_pagos_tenant_prestamo ON pagos(tenant_id, prestamo_id)`);
  await safe(`CREATE INDEX idx_pagos_vendedor_fecha ON pagos(vendedor_id, fecha_pago)`);
  await safe(`CREATE INDEX idx_pagos_tenant_created ON pagos(tenant_id, created_at)`);
  await safe(`CREATE INDEX idx_historial_tenant_created ON historial(tenant_id, created_at)`);
  await safe(`CREATE INDEX idx_historial_tenant_accion ON historial(tenant_id, accion)`);
  console.log("indexes done");
  const idx=await prisma.$queryRawUnsafe("SHOW INDEX FROM pagos");
  console.log(idx.map(i=>i.Key_name).join(", "));
} finally { await prisma.$disconnect(); }
