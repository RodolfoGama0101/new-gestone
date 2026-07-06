'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { GoogleAuthButton } from './google-auth-button'
import { registerSchema, type RegisterInput } from '@/lib/validations/auth.schema'
import { signUpWithEmail } from '@/lib/firebase/auth'

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
      await signUpWithEmail(data.email, data.password)
      toast.success('Conta criada com sucesso! Bem-vindo(a).')
      router.push('/')
      router.refresh()
    } catch (error) {
      const authError = error as { code?: string }
      console.error('Registration Error:', error)
      switch (authError.code) {
        case 'auth/email-already-in-use':
          toast.error('Este e-mail já está em uso por outra conta.')
          break
        case 'auth/invalid-email':
          toast.error('Formato de e-mail inválido.')
          break
        case 'auth/operation-not-allowed':
          toast.error('O registro de usuários está desativado no momento.')
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
    <Card className="w-full max-w-md mx-auto shadow-xl border-border bg-card">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">Criar conta no GestOne</CardTitle>
        <CardDescription className="text-center">
          Preencha os campos abaixo para criar sua conta
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              placeholder="exemplo@dominio.com"
              disabled={isLoading}
              className={errors.email ? 'border-destructive focus-visible:ring-destructive' : ''}
              {...register('email')}
            />
            {errors.email && (
              <p className="text-xs font-medium text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              disabled={isLoading}
              className={errors.password ? 'border-destructive focus-visible:ring-destructive' : ''}
              {...register('password')}
            />
            {errors.password && (
              <p className="text-xs font-medium text-destructive">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar Senha</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              disabled={isLoading}
              className={errors.confirmPassword ? 'border-destructive focus-visible:ring-destructive' : ''}
              {...register('confirmPassword')}
            />
            {errors.confirmPassword && (
              <p className="text-xs font-medium text-destructive">{errors.confirmPassword.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full font-semibold" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Criando conta...
              </>
            ) : (
              'Criar Conta'
            )}
          </Button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <Separator className="w-full" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">Ou continuar com</span>
          </div>
        </div>

        <GoogleAuthButton />
      </CardContent>
      <CardFooter className="flex flex-col space-y-2">
        <p className="text-sm text-center text-muted-foreground w-full">
          Já tem uma conta?{' '}
          <Link href="/login" className="text-primary hover:underline font-medium">
            Fazer login
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}
