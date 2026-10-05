import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'

export const metadata = {
  robots: { index: false, follow: false },
}

export default function SuspendidoPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-emerald-950 px-4">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/15">
          <AlertTriangle size={28} className="text-amber-400" />
        </div>
        <h1 className="mt-6 text-2xl font-bold text-zinc-100 font-display">Servicio suspendido</h1>
        <p className="mt-3 text-sm text-zinc-400">
          Tu empresa pausó el servicio de Kreditools por vencimiento del periodo de prueba o de la suscripción.
          No podrás usar el sistema hasta que se active un plan.
        </p>
        <p className="mt-2 text-sm text-zinc-400">
          Si eres vendedor o cliente, habla con el administrador de tu empresa. Si eres el administrador, ingresa a facturación para pagar.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Link href="/login" className="rounded-lg bg-lime-500 px-4 py-2.5 text-sm font-semibold text-emerald-950 font-display hover:bg-zinc-200 transition-colors">
            Ir al login
          </Link>
        </div>
        <p className="mt-6 text-xs text-zinc-500">Soporte: quinteroenrrique321@gmail.com</p>
      </div>
    </div>
  )
}
