import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { Category } from '@/types/category'

export const defaultCategories: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>[] = [
  // Receitas
  { name: 'Salário', type: 'income', icon: 'Briefcase', color: '#2563eb', isDefault: true },
  { name: 'Freelance', type: 'income', icon: 'Laptop', color: '#16a34a', isDefault: true },
  { name: 'Investimentos', type: 'income', icon: 'TrendingUp', color: '#7c3aed', isDefault: true },
  { name: 'Prêmios / Presentes', type: 'income', icon: 'Gift', color: '#ec4899', isDefault: true },
  { name: 'Outras Receitas', type: 'income', icon: 'Coins', color: '#4b5563', isDefault: true },
  // Despesas
  { name: 'Alimentação', type: 'expense', icon: 'Utensils', color: '#dc2626', isDefault: true },
  { name: 'Supermercado', type: 'expense', icon: 'ShoppingBag', color: '#059669', isDefault: true },
  { name: 'Transporte', type: 'expense', icon: 'Car', color: '#ea580c', isDefault: true },
  { name: 'Moradia', type: 'expense', icon: 'Home', color: '#d97706', isDefault: true },
  { name: 'Saúde', type: 'expense', icon: 'HeartPulse', color: '#0891b2', isDefault: true },
  { name: 'Educação', type: 'expense', icon: 'GraduationCap', color: '#4f46e5', isDefault: true },
  { name: 'Lazer', type: 'expense', icon: 'Sparkles', color: '#db2777', isDefault: true },
  { name: 'Assinaturas / Serviços', type: 'expense', icon: 'Tv', color: '#0284c7', isDefault: true },
  { name: 'Vestuário', type: 'expense', icon: 'Shirt', color: '#8b5cf6', isDefault: true },
  { name: 'Outras Despesas', type: 'expense', icon: 'CreditCard', color: '#6b7280', isDefault: true },
]

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
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      })
    })

    return categories
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
    const docRef = doc(db, 'users', userId, 'categories', categoryId)
    await deleteDoc(docRef)
  },

  async seedDefaultCategories(userId: string): Promise<void> {
    const existing = await this.getAll(userId)
    if (existing.length > 0) return

    const batch = writeBatch(db)
    const colRef = this.getCollection(userId)

    defaultCategories.forEach((cat) => {
      const newDocRef = doc(colRef)
      batch.set(newDocRef, {
        ...cat,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    })

    await batch.commit()
  },
}
