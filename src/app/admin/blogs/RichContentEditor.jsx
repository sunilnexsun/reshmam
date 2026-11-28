'use client'
import { useEffect, useImperativeHandle, useRef, useState } from 'react'
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  CheckSquare,
  Eraser,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Minus,
  Quote,
  Redo2,
  Strikethrough,
  Underline,
  Undo2,
} from 'lucide-react'
import { uploadProductImage } from '@admin/_lib/firebase'
import { htmlToPlainText, sanitizeBlogHtml } from '@storefront/_lib/blog'
import { useToast } from '@admin/_components/ui'

const BLOCK_OPTIONS = [
  { value: 'p', label: 'Normal' },
  { value: 'h1', label: 'Heading 1' },
  { value: 'h2', label: 'Heading 2' },
  { value: 'h3', label: 'Heading 3' },
  { value: 'callout', label: 'Highlighted Heading' },
  { value: 'blockquote', label: 'Quote' },
]

function ToolbarBtn({ active, disabled, onAction, title, children }) {
  return (
    <button
      type="button"
      disabled={disabled}
      title={title}
      aria-label={title}
      aria-pressed={active || undefined}
      onMouseDown={(e) => {
        e.preventDefault()
        if (!disabled) onAction()
      }}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-md text-xs font-medium transition ${
        active
          ? 'bg-primary text-white shadow-xs'
          : 'text-ink hover:bg-surface hover:text-primary'
      } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
    >
      {children}
    </button>
  )
}

function closestTag(node, tagNames) {
  let cur = node?.nodeType === 3 ? node.parentElement : node
  while (cur && !cur.getAttribute?.('contenteditable')) {
    if (tagNames.includes(cur.tagName?.toLowerCase())) return cur
    cur = cur.parentElement
  }
  return null
}

/**
 * Uncontrolled rich-text contentEditable editor with zero per-keystroke React re-renders.
 * Reads live HTML imperatively via `editorRef.current.getHtml()`.
 */
