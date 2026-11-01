import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { BookOpen, FileText, PackagePlus, Pencil, Plus, Trash2, Upload } from 'lucide-react'
import { Badge, Button, DataTable, DemoNote, EmptyState, Field, FilterSelect, IconButton, Input, Modal, SearchInput, Select, Textarea, useConfirm, useToast } from '@admin/_components/ui'
import { createItem, getState, logActivity, removeItem, setState, updateItem, useDb } from '@admin/_lib/store'
import { date, inr, uid } from '@admin/_lib/format'

const TYPES = ['FAQ', 'Product Info', 'Document']
const TONE = { FAQ: 'blue', 'Product Info': 'primary', Document: 'purple' }
const ACCEPT = ['pdf', 'docx', 'txt']
const MAX_SIZE = 10 * 1024 * 1024
const fileSize = (b) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`)

function EntryModal({ entry, onClose }) {
  const toast = useToast()
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({ defaultValues: { type: 'FAQ', question: '', answer: '' } })
  useEffect(() => { if (entry !== undefined) reset(entry ? { type: entry.type, question: entry.question, answer: entry.answer } : { type: 'FAQ', question: '', answer: '' }) }, [entry, reset])
  const onSubmit = (v) => {
    const data = { type: v.type, question: v.question.trim(), answer: v.answer.trim() }
    if (getState().chatbot.knowledge.some((k) => k.id !== entry?.id && k.question.toLowerCase() === data.question.toLowerCase())) return toast.error('An entry with this question already exists.')
    if (entry) updateItem('chatbot.knowledge', entry.id, data)
    else createItem('chatbot.knowledge', { ...data, fileName: '', size: 0 }, 'kb')
    logActivity('chatbot', `Knowledge base ${entry ? 'updated' : 'entry added'}: ${data.question}`)
    toast.success(entry ? 'Entry updated' : 'Entry added to knowledge base')
    onClose()
  }
  return (
    <Modal open={entry !== undefined} onClose={onClose} title={entry ? 'Edit knowledge entry' : 'Add question & answer'} size="lg"
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" form="kb-form" loading={isSubmitting}>{entry ? 'Save' : 'Add Entry'}</Button></>}>
      <form id="kb-form" onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4">
        <Field label="Type" htmlFor="kb-type"><Select id="kb-type" options={['FAQ', 'Product Info']} {...register('type')} /></Field>
        <Field label="Question / Title" required error={errors.question} htmlFor="kb-q"><Input id="kb-q" error={errors.question} {...register('question', { required: 'Question is required', minLength: { value: 3, message: 'Too short' } })} /></Field>
        <Field label="Answer" required error={errors.answer} htmlFor="kb-a"><Textarea id="kb-a" rows={5} error={errors.answer} {...register('answer', { required: 'Answer is required', maxLength: { value: 2000, message: 'Max 2000 characters' } })} /></Field>
      </form>
    </Modal>
  )
}

export default function KnowledgeBase({ canManage }) {
  const db = useDb()
  const toast = useToast()
  const confirm = useConfirm()
  const fileRef = useRef(null)
  const [q, setQ] = useState('')
  const [type, setType] = useState('all')
  const [editing, setEditing] = useState(undefined)
  const kb = db.chatbot.knowledge
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()
    return kb.filter((k) => (type === 'all' || k.type === type) && (!s || `${k.question} ${k.answer} ${k.fileName}`.toLowerCase().includes(s)))
  }, [kb, q, type])

  const onUpload = (files) => {
    const list = [...(files || [])]
    if (fileRef.current) fileRef.current.value = ''
    let added = 0
    list.forEach((f) => {
      const ext = f.name.split('.').pop().toLowerCase()
      if (!ACCEPT.includes(ext)) return toast.error(`${f.name}: only PDF, DOCX or TXT files are supported.`)
      if (f.size > MAX_SIZE) return toast.error(`${f.name}: file must be under 10 MB.`)
      if (getState().chatbot.knowledge.some((k) => k.fileName === f.name)) return toast.error(`${f.name} is already in the knowledge base.`)
      createItem('chatbot.knowledge', { type: 'Document', question: f.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '), answer: '', fileName: f.name, size: f.size }, 'kb')
      added++
    })
    if (added) {
      logActivity('chatbot', `${added} document${added > 1 ? 's' : ''} added to knowledge base`)
      toast.info(`${added} document${added > 1 ? 's' : ''} recorded (name and size only). Text extraction and indexing happen on the backend.`, { duration: 6000 })
    }
  }
  const onImport = () => {
    const s = getState()
    const existing = new Set(s.chatbot.knowledge.map((k) => k.question.toLowerCase()))
    const br = Object.fromEntries(s.branches.map((b) => [b.id, b.name]))
    const items = s.products.filter((p) => p.status === 'Active' && !existing.has(p.name.toLowerCase())).map((p) => {
      const vs = s.variants.filter((v) => v.productId === p.id && v.status === 'Active')
      const sizes = vs.map((v) => `${v.size} ${inr(v.price)} at ${br[v.branchId] || 'branch'}`).join('; ')
      return { id: uid('kb'), createdAt: new Date().toISOString(), type: 'Product Info', question: p.name, answer: `${p.description} Category: ${p.category}. Brand: ${p.brand}.${sizes ? ` Sizes & prices: ${sizes}.` : ''}`, fileName: '', size: 0 }
    })
    if (!items.length) return toast.info('All active products are already in the knowledge base.')
    setState((st) => ({ ...st, chatbot: { ...st.chatbot, knowledge: [...items, ...st.chatbot.knowledge] } }))
    logActivity('chatbot', `Imported ${items.length} products into the chatbot knowledge base`)
    toast.success(`Imported ${items.length} product${items.length > 1 ? 's' : ''} as Product Info`)
  }
  const onDelete = async (k) => {
    if (!(await confirm({ title: 'Delete entry?', message: `Remove “${k.question}” from the knowledge base?`, confirmText: 'Delete' }))) return
    removeItem('chatbot.knowledge', k.id)
    toast.success('Entry deleted')
  }

  const columns = [
    { key: 'type', label: 'Type', sortable: true, render: (k) => <Badge tone={TONE[k.type]}>{k.type}</Badge> },
    { key: 'question', label: 'Question / Title', sortable: true, render: (k) => (
      <div className="min-w-0 max-w-md">
        <p className="font-medium text-ink">{k.question}</p>
        {k.type === 'Document'
          ? <p className="flex items-center gap-1 text-xs text-muted"><FileText className="h-3 w-3" />{k.fileName} · {fileSize(k.size)} · <span className="text-amber-700">awaiting backend indexing</span></p>
          : <p className="line-clamp-2 text-xs text-muted">{k.answer}</p>}
      </div>
    ) },
    { key: 'createdAt', label: 'Added', sortable: true, render: (k) => <span className="whitespace-nowrap">{date(k.createdAt)}</span> },
    { key: 'actions', label: 'Actions', align: 'right', render: (k) => canManage ? (
      <div className="flex justify-end gap-1">
        {k.type !== 'Document' && <IconButton icon={Pencil} size="sm" variant="primary" label={`Edit ${k.question}`} onClick={() => setEditing(k)} />}
        <IconButton icon={Trash2} size="sm" variant="danger" label={`Delete ${k.question}`} onClick={() => onDelete(k)} />
      </div>
    ) : null },
  ]

  return (
    <>
      <div className="flex flex-col gap-3 border-b border-line p-4 lg:flex-row lg:items-center">
        <SearchInput value={q} onChange={setQ} placeholder="Search questions and answers" className="lg:w-72" />
        <div className="flex flex-wrap gap-2 lg:ml-auto">
          <FilterSelect label="Type" value={type} onChange={setType} allLabel="All Types" options={TYPES} />
          {canManage && <>
            <Button variant="outline" icon={PackagePlus} className="h-9" onClick={onImport}>Import product info</Button>
            <Button variant="outline" icon={Upload} className="h-9" onClick={() => fileRef.current?.click()}>Upload document</Button>
            <Button icon={Plus} className="h-9" onClick={() => setEditing(null)}>Add Q&amp;A</Button>
          </>}
          <input ref={fileRef} type="file" hidden multiple accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" onChange={(e) => onUpload(e.target.files)} aria-label="Upload knowledge document" />
        </div>
      </div>
      <DemoNote className="mx-4 mt-4">Uploaded documents are stored here by file name and size only — the file content is not read in the browser. Indexing them for answers happens on the backend.</DemoNote>
      <DataTable className="mt-2" columns={columns} rows={rows} initialSort={{ key: 'createdAt', dir: 'desc' }}
        empty={<EmptyState icon={BookOpen} title="No entries" text="Add FAQs, import product info or upload policy documents." />} />
      <EntryModal entry={editing} onClose={() => setEditing(undefined)} />
    </>
  )
}
