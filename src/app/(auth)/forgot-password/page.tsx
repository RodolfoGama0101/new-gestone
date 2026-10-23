'use client'

import { fieldErrorProps } from '@/lib/utils/form-accessibility'

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
import { AuthShell } from '@/components/auth/auth-shell'
import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from '@/lib/validations/auth.schema'
import { sendPasswordReset } from '@/lib/firebase/auth'

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = React.useState(false)
  const [sent, setSent] = React.useState(false)
  const router = useRouter()
  const resultHeading = React.useRef<HTMLHeadingElement>(null)
  React.useEffect(() => {
    if (sent) resultHeading.current?.focus()
  }, [sent])

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
      toast.success(
        'Se existir uma conta para este e-mail, enviaremos as instruções de recuperação.',
      )
    } catch (error) {
      const authError = error as { code?: string }
      console.error('Password Reset Error:', error)
      if (authError.code === 'auth/user-not-found') {
        setSent(true)
        toast.success(
          'Se existir uma conta para este e-mail, enviaremos as instruções de recuperação.',
        )
      } else {
        toast.error('Erro ao enviar e-mail de recuperação. Tente novamente.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthShell>
      {sent ? (
        /* Success state */
        <div role="status" className="space-y-6 text-center">
          <div className="bg-primary/10 border-primary/15 mx-auto flex size-16 items-center justify-center rounded-full border">
            <Mail className="text-primary size-7" />
          </div>
          <div className="space-y-2">
            <h1
              ref={resultHeading}
              tabIndex={-1}
              className="text-foreground text-2xl font-bold tracking-tight"
            >
              E-mail enviado!
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Enviamos um link de recuperação para{' '}
              <span className="text-foreground font-semibold">
                {getValues('email')}
              </span>
              . Verifique sua caixa de entrada e o spam.
            </p>
          </div>
          <Button
            className="h-11 w-full cursor-pointer font-bold"
            onClick={() => router.push('/login')}
          >
            Voltar ao login
          </Button>
        </div>
      ) : (
        /* Recovery form */
        <>
          <div className="mb-8 space-y-1.5">
            <h1 className="text-foreground text-2xl font-bold tracking-tight">
              Recuperar senha
            </h1>
            <p className="text-muted-foreground text-sm">
              Digite seu e-mail para receber o link de recuperação
            </p>
          </div>

          <form
            aria-busy={isLoading}
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label
                htmlFor="email"
                className="text-foreground text-sm font-semibold"
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
                className={`h-11 ${errors.email ? 'border-destructive focus-visible:ring-destructive' : ''}`}
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

            <Button
              type="submit"
              className="h-11 w-full cursor-pointer text-sm font-bold"
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
            <p role="status" className="sr-only">
              {isLoading ? 'Enviando instruções…' : ''}
            </p>
          </form>

          <div className="mt-7 text-center">
            <Link
              href="/login"
              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm font-medium underline-offset-4 transition-colors hover:underline"
            >
              <ArrowLeft className="size-3.5" />
              Voltar ao login
            </Link>
          </div>
        </>
      )}
    </AuthShell>
  )
}
