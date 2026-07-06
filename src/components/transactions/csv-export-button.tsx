'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Download, Loader2 } from 'lucide-react'
import { Transaction } from '@/types/transaction'
import { useCategories } from '@/hooks/use-categories'
import { format } from 'date-fns'
import { Timestamp } from 'firebase/firestore'
import { toast } from 'sonner'

interface CsvExportButtonProps {
  transactions: Transaction[]
  disabled?: boolean
}

export function CsvExportButton({ transactions, disabled = false }: CsvExportButtonProps) {
  const { categories } = useCategories()
  const [isExporting, setIsExporting] = React.useState(false)

  const handleExport = () => {
    if (transactions.length === 0) {
      toast.error('Nenhuma transação disponível para exportar.')
      return
    }

    setIsExporting(true)
    try {
      // Cabeçalhos CSV
      const headers = ['Data', 'Descrição', 'Categoria', 'Tipo', 'Valor', 'Tags', 'Anotações']
      
      const rows = transactions.map((tx) => {
        let d: Date
        if (tx.date instanceof Date) {
          d = tx.date
        } else if (tx.date instanceof Timestamp) {
          d = tx.date.toDate()
        } else {
          const record = tx.date as { seconds?: number }
          if (record && typeof record.seconds === 'number') {
            d = new Date(record.seconds * 1000)
          } else {
            d = new Date(tx.date as string | number)
          }
        }

        const formattedDate = format(d, 'dd/MM/yyyy')
        const categoryName = categories.find((c) => c.id === tx.categoryId)?.name ?? 'Sem Categoria'
        const typeLabel = tx.type === 'income' ? 'Receita' : 'Despesa'
        const decimalValue = (tx.amount / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
        const tagsJoined = tx.tags ? tx.tags.join('; ') : ''
        const sanitizedNotes = tx.notes ? tx.notes.replace(/"/g, '""').replace(/\n/g, ' ') : ''

        return [
          formattedDate,
          `"${tx.description.replace(/"/g, '""')}"`,
          `"${categoryName}"`,
          typeLabel,
          decimalValue,
          `"${tagsJoined}"`,
          `"${sanitizedNotes}"`
        ]
      })

      const csvContent = [
        headers.join(','),
        ...rows.map((row) => row.join(','))
      ].join('\n')

      const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], {
        type: 'text/csv;charset=utf-8;',
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.setAttribute('href', url)
      link.setAttribute('download', `extrato_gestone_${format(new Date(), 'yyyy-MM-dd')}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast.success('Extrato CSV baixado com sucesso!')
    } catch (error) {
      console.error(error)
      toast.error('Erro ao exportar arquivo CSV.')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={disabled || isExporting}
      className="gap-1.5 cursor-pointer text-xs font-semibold"
    >
      {isExporting ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <Download className="size-3.5" />
      )}
      Exportar CSV
    </Button>
  )
}