export default function RichContentEditor({
  editorRef,
  initialHtml = '',
  editorKey = 'new',
  placeholder = 'Write your article content here… Use the toolbar for headings, checklists, quotes, links, and inline images.',
  onStatsChange,
}) {
  const domRef = useRef(null)
  const fileInputRef = useRef(null)
  const savedRangeRef = useRef(null)
  const statsTimerRef = useRef(null)
  const lastToolbarKeyRef = useRef('')
  const toast = useToast()

  const [uploadingImage, setUploadingImage] = useState(false)
  const [linkOpen, setLinkOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkLabel, setLinkLabel] = useState('')
  const [toolbar, setToolbar] = useState({
    block: 'p',
    bold: false,
    italic: false,
    underline: false,
    strike: false,
    ul: false,
    checklist: false,
    ol: false,
  })

  const emitStats = () => {
    if (!onStatsChange || !domRef.current) return
    const text = htmlToPlainText(domRef.current.innerHTML || '')
    const words = text ? text.split(/\s+/).filter(Boolean).length : 0
    const mins = words ? Math.max(1, Math.ceil(words / 200)) : 0
    onStatsChange({ words, mins })
  }

  // Initialize DOM only on mount or when switching article (never during typing)
  useEffect(() => {
    const el = domRef.current
    if (!el) return
    el.innerHTML = sanitizeBlogHtml(initialHtml) || ''
    emitStats()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editorKey])

  useImperativeHandle(editorRef, () => ({
    getHtml: () => {
      const raw = domRef.current?.innerHTML || ''
      const clean = sanitizeBlogHtml(raw)
      return htmlToPlainText(clean) || /<img\b/i.test(clean) ? clean : ''
    },
    getText: () => htmlToPlainText(domRef.current?.innerHTML || ''),
    focus: () => domRef.current?.focus(),
  }))

  const saveSelection = () => {
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) return null
    const range = sel.getRangeAt(0)
    if (domRef.current && domRef.current.contains(range.commonAncestorContainer)) {
      savedRangeRef.current = range.cloneRange()
      return savedRangeRef.current
    }
    return null
  }

  const restoreSelection = () => {
    domRef.current?.focus()
    const sel = window.getSelection()
    if (savedRangeRef.current && sel) {
      sel.removeAllRanges()
      sel.addRange(savedRangeRef.current)
    }
  }

  const syncToolbar = () => {
    if (typeof document === 'undefined' || !domRef.current) return
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) return
    if (!domRef.current.contains(sel.anchorNode)) return

    const blockEl = closestTag(sel.anchorNode, ['h1', 'h2', 'h3', 'blockquote', 'p'])
    let block = 'p'
    if (blockEl) {
      const tag = blockEl.tagName.toLowerCase()
      block = tag === 'h2' && blockEl.classList.contains('blog-callout') ? 'callout' : tag
    }
    const ulEl = closestTag(sel.anchorNode, ['ul'])
    const checklist = Boolean(ulEl && ulEl.classList.contains('blog-checklist'))
    const ul = Boolean(ulEl && !checklist)

    const next = {
      block,
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      strike: document.queryCommandState('strikeThrough'),
      ul,
      checklist,
      ol: document.queryCommandState('insertOrderedList'),
    }
    const sig = JSON.stringify(next)
    if (sig !== lastToolbarKeyRef.current) {
      lastToolbarKeyRef.current = sig
      setToolbar(next)
    }
  }

  const exec = (cmd, val = null) => {
    domRef.current?.focus()
    document.execCommand(cmd, false, val)
    syncToolbar()
    scheduleStats()
  }

  const scheduleStats = () => {
    if (statsTimerRef.current) clearTimeout(statsTimerRef.current)
    statsTimerRef.current = setTimeout(emitStats, 250)
  }

  const applyBlockFormat = (val) => {
    domRef.current?.focus()
    if (val === 'callout') {
      document.execCommand('formatBlock', false, '<h2>')
      const sel = window.getSelection()
      const h2 = sel?.anchorNode ? closestTag(sel.anchorNode, ['h2']) : null
      if (h2) h2.classList.add('blog-callout')
    } else {
      const sel = window.getSelection()
      const existingH2 = sel?.anchorNode ? closestTag(sel.anchorNode, ['h2']) : null
      if (existingH2) existingH2.classList.remove('blog-callout')
      document.execCommand('formatBlock', false, `<${val}>`)
    }
    syncToolbar()
    scheduleStats()
  }

  const toggleChecklist = () => {
    domRef.current?.focus()
    const sel = window.getSelection()
    const ulEl = sel?.anchorNode ? closestTag(sel.anchorNode, ['ul']) : null
    if (ulEl) {
      ulEl.classList.toggle('blog-checklist')
    } else {
      document.execCommand('insertUnorderedList', false, null)
      const afterSel = window.getSelection()
      const newUl = afterSel?.anchorNode ? closestTag(afterSel.anchorNode, ['ul']) : null
      if (newUl) newUl.classList.add('blog-checklist')
    }
    syncToolbar()
    scheduleStats()
  }

  const openLinkPopover = () => {
    const range = saveSelection()
    const selectedText = range ? range.toString() : ''
    const existingLink = range ? closestTag(range.commonAncestorContainer, ['a']) : null
    setLinkUrl(existingLink?.getAttribute('href') || 'https://')
    setLinkLabel(selectedText || existingLink?.textContent || '')
    setLinkOpen(true)
  }

  const applyLink = (e) => {
    e.preventDefault()
    const url = linkUrl.trim()
    if (!url || url === 'https://') {
      setLinkOpen(false)
      return
    }
    const safeUrl = /^(https?:|mailto:|tel:|\/)/i.test(url) ? url : `https://${url}`
    restoreSelection()
    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0 && !sel.getRangeAt(0).collapsed) {
      document.execCommand('createLink', false, safeUrl)
      const anchor = closestTag(sel.anchorNode, ['a'])
      if (anchor && safeUrl.startsWith('http')) {
        anchor.setAttribute('target', '_blank')
        anchor.setAttribute('rel', 'noopener noreferrer')
      }
    } else {
      const label = (linkLabel.trim() || safeUrl)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
      const attrs = safeUrl.startsWith('http') ? ' target="_blank" rel="noopener noreferrer"' : ''
      document.execCommand('insertHTML', false, `<a href="${safeUrl.replace(/"/g, '&quot;')}"${attrs}>${label}</a>`)
    }
    setLinkOpen(false)
    setLinkUrl('')
    setLinkLabel('')
    syncToolbar()
    scheduleStats()
  }

  const onPickInlineImage = () => {
    saveSelection()
    fileInputRef.current?.click()
  }

  const onInlineImageSelected = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploadingImage(true)
    try {
      const url = await uploadProductImage(file, { pathPrefix: 'blogs', maxSizeMB: 2 })
      restoreSelection()
      const alt = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').replace(/"/g, '&quot;')
      document.execCommand(
        'insertHTML',
        false,
        `<figure class="blog-figure"><img src="${url}" alt="${alt}" /></figure><p><br></p>`
      )
      scheduleStats()
      toast.success('Image uploaded to Storage and inserted')
    } catch (err) {
      toast.error(err?.message || 'Failed to upload inline image')
    } finally {
      setUploadingImage(false)
    }
  }

  const handlePaste = (e) => {
    const html = e.clipboardData?.getData('text/html')
    const text = e.clipboardData?.getData('text/plain') || ''
    if (!html) return // Native plain text paste is fast and safe
    e.preventDefault()
    // Strip bloated inline font/color/background spans from external editors (Word/Docs)
    const clean = sanitizeBlogHtml(html)
      .replace(/<\/?(meta|font|o:p|xml)[^>]*>/gi, '')
      .replace(/\sclass\s*=\s*(?:"[^"]*"|'[^']*')/gi, (m) =>
        /blog-(callout|checklist|figure)/.test(m) ? m : ''
      )
    if (clean.trim()) {
      document.execCommand('insertHTML', false, clean)
    } else if (text) {
      document.execCommand('insertText', false, text)
    }
    scheduleStats()
  }

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-white shadow-xs focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/15">
      {/* Formatting Toolbar */}
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-1 border-b border-line bg-surface/90 px-2.5 py-2 backdrop-blur-xs">
        <select
          aria-label="Text block format"
          value={toolbar.block}
          onChange={(e) => applyBlockFormat(e.target.value)}
          className="h-8 rounded-md border border-line bg-white px-2 text-xs font-medium text-ink outline-none focus:border-accent"
        >
          {BLOCK_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <span className="mx-1 h-5 w-px bg-line" aria-hidden />

        <ToolbarBtn title="Bold" active={toolbar.bold} onAction={() => exec('bold')}>
          <Bold className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn title="Italic" active={toolbar.italic} onAction={() => exec('italic')}>
          <Italic className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn title="Underline" active={toolbar.underline} onAction={() => exec('underline')}>
          <Underline className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn title="Strikethrough" active={toolbar.strike} onAction={() => exec('strikeThrough')}>
          <Strikethrough className="h-3.5 w-3.5" />
        </ToolbarBtn>

        <span className="mx-1 h-5 w-px bg-line" aria-hidden />

        <ToolbarBtn title="Align left" onAction={() => exec('justifyLeft')}>
          <AlignLeft className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn title="Align center" onAction={() => exec('justifyCenter')}>
          <AlignCenter className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn title="Align right" onAction={() => exec('justifyRight')}>
          <AlignRight className="h-3.5 w-3.5" />
        </ToolbarBtn>

        <span className="mx-1 h-5 w-px bg-line" aria-hidden />

        <ToolbarBtn title="Bullet list" active={toolbar.ul} onAction={() => exec('insertUnorderedList')}>
          <List className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn title="Numbered list" active={toolbar.ol} onAction={() => exec('insertOrderedList')}>
          <ListOrdered className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn title="Checklist with green ticks" active={toolbar.checklist} onAction={toggleChecklist}>
          <CheckSquare className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn title="Highlighted quote" active={toolbar.block === 'blockquote'} onAction={() => applyBlockFormat(toolbar.block === 'blockquote' ? 'p' : 'blockquote')}>
          <Quote className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn title="Divider line" onAction={() => exec('insertHorizontalRule')}>
          <Minus className="h-3.5 w-3.5" />
        </ToolbarBtn>

        <span className="mx-1 h-5 w-px bg-line" aria-hidden />

        <ToolbarBtn title="Insert link" active={linkOpen} onAction={openLinkPopover}>
          <Link2 className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn title="Upload & insert image to Storage" disabled={uploadingImage} onAction={onPickInlineImage}>
          {uploadingImage ? <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" /> : <ImagePlus className="h-3.5 w-3.5" />}
        </ToolbarBtn>

        <span className="mx-1 h-5 w-px bg-line" aria-hidden />

        <ToolbarBtn title="Undo" onAction={() => exec('undo')}>
          <Undo2 className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn title="Redo" onAction={() => exec('redo')}>
          <Redo2 className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn title="Clear formatting" onAction={() => exec('removeFormat')}>
          <Eraser className="h-3.5 w-3.5" />
        </ToolbarBtn>
      </div>

      {/* Inline Link Bar (non-blocking alternative to window.prompt) */}
      {linkOpen && (
        <div className="flex flex-wrap items-center gap-2 border-b border-line bg-accent-soft/40 px-3 py-2 text-xs">
          <input
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') applyLink(e) }}
            placeholder="https://reshmam.com/products"
            autoFocus
            className="h-8 min-w-[200px] flex-1 rounded-md border border-line bg-white px-2.5 text-xs outline-none focus:border-accent"
          />
          <input
            type="text"
            value={linkLabel}
            onChange={(e) => setLinkLabel(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') applyLink(e) }}
            placeholder="Link text (optional)"
            className="h-8 w-44 rounded-md border border-line bg-white px-2.5 text-xs outline-none focus:border-accent"
          />
          <button
            type="button"
            onClick={applyLink}
            className="h-8 rounded-md bg-primary px-3 font-semibold text-white transition hover:bg-primary-dark"
          >
            Insert Link
          </button>
          <button
            type="button"
            onClick={() => setLinkOpen(false)}
            className="h-8 rounded-md border border-line bg-white px-2.5 text-muted hover:text-ink"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Editable Surface */}
      <div
        ref={domRef}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label="Blog Content"
        data-placeholder={placeholder}
        onInput={scheduleStats}
        onKeyUp={syncToolbar}
        onMouseUp={syncToolbar}
        onFocus={syncToolbar}
        onPaste={handlePaste}
        className="blog-prose min-h-[380px] max-h-[680px] overflow-y-auto px-5 py-4 outline-none"
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={onInlineImageSelected}
      />
    </div>
  )
}
