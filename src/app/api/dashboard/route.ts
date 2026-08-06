import { requireSession, isErrorResponse, apiResponse } from '@/lib/api-helpers'
import { getDashboard } from '@/lib/services/dashboard-service'

export async function GET() {
  const session = await requireSession()
  if (isErrorResponse(session)) return session

  return apiResponse(await getDashboard(session))
}
