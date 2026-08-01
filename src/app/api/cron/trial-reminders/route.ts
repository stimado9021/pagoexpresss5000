import { NextResponse } from 'next/server'
import { sendTrialReminders } from '@/lib/notifications'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  try {
    await sendTrialReminders()
    return NextResponse.json({ success: true, message: 'Trial reminders processed' })
  } catch (error) {
    console.error('Trial reminder error:', error)
    return NextResponse.json({ success: false, message: 'Error processing reminders' }, { status: 500 })
  }
}