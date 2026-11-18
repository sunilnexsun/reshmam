'use client'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from '@admin/_lib/navigation'
import { useFieldArray, useForm } from 'react-hook-form'
import { Info, Plus, Save, ShieldAlert, Sparkles, Trash2 } from 'lucide-react'
import { Badge, Button, Card, EmptyState, Field, IconButton, ImageUploader, Input, PageHeader, Select, StatusBadge, Textarea, Toggle, useConfirm, useToast } from '@admin/_components/ui'
import { getState, saveProduct, updateVariant, useDb } from '@admin/_lib/store'
import { stockStatus } from '@admin/_lib/selectors'
import { useAuth } from '@admin/_lib/auth'
import { UNIT_TYPES } from '@admin/_lib/seed'
import { cn, inr, num } from '@admin/_lib/format'
import NotFound from '@admin/_components/NotFound'
import { discountPct, GST_RATES, normSize, priceRange, suggestSku, variantSku } from './productUtils'

export default function ProductForm() {
  const { id } = useParams()
  const db = useDb()
  const { can } = useAuth()
  const product = id ? db.products.find((p) => p.id === id) : null
  if (id && !product) return <NotFound title="Product not found" text="It may have been deleted." back="/products" backLabel="Back to Products" />
  if (!can('products', 'manage')) {
    return (
      <>
        <PageHeader title={id ? 'Edit Product' : 'Add Product'} breadcrumbs={[{ label: 'Products', to: '/products' }, { label: id ? 'Edit' : 'Add Product' }]} />
        <EmptyState className="card" icon={ShieldAlert} title="You can view products but not edit them" text="Ask an administrator to give your role “manage” access to Products." action={<Button as="link" to="/products" variant="outline">Back to Products</Button>} />
      </>
    )
  }
  return <ProductFormInner key={id || 'new'} product={product} />
}

const blankVariant = (branchId, unitType = 'Bottle') => ({ variantId: '', branchId, unitType, size: '', price: '', mrp: '', stock: '0', alertStock: '10', status: 'Active' })

