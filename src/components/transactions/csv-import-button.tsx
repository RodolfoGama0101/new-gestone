'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth-context'
import { useCategories } from '@/hooks/use-categories'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { CSV_MAX_BYTES, readCsv, previewCsv } from '@/lib/utils/transaction-csv'
import { TransactionImportService } from '@/services/transaction-import.service'
import { invalidateTransactionData } from '@/lib/transaction-cache'
import { formatMoney as formatCurrency } from '@/lib/utils/format-money'

export function CsvImportButton() {
  const { user } = useAuth()
  const { categories } = useCategories()
  const client = useQueryClient()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [rows, setRows] = useState<string[][]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [completed, setCompleted] = useState(0)
  const preview = previewCsv(rows, categories, mapping)
  const invalid = preview.filter((row) => row.error).length
  const submit = async () => {
    if (!user || busy) return
    setBusy(true)
    setCompleted(0)
    setMessage('')
    try {
      const result = await TransactionImportService.import(
        user.uid,
        text,
        mapping,
        setCompleted,
      )
      setMessage(
        `${result.imported} importados; ${result.skipped} já existentes; 0 rejeitados.`,
      )
    } catch {
      setMessage(
        'Importação interrompida. O progresso indica as linhas confirmadas. Repita o mesmo arquivo para retomar sem duplicar. Se já houve gravações, mantenha o arquivo original: alterar seu conteúdo inicia outro lote.',
      )
    } finally {
      try {
        await invalidateTransactionData(client, user.uid)
      } finally {
        setBusy(false)
      }
    }
  }
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Importar CSV
      </Button>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!busy) setOpen(value)
        }}
      >
        <DialogContent
          className="max-h-[85vh] overflow-y-auto sm:max-w-2xl"
          showCloseButton={!busy}
        >
          <DialogHeader>
            <DialogTitle>Importar lançamentos</DialogTitle>
            <DialogDescription>
              Use o CSV exportado pelo GestOne. Até 500 linhas e 1 MiB. Nenhuma
              gravação ocorre antes da confirmação.
            </DialogDescription>
          </DialogHeader>
          <label className="space-y-2 text-sm">
            Arquivo CSV
            <input
              className="block w-full"
              type="file"
              accept=".csv,text/csv"
              disabled={busy}
              onChange={async (e) => {
                const file = e.target.files?.[0]
                setRows([])
                setText('')
                setMapping({})
                setMessage('')
                setCompleted(0)
                if (!file) return
                try {
                  if (file.size > CSV_MAX_BYTES)
                    throw new Error('O arquivo deve ter até 1 MiB.')
                  const content = await file.text()
                  setRows(readCsv(content))
                  setText(content)
                } catch (error) {
                  setMessage(
                    error instanceof Error
                      ? error.message
                      : 'Arquivo inválido.',
                  )
                }
              }}
            />
          </label>
          {Array.from(new Set(rows.map((row) => row[2]))).map((name) => (
            <label key={name} className="text-sm">
              Categoria do CSV: {name}
              <select
                className="bg-background block h-11 w-full rounded-md border px-2"
                disabled={busy}
                value={mapping[name] || ''}
                onChange={(e) =>
                  setMapping({ ...mapping, [name]: e.target.value })
                }
              >
                <option value="">Usar nome e tipo do CSV</option>
                {categories
                  .filter((c) => !c.archived)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.type})
                    </option>
                  ))}
              </select>
            </label>
          ))}
          {rows.length > 0 && (
            <>
              <p className="text-sm">
                {rows.length - invalid} válidos; {invalid} rejeitados. Corrija
                as linhas rejeitadas no arquivo ou ajuste as categorias antes de
                confirmar.
              </p>
              <div className="max-h-64 overflow-auto">
                <table className="w-full text-left text-sm">
                  <caption>Prévia completa da importação</caption>
                  <thead>
                    <tr>
                      <th>Linha</th>
                      <th>Descrição / data</th>
                      <th>Valor / erro</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row) => (
                      <tr key={row.line} className="border-b">
                        <td>{row.line}</td>
                        <td className="max-w-64 break-words">
                          {row.cells[1]}
                          <br />
                          {row.cells[0]}
                        </td>
                        <td>
                          {row.error ||
                            (row.data && formatCurrency(row.data.amount))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-sm">
                Cartões e recorrência não constam no CSV: as linhas serão
                lançamentos avulsos, sem cartão. Repetir o mesmo arquivo
                preserva as linhas já importadas.
              </p>
              <Button onClick={submit} disabled={busy || !!invalid}>
                {busy ? 'Importando…' : 'Confirmar importação'}
              </Button>
              <p role="status" className="text-sm">
                {completed} de {rows.length} linhas confirmadas
              </p>
            </>
          )}
          {message && (
            <p role="status" className="text-sm">
              {message}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
