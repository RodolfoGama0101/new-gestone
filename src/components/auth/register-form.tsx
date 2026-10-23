'use client'

import { fieldErrorProps } from '@/lib/utils/form-accessibility'

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { GoogleAuthButton } from './google-auth-button'
import {
  registerSchema,
  type RegisterInput,
} from '@/lib/validations/auth.schema'
import { useAuth } from '@/contexts/auth-context'
import { CategoryService } from '@/services/category.service'
import { useRouter } from 'next/navigation'

export function RegisterForm() {
  const [isLoading, setIsLoading] = React.useState(false)
  const { signUpWithEmail } = useAuth()
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
    },
  })

  const onSubmit = async (data: RegisterInput) => {
    setIsLoading(true)
    try {
      const user = await signUpWithEmail(data.email, data.password)
      if (user) {
        await CategoryService.seedDefaultCategories(user.uid)
      }
      toast.success('Conta criada com sucesso! Bem-vindo(a).')
      router.replace('/')
      router.refresh()
    } catch (error) {
      setIsLoading(false)
      const authError = error as { code?: string }
      console.error('Registration Error:', error)
      switch (authError.code) {
        case 'auth/email-already-in-use':
          toast.error('Este e-mail já está cadastrado.')
          break
        case 'auth/invalid-email':
          toast.error('Formato de e-mail inválido.')
          break
        case 'auth/weak-password':
          toast.error('A senha fornecida é muito fraca.')
          break
        case 'auth/session-service-unavailable':
          toast.error(
            'A conta foi criada, mas o serviço de sessão está indisponível. Tente fazer login novamente.',
          )
          break
        default:
          toast.error('Erro ao criar a conta. Tente novamente.')
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
          <Label
            htmlFor="password"
            className="text-foreground text-[13px] font-medium"
          >
            Senha
          </Label>
          <Input
            id="password"
            autoComplete="new-password"
            {...fieldErrorProps('password', errors.password)}
            type="password"
            placeholder="Ex: MinhaSenh@1"
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

        <div className="space-y-1.5">
          <Label
            htmlFor="confirmPassword"
            className="text-foreground text-[13px] font-medium"
          >
            Confirmar Senha
          </Label>
          <Input
            id="confirmPassword"
            autoComplete="new-password"
            {...fieldErrorProps('confirmPassword', errors.confirmPassword)}
            type="password"
            placeholder="Repita a senha"
            disabled={isLoading}
            className={`h-10 ${errors.confirmPassword ? 'border-destructive focus-visible:ring-destructive' : ''}`}
            {...register('confirmPassword')}
          />
          {errors.confirmPassword && (
            <p
              id="confirmPassword-error"
              role="alert"
              className="text-destructive text-xs font-medium"
            >
              {errors.confirmPassword.message}
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
              Criando conta...
            </>
          ) : (
            'Criar conta grátis'
          )}
        </Button>
        <p role="status" className="sr-only">
          {isLoading ? 'Criando sua conta…' : ''}
        </p>
      </form>
    </div>
  )
}
