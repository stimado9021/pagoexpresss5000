import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
const url=new URL(process.env.DATABASE_URL);
const a=new PrismaMariaDb({host:url.hostname,port:parseInt(url.port||"3306"),user:url.username,password:url.password,database:url.pathname.replace("/",""),ssl:{rejectUnauthorized:false}, connectionLimit:10});
const prisma=new PrismaClient({adapter:a});
const tenantId=11;
try{
  let clientes=await prisma.usuario.findMany({where:{tenantId, rol:"cliente"}, select:{id:true, vendedorId:true}});
  console.log(`clientes ${clientes.length}`);
  let prestCount=await prisma.prestamo.count({where:{tenantId}});
  console.log(`prestamos before ${prestCount}`);
  const need=1000-prestCount;
  if(need>0){
    console.log(`Creating ${need} prestamos via raw bulk...`);
    // Build raw SQL multi-insert 100 rows at a time
    const batchSize=100;
    let created=0;
    for(let offset=0; offset<need; offset+=batchSize){
      const batch=Math.min(batchSize, need-offset);
      const values=[];
      const params=[];
      for(let i=0;i<batch;i++){
        const idx=prestCount+i+offset;
        const c=clientes[(prestCount+i+offset) % clientes.length];
        const monto=100000, tasa=20, interes=20000, total=120000, cuota=5000, dias=24;
        const fechaInicio=new Date(Date.now()-Math.floor(Math.random()*30)*86400000);
        const fechaFin=new Date(fechaInicio); fechaFin.setDate(fechaFin.getDate()+dias);
        // We'll use Prisma createMany for this batch
        values.push({tenantId, clienteId:c.id, vendedorId:c.vendedorId, montoSolicitado:monto, tasaInteres:tasa, interesTotal:interes, montoTotal:total, cuotaDiaria:cuota, diasPlazo:dias, montoPagado:0, saldoPendiente:total, estado:"activo", fechaInicio, fechaFinEsperada:fechaFin});
      }
      await prisma.prestamo.createMany({data:values});
      created+=batch;
      console.log(`  batch ${created}/${need}`);
    }
  }
  prestCount=await prisma.prestamo.count({where:{tenantId}});
  console.log(`prestamos after ${prestCount}`);
  // Pagos: 20 per prestamo => 20k
  let pagoCount=await prisma.pago.count({where:{tenantId}});
  console.log(`pagos before ${pagoCount}`);
  if(pagoCount<18000){
    const prestamos=await prisma.prestamo.findMany({where:{tenantId}, select:{id:true, vendedorId:true, cuotaDiaria:true, fechaInicio:true}});
    console.log(`Generating pagos for ${prestamos.length} prestamos...`);
    const batchPagos=[];
    for(let p of prestamos){
      const existing=0; // we know 0 for new ones, but some prestamos have 0
      for(let j=0;j<20;j++){
        const fecha=new Date(p.fechaInicio); fecha.setDate(fecha.getDate()+j+1);
        batchPagos.push({tenantId, prestamoId:p.id, vendedorId:p.vendedorId, fechaPago:fecha, fechaEsperada:fecha, monto:Number(p.cuotaDiaria), diasCubiertos:1, esPagoAtrasado:0, diasAtraso:0});
        if(batchPagos.length>=500){
          await prisma.pago.createMany({data:batchPagos});
          batchPagos.length=0;
          process.stdout.write(".");
        }
      }
    }
    if(batchPagos.length>0) await prisma.pago.createMany({data:batchPagos});
    console.log("\npagos done");
  }
  console.log("final counts", await prisma.prestamo.count({where:{tenantId}}), await prisma.pago.count({where:{tenantId}}));
} finally { await prisma.$disconnect(); }
