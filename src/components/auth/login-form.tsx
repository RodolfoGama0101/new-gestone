'use client'

import { fieldErrorProps } from '@/lib/utils/form-accessibility'

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
import { useAuth } from '@/contexts/auth-context'
import { useRouter } from 'next/navigation'

export function LoginForm() {
  const [isLoading, setIsLoading] = React.useState(false)
  const { signInWithEmail } = useAuth()
  const router = useRouter()

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
      router.replace('/')
      router.refresh()
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
        case 'auth/session-service-unavailable':
          toast.error(
            'O serviço de sessão está indisponível. Tente novamente em instantes.',
          )
          break
        default:
          toast.error(
            'Erro ao realizar o login. Verifique seus dados e tente novamente.',
          )
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <GoogleAuthButton />
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <Separator className="w-full" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-muted text-muted-foreground px-3 font-medium">
            ou continue com e-mail
          </span>
        </div>
      </div>

      <form
        aria-busy={isLoading}
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-5"
        noValidate
      >
        <div className="space-y-1.5">
          <Label
            htmlFor="email"
            className="text-foreground text-[13px] font-medium"
          >
            E-mail
          </Label>
          <Input
            id="email"
            autoComplete="email"
            {...fieldErrorProps('email', errors.email)}
            type="email"
            placeholder="exemplo@dominio.com"
            disabled={isLoading}
            className={`h-10 ${errors.email ? 'border-destructive focus-visible:ring-destructive' : ''}`}
            {...register('email')}
          />
          {errors.email && (
            <p
              id="email-error"
              role="alert"
              className="text-destructive text-xs font-medium"
            >
              {errors.email.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label
              htmlFor="password"
              className="text-foreground text-[13px] font-medium"
            >
              Senha
            </Label>
            <Link
              href="/forgot-password"
              className="text-primary text-xs font-medium hover:underline"
            >
              Esqueceu a senha?
            </Link>
          </div>
          <Input
            id="password"
            autoComplete="current-password"
            {...fieldErrorProps('password', errors.password)}
            type="password"
            placeholder="••••••••"
            disabled={isLoading}
            className={`h-10 ${errors.password ? 'border-destructive focus-visible:ring-destructive' : ''}`}
            {...register('password')}
          />
          {errors.password && (
            <p
              id="password-error"
              role="alert"
              className="text-destructive text-xs font-medium"
            >
              {errors.password.message}
            </p>
          )}
        </div>

        <Button
          type="submit"
          className="h-10 w-full cursor-pointer text-sm font-medium"
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
        <p role="status" className="sr-only">
          {isLoading ? 'Entrando na conta…' : ''}
        </p>
      </form>
    </div>
  )
}
