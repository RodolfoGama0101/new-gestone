import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { Category } from '@/types/category'

export { defaultCategories } from '@/lib/default-categories'

export const CategoryService = {
  getCollection(userId: string) {
    return collection(db, 'users', userId, 'categories')
  },

  async getAll(userId: string): Promise<Category[]> {
    const colRef = this.getCollection(userId)
    const snapshot = await getDocs(colRef)
    const categories: Category[] = []
    
    snapshot.forEach((docSnap) => {
      const data = docSnap.data()
      categories.push({
        id: docSnap.id,
        name: data.name,
        type: data.type,
        icon: data.icon,
        color: data.color,
        isDefault: data.isDefault ?? false,
        archived: data.archived ?? false,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      })
    })

    return categories
  },

  async initialize(userId: string): Promise<void> {
    void userId
    const response = await fetch('/api/categories/initialize', {
      method: 'POST', credentials: 'same-origin',
    })
    if (!response.ok) throw new Error('Não foi possível preparar as categorias.')
  },

  async create(userId: string, data: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const colRef = this.getCollection(userId)
    const docRef = await addDoc(colRef, {
      ...data,
      isDefault: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    return docRef.id
  },

  async update(userId: string, categoryId: string, data: Partial<Omit<Category, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> {
    const docRef = doc(db, 'users', userId, 'categories', categoryId)
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp(),
    })
  },

  async delete(userId: string, categoryId: string): Promise<void> {
    // O servidor verifica vínculos e arquiva/exclui de forma transacional.
    void userId
    const response = await fetch(`/api/categories/${encodeURIComponent(categoryId)}`, { method: 'DELETE', credentials: 'same-origin' })
    if (!response.ok) throw new Error('Não foi possível remover a categoria.')
  },

  async seedDefaultCategories(userId: string): Promise<void> {
    await this.initialize(userId)
  },
}
