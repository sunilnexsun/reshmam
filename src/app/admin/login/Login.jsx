'use client'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Navigate, useNavigate, useSearchParams } from '@admin/_lib/navigation'
import { Eye, EyeOff, Leaf, Lock, Mail } from 'lucide-react'
import { useAuth } from '@admin/_lib/auth'
import { Button, Checkbox, Field, Input, Modal, useToast } from '@admin/_components/ui'
import hero from '@admin/_assets/login-hero.webp'

const REMEMBER_KEY = 'reshmam-admin-remember'

function loadRemembered() {
  try {
    const raw = localStorage.getItem(REMEMBER_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && parsed.email) {
      return {
        email: String(parsed.email || ''),
        password: String(parsed.password || ''),
        remember: true,
      }
    }
  } catch {}
  return null
}

function saveRemembered(remember, email, password) {
  try {
    if (remember) {
      localStorage.setItem(
        REMEMBER_KEY,
        JSON.stringify({ email: String(email || '').trim(), password: String(password || ''), remember: true })
      )
    } else {
      localStorage.removeItem(REMEMBER_KEY)
    }
  } catch {}
}

export default function Login() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  // Only panel-relative paths, so ?next= can't send anyone to another site.
  const next = /^\/(?!\/)/.test(params.get('next') || '') ? params.get('next') : '/'
  const toast = useToast()
  const [show, setShow] = useState(false)
  const [forgot, setForgot] = useState(false)
  const [error, setError] = useState('')
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { email: '', password: '', remember: true },
  })

  // Restore remembered email & password on client mount
  useEffect(() => {
    const saved = loadRemembered()
    if (saved) {
      reset(saved)
    }
  }, [reset])

  if (user) return <Navigate to={next} replace />

  const onSubmit = async ({ email, password, remember }) => {
    setError('')
    try {
      const u = await login(email, password, remember)
      saveRemembered(!!remember, email, password)
      toast.success(`Welcome back, ${(u.name || 'Admin').split(' ')[0]}!`)
      navigate(next, { replace: true })
    } catch (e) { setError(e.message) }
  }

  const rememberField = register('remember', {
    onChange: (e) => {
      if (!e.target.checked) {
        saveRemembered(false, '', '')
      }
    },
  })

  return (
    <div className="flex min-h-screen bg-surface">
      {/* Brand panel */}
      <div className="relative hidden w-[46%] overflow-hidden bg-primary text-white lg:flex lg:flex-col">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(22,163,74,0.35),transparent_55%)]" aria-hidden />
        <div className="relative flex items-center gap-3 px-12 pt-10">
          <span className="rounded-xl bg-[#fffdf6] px-4 py-2.5 shadow-sm"><img src="/images/logo.png" alt="RESHMAM" className="h-14 w-auto" /></span>
        </div>
        <div className="relative px-12 pt-16">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium"><Leaf className="h-3.5 w-3.5" />Premium Products</p>
          <h1 className="mt-5 font-serif text-5xl font-bold leading-tight">Natural Goodness</h1>
          <p className="mt-3 text-xl text-white/85">For a Healthier Tomorrow</p>
          <p className="mt-6 max-w-md text-sm leading-relaxed text-white/70">Manage products, branch-wise pricing, inventory, orders and customer conversations for RESHMAM traditional cold-pressed oils — all in one place.</p>
        </div>
        <div className="relative mt-auto px-12 pb-10">
          <div className="overflow-hidden rounded-2xl bg-[#f6efe2] shadow-2xl ring-1 ring-white/20">
            <img src={hero.src} alt="RESHMAM cold-pressed coconut oil" className="h-auto w-full object-cover" />
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="flex flex-1 items-center justify-center px-5 py-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center justify-center lg:hidden">
            <img src="/images/logo.png" alt="RESHMAM" className="h-14 w-auto" />
          </div>
          <div className="card p-7 sm:p-9">
            <h2 className="text-2xl font-bold tracking-tight">Welcome Back</h2>
            <p className="mt-1 text-sm text-muted">Login to your admin account</p>
            {error && <p role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-6 space-y-4">
              <Field label="Email Address" htmlFor="email" error={errors.email}>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <Input id="email" type="email" autoComplete="username" placeholder="admin@reshmam.com" className="h-11 pl-9" error={errors.email}
                    {...register('email', { required: 'Email is required', pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email address' } })} />
                </div>
              </Field>
              <Field label="Password" htmlFor="password" error={errors.password}>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <Input id="password" type={show ? 'text' : 'password'} autoComplete="current-password" placeholder="Enter your password" className="h-11 pl-9 pr-11" error={errors.password}
                    {...register('password', { required: 'Password is required', minLength: { value: 6, message: 'Password must be at least 6 characters' } })} />
                  <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-muted hover:text-ink">
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </Field>
              <div className="flex items-center justify-between">
                <Checkbox label="Remember Me" {...rememberField} />
                <button type="button" onClick={() => setForgot(true)} className="text-sm font-medium text-accent hover:underline">Forgot Password?</button>
              </div>
              <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>Login</Button>
            </form>
          </div>
        </div>
      </div>

      <Modal open={forgot} onClose={() => setForgot(false)} title="Reset password" size="sm" footer={<Button onClick={() => setForgot(false)}>Got it</Button>}>
        <p className="text-sm text-ink">Contact an Admin to reset your password from <b>Settings → User Management</b>.</p>
      </Modal>
    </div>
  )
}