function ProductFormInner({ product }) {
  // Changing an existing variant's stock is an inventory adjustment, so it also needs inventory permission.
  const canEditStock = useAuth().can('inventory', 'manage')
  const db = useDb()
  const navigate = useNavigate()
  const toast = useToast()
  const confirm = useConfirm()
  const isEdit = !!product
  const branches = db.branches
  const branchById = useMemo(() => Object.fromEntries(db.branches.map((b) => [b.id, b])), [db.branches])

  // Snapshot of the product's variants when the form opened (edit mode) — used to detect changes.
  const [original] = useState(() => (product ? getState().variants.filter((v) => v.productId === product.id) : []))
  const [defaults] = useState(() => (product ? {
    name: product.name, sku: product.sku, description: product.description || '', category: product.category, brand: product.brand,
    hsn: product.hsn || '', gst: String(product.gst ?? 5), images: product.images || [], primaryImage: product.primaryImage || 0,
    status: product.status, featured: !!product.featured,
    variants: original.length ? original.map((v) => ({ variantId: v.id, branchId: v.branchId, unitType: v.unitType || product.unitType || 'Bottle', size: v.size, price: String(v.price), mrp: String(v.mrp), stock: String(v.stock), alertStock: String(v.alertStock ?? 10), status: v.status || 'Active' })) : [blankVariant(db.branches[0]?.id, product.unitType)],
  } : {
    name: '', sku: '', description: '', category: '', brand: '', hsn: '', gst: String(db.settings?.tax?.defaultGst ?? 5),
    images: [], primaryImage: 0, status: 'Active', featured: false, variants: [blankVariant(db.branches[0]?.id)],
  }))

  const { register, handleSubmit, control, watch, setValue, getValues, formState: { errors, isSubmitting, isDirty, dirtyFields } } = useForm({ defaultValues: defaults, mode: 'onTouched' })
  const { fields, append, remove } = useFieldArray({ control, name: 'variants' })
  const [skuTouched, setSkuTouched] = useState(isEdit)

  const name = watch('name')
  const brand = watch('brand')
  const images = watch('images')
  const primaryImage = watch('primaryImage')
  const status = watch('status')
  const featured = watch('featured')
  const variants = watch('variants')

  const categoryOptions = useMemo(() => {
    const fromDb = (db.categories || []).filter((c) => c.status !== 'Inactive').map((c) => c.name)
    if (fromDb.length > 0) return fromDb
    return Array.from(new Set(db.products.map((p) => p.category).filter(Boolean)))
  }, [db.categories, db.products])

  const brandOptions = useMemo(() => {
    const fromDb = (db.brands || []).filter((b) => b.status !== 'Inactive').map((b) => b.name)
    if (fromDb.length > 0) return fromDb
    return Array.from(new Set(db.products.map((p) => p.brand).filter(Boolean)))
  }, [db.brands, db.products])

  const otherSkus = useMemo(() => db.products.filter((p) => p.id !== product?.id).map((p) => p.sku), [db.products, product?.id])
  useEffect(() => {
    if (!skuTouched) setValue('sku', suggestSku(name, brand, otherSkus), { shouldValidate: !!getValues('sku') })
  }, [name, brand, skuTouched, otherSkus, setValue, getValues])

  // Warn before closing the tab with unsaved changes.
  useEffect(() => {
    if (!isDirty) return
    const h = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [isDirty])

  const back = isEdit ? `/products/${product.id}` : '/products'
  const onCancel = async () => {
    if (isDirty && !(await confirm({ title: 'Discard changes?', message: 'You have unsaved changes on this product. Leave without saving?', confirmText: 'Discard Changes' }))) return
    navigate(back)
  }

  const removeRow = async (i) => {
    const row = getValues(`variants.${i}`)
    if (row.variantId) {
      const ok = await confirm({ title: 'Remove this variant?', message: `${row.size || 'This size'} at ${branchById[row.branchId]?.name || 'this branch'} will be removed when you save (current stock ${row.stock}). Its stock and price history stay in the records.`, confirmText: 'Remove Variant' })
      if (!ok) return
    }
    remove(i)
  }
  const addRow = () => {
    const last = getValues('variants').at(-1)
    append({ ...blankVariant(last?.branchId || branches[0]?.id, last?.unitType || 'Bottle') })
  }

  const onSubmit = (v) => {
    const sku = v.sku.trim().toUpperCase()
    const data = {
      ...(isEdit ? { id: product.id } : {}),
      name: v.name.trim(), sku, description: v.description.trim(), category: v.category, brand: v.brand,
      hsn: v.hsn.trim(), gst: Number(v.gst), unitType: v.variants[0]?.unitType || 'Bottle',
      images: v.images, primaryImage: Math.min(v.primaryImage, Math.max(0, v.images.length - 1)), status: v.status, featured: !!v.featured,
    }
    const prev = Object.fromEntries(original.map((o) => [o.id, o]))
    const followUps = []
    const rows = v.variants.map((r) => {
      const old = r.variantId && prev[r.variantId]
      const base = {
        // An existing variant keeps its branch: changing it would move the stock without a transfer record.
        branchId: old ? old.branchId : r.branchId, size: r.size.trim(), unitType: r.unitType, alertStock: Number(r.alertStock), status: r.status,
        sku: old && old.branchId === r.branchId && normSize(old.size) === normSize(r.size) && sku === product?.sku ? old.sku : variantSku(sku, branchById[r.branchId], r.size),
      }
      if (!old) return { ...base, price: Number(r.price), mrp: Number(r.mrp), stock: Number(r.stock) }
      // Price and stock of an existing variant are never written from the form snapshot (saveProduct keeps the
      // live values). Only fields the user actually edited are applied, through updateVariant, so they are
      // recorded in history and an order taken while the form was open isn't undone.
      const patch = {}
      if (Number(r.price) !== old.price) patch.price = Number(r.price)
      if (Number(r.mrp) !== old.mrp) patch.mrp = Number(r.mrp)
      if (canEditStock && Number(r.stock) !== old.stock) patch.stock = Number(r.stock)
      if (Object.keys(patch).length) followUps.push([old.id, patch])
      return { ...base, id: old.id }
    })
    const saved = saveProduct(data, rows)
    followUps.forEach(([vid, patch]) => updateVariant(vid, patch, 'Updated from product form'))
    toast.success(isEdit ? `${saved.name} updated` : `${saved.name} added`)
    navigate(`/products/${saved.id}`, { replace: !isEdit })
  }
  const onInvalid = () => toast.error('Please fix the highlighted fields before saving.')

  const totals = useMemo(() => {
    const valid = (variants || []).filter((r) => Number(r.price) > 0)
    const prices = valid.map((r) => Number(r.price))
    return {
      count: variants?.length || 0,
      stock: (variants || []).reduce((s, r) => s + (Number(r.stock) || 0), 0),
      branches: new Set((variants || []).map((r) => r.branchId)).size,
      range: prices.length ? priceRange(Math.min(...prices), Math.max(...prices)) : '—',
    }
  }, [variants])
  const title = isEdit ? `Edit ${product.name}` : 'Add New Product'
  const vErr = (i, k) => errors.variants?.[i]?.[k]

  return (
    <>
      <PageHeader title={title} subtitle={isEdit ? `SKU ${product.sku}` : 'Catalogue details, images and branch-wise prices & stock.'}
        breadcrumbs={[{ label: 'Products', to: '/products' }, ...(isEdit ? [{ label: product.name, to: `/products/${product.id}` }] : []), { label: isEdit ? 'Edit' : 'Add Product' }]} />

      <form onSubmit={handleSubmit(onSubmit, onInvalid)} noValidate>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 space-y-6">
            <Card title="Basic Information" subtitle="What customers see on the store.">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Product Name" required error={errors.name} htmlFor="pf-name" className="sm:col-span-2">
                  <Input id="pf-name" placeholder="e.g. Pure Coconut Oil" error={errors.name} {...register('name', { required: 'Product name is required', minLength: { value: 3, message: 'Name is too short' }, maxLength: { value: 120, message: 'Keep the name under 120 characters' } })} />
                </Field>
                <Field label="Category" required error={errors.category} htmlFor="pf-category">
                  <Select id="pf-category" placeholder="Select category" options={categoryOptions} error={errors.category} {...register('category', { required: 'Choose a category' })} />
                </Field>
                <Field label="Brand" required error={errors.brand} htmlFor="pf-brand">
                  <Select id="pf-brand" placeholder="Select brand" options={brandOptions} error={errors.brand} {...register('brand', { required: 'Choose a brand' })} />
                </Field>
                <Field label="SKU" required error={errors.sku} htmlFor="pf-sku" hint="Must be unique across products.">
                  <Input id="pf-sku" className="uppercase" placeholder="e.g. VM-COC" error={errors.sku}
                    {...register('sku', {
                      required: 'SKU is required',
                      pattern: { value: /^[A-Za-z0-9][A-Za-z0-9-]{1,30}$/, message: 'Use letters, numbers and dashes only' },
                      validate: (x) => !otherSkus.some((s) => s.toUpperCase() === x.trim().toUpperCase()) || 'Another product already uses this SKU',
                      onChange: () => setSkuTouched(true),
                    })} />
                </Field>
                <Field label="HSN Code" error={errors.hsn} htmlFor="pf-hsn" hint="4–8 digit GST HSN code, e.g. 1513">
                  <Input id="pf-hsn" inputMode="numeric" placeholder="1513" error={errors.hsn} {...register('hsn', { pattern: { value: /^\d{4,8}$/, message: 'HSN must be 4–8 digits' } })} />
                </Field>
                <Field label="GST Rate" required htmlFor="pf-gst">
                  <Select id="pf-gst" options={GST_RATES.map((g) => ({ value: String(g), label: `${g}%` }))} {...register('gst')} />
                </Field>
                <Field label="Description" error={errors.description} htmlFor="pf-desc" className="sm:col-span-2">
                  <Textarea id="pf-desc" rows={4} placeholder="How it is made, uses, pack details…" error={errors.description} {...register('description', { maxLength: { value: 1500, message: 'Keep the description under 1500 characters' } })} />
                </Field>
              </div>
            </Card>

            <Card title="Pricing & Stock by Branch" subtitle="One row per branch and size. Customers see the price of the branch serving them."
              actions={<Button size="sm" variant="secondary" icon={Plus} onClick={addRow}>Add Variant</Button>}>
              <div className="space-y-4">
                {fields.map((f, i) => {
                  const r = variants?.[i] || {}
                  const disc = discountPct(r.price, r.mrp)
                  const st = stockStatus(Number(r.stock) || 0, Number(r.alertStock) || 0)
                  return (
                    <fieldset key={f.id} className={cn('rounded-xl border p-4', vErr(i, 'size') || vErr(i, 'price') || vErr(i, 'mrp') || vErr(i, 'stock') || vErr(i, 'alertStock') ? 'border-red-200 bg-red-50/30' : 'border-line bg-surface/40')}>
                      <legend className="sr-only">Variant {i + 1}</legend>
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-ink">Variant {i + 1}</span>
                        {r.size && <Badge tone="primary">{r.size}</Badge>}
                        {r.variantId ? <Badge tone="gray">Existing</Badge> : <Badge tone="blue">New</Badge>}
                        {disc > 0 && <Badge tone="green">{disc}% off MRP</Badge>}
                        <StatusBadge status={st} />
                        <IconButton icon={Trash2} variant="danger" size="sm" label={`Remove variant ${i + 1}`} className="ml-auto" disabled={fields.length === 1} onClick={() => removeRow(i)} />
                      </div>
                      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                        <Field label="Branch" required htmlFor={`pv-branch-${i}`} className="col-span-2"
                          hint={r.variantId ? 'Fixed for an existing variant — move stock with a transfer in Inventory.' : undefined}>
                          {r.variantId
                            ? <Input id={`pv-branch-${i}`} value={branchById[r.branchId]?.name || ''} readOnly className="bg-surface text-muted" />
                            : <Select id={`pv-branch-${i}`} options={branches.map((b) => ({ value: b.id, label: b.name }))} {...register(`variants.${i}.branchId`, { required: true, deps: [`variants.${i}.size`] })} />}
                        </Field>
                        <Field label="Unit Type" htmlFor={`pv-unit-${i}`}>
                          <Select id={`pv-unit-${i}`} options={UNIT_TYPES} {...register(`variants.${i}.unitType`)} />
                        </Field>
                        <Field label="Size / Weight" required error={vErr(i, 'size')} htmlFor={`pv-size-${i}`}>
                          <Input id={`pv-size-${i}`} placeholder="500 ml" error={vErr(i, 'size')} {...register(`variants.${i}.size`, {
                            required: 'Size is required',
                            validate: (val, fv) => !fv.variants.some((o, j) => j !== i && o.branchId === fv.variants[i].branchId && normSize(o.size) === normSize(val)) || 'This size already exists for this branch',
                          })} />
                        </Field>
                        <Field label="Selling Price (₹)" required error={vErr(i, 'price')} htmlFor={`pv-price-${i}`}>
                          <Input id={`pv-price-${i}`} type="number" inputMode="decimal" min="0" step="0.01" placeholder="150" error={vErr(i, 'price')} {...register(`variants.${i}.price`, {
                            required: 'Price is required', validate: (x) => Number(x) > 0 || 'Price must be more than 0', deps: [`variants.${i}.mrp`],
                          })} />
                        </Field>
                        <Field label="MRP (₹)" required error={vErr(i, 'mrp')} htmlFor={`pv-mrp-${i}`}>
                          <Input id={`pv-mrp-${i}`} type="number" inputMode="decimal" min="0" step="0.01" placeholder="170" error={vErr(i, 'mrp')} {...register(`variants.${i}.mrp`, {
                            required: 'MRP is required', validate: (x, fv) => Number(x) >= Number(fv.variants[i].price) || 'MRP must be ≥ selling price',
                          })} />
                        </Field>
                        <Field label={r.variantId ? 'Current Stock' : 'Initial Stock'} required error={vErr(i, 'stock')} htmlFor={`pv-stock-${i}`}>
                          <Input id={`pv-stock-${i}`} type="number" inputMode="numeric" min="0" step="1" error={vErr(i, 'stock')}
                            readOnly={!!r.variantId && !canEditStock} className={r.variantId && !canEditStock ? 'bg-surface text-muted' : undefined}
                            title={r.variantId && !canEditStock ? 'Changing stock needs Inventory permission' : undefined} {...register(`variants.${i}.stock`, {
                            required: 'Stock is required', validate: (x) => (Number.isInteger(Number(x)) && Number(x) >= 0) || 'Enter 0 or a whole number',
                          })} />
                        </Field>
                        <Field label="Alert Stock" required error={vErr(i, 'alertStock')} htmlFor={`pv-alert-${i}`}>
                          <Input id={`pv-alert-${i}`} type="number" inputMode="numeric" min="0" step="1" error={vErr(i, 'alertStock')} {...register(`variants.${i}.alertStock`, {
                            required: 'Required', validate: (x) => (Number.isInteger(Number(x)) && Number(x) >= 0) || 'Enter 0 or a whole number',
                          })} />
                        </Field>
                        <Field label="Status" htmlFor={`pv-status-${i}`} className="col-span-2 md:col-span-2">
                          <Select id={`pv-status-${i}`} options={['Active', 'Inactive']} {...register(`variants.${i}.status`)} />
                        </Field>
                        {r.variantId && dirtyFields.variants?.[i]?.stock && (
                          <p className="col-span-2 flex items-start gap-1.5 self-end text-xs text-amber-700 md:col-span-2"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />Stock change will be logged as an adjustment in stock history.</p>
                        )}
                      </div>
                    </fieldset>
                  )
                })}
                <Button variant="outline" icon={Plus} onClick={addRow} className="w-full border-dashed">Add another size or branch</Button>
              </div>
            </Card>
          </div>

          <div className="min-w-0 space-y-6">
            <Card title="Product Images" subtitle="The primary image is used in lists and on the store.">
              {/* Narrow side column at xl: use 3 larger tiles instead of the uploader's 6-up grid. */}
              <div className="xl:[&_.grid]:grid-cols-2!">
              <ImageUploader images={images} primary={primaryImage} max={4} maxSizeMB={2} storagePath="products"
                onChange={(list) => setValue('images', list, { shouldDirty: true })}
                onPrimary={(i) => setValue('primaryImage', i, { shouldDirty: true })}
                onError={(m) => toast.error(m)} />
              </div>
            </Card>

            <Card title="Availability">
              <div className="space-y-4">
                <Toggle checked={status === 'Active'} onChange={(on) => setValue('status', on ? 'Active' : 'Inactive', { shouldDirty: true })}
                  label={status === 'Active' ? 'Active' : 'Inactive'} description={status === 'Active' ? 'Visible and orderable on the store' : 'Hidden from the store'} />
                <Toggle checked={featured} onChange={(on) => setValue('featured', on, { shouldDirty: true })}
                  label="Featured product" description="Highlight on the store home page" />
              </div>
            </Card>

            <Card title="Summary">
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-surface p-3"><dt className="text-xs text-muted">Variants</dt><dd className="mt-0.5 font-semibold">{totals.count}</dd></div>
                <div className="rounded-lg bg-surface p-3"><dt className="text-xs text-muted">Branches</dt><dd className="mt-0.5 font-semibold">{totals.branches}</dd></div>
                <div className="rounded-lg bg-surface p-3"><dt className="text-xs text-muted">Total stock</dt><dd className="mt-0.5 font-semibold">{num(totals.stock)}</dd></div>
                <div className="rounded-lg bg-surface p-3"><dt className="text-xs text-muted">Price range</dt><dd className="mt-0.5 truncate font-semibold">{totals.range}</dd></div>
              </dl>
              {!isEdit && <p className="mt-3 flex items-start gap-1.5 text-xs text-muted"><Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />Initial stock is recorded as a “Stock In” entry for each branch.</p>}
              {isEdit && original.length > 0 && <p className="mt-3 text-xs text-muted">Price and MRP changes are saved to Price History with the note “Updated from product form”. Current lowest price: {inr(Math.min(...original.map((o) => o.price)))}.</p>}
            </Card>
          </div>
        </div>

        <div className="sticky bottom-0 z-20 -mx-4 mt-6 flex flex-wrap items-center justify-end gap-2 border-t border-line bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <p className="mr-auto text-xs text-muted">{isDirty ? 'You have unsaved changes' : 'No changes yet'}</p>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button type="submit" icon={Save} loading={isSubmitting}>{isEdit ? 'Save Changes' : 'Save Product'}</Button>
        </div>
      </form>
    </>
  )
}
