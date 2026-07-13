'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Loader2, ArrowLeft, Mail } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ThemeToggle } from '@/components/shared/theme-toggle'
import { Logo } from '@/components/shared/logo'
import { forgotPasswordSchema, type ForgotPasswordInput } from '@/lib/validations/auth.schema'
import { sendPasswordReset } from '@/lib/firebase/auth'

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = React.useState(false)
  const [sent, setSent] = React.useState(false)
  const router = useRouter()

  const {
    register,
    handleSubmit,
    getValues,
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
      setSent(true)
      toast.success('E-mail de recuperação enviado com sucesso! Verifique sua caixa de entrada.')
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
    <div className="relative min-h-screen flex">
      {/* Left Panel — Branding */}
      <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden flex-col items-center justify-center p-14 bg-black">
        {/* Decorative background grid */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <svg className="absolute inset-0 size-full opacity-[0.035]" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="dots-fp" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1" fill="#ffffff" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dots-fp)" />
          </svg>
          {/* Subtle light border in center */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>

        <div className="relative z-10 flex flex-col items-start gap-12 max-w-md w-full">
          <Logo variant="full" size="lg" textColor="text-white" href="" />

          <div className="space-y-4">
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-white xl:text-5xl">
              Recupere o<br />
              acesso à<br />
              <span className="text-neutral-400 font-medium">sua conta</span>
            </h1>
            <p className="text-sm text-neutral-400 leading-relaxed max-w-xs">
              Enviaremos um link seguro para o e-mail cadastrado para você redefinir sua senha.
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel — Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-background relative">
        {/* Theme Toggle */}
        <div className="absolute top-5 right-5">
          <ThemeToggle />
        </div>

        {/* Mobile logo */}
        <div className="lg:hidden flex items-center justify-center mb-10">
          <Logo variant="full" size="md" />
        </div>

        <div className="w-full max-w-sm animate-in fade-in slide-in-from-bottom-3 duration-300">
          {sent ? (
            /* Success state */
            <div className="space-y-6 text-center">
              <div className="size-16 rounded-full bg-primary/10 border border-primary/15 flex items-center justify-center mx-auto">
                <Mail className="size-7 text-primary" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold tracking-tight text-foreground">
                  E-mail enviado!
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Enviamos um link de recuperação para{' '}
                  <span className="font-semibold text-foreground">{getValues('email')}</span>.
                  Verifique sua caixa de entrada e o spam.
                </p>
              </div>
              <Button
                className="w-full h-11 font-bold cursor-pointer"
                onClick={() => router.push('/login')}
              >
                Voltar ao login
              </Button>
            </div>
          ) : (
            /* Recovery form */
            <>
              <div className="mb-8 space-y-1.5">
                <h2 className="text-2xl font-bold tracking-tight text-foreground">
                  Recuperar senha
                </h2>
                <p className="text-sm text-muted-foreground">
                  Digite seu e-mail para receber o link de recuperação
                </p>
              </div>

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

                <Button
                  type="submit"
                  className="w-full h-11 font-bold text-sm cursor-pointer"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Enviando link...
                    </>
                  ) : (
                    'Enviar link de recuperação'
                  )}
                </Button>
              </form>

              <div className="mt-7 text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
                >
                  <ArrowLeft className="size-3.5" />
                  Voltar ao login
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
