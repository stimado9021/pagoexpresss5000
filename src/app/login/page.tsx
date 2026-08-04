import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import LoginForm from './LoginForm'

export default async function LoginPage() {
  const session = await getSession()
  if (session?.rol) {
    const routes: Record<string, string> = {
      superadmin: '/admin',
      empresario: '/empresario',
      vendedor: '/vendedor',
      cliente: '/cliente',
    }
    const destino = routes[session.rol]
    if (destino) redirect(destino)
  }

  return <LoginForm />
}
