import { AuthFrame } from '@/components/auth/auth-frame'
import { LoginForm } from '@/components/auth/login-form'
import Link from 'next/link'

export default function LoginPage() {
  return (
    <AuthFrame>
      <div className="mb-8 space-y-2 text-center">
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">
          Bem-vindo de volta
        </h1>
        <p className="text-muted-foreground text-sm">
          Entre na sua conta para continuar
        </p>
      </div>

      <LoginForm />

      <p className="text-muted-foreground mt-7 text-center text-sm">
        Não tem uma conta?{' '}
        <Link
          href="/register"
          className="text-link font-medium underline-offset-4 hover:underline"
        >
          Criar conta grátis
        </Link>
      </p>
    </AuthFrame>
  )
}
