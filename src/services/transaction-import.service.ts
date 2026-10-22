import {
  doc,
  runTransaction,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { previewCsv, readCsv } from '@/lib/utils/transaction-csv'
import { CategoryService } from './category.service'

export const TransactionImportService = {
  async import(
    userId: string,
    text: string,
    mapping: Record<string, string>,
    progress: (completed: number, total: number) => void,
  ) {
    if (!userId) throw new Error('Entre na sua conta para importar.')
    // Revalida o arquivo inteiro antes de qualquer gravação, inclusive categorias atuais.
    const preview = previewCsv(
      readCsv(text),
      await CategoryService.getAll(userId),
      mapping,
    )
    if (preview.some((row) => !row.data))
      throw new Error('Corrija todas as linhas antes de importar.')
    const bytes = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(
        text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n'),
      ),
    )
    const fingerprint = Array.from(new Uint8Array(bytes), (n) =>
      n.toString(16).padStart(2, '0'),
    ).join('')
    let imported = 0,
      skipped = 0
    for (const [index, row] of preview.entries()) {
      const data = row.data!
      const ref = doc(
        db,
        'users',
        userId,
        'transactions',
        `csv-${fingerprint}-${index}`,
      )
      const created = await runTransaction(db, async (transaction) => {
        if ((await transaction.get(ref)).exists()) return false
        transaction.set(ref, {
          ...data,
          date: Timestamp.fromDate(data.date as Date),
          cardClosingDay: null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
        return true
      })
      if (created) imported++
      else skipped++
      progress(index + 1, preview.length)
    }
    return { imported, skipped }
  },
}
