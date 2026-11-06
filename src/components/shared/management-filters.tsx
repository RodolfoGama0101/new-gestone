'use client'

import { parseAsString, useQueryStates } from 'nuqs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const parsers = {
  search: parseAsString.withDefault(''),
  type: parseAsString.withDefault(''),
  status: parseAsString.withDefault(''),
  modality: parseAsString.withDefault(''),
  categoryId: parseAsString.withDefault(''),
  creditCardId: parseAsString.withDefault(''),
  pending: parseAsString.withDefault(''),
  scope: parseAsString.withDefault(''),
}

export type ManagementFilterKey = keyof typeof parsers
export type ManagementFilterValues = Record<ManagementFilterKey, string>
export type ManagementFilterField = {
  key: ManagementFilterKey
  label: string
  options: { value: string; label: string }[]
}

export function useManagementFilters() {
  const [values, setValues] = useQueryStates(parsers)
  return { values, setValues }
}

export function ManagementFilters({
  values,
  setValues,
  fields,
  searchLabel,
}: {
  values: ManagementFilterValues
  setValues: ReturnType<typeof useManagementFilters>['setValues']
  fields: ManagementFilterField[]
  searchLabel?: string
}) {
  const active = [
    ...(searchLabel && values.search
      ? [{ key: 'search' as const, text: `${searchLabel}: ${values.search}` }]
      : []),
    ...fields
      .filter((field) => values[field.key])
      .map((field) => ({
        key: field.key,
        text: `${field.label}: ${field.options.find((option) => option.value === values[field.key])?.label ?? values[field.key]}`,
      })),
  ]
  return (
    <section
      aria-label="Filtros"
      className="border-border space-y-4 rounded-lg border p-4"
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {searchLabel && (
          <label className="grid min-w-0 gap-2 text-sm">
            {searchLabel}
            <Input
              value={values.search}
              onChange={(event) =>
                void setValues({ search: event.target.value || null })
              }
            />
          </label>
        )}
        {fields.map((field) => (
          <div key={field.key} className="grid min-w-0 gap-2 text-sm">
            <span>{field.label}</span>
            <Select
              value={values[field.key] || 'all'}
              onValueChange={(value) =>
                void setValues({ [field.key]: value === 'all' ? null : value })
              }
              items={[{ value: 'all', label: 'Todos' }, ...field.options]}
            >
              <SelectTrigger
                aria-label={field.label}
                className="w-full min-w-0"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {field.options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
      {active.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span>Filtros ativos:</span>
          {active.map((item) => (
            <span key={item.key} className="bg-muted rounded-md px-2 py-1">
              {item.text}
            </span>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              void setValues(
                Object.fromEntries(active.map(({ key }) => [key, null])),
              )
            }
          >
            Limpar filtros
          </Button>
        </div>
      )}
    </section>
  )
}
