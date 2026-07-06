'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Loader2, PiggyBank, ArrowLeft } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { ThemeToggle } from '@/components/shared/theme-toggle'
import { forgotPasswordSchema, type ForgotPasswordInput } from '@/lib/validations/auth.schema'
import { sendPasswordReset } from '@/lib/firebase/auth'

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = React.useState(false)
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  })

  const onSubmit = async (data: ForgotPasswordInput) => {
    setIsLoading(true)
    try {
      await sendPasswordReset(data.email)
      toast.success('E-mail de recuperação enviado com sucesso! Verifique sua caixa de entrada.')
      router.push('/login')
    } catch (error) {
      const authError = error as { code?: string }
      console.error('Password Reset Error:', error)
      switch (authError.code) {
        case 'auth/user-not-found':
          toast.error('Nenhum usuário encontrado com este e-mail.')
          break
        case 'auth/invalid-email':
          toast.error('Formato de e-mail inválido.')
          break
        default:
          toast.error('Erro ao enviar e-mail de recuperação. Tente novamente.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-4 bg-background text-foreground transition-colors duration-200">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-2">
          <div className="p-3 bg-primary/10 rounded-2xl text-primary shadow-inner">
            <PiggyBank className="size-8" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-indigo-500 bg-clip-text text-transparent">
            GestOne
          </h1>
        </div>

        <Card className="shadow-xl border-border bg-card">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Recuperar Senha</CardTitle>
            <CardDescription className="text-center">
              Digite seu e-mail e enviaremos um link para redefinir sua senha
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

              <Button type="submit" className="w-full font-semibold" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Enviando link...
                  </>
                ) : (
                  'Enviar Link de Recuperação'
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter>
            <Link
              href="/login"
              className="flex items-center justify-center gap-2 text-sm text-primary hover:underline hover:text-primary/90 mx-auto font-medium"
            >
              <ArrowLeft className="size-4" />
              Voltar para o login
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
