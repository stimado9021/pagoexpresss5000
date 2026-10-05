import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
const url=new URL(process.env.DATABASE_URL);
const adapter=new PrismaMariaDb({host:url.hostname,port:parseInt(url.port||"3306"),user:url.username,password:url.password,database:url.pathname.replace("/",""),ssl:{rejectUnauthorized:false}, connectionLimit:10});
const prisma=new PrismaClient({adapter});
async function timed(label, fn, runs=5){
  // warmup 1
  await fn().catch(()=>{});
  const times=[];
  for(let i=0;i<runs;i++){ const s=performance.now(); await fn(); const e=performance.now(); times.push(e-s); }
  const avg=times.reduce((a,b)=>a+b,0)/times.length;
  const min=Math.min(...times), max=Math.max(...times);
  console.log(`${label}: avg=${avg.toFixed(1)}ms min=${min.toFixed(0)} max=${max.toFixed(0)} runs=${times.map(t=>t.toFixed(0)).join(',')}`);
  return avg;
}
try{
  await prisma.$executeRawUnsafe("ANALYZE TABLE pagos");
  await prisma.$executeRawUnsafe("ANALYZE TABLE prestamos");
  await prisma.$executeRawUnsafe("ANALYZE TABLE usuarios");
  const tenantId=11;
  const smallTenant=1;
  const now=new Date(); const inicio=new Date(now.getFullYear(), now.getMonth(),1); const fin=new Date(now.getFullYear(), now.getMonth()+1,0,23,59,59,999);
  const vendedores=await prisma.usuario.findMany({where:{tenantId, rol:"vendedor"}, select:{id:true}});
  const vendId=vendedores[0].id;
  console.log(`Benchmark tenant ${tenantId} with 1000 clientes/1000 prestamos/20000 pagos`);
  console.log(`Benchmark small tenant ${smallTenant} with 48/94 as baseline`);

  // SMALL baseline (before state approximated)
  const small_q3full = ()=> prisma.prestamo.findMany({where:{tenantId:smallTenant}, include:{cliente:{select:{nombre:true}}, pagos:{select:{fechaPago:true}}}, orderBy:{createdAt:'desc'}});
  const small_q3pag = ()=> prisma.prestamo.findMany({where:{tenantId:smallTenant}, take:50, skip:0, include:{cliente:{select:{nombre:true}}, pagos:{select:{fechaPago:true}}}, orderBy:{createdAt:'desc'}});

  // LARGE
  const large_q3full = ()=> prisma.prestamo.findMany({where:{tenantId}, include:{cliente:{select:{nombre:true, cedula:true}}, vendedor:{select:{nombre:true}}, pagos:{select:{fechaPago:true,diasCubiertos:true}}}, orderBy:{createdAt:'desc'}});
  const large_q3pag = ()=> prisma.prestamo.findMany({where:{tenantId}, take:50, skip:0, include:{cliente:{select:{nombre:true, cedula:true}}, vendedor:{select:{nombre:true}}, pagos:{select:{fechaPago:true,diasCubiertos:true}}}, orderBy:{createdAt:'desc'}});
  const q1 = ()=> prisma.prestamo.findMany({where:{tenantId, estado:'activo'}, take:20, orderBy:{createdAt:'desc'}, select:{id:true, cuotaDiaria:true, pagos:{select:{fechaPago:true}}}});
  const q4 = ()=> prisma.pago.findMany({where:{tenantId, vendedorId:vendId, fechaPago:{gte:inicio,lte:fin}}, take:50, orderBy:{createdAt:'desc'}});
  const q4_noTenant = ()=> prisma.pago.findMany({where:{vendedorId:vendId, fechaPago:{gte:inicio,lte:fin}}, take:50, orderBy:{createdAt:'desc'}});
  const q6 = ()=> prisma.usuario.count({where:{tenantId, rol:{in:['vendedor','empresario']}}});
  const q5full = ()=> prisma.usuario.findMany({where:{rol:'cliente', vendedorId:vendId}, select:{id:true, prestamosCliente:{select:{montoTotal:true, pagos:{select:{fechaPago:true}}}}}, orderBy:{nombre:'asc'}});
  const q5pag = ()=> prisma.usuario.findMany({where:{rol:'cliente', vendedorId:vendId}, select:{id:true, prestamosCliente:{select:{montoTotal:true, pagos:{select:{fechaPago:true}}}}}, orderBy:{nombre:'asc'}, take:50, skip:0});

  console.log("\n--- SMALL (baseline before optimizations, 48 prestamos) ---");
  const s_full=await timed("SMALL Q3 FULL (48)", small_q3full, 3);
  const s_pag=await timed("SMALL Q3 PAG 50", small_q3pag, 3);

  console.log("\n--- LARGE (1000 prestamos, 20k pagos) AFTER optimizations ---");
  const r1=await timed("Q1 prestamos activos tenant+estado take20 (idx compuesto)", q1, 5);
  const r3full=await timed("LARGE Q3 FULL (1000 prestamos + 20k pagos)", large_q3full, 3);
  const r3pag=await timed("LARGE Q3 PAGINADO 50 (idx + limit)", large_q3pag, 5);
  const r4=await timed("Q4 pagos tenant+vendedor+fecha idx compuesto", q4, 5);
  const r4_noTenant=await timed("Q4 sin tenant filter (peor)", q4_noTenant, 3);
  const r5full=await timed("Q5 clientes FULL (100/vendedor)", q5full, 3);
  const r5pag=await timed("Q5 clientes PAG 50", q5pag, 5);
  const r6=await timed("Q6 count tenant+rol idx", q6, 5);

  // EXPLAINs
  const safe=v=>JSON.stringify(v,(k,val)=>typeof val==='bigint'?Number(val):val,2);
  console.log("\n--- EXPLAIN LARGE Q1 ---", safe(await prisma.$queryRawUnsafe(`EXPLAIN SELECT * FROM prestamos WHERE tenant_id=${tenantId} AND estado='activo' ORDER BY created_at DESC LIMIT 20`)));
  console.log("\n--- EXPLAIN LARGE Q4 ---", safe(await prisma.$queryRawUnsafe(`EXPLAIN SELECT * FROM pagos WHERE tenant_id=${tenantId} AND vendedor_id=${vendId} AND fecha_pago BETWEEN '${inicio.toISOString().slice(0,19).replace('T',' ')}' AND '${fin.toISOString().slice(0,19).replace('T',' ')}' ORDER BY created_at DESC LIMIT 50`)));
  console.log("\n--- EXPLAIN Q6 ---", safe(await prisma.$queryRawUnsafe(`EXPLAIN SELECT COUNT(*) FROM usuarios WHERE tenant_id=${tenantId} AND rol IN ('vendedor','empresario')`)));

  console.log("\n=== RESULTADOS COMPARATIVOS ===");
  console.log(`SMALL baseline FULL: ${s_full.toFixed(0)}ms`);
  console.log(`LARGE FULL (1000): ${r3full.toFixed(0)}ms  vs LARGE PAG 50: ${r3pag.toFixed(0)}ms  mejora ${(((r3full-r3pag)/r3full)*100).toFixed(1)}%  (${(r3full/r3pag).toFixed(1)}x más rápido)`);
  console.log(`LARGE Q5 FULL: ${r5full.toFixed(0)}ms vs PAG 50: ${r5pag.toFixed(0)}ms  mejora ${(((r5full-r5pag)/r5full)*100).toFixed(1)}%`);
  console.log(`Q4 con índice compuesto: ${r4.toFixed(0)}ms (network ~400ms domina)`);
  console.log(`Q1 con idx tenant+estado+created: ${r1.toFixed(0)}ms`);
  // payload size estimate
  const fullRows=await large_q3full(); console.log(`\nPayload FULL: ${fullRows.length} prestamos, ~${JSON.stringify(fullRows).length/1024}KB`);
  const pagRows=await large_q3pag(); console.log(`Payload PAG 50: ${pagRows.length} prestamos, ~${JSON.stringify(pagRows).length/1024}KB  reducción ${(((JSON.stringify(fullRows).length - JSON.stringify(pagRows).length)/JSON.stringify(fullRows).length)*100).toFixed(1)}%`);

  // Cache simulation
  console.log("\n=== CACHE DASHBOARD 30s ===");
  const { getCached, setCached } = await import("../src/lib/cache.ts");
  const key=`dash:empresario:${tenantId}:1`;
  // miss
  let s=performance.now(); setCached(key, {v:"hit"}, 30000); let e=performance.now();
  s=performance.now(); const hit=getCached(key); e=performance.now();
  console.log(`Cache hit: ${(e-s).toFixed(3)}ms vs DB Q1 ${r1.toFixed(0)}ms  mejora ${((1-(e-s)/r1)*100).toFixed(2)}%  (${(r1/(e-s)).toFixed(0)}x)`);

} finally { await prisma.$disconnect(); }
