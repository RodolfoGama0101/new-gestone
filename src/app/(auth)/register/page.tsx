import { AuthFrame } from '@/components/auth/auth-frame'
import { RegisterForm } from '@/components/auth/register-form'
import Link from 'next/link'

export default function RegisterPage() {
  return (
    <AuthFrame>
      <div className="mb-8 space-y-2 text-center">
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">
          Crie sua conta
        </h1>
        <p className="text-muted-foreground text-sm">
          Comece a organizar suas finanças.
        </p>
      </div>

      <RegisterForm />

      <p className="text-muted-foreground mt-7 text-center text-sm">
        Já tem uma conta?{' '}
        <Link
          href="/login"
          className="text-link font-medium underline-offset-4 hover:underline"
        >
          Fazer login
        </Link>
      </p>
    </AuthFrame>
  )
}
