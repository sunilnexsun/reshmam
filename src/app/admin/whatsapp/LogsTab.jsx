import { useMemo, useState } from 'react'
import { Download, MessageSquare, Trash2 } from 'lucide-react'
import { Badge, Button, DataTable, DemoNote, EmptyState, FilterSelect, SearchInput, StatusBadge, useConfirm, useToast } from '@admin/_components/ui'
import { setState, useDb } from '@admin/_lib/store'
import { dateTime } from '@admin/_lib/format'
import { exportCSV } from '@admin/_lib/export'
import { LOG_STATUSES } from './waUtils'

export default function LogsTab({ canManage }) {
  const db = useDb()
  const toast = useToast()
  const confirm = useConfirm()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('all')
  const [template, setTemplate] = useState('all')
  const logs = db.whatsapp.logs
  const templates = useMemo(() => [...new Set(logs.map((l) => l.template).filter(Boolean))].sort(), [logs])
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()
    return logs.filter((l) => (status === 'all' || l.status === status) && (template === 'all' || l.template === template) && (!s || `${l.phone} ${l.customer} ${l.message} ${l.template}`.toLowerCase().includes(s)))
  }, [logs, q, status, template])
  const simulatedCount = logs.filter((l) => l.status === 'Simulated').length

  const onExport = () => {
    exportCSV(`reshmam-whatsapp-logs-${new Date().toISOString().slice(0, 10)}`, rows, [
      { label: 'Number', key: 'phone' }, { label: 'Customer', key: 'customer' }, { label: 'Template', key: 'template' }, { label: 'Message', key: 'message' },
      { label: 'Date', value: (l) => dateTime(l.date) }, { label: 'Status', key: 'status' }, { label: 'Error', key: 'error' }, { label: 'Sample/Simulated', value: (l) => (l.simulated ? 'Yes' : 'No') },
    ])
    toast.success(`Exported ${rows.length} log entries`)
  }
  const onClearSimulated = async () => {
    if (!(await confirm({ title: 'Clear simulated tests?', message: `Remove ${simulatedCount} “Simulated” test entries from the log? Sample delivery records are kept.`, confirmText: 'Clear' }))) return
    setState((s) => ({ ...s, whatsapp: { ...s.whatsapp, logs: s.whatsapp.logs.filter((l) => l.status !== 'Simulated') } }))
    toast.success('Simulated test entries cleared')
  }

  const columns = [
    { key: 'phone', label: 'Number', render: (l) => <span className="whitespace-nowrap font-medium">{l.phone}</span> },
    { key: 'customer', label: 'Customer', sortable: true, render: (l) => <span className="whitespace-nowrap">{l.customer}</span> },
    { key: 'template', label: 'Template / Message', render: (l) => (
      <div className="min-w-0 max-w-sm"><p className="font-mono text-xs font-semibold text-primary">{l.template || '—'}</p><p className="truncate text-xs text-muted" title={l.message}>{l.message}</p></div>
    ) },
    { key: 'date', label: 'Date', sortable: true, render: (l) => <span className="whitespace-nowrap">{dateTime(l.date)}</span> },
    { key: 'status', label: 'Status', sortable: true, render: (l) => <span className="inline-flex items-center gap-1.5"><StatusBadge status={l.status} />{l.simulated && l.status !== 'Simulated' && <Badge>Sample</Badge>}</span> },
    { key: 'error', label: 'Error', render: (l) => (l.error ? <span className="text-xs text-red-700">{l.error}</span> : <span className="text-muted">—</span>) },
  ]

  return (
    <>
      <div className="flex flex-col gap-3 border-b border-line p-4 md:flex-row md:items-center">
        <SearchInput value={q} onChange={setQ} placeholder="Search number, customer or message" className="md:w-72" />
        <div className="flex flex-wrap gap-2 md:ml-auto">
          <FilterSelect label="Status" value={status} onChange={setStatus} allLabel="All Status" options={LOG_STATUSES} />
          <FilterSelect label="Template" value={template} onChange={setTemplate} allLabel="All Templates" options={templates} />
          <Button variant="outline" icon={Download} className="h-9" onClick={onExport} disabled={!rows.length}>Export CSV</Button>
          {canManage && simulatedCount > 0 && <Button variant="danger-outline" icon={Trash2} className="h-9" onClick={onClearSimulated}>Clear tests</Button>}
        </div>
      </div>
      <DemoNote className="mx-4 mt-4">Entries marked <b>Sample</b> are demo records, not real deliveries. Test sends from this panel are logged as <b>Simulated</b>. Real Sent / Delivered / Read / Failed statuses will come from the WhatsApp webhook once the backend is connected.</DemoNote>
      <DataTable className="mt-2" columns={columns} rows={rows} initialSort={{ key: 'date', dir: 'desc' }}
        empty={<EmptyState icon={MessageSquare} title="No messages logged" text="Try changing the filters." />} />
    </>
  )
}
