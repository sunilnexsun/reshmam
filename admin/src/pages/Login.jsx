import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Leaf, Lock, Mail, ShieldCheck } from 'lucide-react'
import { useAuth } from '../services/auth'
import { Button, Checkbox, Field, Input, Modal, useToast } from '../components/ui'
import hero from '../assets/login-hero.webp'
import logoWhite from '../assets/logo-white.png'

const DEMO = [
  { role: 'Admin', email: 'admin@reshmam.com', password: 'Admin@123' },
  { role: 'Manager', email: 'manager@reshmam.com', password: 'Manager@123' },
  { role: 'Staff', email: 'staff@reshmam.com', password: 'Staff@123' },
]

export default function Login() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()
  const [show, setShow] = useState(false)
  const [forgot, setForgot] = useState(false)
  const [error, setError] = useState('')
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm({ defaultValues: { email: '', password: '', remember: true } })

  if (user) return <Navigate to={location.state?.from || '/'} replace />

  const onSubmit = async ({ email, password, remember }) => {
    setError('')
    await new Promise((r) => setTimeout(r, 350))
    try {
      const u = login(email, password, remember)
      toast.success(`Welcome back, ${u.name.split(' ')[0]}!`)
      navigate(location.state?.from || '/', { replace: true })
    } catch (e) { setError(e.message) }
  }

  return (
    <div className="flex min-h-screen bg-surface">
      {/* Brand panel */}
      <div className="relative hidden w-[46%] overflow-hidden bg-primary text-white lg:flex lg:flex-col">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(22,163,74,0.35),transparent_55%)]" aria-hidden />
        <div className="relative flex items-center gap-3 px-12 pt-10">
          <img src={logoWhite} alt="" className="h-12 w-auto" />
          <div className="leading-none"><p className="font-serif text-2xl font-bold tracking-wide">RESHMAM</p><p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/75">Natural Goodness</p></div>
        </div>
        <div className="relative px-12 pt-16">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium"><Leaf className="h-3.5 w-3.5" />Premium Products</p>
          <h1 className="mt-5 font-serif text-5xl font-bold leading-tight">Natural Goodness</h1>
          <p className="mt-3 text-xl text-white/85">For a Healthier Tomorrow</p>
          <p className="mt-6 max-w-md text-sm leading-relaxed text-white/70">Manage products, branch-wise pricing, inventory, orders and customer conversations for RESHMAM traditional cold-pressed oils — all in one place.</p>
        </div>
        <div className="relative mt-auto px-12 pb-10">
          <div className="overflow-hidden rounded-2xl bg-[#f6efe2] shadow-2xl ring-1 ring-white/20">
            <img src={hero} alt="RESHMAM cold-pressed coconut oil" className="h-auto w-full object-cover" />
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="flex flex-1 items-center justify-center px-5 py-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary"><img src={logoWhite} alt="" className="h-8" /></span>
            <div className="leading-none"><p className="font-serif text-2xl font-bold text-primary">RESHMAM</p><p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-accent">Admin Panel</p></div>
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
                <Checkbox label="Remember Me" {...register('remember')} />
                <button type="button" onClick={() => setForgot(true)} className="text-sm font-medium text-accent hover:underline">Forgot Password?</button>
              </div>
              <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>Login</Button>
            </form>
          </div>

          <div className="mt-5 rounded-xl border border-dashed border-line bg-white/60 p-4">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-ink"><ShieldCheck className="h-4 w-4 text-accent" />Demo accounts (sample data, stored in this browser)</p>
            <div className="mt-2 grid gap-1.5">
              {DEMO.map((d) => (
                <button key={d.role} type="button" onClick={() => { setValue('email', d.email, { shouldValidate: true }); setValue('password', d.password, { shouldValidate: true }) }}
                  className="flex items-center justify-between rounded-lg px-2 py-1.5 text-left text-xs hover:bg-surface">
                  <span><b className="text-ink">{d.role}</b> <span className="text-muted">· {d.email}</span></span>
                  <span className="font-mono text-muted">{d.password}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Modal open={forgot} onClose={() => setForgot(false)} title="Reset password" size="sm" footer={<Button onClick={() => setForgot(false)}>Got it</Button>}>
        <p className="text-sm text-ink">Password reset emails need the backend email service, which is not connected in this frontend version.</p>
        <p className="mt-2 text-sm text-muted">Until then, an Admin can reset any user's password from <b>Settings → User Management</b>.</p>
      </Modal>
    </div>
  )
}
