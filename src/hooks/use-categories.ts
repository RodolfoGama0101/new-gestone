import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CategoryService } from '@/services/category.service'
import { useAuth } from '@/contexts/auth-context'
import { Category } from '@/types/category'
import { toast } from 'sonner'

export function useCategories() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const userId = user?.uid ?? ''

  const categoriesQuery = useQuery({
    queryKey: ['categories', userId],
    queryFn: async () => {
      await CategoryService.initialize(userId)
      return CategoryService.getAll(userId)
    },
    enabled: !!userId,
    // Categorias raramente mudam e já são invalidadas explicitamente nas mutações.
    // staleTime: Infinity evita refetches automáticos desnecessários ao navegar entre telas.
    staleTime: Infinity,
  })

  const createCategoryMutation = useMutation({
    mutationFn: (data: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) =>
      CategoryService.create(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', userId] })
      toast.success('Categoria criada com sucesso!')
    },
    onError: () => {
      toast.error('Erro ao criar categoria.')
    },
  })

  const updateCategoryMutation = useMutation({
    mutationFn: ({
      categoryId,
      data,
    }: {
      categoryId: string
      data: Partial<Omit<Category, 'id' | 'createdAt' | 'updatedAt'>>
    }) => CategoryService.update(userId, categoryId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', userId] })
      toast.success('Categoria atualizada com sucesso!')
    },
    onError: () => {
      toast.error('Erro ao atualizar categoria.')
    },
  })

  const deleteCategoryMutation = useMutation({
    mutationFn: (categoryId: string) => CategoryService.delete(userId, categoryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', userId] })
      toast.success('Categoria removida. O histórico foi preservado.')
    },
    onError: () => {
      toast.error('Erro ao excluir categoria.')
    },
  })

  return {
    categories: categoriesQuery.data ?? [],
    isLoading: categoriesQuery.isLoading,
    error: categoriesQuery.error,
    refetch: categoriesQuery.refetch,
    createCategory: createCategoryMutation.mutateAsync,
    isCreating: createCategoryMutation.isPending,
    updateCategory: updateCategoryMutation.mutateAsync,
    isUpdating: updateCategoryMutation.isPending,
    deleteCategory: deleteCategoryMutation.mutateAsync,
    isDeleting: deleteCategoryMutation.isPending,
  }
}
