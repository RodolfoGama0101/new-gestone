'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { GoogleAuthButton } from './google-auth-button'
import { registerSchema, type RegisterInput } from '@/lib/validations/auth.schema'
import { signUpWithEmail } from '@/lib/firebase/auth'
import { CategoryService } from '@/services/category.service'

export function RegisterForm() {
  const [isLoading, setIsLoading] = React.useState(false)
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
      router.push('/')
      router.refresh()
    } catch (error) {
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
        default:
          toast.error('Erro ao criar a conta. Tente novamente.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
          <Label htmlFor="password" className="text-sm font-semibold text-foreground">
            Senha
          </Label>
          <Input
            id="password"
            type="password"
            placeholder="Mínimo 6 caracteres"
            disabled={isLoading}
            className={`h-11 ${errors.password ? 'border-destructive focus-visible:ring-destructive' : ''}`}
            {...register('password')}
          />
          {errors.password && (
            <p className="text-xs font-medium text-destructive">{errors.password.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword" className="text-sm font-semibold text-foreground">
            Confirmar Senha
          </Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="Repita a senha"
            disabled={isLoading}
            className={`h-11 ${errors.confirmPassword ? 'border-destructive focus-visible:ring-destructive' : ''}`}
            {...register('confirmPassword')}
          />
          {errors.confirmPassword && (
            <p className="text-xs font-medium text-destructive">{errors.confirmPassword.message}</p>
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
              Criando conta...
            </>
          ) : (
            'Criar conta grátis'
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
