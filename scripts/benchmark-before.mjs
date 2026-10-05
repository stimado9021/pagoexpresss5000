import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
const url = new URL(process.env.DATABASE_URL);
const adapter = new PrismaMariaDb({
  host: url.hostname,
  port: parseInt(url.port || "3306"),
  user: url.username,
  password: url.password,
  database: url.pathname.replace("/", ""),
  ssl: { rejectUnauthorized: false },
  connectionLimit: 20,
});
const prisma = new PrismaClient({ adapter });

async function timed(label, fn, runs=5){
  const times=[];
  for(let i=0;i<runs;i++){
    const s=performance.now();
    await fn();
    const e=performance.now();
    times.push(e-s);
  }
  const avg = times.reduce((a,b)=>a+b,0)/times.length;
  const min=Math.min(...times), max=Math.max(...times);
  console.log(`${label}: avg=${avg.toFixed(2)}ms min=${min.toFixed(2)} max=${max.toFixed(2)} runs=${times.map(t=>t.toFixed(1)).join(',')}`);
  return avg;
}

try{
  // ensure we have tenant 1
  const tenant = await prisma.tenant.findFirst();
  const tenantId = tenant?.id ?? 1;
  console.log("TenantId benchmark", tenantId);

  // Query 1: portfolioDashboard - prestamos activos por tenant
  const q1 = ()=> prisma.prestamo.findMany({ where:{ tenantId, estado:'activo' }, include:{ cliente:{select:{nombre:true,apellido:true}}, vendedor:{select:{nombre:true,apellido:true}}, pagos:{select:{fechaPago:true,diasCubiertos:true}} }, take:20, orderBy:{createdAt:'desc'} });

  // Query 2: pagos groupBy vendedor mes (dashboard)
  const now=new Date(); const inicio=new Date(now.getFullYear(), now.getMonth(),1); const fin=new Date(now.getFullYear(), now.getMonth()+1,0,23,59,59,999);
  const vendedores = await prisma.usuario.findMany({ where:{ tenantId, rol:'vendedor' }, select:{id:true}});
  const vendedorIds=vendedores.map(v=>v.id);
  const q2 = ()=> vendedorIds.length? prisma.pago.groupBy({ by:['vendedorId'], where:{ vendedorId:{in:vendedorIds}, fechaPago:{gte:inicio,lte:fin}}, _sum:{monto:true}}): Promise.resolve([]);

  // Query 3: listarPrestamos empresario (sin paginación actual = todos)
  const q3 = ()=> prisma.prestamo.findMany({ where:{ tenantId }, orderBy:{createdAt:'desc'}, include:{ cliente:{select:{nombre:true,apellido:true,cedula:true}}, vendedor:{select:{nombre:true,apellido:true}}, pagos:{select:{fechaPago:true,diasCubiertos:true}} } });

  // Query 4: pagos por vendedor+fecha (pagos list)
  const q4 = ()=> prisma.pago.findMany({ where:{ tenantId, vendedorId: vendedorIds[0] ?? 1, fechaPago:{gte:inicio,lte:fin}}, orderBy:{createdAt:'desc'}, take:50 });

  // Query 5: clientes resumen_vendedor (todos)
  const vendedorId = vendedorIds[0] ?? 1;
  const q5 = ()=> prisma.usuario.findMany({ where:{ rol:'cliente', vendedorId }, select:{ id:true, cedula:true, nombre:true, apellido:true, prestamosCliente:{ select:{ estado:true, montoSolicitado:true, montoPagado:true, saldoPendiente:true, cuotaDiaria:true, diasAtrasados:true, fechaInicio:true, fechaUltimoPago:true, montoTotal:true, pagos:{select:{fechaPago:true,diasCubiertos:true}}}}}, orderBy:{nombre:'asc'}});

  // Query 6: usuarios count por tenant+rol (checkTenantLimit)
  const q6 = ()=> prisma.usuario.count({ where:{ tenantId, rol:{in:['vendedor','empresario']}}});

  console.log("\n=== BENCHMARK BEFORE (actual) ===");
  const r1=await timed("Q1 prestamos activos tenant+estado", q1);
  const r2=await timed("Q2 pagos groupBy mes", q2);
  const r3=await timed("Q3 listarPrestamos full (sin paginación)", q3);
  const r4=await timed("Q4 pagos vendedor+fecha", q4);
  const r5=await timed("Q5 clientes resumen vendedor full", q5);
  const r6=await timed("Q6 count usuarios tenant+rol", q6);
  console.log(JSON.stringify({r1,r2,r3,r4,r5,r6},null,2));

  // EXPLAIN before
  const safe=(v)=>JSON.stringify(v,(k,val)=>typeof val==='bigint'?Number(val):val,2);
  console.log("\n--- EXPLAIN Q1 ---", safe(await prisma.$queryRawUnsafe(`EXPLAIN SELECT * FROM prestamos WHERE tenant_id=${tenantId} AND estado='activo' ORDER BY created_at DESC LIMIT 20`)));
  console.log("\n--- EXPLAIN Q2 ---", safe(await prisma.$queryRawUnsafe(`EXPLAIN SELECT vendedor_id, SUM(monto) FROM pagos WHERE vendedor_id IN (${vendedorIds.join(',')||1}) AND fecha_pago BETWEEN '${inicio.toISOString().slice(0,19).replace('T',' ')}' AND '${fin.toISOString().slice(0,19).replace('T',' ')}' GROUP BY vendedor_id`)));
  console.log("\n--- EXPLAIN Q4 ---", safe(await prisma.$queryRawUnsafe(`EXPLAIN SELECT * FROM pagos WHERE tenant_id=${tenantId} AND vendedor_id=${vendedorId} AND fecha_pago BETWEEN '${inicio.toISOString().slice(0,19).replace('T',' ')}' AND '${fin.toISOString().slice(0,19).replace('T',' ')}' ORDER BY created_at DESC LIMIT 50`)));
} finally { await prisma.$disconnect(); }
