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
import { loginSchema, type LoginInput } from '@/lib/validations/auth.schema'
import { signInWithEmail } from '@/lib/firebase/auth'

export function LoginForm() {
  const [isLoading, setIsLoading] = React.useState(false)
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
      router.push('/')
      router.refresh()
    } catch (error) {
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
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto shadow-xl border-border bg-card">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">Entrar no GestOne</CardTitle>
        <CardDescription className="text-center">
          Digite seu e-mail e senha para acessar sua conta
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
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Senha</Label>
              <Link
                href="/forgot-password"
                className="text-xs text-primary hover:underline hover:text-primary/90"
              >
                Esqueceu a senha?
              </Link>
            </div>
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

          <Button type="submit" className="w-full font-semibold" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Entrando...
              </>
            ) : (
              'Entrar'
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
          Não tem uma conta?{' '}
          <Link href="/register" className="text-primary hover:underline font-medium">
            Criar conta
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}
