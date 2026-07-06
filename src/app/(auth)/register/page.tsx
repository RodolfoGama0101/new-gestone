import { RegisterForm } from '@/components/auth/register-form'
import { ThemeToggle } from '@/components/shared/theme-toggle'
import { PiggyBank } from 'lucide-react'

export default function RegisterPage() {
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
        <RegisterForm />
      </div>
    </div>
  )
}
