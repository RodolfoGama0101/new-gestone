'use client'

import * as React from 'react'
import { usePreferences } from '@/providers/preferences-provider'
import { auth } from '@/lib/firebase/config'
import { AccountDeletionError, deleteAccount } from '@/lib/firebase/account'
import { updateProfile, updatePassword } from 'firebase/auth'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { ReauthDialog } from '@/components/auth/reauth-dialog'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  Sun,
  Moon,
  Monitor,
  User,
  Lock,
  Settings as SettingsIcon,
  Trash2,
  Loader2,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { passwordSchema } from '@/lib/validations/auth.schema'
import { useAuth } from '@/contexts/auth-context'
import { McpConnections } from '@/components/integrations/mcp-connections'

export default function SettingsPage() {
  const {
    theme,
    changeTheme,
    isLoading: isLoadingPreferences,
    isSaving: isSavingPreferences,
    error: preferencesError,
    refetch: refetchPreferences,
  } = usePreferences()
  const { signOutUser } = useAuth()
  const user = auth.currentUser

  const [activeTab, setActiveTab] = React.useState<
    'profile' | 'preferences' | 'security' | 'integrations' | 'danger'
  >('profile')

  // Estados de Nome
  const [name, setName] = React.useState(user?.displayName ?? '')
  const [isSavingName, setIsSavingName] = React.useState(false)

  // Estados de Senha
  const [newPassword, setNewPassword] = React.useState('')
  const [confirmPassword, setConfirmPassword] = React.useState('')
  const [isSavingPassword, setIsSavingPassword] = React.useState(false)
  const [passwordError, setPasswordError] = React.useState<string | null>(null)

  // Modais de Controle de Fluxo
  const [reauthAction, setReauthAction] = React.useState<
    'password' | 'delete' | null
  >(null)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = React.useState(false)
  const [deleteConfirmationText, setDeleteConfirmationText] = React.useState('')
  const [isDeletingAccount, setIsDeletingAccount] = React.useState(false)

  // Atualizar Nome de Perfil
  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    const currentUser = auth.currentUser
    if (!currentUser) return

    setIsSavingName(true)
    try {
      await updateProfile(currentUser, { displayName: name })
      toast.success('Nome de perfil atualizado com sucesso!')
      // Força recarregamento leve dos componentes da casca para atualizar avatar
      window.location.reload()
    } catch (error) {
      console.error(error)
      toast.error('Erro ao atualizar nome de perfil.')
    } finally {
      setIsSavingName(false)
    }
  }

  // Mudar Senha
  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError(null)
    const passwordValidation = passwordSchema.safeParse(newPassword)
    if (!passwordValidation.success) {
      setPasswordError(
        passwordValidation.error.issues[0]?.message ?? 'Senha inválida.',
      )
      toast.error(
        passwordValidation.error.issues[0]?.message ?? 'Senha inválida.',
      )
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('As senhas não coincidem.')
      toast.error('As senhas não coincidem.')
      return
    }

    const currentUser = auth.currentUser
    if (!currentUser) return

    setIsSavingPassword(true)
    try {
      await updatePassword(currentUser, newPassword)
      toast.success('Senha atualizada com sucesso!')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
      const authError = error as { code?: string }
      console.error(error)
      // Se exigir login recente, abre diálogo de reautenticação
      if (authError.code === 'auth/requires-recent-login') {
        setReauthAction('password')
      } else {
        toast.error(
          'Erro ao alterar senha. Verifique os critérios de segurança.',
        )
      }
    } finally {
      setIsSavingPassword(false)
    }
  }

  // Callback de sucesso da Reautenticação
  const handleReauthSuccess = async () => {
    setReauthAction(null)
    const currentUser = auth.currentUser
    if (!currentUser) return

    if (reauthAction === 'password') {
      setIsSavingPassword(true)
      try {
        await updatePassword(currentUser, newPassword)
        toast.success('Senha atualizada com sucesso!')
        setNewPassword('')
        setConfirmPassword('')
      } catch (err) {
        console.error(err)
        toast.error('Falha ao redefinir senha após reautenticação.')
      } finally {
        setIsSavingPassword(false)
      }
    } else if (reauthAction === 'delete') {
      await executeCascadeDelete()
    }
  }

  // A exclusão é executada no servidor com Firebase Admin, inclusive subcoleções.
  const executeCascadeDelete = async () => {
    const currentUser = auth.currentUser
    if (!currentUser) return

    setIsDeletingAccount(true)
    try {
      await deleteAccount(currentUser)
      await signOutUser()

      toast.success('Sua conta e dados foram completamente apagados.')
      // Uma navegação completa evita disputa com os redirecionamentos do layout após logout.
      window.location.replace('/register')
    } catch (error) {
      if (
        error instanceof AccountDeletionError &&
        error.code === 'auth/requires-recent-login'
      ) {
        setReauthAction('delete')
        toast.error('A confirmação expirou. Confirme sua identidade novamente.')
      } else {
        toast.error(
          error instanceof AccountDeletionError
            ? error.message
            : 'Erro ao apagar conta. Tente novamente mais tarde.',
        )
      }
    } finally {
      setIsDeletingAccount(false)
    }
  }

  // Tratar pedido de Exclusão de Conta
  const handleDeleteAccountClick = () => {
    if (deleteConfirmationText !== 'EXCLUIR CONTA') {
      toast.error('Escreva o texto de confirmação em letras maiúsculas.')
      return
    }
    setIsDeleteConfirmOpen(false)
    setReauthAction('delete') // Confirma a identidade antes da exclusão
  }

  return (
    <div className="animate-in fade-in space-y-6 duration-200">
      {/* Header */}
      <PageHeader
        title="Configurações"
        description="Gerencie seu perfil, preferências de exibição e segurança da conta."
      />

      {/* Tabs Control */}
      <div
        role="group"
        aria-label="Seções de configurações"
        className="border-border flex flex-wrap gap-x-6 gap-y-2 border-b"
      >
        {(
          [
            { id: 'profile', label: 'Perfil', icon: User },
            { id: 'preferences', label: 'Preferências', icon: SettingsIcon },
            { id: 'security', label: 'Segurança', icon: Lock },
            { id: 'integrations', label: 'Integrações', icon: SettingsIcon },
            { id: 'danger', label: 'Excluir conta', icon: Trash2 },
          ] as const
        ).map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              id={'settings-' + tab.id}
              aria-pressed={isActive}
              aria-controls="settings-panel"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'focus-visible:ring-ring -mb-px flex shrink-0 cursor-pointer items-center gap-1.5 border-b-2 px-0 pt-0 pb-3.5 text-sm font-medium transition-all outline-none focus-visible:ring-2',
                isActive
                  ? 'border-primary text-foreground'
                  : 'text-muted-foreground hover:text-foreground border-transparent',
              )}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab Contents */}
      <div
        id="settings-panel"
        role="region"
        aria-labelledby={'settings-' + activeTab}
        className="max-w-[760px] min-w-0 [&_button]:h-auto [&_button]:min-h-10 [&_button]:max-w-full [&_button]:py-2 [&_button]:whitespace-normal"
      >
        {activeTab === 'integrations' && <McpConnections />}
        {activeTab === 'profile' && (
          <Card className="border-border bg-card rounded-md">
            <CardHeader className="border-border border-b pb-6">
              <CardTitle className="text-base font-medium">
                Informações do perfil
              </CardTitle>
              <CardDescription className="text-muted-foreground text-sm">
                Atualize seu nome público de exibição
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveName} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="displayName" className="text-sm">
                    Nome de Exibição
                  </Label>
                  <Input
                    id="displayName"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nome do usuário"
                    maxLength={50}
                    required
                    disabled={isSavingName}
                    className="h-10 rounded-md text-base md:text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profile-email">E-mail</Label>
                  <Input
                    id="profile-email"
                    type="email"
                    value={user?.email ?? ''}
                    readOnly
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isSavingName}
                  className="h-10 cursor-pointer gap-2 rounded-md text-sm font-medium"
                >
                  {isSavingName ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    'Salvar Nome'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {activeTab === 'preferences' && (
          <Card className="border-border bg-card rounded-md">
            <CardHeader className="border-border border-b pb-6">
              <CardTitle className="text-base font-medium">
                Preferências
              </CardTitle>
              <CardDescription className="text-muted-foreground text-sm">
                Personalize o comportamento do aplicativo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Seletor de Tema */}
              <div className="space-y-2">
                <Label className="text-sm">Tema da Interface</Label>
                <div
                  role="group"
                  aria-label="Tema da interface"
                  className="grid grid-cols-1 gap-2 sm:grid-cols-3"
                >
                  <Button
                    aria-pressed={theme === 'light'}
                    variant={theme === 'light' ? 'default' : 'outline'}
                    className="min-h-10 cursor-pointer justify-center gap-1.5 rounded-md text-sm"
                    disabled={
                      isLoadingPreferences ||
                      isSavingPreferences ||
                      !!preferencesError
                    }
                    onClick={() => {
                      void changeTheme('light').catch(() => undefined)
                    }}
                  >
                    <Sun className="size-3.5" />
                    Claro
                  </Button>
                  <Button
                    aria-pressed={theme === 'dark'}
                    variant={theme === 'dark' ? 'default' : 'outline'}
                    className="min-h-10 cursor-pointer justify-center gap-1.5 rounded-md text-sm"
                    disabled={
                      isLoadingPreferences ||
                      isSavingPreferences ||
                      !!preferencesError
                    }
                    onClick={() => {
                      void changeTheme('dark').catch(() => undefined)
                    }}
                  >
                    <Moon className="size-3.5" />
                    Escuro
                  </Button>
                  <Button
                    aria-pressed={theme === 'system'}
                    variant={theme === 'system' ? 'default' : 'outline'}
                    className="min-h-10 cursor-pointer justify-center gap-1.5 rounded-md text-sm"
                    disabled={
                      isLoadingPreferences ||
                      isSavingPreferences ||
                      !!preferencesError
                    }
                    onClick={() => {
                      void changeTheme('system').catch(() => undefined)
                    }}
                  >
                    <Monitor className="size-3.5" />
                    Sistema
                  </Button>
                </div>
              </div>

              {preferencesError && (
                <div role="alert">
                  Não foi possível carregar seu tema.{' '}
                  <Button variant="outline" onClick={refetchPreferences}>
                    Tentar novamente
                  </Button>
                </div>
              )}
              <p role="status" className="text-muted-foreground text-sm">
                {isSavingPreferences
                  ? 'Salvando tema…'
                  : 'O tema é salvo na sua conta e recuperado em outros dispositivos.'}
              </p>
              <div className="space-y-2">
                <p className="text-sm font-medium">Moeda Base</p>
                <p className="text-sm">Real Brasileiro (BRL, R$)</p>
                <p className="text-muted-foreground text-sm">
                  Valores em reais, armazenados em centavos. O CSV usa vírgula
                  decimal e não realiza conversão de moeda.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'security' && (
          <Card className="border-border bg-card rounded-md">
            <CardHeader className="border-border border-b pb-6">
              <CardTitle className="text-base font-medium">Segurança</CardTitle>
              <CardDescription className="text-muted-foreground text-sm">
                Altere a senha de acesso a sua conta
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                aria-busy={isSavingPassword}
                onSubmit={handleSavePassword}
                className="space-y-4"
              >
                <div className="space-y-1.5">
                  <Label htmlFor="new-password" className="text-sm">
                    Nova Senha
                  </Label>
                  <Input
                    id="new-password"
                    autoComplete="new-password"
                    aria-invalid={!!passwordError}
                    aria-describedby={
                      passwordError ? 'password-error' : undefined
                    }
                    type="password"
                    placeholder="8+ caracteres, maiúscula, número e símbolo"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    disabled={isSavingPassword}
                    className="h-10 rounded-md text-base md:text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirm-password" className="text-sm">
                    Confirmar Nova Senha
                  </Label>
                  <Input
                    id="confirm-password"
                    autoComplete="new-password"
                    aria-invalid={!!passwordError}
                    aria-describedby={
                      passwordError ? 'password-error' : undefined
                    }
                    type="password"
                    placeholder="Repita a nova senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={isSavingPassword}
                    className="h-10 rounded-md text-base md:text-sm"
                  />
                </div>

                {passwordError && (
                  <p
                    id="password-error"
                    role="alert"
                    className="text-destructive text-sm"
                  >
                    {passwordError}
                  </p>
                )}
                <Button
                  type="submit"
                  disabled={isSavingPassword}
                  className="h-10 w-full cursor-pointer gap-2 rounded-md text-sm font-medium"
                >
                  {isSavingPassword ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      Alterando...
                    </>
                  ) : (
                    'Alterar Senha'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {activeTab === 'danger' && (
          <Card className="border-destructive/30 bg-card rounded-md">
            <CardHeader className="border-border border-b pb-6">
              <CardTitle className="text-destructive text-base font-medium">
                Excluir Conta
              </CardTitle>
              <CardDescription className="text-muted-foreground text-sm">
                Ações permanentes e irreversíveis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-muted-foreground text-sm leading-normal font-medium">
                Ao apagar sua conta, todos os lançamentos financeiros,
                relatórios, configurações e categorias salvas no Firestore serão
                removidos permanentemente. A ação não poderá ser desfeita.
              </p>

              <div className="space-y-1.5">
                <Label
                  htmlFor="confirmDeleteText"
                  className="text-muted-foreground text-sm font-medium uppercase"
                >
                  Escreva &quot;EXCLUIR CONTA&quot; para liberar
                </Label>
                <Input
                  id="confirmDeleteText"
                  placeholder="EXCLUIR CONTA"
                  value={deleteConfirmationText}
                  onChange={(e) => setDeleteConfirmationText(e.target.value)}
                  className="h-10 rounded-md border-red-200/50 text-base focus-visible:ring-red-500 md:text-sm dark:border-red-900/20"
                />
              </div>

              <Button
                type="button"
                variant="destructive"
                onClick={() => setIsDeleteConfirmOpen(true)}
                disabled={
                  deleteConfirmationText !== 'EXCLUIR CONTA' ||
                  isDeletingAccount
                }
                className="min-h-10 w-full cursor-pointer gap-2 rounded-md text-sm font-semibold"
              >
                {isDeletingAccount ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    Apagando dados...
                  </>
                ) : (
                  'Excluir Conta Permanentemente'
                )}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Confirmação de Ação Destrutiva */}
      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleDeleteAccountClick}
        title="Excluir Conta Definitivamente?"
        description="Esta é uma ação crítica. Todos os seus dados serão apagados para sempre e o seu cadastro de e-mail será descadastrado do GestOne."
        confirmText="Confirmar Exclusão"
        isDestructive
      />

      {/* Confirmação de identidade pelos provedores vinculados */}
      <ReauthDialog
        isOpen={reauthAction !== null}
        onClose={() => setReauthAction(null)}
        onSuccess={handleReauthSuccess}
        title={
          reauthAction === 'delete'
            ? 'Confirmar Exclusão de Conta'
            : 'Redefinição de Senha'
        }
        description={
          reauthAction === 'delete'
            ? 'Para apagar sua conta definitivamente, confirme sua identidade.'
            : 'Confirme sua identidade para autorizar a alteração segura da senha.'
        }
      />
    </div>
  )
}
