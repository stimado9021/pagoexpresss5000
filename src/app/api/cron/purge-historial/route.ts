import { NextResponse } from 'next/server'
import { purgarHistorial } from '@/lib/services/historial-service'

export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 })
  }
  const { searchParams } = new URL(request.url)
  const days = parseInt(searchParams.get('days') || '90')
  const count = await purgarHistorial(days)
  return NextResponse.json({ success: true, purgados: count, days })
}
