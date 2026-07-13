'use client'

import * as React from 'react'
import { useTheme } from 'next-themes'
import { auth, db } from '@/lib/firebase/config'
import { updateProfile, updatePassword, deleteUser } from 'firebase/auth'
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { ReauthDialog } from '@/components/auth/reauth-dialog'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { 
  Sun, 
  Moon, 
  Monitor, 
  User, 
  Lock, 
  Settings as SettingsIcon,
  Trash2,
  Loader2
} from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const user = auth.currentUser

  const [activeTab, setActiveTab] = React.useState<'profile' | 'preferences' | 'security' | 'danger'>('profile')

  // Estados de Nome
  const [name, setName] = React.useState(user?.displayName ?? '')
  const [isSavingName, setIsSavingName] = React.useState(false)

  // Estados de Senha
  const [newPassword, setNewPassword] = React.useState('')
  const [confirmPassword, setConfirmPassword] = React.useState('')
  const [isSavingPassword, setIsSavingPassword] = React.useState(false)

  // Estados de Preferência
  const [currency, setCurrency] = React.useState('BRL')

  const handleCurrencyChange = (val: string | null) => {
    if (val) setCurrency(val)
  }

  // Modais de Controle de Fluxo
  const [reauthAction, setReauthAction] = React.useState<'password' | 'delete' | null>(null)
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
    if (newPassword.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres.')
      return
    }
    if (newPassword !== confirmPassword) {
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
        toast.error('Erro ao alterar senha. Verifique os critérios de segurança.')
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

  // Executar Exclusão em Cascata (Firestore + Auth)
  const executeCascadeDelete = async () => {
    const currentUser = auth.currentUser
    if (!currentUser) return

    setIsDeletingAccount(true)
    try {
      const userId = currentUser.uid
      const batch = writeBatch(db)

      // 1. Deletar todas as transações
      const transactionsSnap = await getDocs(collection(db, 'users', userId, 'transactions'))
      transactionsSnap.forEach((docSnap) => {
        batch.delete(docSnap.ref)
      })

      // 2. Deletar todas as categorias
      const categoriesSnap = await getDocs(collection(db, 'users', userId, 'categories'))
      categoriesSnap.forEach((docSnap) => {
        batch.delete(docSnap.ref)
      })

      // 3. Deletar documento do usuário
      batch.delete(doc(db, 'users', userId))

      // Commit das deleções do Firestore
      await batch.commit()

      // 4. Deletar conta do Firebase Auth
      await deleteUser(currentUser)

      toast.success('Sua conta e dados foram completamente apagados.')
      router.push('/register')
    } catch (error) {
      console.error(error)
      toast.error('Erro ao apagar conta. Tente novamente mais tarde.')
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
    setReauthAction('delete') // Abre modal de senha antes da exclusão
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <PageHeader
        title="Configurações"
        description="Gerencie seu perfil, preferências de exibição e segurança da conta."
      />

      {/* Tabs Control */}
      <div className="flex border-b border-border overflow-x-auto scrollbar-thin">
        {([
          { id: 'profile', label: 'Meu Perfil', icon: User },
          { id: 'preferences', label: 'Preferências', icon: SettingsIcon },
          { id: 'security', label: 'Segurança', icon: Lock },
          { id: 'danger', label: 'Zona de Risco', icon: Trash2 },
        ] as const).map((tab) => {
          const TabIcon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2.5 border-b-2 text-xs font-semibold transition-all -mb-px shrink-0 outline-none cursor-pointer",
                isActive
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <TabIcon className="size-3.5" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab Contents */}
      <div className="max-w-2xl">
        {activeTab === 'profile' && (
          <Card className="border-border bg-card shadow-xs rounded-md">
            <CardHeader className="pb-1 pt-4 px-5">
              <CardTitle className="text-sm font-semibold">Meu Perfil</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">Atualize seu nome público de exibição</CardDescription>
            </CardHeader>
            <CardContent className="px-5 pb-5 pt-3">
              <form onSubmit={handleSaveName} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="displayName" className="text-xs">Nome de Exibição</Label>
                  <Input
                    id="displayName"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nome do usuário"
                    maxLength={50}
                    required
                    disabled={isSavingName}
                    className="h-9 text-xs rounded-md"
                  />
                </div>
                <Button type="submit" disabled={isSavingName} className="w-full text-xs font-semibold h-9 rounded-md cursor-pointer gap-2">
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
          <Card className="border-border bg-card shadow-xs rounded-md">
            <CardHeader className="pb-1 pt-4 px-5">
              <CardTitle className="text-sm font-semibold">Preferências</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">Personalize o comportamento do aplicativo</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 px-5 pb-5 pt-3">
              {/* Seletor de Tema */}
              <div className="space-y-2">
                <Label className="text-xs">Tema da Interface</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant={theme === 'light' ? 'default' : 'outline'}
                    className="gap-1.5 text-xs h-9 cursor-pointer justify-center rounded-md"
                    onClick={() => setTheme('light')}
                  >
                    <Sun className="size-3.5" />
                    Claro
                  </Button>
                  <Button
                    variant={theme === 'dark' ? 'default' : 'outline'}
                    className="gap-1.5 text-xs h-9 cursor-pointer justify-center rounded-md"
                    onClick={() => setTheme('dark')}
                  >
                    <Moon className="size-3.5" />
                    Escuro
                  </Button>
                  <Button
                    variant={theme === 'system' ? 'default' : 'outline'}
                    className="gap-1.5 text-xs h-9 cursor-pointer justify-center rounded-md"
                    onClick={() => setTheme('system')}
                  >
                    <Monitor className="size-3.5" />
                    Sistema
                  </Button>
                </div>
              </div>

              {/* Seletor de Moeda */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="currency" className="text-xs">Moeda Base</Label>
                  <span className="text-[9px] font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Em breve</span>
                </div>
                <Select value={currency} onValueChange={handleCurrencyChange} disabled>
                  <SelectTrigger id="currency" className="w-full h-9 text-xs rounded-md opacity-70">
                    <SelectValue placeholder="Selecione a moeda" />
                  </SelectTrigger>
                  <SelectContent className="rounded-md">
                    <SelectItem value="BRL" className="text-xs rounded-md">Real Brasileiro (BRL, R$)</SelectItem>
                    <SelectItem value="USD" className="text-xs rounded-md">Dólar Americano (USD, $)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'security' && (
          <Card className="border-border bg-card shadow-xs rounded-md">
            <CardHeader className="pb-1 pt-4 px-5">
              <CardTitle className="text-sm font-semibold">Segurança</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">Altere a senha de acesso a sua conta</CardDescription>
            </CardHeader>
            <CardContent className="px-5 pb-5 pt-3">
              <form onSubmit={handleSavePassword} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="new-password" className="text-xs">Nova Senha</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    disabled={isSavingPassword}
                    className="h-9 text-xs rounded-md"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirm-password" className="text-xs">Confirmar Nova Senha</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="Repita a nova senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={isSavingPassword}
                    className="h-9 text-xs rounded-md"
                  />
                </div>

                <Button type="submit" disabled={isSavingPassword} className="w-full text-xs font-semibold h-9 rounded-md cursor-pointer gap-2">
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
          <Card className="border-red-200 dark:border-red-900/30 bg-red-50/10 dark:bg-red-950/5 shadow-xs rounded-md">
            <CardHeader className="pb-1 pt-4 px-5">
              <CardTitle className="text-sm font-semibold text-red-700 dark:text-red-500">Excluir Conta</CardTitle>
              <CardDescription className="text-xs text-red-600/80 dark:text-red-400/80">Ações permanentes e irreversíveis</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 px-5 pb-5 pt-3">
              <p className="text-[11px] text-muted-foreground leading-normal font-medium">
                Ao apagar sua conta, todos os lançamentos financeiros, relatórios, configurações e categorias salvas no Firestore serão removidos permanentemente. A ação não poderá ser desfeita.
              </p>

              <div className="space-y-1.5">
                <Label htmlFor="confirmDeleteText" className="text-[10px] font-bold text-muted-foreground uppercase">
                  Escreva &quot;EXCLUIR CONTA&quot; para liberar
                </Label>
                <Input
                  id="confirmDeleteText"
                  placeholder="EXCLUIR CONTA"
                  value={deleteConfirmationText}
                  onChange={(e) => setDeleteConfirmationText(e.target.value)}
                  className="border-red-200/50 dark:border-red-900/20 focus-visible:ring-red-500 h-9 text-xs rounded-md"
                />
              </div>

              <Button 
                type="button" 
                variant="destructive" 
                onClick={() => setIsDeleteConfirmOpen(true)}
                disabled={deleteConfirmationText !== 'EXCLUIR CONTA' || isDeletingAccount}
                className="w-full text-xs font-semibold cursor-pointer rounded-md h-9 gap-2"
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

      {/* Modal de Reautenticação via Senha */}
      <ReauthDialog
        isOpen={reauthAction !== null}
        onClose={() => setReauthAction(null)}
        onSuccess={handleReauthSuccess}
        title={reauthAction === 'delete' ? 'Confirmar Exclusão de Conta' : 'Redefinição de Senha'}
        description={
          reauthAction === 'delete' 
            ? 'Para apagar sua conta definitivamente, insira a senha atual por motivos de segurança.' 
            : 'Confirme sua senha atual para autorizar a alteração segura da senha.'
        }
      />
    </div>
  )
}
