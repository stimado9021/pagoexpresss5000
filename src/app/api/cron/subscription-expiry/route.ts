import { NextResponse } from 'next/server'
import { processSubscriptionExpiry, sendRenewalReminders } from '@/lib/notifications'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  try {
    const [expiry, renewals] = await Promise.all([
      processSubscriptionExpiry(),
      sendRenewalReminders(),
    ])
    return NextResponse.json({
      success: true,
      message: 'Subscription expiry processed',
      expiry,
      renewals,
    })
  } catch (error) {
    console.error('Subscription expiry error:', error)
    return NextResponse.json({ success: false, message: 'Error processing subscription expiry' }, { status: 500 })
  }
}
