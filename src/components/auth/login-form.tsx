'use client'

import * as React from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { GoogleAuthButton } from './google-auth-button'
import { loginSchema, type LoginInput } from '@/lib/validations/auth.schema'
import { signInWithEmail } from '@/lib/firebase/auth'

export function LoginForm() {
  const [isLoading, setIsLoading] = React.useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const onSubmit = async (data: LoginInput) => {
    setIsLoading(true)
    try {
      await signInWithEmail(data.email, data.password)
      toast.success('Login realizado com sucesso!')
      // Mantém o estado de carregamento ativo até que o AuthProvider redirecione
    } catch (error) {
      setIsLoading(false)
      const authError = error as { code?: string }
      console.error('Login Error:', error)
      switch (authError.code) {
        case 'auth/invalid-credential':
        case 'auth/wrong-password':
        case 'auth/user-not-found':
          toast.error('E-mail ou senha incorretos.')
          break
        case 'auth/user-disabled':
          toast.error('Esta conta foi desativada.')
          break
        case 'auth/too-many-requests':
          toast.error('Muitas tentativas malsucedidas. Tente mais tarde.')
          break
        default:
          toast.error('Erro ao realizar o login. Verifique seus dados e tente novamente.')
      }
    }
  }

  return (
    <div className="space-y-5">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-sm font-semibold text-foreground">
            E-mail
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="exemplo@dominio.com"
            disabled={isLoading}
            className={`h-11 ${errors.email ? 'border-destructive focus-visible:ring-destructive' : ''}`}
            {...register('email')}
          />
          {errors.email && (
            <p className="text-xs font-medium text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-sm font-semibold text-foreground">
              Senha
            </Label>
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-primary hover:underline"
            >
              Esqueceu a senha?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            disabled={isLoading}
            className={`h-11 ${errors.password ? 'border-destructive focus-visible:ring-destructive' : ''}`}
            {...register('password')}
          />
          {errors.password && (
            <p className="text-xs font-medium text-destructive">{errors.password.message}</p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full h-11 font-bold text-sm cursor-pointer"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Entrando...
            </>
          ) : (
            'Entrar na conta'
          )}
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <Separator className="w-full" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-3 text-muted-foreground font-medium">Ou continuar com</span>
        </div>
      </div>

      <GoogleAuthButton />
    </div>
  )
}
