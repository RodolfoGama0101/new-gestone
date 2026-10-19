'use client'

import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { auth } from '@/lib/firebase/config'
import { useAuth } from '@/contexts/auth-context'
import {
  EmailAuthProvider,
  GoogleAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  type User,
} from 'firebase/auth'
import { toast } from 'sonner'

interface ReauthDialogProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  title?: string
  description?: string
}

export function ReauthDialog({
  isOpen,
  onClose,
  onSuccess,
  title = 'Reautenticação Necessária',
  description = 'Para prosseguir com esta ação de segurança, confirme sua identidade.',
}: ReauthDialogProps) {
  const { user } = useAuth()

  // Desmontar o conteúdo ao fechar ou trocar de usuário descarta senha e confirmação pendente.
  return isOpen ? (
    <ReauthContent
      key={user?.uid ?? 'signed-out'}
      user={user}
      onClose={onClose}
      onSuccess={onSuccess}
      title={title}
      description={description}
    />
  ) : null
}

function reauthErrorMessage(error: unknown) {
  const code = (error as { code?: string })?.code
  switch (code) {
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'Confirmação cancelada. Nenhuma ação foi executada.'
    case 'auth/popup-blocked':
    case 'auth/operation-not-supported-in-this-environment':
      return 'Permita pop-ups ou abra o GestOne no navegador para confirmar com o Google.'
    case 'auth/user-mismatch':
      return 'Selecione a mesma conta Google conectada ao GestOne.'
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
      return 'Senha incorreta. Tente novamente.'
    case 'auth/too-many-requests':
      return 'Muitas tentativas. Aguarde um pouco e tente novamente.'
    default:
      return 'Não foi possível confirmar sua identidade. Tente novamente.'
  }
}

function ReauthContent({
  user,
  onClose,
  onSuccess,
  title,
  description,
}: Omit<ReauthDialogProps, 'isOpen'> & { user: User | null }) {
  const [password, setPassword] = React.useState('')
  const [pendingMethod, setPendingMethod] = React.useState<
    'password' | 'google' | null
  >(null)
  const activeRef = React.useRef(true)
  const busyRef = React.useRef(false)
  const isLoading = pendingMethod !== null
  const hasPassword =
    !!user?.email &&
    user.providerData.some(({ providerId }) => providerId === 'password')
  const hasGoogle = !!user?.providerData.some(
    ({ providerId }) => providerId === 'google.com',
  )

  React.useEffect(() => {
    activeRef.current = true
    return () => {
      activeRef.current = false
    }
  }, [])

  const handleClose = () => {
    activeRef.current = false
    setPassword('')
    onClose()
  }

  const handleReauthenticate = async (method: 'password' | 'google') => {
    if (busyRef.current || !activeRef.current) return
    if (!user || auth.currentUser?.uid !== user.uid) {
      toast.error('Nenhum usuário ativo encontrado.')
      return
    }
    if (
      (method === 'password' && !hasPassword) ||
      (method === 'google' && !hasGoogle)
    )
      return

    busyRef.current = true
    setPendingMethod(method)
    try {
      if (method === 'google') {
        const provider = new GoogleAuthProvider()
        provider.setCustomParameters({ prompt: 'select_account' })
        await reauthenticateWithPopup(user, provider)
      } else {
        const credential = EmailAuthProvider.credential(user.email!, password)
        await reauthenticateWithCredential(user, credential)
      }
    } catch (error) {
      if (activeRef.current) {
        setPendingMethod(null)
        busyRef.current = false
        toast.error(reauthErrorMessage(error))
      }
      return
    }

    if (!activeRef.current) return
    if (auth.currentUser?.uid !== user.uid) {
      handleClose()
      toast.error('A conta conectada mudou. Inicie a ação novamente.')
      return
    }
    toast.success('Identidade confirmada!')
    setPassword('')
    onSuccess()
  }

  return (
    <Dialog open onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[400px]">
        <form
          onSubmit={(event) => {
            event.preventDefault()
            void handleReauthenticate('password')
          }}
        >
          <DialogHeader className="text-left">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {hasGoogle && (
              <Button
                type="button"
                variant="outline"
                className="w-full cursor-pointer"
                disabled={isLoading}
                onClick={() => void handleReauthenticate('google')}
              >
                {pendingMethod === 'google' && (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                )}
                {pendingMethod === 'google'
                  ? 'Confirmando com o Google...'
                  : 'Confirmar com o Google'}
              </Button>
            )}
            {hasGoogle && hasPassword && (
              <p className="text-muted-foreground text-xs">
                Ou confirme com sua senha atual.
              </p>
            )}
            {hasPassword && (
              <div className="space-y-2 text-left">
                <Label htmlFor="current-password">Senha Atual</Label>
                <Input
                  id="current-password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
            )}
            {!hasGoogle && !hasPassword && (
              <p className="text-muted-foreground text-sm">
                Não há um método de confirmação disponível. Entre novamente para
                continuar.
              </p>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={handleClose}
              className="cursor-pointer"
            >
              Cancelar
            </Button>
            {hasPassword && (
              <Button
                type="submit"
                disabled={isLoading}
                className="cursor-pointer font-semibold"
              >
                {pendingMethod === 'password' ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Confirmando...
                  </>
                ) : (
                  'Confirmar Senha'
                )}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
