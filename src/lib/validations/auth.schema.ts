import { z } from 'zod'

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'O e-mail é obrigatório')
    .email('Formato de e-mail inválido'),
  password: z
    .string()
    .min(1, 'A senha é obrigatória')
    .min(8, 'A senha deve ter pelo menos 8 caracteres'),
})

export const registerSchema = z
  .object({
    email: z
      .string()
      .min(1, 'O e-mail é obrigatório')
      .email('Formato de e-mail inválido'),
    password: z
      .string()
      .min(1, 'A senha é obrigatória')
      .min(8, 'A senha deve ter pelo menos 8 caracteres')
      .refine((val) => /[A-Z]/.test(val), {
        message: 'A senha deve conter pelo menos uma letra maiúscula',
      })
      .refine((val) => /[0-9]/.test(val), {
        message: 'A senha deve conter pelo menos um número',
      })
      .refine((val) => /[^A-Za-z0-9]/.test(val), {
        message: 'A senha deve conter pelo menos um caractere especial',
      }),
    confirmPassword: z.string().min(1, 'Confirmação de senha é obrigatória'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  })

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'O e-mail é obrigatório')
    .email('Formato de e-mail inválido'),
})

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
