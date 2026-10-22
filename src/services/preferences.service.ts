import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import type { DisplayPreferences } from '@/types/preferences'

export const PreferencesService = {
  async get(userId: string): Promise<DisplayPreferences> {
    const snapshot = await getDoc(doc(db, 'users', userId, 'preferences', 'display'))
    if (!snapshot.exists()) return { theme: 'system' }
    const theme: unknown = snapshot.data().theme
    if (theme !== 'light' && theme !== 'dark' && theme !== 'system') throw new Error('Preferências inválidas.')
    return { theme }
  },
  async save(userId: string, preferences: DisplayPreferences): Promise<void> {
    await setDoc(doc(db, 'users', userId, 'preferences', 'display'), {
      theme: preferences.theme, updatedAt: serverTimestamp(),
    })
  },
}
