import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
const url = new URL(process.env.DATABASE_URL);
const adapter = new PrismaMariaDb({
  host: url.hostname, port: parseInt(url.port||"3306"), user: url.username, password: url.password, database: url.pathname.replace("/",""), ssl:{rejectUnauthorized:false}, connectionLimit: 10,
});
const prisma=new PrismaClient({adapter});
async function timed(label, fn, runs=5){
  const times=[]; for(let i=0;i<runs;i++){ const s=performance.now(); await fn(); const e=performance.now(); times.push(e-s); }
  const avg=times.reduce((a,b)=>a+b,0)/times.length; const min=Math.min(...times), max=Math.max(...times);
  console.log(`${label}: avg=${avg.toFixed(2)}ms min=${min.toFixed(2)} max=${max.toFixed(2)} runs=${times.map(t=>t.toFixed(1)).join(',')}`);
  return avg;
}
try{
  const tenant = await prisma.tenant.findFirst();
  const tenantId = tenant?.id ?? 1;
  console.log("TenantId", tenantId);
  const now=new Date(); const inicio=new Date(now.getFullYear(), now.getMonth(),1); const fin=new Date(now.getFullYear(), now.getMonth()+1,0,23,59,59,999);
  const vendedores = await prisma.usuario.findMany({ where:{ tenantId, rol:'vendedor' }, select:{id:true}});
  const vendedorIds=vendedores.map(v=>v.id);
  const vendedorId=vendedorIds[0]??1;

  // Mismas queries que before pero ahora con índices compuestos y paginación
  const q1 = ()=> prisma.prestamo.findMany({ where:{ tenantId, estado:'activo' }, include:{ cliente:{select:{nombre:true,apellido:true}}, vendedor:{select:{nombre:true,apellido:true}}, pagos:{select:{fechaPago:true,diasCubiertos:true}} }, take:20, orderBy:{createdAt:'desc'} });
  const q2 = ()=> vendedorIds.length? prisma.pago.groupBy({ by:['vendedorId'], where:{ tenantId, vendedorId:{in:vendedorIds}, fechaPago:{gte:inicio,lte:fin}}, _sum:{monto:true}}): Promise.resolve([]);
  // q3 paginado (50) vs before full
  const q3_full = ()=> prisma.prestamo.findMany({ where:{ tenantId }, orderBy:{createdAt:'desc'}, include:{ cliente:{select:{nombre:true,apellido:true,cedula:true}}, vendedor:{select:{nombre:true,apellido:true}}, pagos:{select:{fechaPago:true,diasCubiertos:true}} } });
  const q3_pag = ()=> prisma.prestamo.findMany({ where:{ tenantId }, orderBy:{createdAt:'desc'}, take:50, skip:0, include:{ cliente:{select:{nombre:true,apellido:true,cedula:true}}, vendedor:{select:{nombre:true,apellido:true}}, pagos:{select:{fechaPago:true,diasCubiertos:true}} } });
  const q4 = ()=> prisma.pago.findMany({ where:{ tenantId, vendedorId, fechaPago:{gte:inicio,lte:fin}}, orderBy:{createdAt:'desc'}, take:50 });
  const q5_full = ()=> prisma.usuario.findMany({ where:{ rol:'cliente', vendedorId }, select:{ id:true, cedula:true, nombre:true, apellido:true, prestamosCliente:{ select:{ estado:true, montoSolicitado:true, montoPagado:true, saldoPendiente:true, cuotaDiaria:true, diasAtrasados:true, fechaInicio:true, fechaUltimoPago:true, montoTotal:true, pagos:{select:{fechaPago:true,diasCubiertos:true}}}}}, orderBy:{nombre:'asc'}});
  const q5_pag = ()=> prisma.usuario.findMany({ where:{ rol:'cliente', vendedorId }, select:{ id:true, cedula:true, nombre:true, apellido:true, prestamosCliente:{ select:{ estado:true, montoSolicitado:true, montoPagado:true, saldoPendiente:true, cuotaDiaria:true, diasAtrasados:true, fechaInicio:true, fechaUltimoPago:true, montoTotal:true, pagos:{select:{fechaPago:true,diasCubiertos:true}}}}}, orderBy:{nombre:'asc'}, take:50, skip:0});
  const q6 = ()=> prisma.usuario.count({ where:{ tenantId, rol:{in:['vendedor','empresario']}}});

  console.log("\n=== BENCHMARK AFTER (con índices + paginación) ===");
  const r1=await timed("Q1 prestamos activos tenant+estado (comp idx)", q1);
  const r2=await timed("Q2 pagos groupBy tenant+vendedor+fecha (comp idx)", q2);
  const r3full=await timed("Q3 listarPrestamos FULL (sin pag, solo medido)", q3_full);
  const r3=await timed("Q3 listarPrestamos PAGINADO 50", q3_pag);
  const r4=await timed("Q4 pagos tenant+vendedor+fecha (comp idx)", q4);
  const r5full=await timed("Q5 clientes resumen FULL", q5_full);
  const r5=await timed("Q5 clientes resumen PAGINADO 50", q5_pag);
  const r6=await timed("Q6 count tenant+rol (comp idx)", q6);

  const safe=(v)=>JSON.stringify(v,(k,val)=>typeof val==='bigint'?Number(val):val,2);
  console.log("\n--- EXPLAIN Q1 AFTER ---", safe(await prisma.$queryRawUnsafe(`EXPLAIN SELECT * FROM prestamos WHERE tenant_id=${tenantId} AND estado='activo' ORDER BY created_at DESC LIMIT 20`)));
  console.log("\n--- EXPLAIN Q2 AFTER ---", safe(await prisma.$queryRawUnsafe(`EXPLAIN SELECT vendedor_id, SUM(monto) FROM pagos WHERE tenant_id=${tenantId} AND vendedor_id IN (${vendedorIds.join(',')||1}) AND fecha_pago BETWEEN '${inicio.toISOString().slice(0,19).replace('T',' ')}' AND '${fin.toISOString().slice(0,19).replace('T',' ')}' GROUP BY vendedor_id`)));
  console.log("\n--- EXPLAIN Q4 AFTER ---", safe(await prisma.$queryRawUnsafe(`EXPLAIN SELECT * FROM pagos WHERE tenant_id=${tenantId} AND vendedor_id=${vendedorId} AND fecha_pago BETWEEN '${inicio.toISOString().slice(0,19).replace('T',' ')}' AND '${fin.toISOString().slice(0,19).replace('T',' ')}' ORDER BY created_at DESC LIMIT 50`)));
  console.log("\n--- EXPLAIN Q6 AFTER ---", safe(await prisma.$queryRawUnsafe(`EXPLAIN SELECT COUNT(*) FROM usuarios WHERE tenant_id=${tenantId} AND rol IN ('vendedor','empresario')`)));

  // Comparativa con valores BEFORE hardcodeados del run anterior
  const before={r1:596.47,r2:0.01,r3:778.12,r4:401.42,r5:1201.73,r6:404.56};
  console.log("\n=== COMPARATIVA % MEJORA ===");
  function pct(bef, aft){ return ((bef-aft)/bef*100).toFixed(1); }
  console.log(`Q1: ${before.r1.toFixed(1)} -> ${r1.toFixed(1)} ms  mejora ${pct(before.r1,r1)}%`);
  console.log(`Q2: ${before.r2.toFixed(2)} -> ${r2.toFixed(2)} ms  (groupBy ya rápido, usa idx compuesto)`);
  console.log(`Q3 full vs paginado: ${r3full.toFixed(1)} -> ${r3.toFixed(1)} ms  mejora ${pct(r3full,r3)}% (pag evita traer todo)`);
  console.log(`Q3 vs before full: ${before.r3.toFixed(1)} -> ${r3.toFixed(1)} ms  mejora ${pct(before.r3,r3)}%`);
  console.log(`Q4: ${before.r4.toFixed(1)} -> ${r4.toFixed(1)} ms  mejora ${pct(before.r4,r4)}%`);
  console.log(`Q5 full vs pag: ${r5full.toFixed(1)} -> ${r5.toFixed(1)} ms  mejora ${pct(r5full,r5)}%`);
  console.log(`Q5 vs before: ${before.r5.toFixed(1)} -> ${r5.toFixed(1)} ms  mejora ${pct(before.r5,r5)}%`);
  console.log(`Q6: ${before.r6.toFixed(1)} -> ${r6.toFixed(1)} ms  mejora ${pct(before.r6,r6)}%`);

  // Benchmark cache dashboard (2 llamadas)
  console.log("\n--- CACHE test (simulado lib/cache) ---");
  const { cached } = await import("../src/lib/cache.ts").catch(()=>({cached:null}));
} finally { await prisma.$disconnect(); }
