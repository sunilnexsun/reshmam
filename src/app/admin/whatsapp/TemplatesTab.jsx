import { useMemo, useState } from 'react'
import { Copy, Eye, FileText, Pencil, Plus, Trash2 } from 'lucide-react'
import { Badge, Button, DataTable, EmptyState, FilterSelect, IconButton, Modal, SearchInput, StatusBadge, useConfirm, useToast } from '@admin/_components/ui'
import { createItem, getState, logActivity, removeItem, useDb } from '@admin/_lib/store'
import { date } from '@admin/_lib/format'
import PhonePreview from './PhonePreview'
import TemplateEditorModal from './TemplateEditorModal'
import { TEMPLATE_STATUSES, TEMPLATE_TYPES, render, sampleValues } from './waUtils'

export default function TemplatesTab({ canManage }) {
  const db = useDb()
  const toast = useToast()
  const confirm = useConfirm()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('all')
  const [type, setType] = useState('all')
  const [editing, setEditing] = useState(undefined)
  const [preview, setPreview] = useState(null)
  const samples = useMemo(() => sampleValues(db), [db])
  const templates = db.whatsapp.templates

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()
    return templates.filter((t) => (status === 'all' || t.status === status) && (type === 'all' || t.type === type) && (!s || `${t.name} ${t.body}`.toLowerCase().includes(s)))
  }, [templates, q, status, type])

  const onDelete = async (t) => {
    const s = getState()
    const autos = s.whatsapp.automations.filter((a) => a.templateId === t.id)
    const camps = s.campaigns.filter((c) => c.templateId === t.id && c.status !== 'Completed')
    if (autos.length || camps.length) {
      const names = [...autos.map((a) => a.name), ...camps.map((c) => c.name)].join(', ')
      return toast.error(`“${t.name}” is used by ${names}. Choose another template there first.`, { duration: 6000 })
    }
    if (!(await confirm({ title: 'Delete template?', message: `Delete “${t.name}” (${t.language})? This removes it from the admin panel only — if it exists in Meta, delete it there too.`, confirmText: 'Delete' }))) return
    removeItem('whatsapp.templates', t.id)
    logActivity('whatsapp', `Template deleted: ${t.name}`)
    toast.success('Template deleted')
  }
  const onDuplicate = (t) => {
    let name = `${t.name}_copy`; let n = 2
    while (getState().whatsapp.templates.some((x) => x.name === name && x.language === t.language)) name = `${t.name}_copy${n++}`
    const copy = { ...t }
    delete copy.id; delete copy.createdAt
    createItem('whatsapp.templates', { ...copy, name, status: 'Draft', updatedAt: new Date().toISOString() }, 'wt')
    toast.success(`Duplicated as ${name} (Draft)`)
  }

  const columns = [
    { key: 'name', label: 'Template', sortable: true, render: (t) => (
      <div className="min-w-0 max-w-xs">
        <p className="font-mono text-[13px] font-semibold text-ink">{t.name}</p>
        <p className="truncate text-xs text-muted">{t.body}</p>
      </div>
    ) },
    { key: 'type', label: 'Type', sortable: true, render: (t) => <Badge tone={t.type === 'Marketing' ? 'purple' : t.type === 'Authentication' ? 'blue' : 'primary'}>{t.type}</Badge> },
    { key: 'language', label: 'Language', sortable: true },
    { key: 'status', label: 'Status', sortable: true, render: (t) => <StatusBadge status={t.status} /> },
    { key: 'updatedAt', label: 'Updated', sortable: true, render: (t) => <span className="whitespace-nowrap">{date(t.updatedAt || t.createdAt)}</span> },
    { key: 'actions', label: 'Actions', align: 'right', render: (t) => (
      <div className="flex justify-end gap-1">
        <IconButton icon={Eye} size="sm" label={`Preview ${t.name}`} onClick={() => setPreview(t)} />
        {canManage && <IconButton icon={Pencil} size="sm" variant="primary" label={`Edit ${t.name}`} onClick={() => setEditing(t)} />}
        {canManage && <IconButton icon={Copy} size="sm" label={`Duplicate ${t.name}`} onClick={() => onDuplicate(t)} />}
        {canManage && <IconButton icon={Trash2} size="sm" variant="danger" label={`Delete ${t.name}`} onClick={() => onDelete(t)} />}
      </div>
    ) },
  ]

  return (
    <>
      <div className="flex flex-col gap-3 border-b border-line p-4 md:flex-row md:items-center">
        <SearchInput value={q} onChange={setQ} placeholder="Search template name or text" className="md:w-72" />
        <div className="flex flex-wrap gap-2 md:ml-auto">
          <FilterSelect label="Type" value={type} onChange={setType} allLabel="All Types" options={TEMPLATE_TYPES} />
          <FilterSelect label="Status" value={status} onChange={setStatus} allLabel="All Status" options={TEMPLATE_STATUSES} />
          {canManage && <Button icon={Plus} size="md" className="h-9" onClick={() => setEditing(null)}>Add Template</Button>}
        </div>
      </div>
      <DataTable columns={columns} rows={rows} onRowClick={(t) => (canManage ? setEditing(t) : setPreview(t))} initialSort={{ key: 'updatedAt', dir: 'desc' }}
        empty={<EmptyState icon={FileText} title={templates.length ? 'No templates match' : 'No templates yet'} text={templates.length ? 'Try changing the search or filters.' : 'Create your first message template.'} />} />

      <TemplateEditorModal open={editing !== undefined} template={editing} onClose={() => setEditing(undefined)} />
      <Modal open={!!preview} onClose={() => setPreview(null)} title={preview?.name} subtitle={preview && `${preview.type} · ${preview.language} · ${preview.status}`} size="sm"
        footer={<>{canManage && preview && <Button variant="outline" icon={Pencil} onClick={() => { setEditing(preview); setPreview(null) }}>Edit</Button>}<Button onClick={() => setPreview(null)}>Close</Button></>}>
        {preview && <PhonePreview header={render(preview.header, samples)} body={render(preview.body, samples)} footer={preview.footer} buttons={preview.buttons} />}
        <p className="mt-3 text-center text-xs text-muted">Shown with sample values.</p>
      </Modal>
    </>
  )
}
