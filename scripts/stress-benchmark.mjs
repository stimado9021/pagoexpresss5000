import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
const url = new URL(process.env.DATABASE_URL);
const adapter = new PrismaMariaDb({ host: url.hostname, port: parseInt(url.port||"3306"), user: url.username, password: url.password, database: url.pathname.replace("/",""), ssl:{rejectUnauthorized:false}, connectionLimit:10});
const prisma=new PrismaClient({adapter});

async function timed(label, fn, runs=3){
  const times=[]; for(let i=0;i<runs;i++){ const s=performance.now(); const r=await fn(); const e=performance.now(); times.push(e-s); if(i===0 && r) console.log(`  sample rows: ${Array.isArray(r)? r.length : JSON.stringify(r).slice(0,80)}`); }
  const avg=times.reduce((a,b)=>a+b,0)/times.length;
  console.log(`${label}: avg=${avg.toFixed(1)}ms runs=${times.map(t=>t.toFixed(0)).join(',')}ms`);
  return avg;
}

let testTenantId=null;
try{
  // Create isolated test tenant to not pollute real data
  const existing=await prisma.tenant.findFirst({where:{slug:"benchmark-test"}});
  if(existing){ testTenantId=existing.id; console.log("Reusing test tenant",testTenantId); } else {
    const t=await prisma.tenant.create({data:{nombre:"Benchmark Test", slug:"benchmark-test", subdominio:"benchmark-test", status:"ACTIVE", trialStartsAt:new Date(), trialEndsAt:new Date(Date.now()+86400000*30)}});
    testTenantId=t.id;
    await prisma.configuracionTenant.create({data:{tenantId:testTenantId, tasaInteres:20, cuotaDiariaMin:5000}});
    console.log("Created test tenant",testTenantId);
  }
  // Create 10 vendedores + 1000 clientes synthetic if not exist
  let vendedores=await prisma.usuario.findMany({where:{tenantId:testTenantId, rol:"vendedor"}, select:{id:true}});
  if(vendedores.length<10){
    console.log("Creating 10 vendedores...");
    for(let i=vendedores.length;i<10;i++){
      await prisma.usuario.create({data:{cedula:`BV${testTenantId}${i}${String(Date.now()).slice(-4)}`, nombre:`Vend${i}`, apellido:"Bench", rol:"vendedor", password:"$2a$10$dummyhashdummyhashdummyhashdummy", tenantId:testTenantId, activo:1}});
    }
    vendedores=await prisma.usuario.findMany({where:{tenantId:testTenantId, rol:"vendedor"}, select:{id:true}});
  }
  console.log(`Vendedores: ${vendedores.length}`);

  let clienteCount=await prisma.usuario.count({where:{tenantId:testTenantId, rol:"cliente"}});
  console.log(`Clientes existing: ${clienteCount}`);
  if(clienteCount<1000){
    console.log("Creating 1000 clientes (batch 100)...");
    const need=1000-clienteCount;
    for(let b=0;b<need;b+=100){
      const batch=Math.min(100, need-b);
      const data=[];
      for(let i=0;i<batch;i++){
        const idx=b+i;
        const vend=vendedores[idx % vendedores.length];
        data.push({cedula:`B${testTenantId}${String(idx).padStart(4,'0')}${String(Date.now()).slice(-4)}`, nombre:`Cli${idx}`, apellido:"Bench", rol:"cliente", password:"$2a$10$dummy", tenantId:testTenantId, vendedorId:vend.id, activo:1});
      }
      // use createMany if available
      await prisma.usuario.createMany({data});
      process.stdout.write(".");
    }
    console.log("done");
  }
  clienteCount=await prisma.usuario.count({where:{tenantId:testTenantId, rol:"cliente"}});
  console.log(`Clientes now: ${clienteCount}`);

  // Prestamos: ensure 1000 prestamos
  let prestCount=await prisma.prestamo.count({where:{tenantId:testTenantId}});
  console.log(`Prestamos existing: ${prestCount}`);
  if(prestCount<1000){
    const clientes=await prisma.usuario.findMany({where:{tenantId:testTenantId, rol:"cliente"}, select:{id:true, vendedorId:true}, take:1000});
    console.log(`Creating ${1000-prestCount} prestamos...`);
    const need=1000-prestCount;
    for(let i=0;i<need;i++){
      const c=clientes[i % clientes.length];
      const monto=100000; const tasa=20; const interes=monto*0.2; const total=monto+interes; const cuota=5000; const dias=Math.ceil(total/cuota);
      const fechaInicio=new Date(Date.now()-Math.floor(Math.random()*30)*86400000);
      const fechaFin=new Date(fechaInicio); fechaFin.setDate(fechaFin.getDate()+dias);
      await prisma.prestamo.create({data:{
        tenantId:testTenantId, clienteId:c.id, vendedorId:c.vendedorId, montoSolicitado:monto, tasaInteres:tasa, interesTotal:interes, montoTotal:total, cuotaDiaria:cuota, diasPlazo:dias, montoPagado:0, saldoPendiente:total, estado:"activo", fechaInicio, fechaFinEsperada:fechaFin
      }});
      if(i%100===0) process.stdout.write(".");
    }
    console.log("prestamos done");
  }

  // Pagos: ensure ~20 per prestamo => 20k pagos
  let pagoCount=await prisma.pago.count({where:{tenantId:testTenantId}});
  console.log(`Pagos existing: ${pagoCount}`);
  if(pagoCount<15000){
    const prestamos=await prisma.prestamo.findMany({where:{tenantId:testTenantId}, select:{id:true, vendedorId:true, tenantId:true, cuotaDiaria:true, fechaInicio:true}});
    console.log(`Creating pagos for ${prestamos.length} prestamos...`);
    for(let p of prestamos){
      const already=await prisma.pago.count({where:{prestamoId:p.id}});
      const need=20-already;
      for(let j=0;j<need;j++){
        const fecha=new Date(p.fechaInicio); fecha.setDate(fecha.getDate()+j+1);
        await prisma.pago.create({data:{
          tenantId:testTenantId, prestamoId:p.id, vendedorId:p.vendedorId, fechaPago:fecha, fechaEsperada:fecha, monto:Number(p.cuotaDiaria), diasCubiertos:1, esPagoAtrasado:0, diasAtraso:0
        }});
      }
    }
    console.log("pagos done");
  }
  pagoCount=await prisma.pago.count({where:{tenantId:testTenantId}});
  console.log(`Pagos now: ${pagoCount}`);

  // Now benchmark with realistic volume
  console.log("\n=== BENCHMARK STRESS (1000 clientes, 1000 prestamos, ~20k pagos) Tenant",testTenantId,"===");

  const q3full = ()=> prisma.prestamo.findMany({ where:{ tenantId:testTenantId }, orderBy:{createdAt:'desc'}, include:{ cliente:{select:{nombre:true,apellido:true,cedula:true}}, vendedor:{select:{nombre:true,apellido:true}}, pagos:{select:{fechaPago:true,diasCubiertos:true}} } });
  const q3pag = ()=> prisma.prestamo.findMany({ where:{ tenantId:testTenantId }, orderBy:{createdAt:'desc'}, take:50, skip:0, include:{ cliente:{select:{nombre:true,apellido:true,cedula:true}}, vendedor:{select:{nombre:true,apellido:true}}, pagos:{select:{fechaPago:true,diasCubiertos:true}} } });
  const q5full = async()=>{ const vend=vendedores[0].id; return prisma.usuario.findMany({ where:{ rol:'cliente', vendedorId:vend }, select:{ id:true, nombre:true, prestamosCliente:{ select:{ estado:true, montoTotal:true, pagos:{select:{fechaPago:true,diasCubiertos:true}}}}}, orderBy:{nombre:'asc'}})};
  const q5pag = async()=>{ const vend=vendedores[0].id; return prisma.usuario.findMany({ where:{ rol:'cliente', vendedorId:vend }, select:{ id:true, nombre:true, prestamosCliente:{ select:{ estado:true, montoTotal:true, pagos:{select:{fechaPago:true,diasCubiertos:true}}}}}, orderBy:{nombre:'asc'}, take:50, skip:0})};
  const q4 = async()=>{ const inicio=new Date(); inicio.setDate(1); inicio.setHours(0,0,0,0); const fin=new Date(inicio); fin.setMonth(fin.getMonth()+1); fin.setDate(0); return prisma.pago.findMany({ where:{ tenantId:testTenantId, vendedorId:vendedores[0].id, fechaPago:{gte:inicio,lte:fin}}, orderBy:{createdAt:'desc'}, take:50 })};
  const q1 = ()=> prisma.prestamo.findMany({ where:{ tenantId:testTenantId, estado:'activo'}, take:20, orderBy:{createdAt:'desc'}, select:{ cliente:{select:{nombre:true}}, cuotaDiaria:true, saldoPendiente:true, fechaInicio:true, pagos:{select:{fechaPago:true,diasCubiertos:true}}}});

  const r3full=await timed("Q3 FULL (1000 prestamos + pagos)", q3full, 3);
  const r3pag=await timed("Q3 PAGINADO 50", q3pag, 5);
  const r5full=await timed("Q5 FULL (100 clientes/vendedor)", q5full, 3);
  const r5pag=await timed("Q5 PAGINADO 50", q5pag, 5);
  const r4=await timed("Q4 pagos vendedor+fecha comp idx", q4, 5);
  const r1=await timed("Q1 prestamos activos take20", q1, 5);

  console.log("\n=== MEJORA ===");
  console.log(`Q3: ${r3full.toFixed(0)} -> ${r3pag.toFixed(0)} ms  mejora ${(((r3full-r3pag)/r3full)*100).toFixed(1)}%  payload ${((r3full/r3pag)).toFixed(1)}x más ligero`);
  console.log(`Q5: ${r5full.toFixed(0)} -> ${r5pag.toFixed(0)} ms  mejora ${(((r5full-r5pag)/r5full)*100).toFixed(1)}%`);

  // Cache test
  console.log("\n=== CACHE DASHBOARD (30s) ===");
  let start=performance.now();
  // simulate 2 calls to cached function
  const { cached, getCached, setCached } = await import("../src/lib/cache.ts");
  // Actually we test manual
  const key=`dash:empresario:${testTenantId}:1`;
  setCached(key, {dummy:true}, 30000);
  const t1=performance.now(); const hit=getCached(key); const t2=performance.now();
  console.log(`Cache hit latency: ${(t2-t1).toFixed(3)}ms vs DB ~${r1.toFixed(0)}ms  mejora ${( (1 - (t2-t1)/r1)*100).toFixed(1)}%`);

  console.log("\nTo cleanup: run scripts/cleanup-benchmark.mjs");
} finally { await prisma.$disconnect(); }
