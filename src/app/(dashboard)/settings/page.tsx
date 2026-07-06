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

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const user = auth.currentUser

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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          Gerencie seu perfil, preferências e segurança de conta.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Seção 1: Perfil do Usuário */}
        <Card className="shadow-sm border-border bg-card">
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="size-5 text-muted-foreground" />
              <CardTitle>Meu Perfil</CardTitle>
            </div>
            <CardDescription>Atualize seu nome público de exibição</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveName} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">Nome de Exibição</Label>
                <Input
                  id="displayName"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nome do usuário"
                  maxLength={50}
                  required
                  disabled={isSavingName}
                />
              </div>
              <Button type="submit" disabled={isSavingName} className="w-full font-semibold cursor-pointer">
                {isSavingName ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar Nome'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Seção 2: Preferências */}
        <Card className="shadow-sm border-border bg-card">
          <CardHeader>
            <div className="flex items-center gap-2">
              <SettingsIcon className="size-5 text-muted-foreground" />
              <CardTitle>Preferências</CardTitle>
            </div>
            <CardDescription>Personalize o comportamento do aplicativo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Seletor de Tema */}
            <div className="space-y-2 text-left">
              <Label>Tema da Interface</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant={theme === 'light' ? 'default' : 'outline'}
                  className="gap-1.5 cursor-pointer justify-center"
                  onClick={() => setTheme('light')}
                >
                  <Sun className="size-4" />
                  Claro
                </Button>
                <Button
                  variant={theme === 'dark' ? 'default' : 'outline'}
                  className="gap-1.5 cursor-pointer justify-center"
                  onClick={() => setTheme('dark')}
                >
                  <Moon className="size-4" />
                  Escuro
                </Button>
                <Button
                  variant={theme === 'system' ? 'default' : 'outline'}
                  className="gap-1.5 cursor-pointer justify-center"
                  onClick={() => setTheme('system')}
                >
                  <Monitor className="size-4" />
                  Sistema
                </Button>
              </div>
            </div>

            {/* Seletor de Moeda */}
            <div className="space-y-2 text-left">
              <Label htmlFor="currency">Moeda Base</Label>
              <Select value={currency} onValueChange={handleCurrencyChange}>
                <SelectTrigger id="currency" className="w-full">
                  <SelectValue placeholder="Selecione a moeda" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BRL">Real Brasileiro (BRL, R$)</SelectItem>
                  <SelectItem value="USD">Dólar Americano (USD, $)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Seção 3: Segurança */}
        <Card className="shadow-sm border-border bg-card">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="size-5 text-muted-foreground" />
              <CardTitle>Segurança</CardTitle>
            </div>
            <CardDescription>Altere a senha de acesso a sua conta</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSavePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">Nova Senha</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="Min 6 caracteres"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  disabled={isSavingPassword}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Repita a nova senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isSavingPassword}
                />
              </div>

              <Button type="submit" disabled={isSavingPassword} className="w-full font-semibold cursor-pointer">
                {isSavingPassword ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Alterando...
                  </>
                ) : (
                  'Alterar Senha'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Seção 4: Zona de Risco (Excluir Conta) */}
        <Card className="border-destructive/30 bg-destructive/5 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Trash2 className="size-5 text-destructive" />
              <CardTitle className="text-destructive">Zona de Risco</CardTitle>
            </div>
            <CardDescription>Ações permanentes e irreversíveis</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground leading-normal">
              Ao apagar sua conta, todos os lançamentos financeiros, relatórios, configurações e categorias salvas no Firestore serão removidos permanentemente. A ação não poderá ser desfeita.
            </p>

            <div className="space-y-2">
              <Label htmlFor="confirmDeleteText" className="text-xs font-bold text-muted-foreground uppercase">
                Escreva &quot;EXCLUIR CONTA&quot; para liberar
              </Label>
              <Input
                id="confirmDeleteText"
                placeholder="EXCLUIR CONTA"
                value={deleteConfirmationText}
                onChange={(e) => setDeleteConfirmationText(e.target.value)}
                className="border-destructive/20 focus-visible:ring-destructive/30"
              />
            </div>

            <Button 
              type="button" 
              variant="destructive" 
              onClick={() => setIsDeleteConfirmOpen(true)}
              disabled={deleteConfirmationText !== 'EXCLUIR CONTA' || isDeletingAccount}
              className="w-full font-bold cursor-pointer"
            >
              {isDeletingAccount ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Apagando dados...
                </>
              ) : (
                'Excluir Conta Permanentemente'
              )}
            </Button>
          </CardContent>
        </Card>
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
