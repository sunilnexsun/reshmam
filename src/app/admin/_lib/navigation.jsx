'use client'
// Admin-relative navigation built on next/navigation.
// Every admin path is written relative to the panel ('/', '/products/123', '/orders?status=Pending')
// and served under ADMIN_BASE, so pages never repeat the '/admin' prefix.
import { forwardRef, useCallback, useEffect, useMemo } from 'react'
import NextLink from 'next/link'
import { useParams as useNextParams, usePathname, useRouter, useSearchParams as useNextSearchParams } from 'next/navigation'

export const ADMIN_BASE = '/admin'

/** '/products?x=1' → '/admin/products?x=1'; '/' → '/admin'. Absolute URLs pass through. */
export function adminHref(to) {
  if (typeof to !== 'string' || !to.startsWith('/') || to.startsWith('//')) return to
  if (to === '/') return ADMIN_BASE
  if (to.startsWith('/?')) return ADMIN_BASE + to.slice(1)
  return ADMIN_BASE + to
}

/** Current path relative to the panel: '/admin/products' → '/products', '/admin' → '/'. */
function relativePath(pathname) {
  if (!pathname?.startsWith(ADMIN_BASE)) return pathname || '/'
  return pathname.slice(ADMIN_BASE.length) || '/'
}

export const Link = forwardRef(function Link({ to, replace, ...rest }, ref) {
  return <NextLink ref={ref} href={adminHref(to)} replace={replace} {...rest} />
})

/** Link whose className/children may be functions of { isActive }. `end` = exact match only. */
export const NavLink = forwardRef(function NavLink({ to, end, className, children, ...rest }, ref) {
  const path = relativePath(usePathname())
  const isActive = end || to === '/' ? path === to : path === to || path.startsWith(`${to}/`)
  return (
    <Link ref={ref} to={to} aria-current={isActive ? 'page' : undefined}
      className={typeof className === 'function' ? className({ isActive }) : className} {...rest}>
      {typeof children === 'function' ? children({ isActive }) : children}
    </Link>
  )
})

export function useNavigate() {
  const router = useRouter()
  return useCallback((to, { replace } = {}) => {
    if (typeof to === 'number') return to < 0 ? router.back() : router.forward()
    const href = adminHref(to)
    return replace ? router.replace(href) : router.push(href)
  }, [router])
}

/** Redirects on mount; renders nothing. */
export function Navigate({ to, replace }) {
  const navigate = useNavigate()
  useEffect(() => { navigate(to, { replace }) }, [navigate, to, replace])
  return null
}

export function useParams() {
  return useNextParams() ?? {}
}

export function useLocation() {
  const pathname = relativePath(usePathname())
  const search = useNextSearchParams()?.toString() ?? ''
  return useMemo(() => ({ pathname, search: search ? `?${search}` : '' }), [pathname, search])
}

/**
 * [params, setParams] — `params` is a mutable copy of the current query. `setParams` accepts
 * URLSearchParams, a plain object, or a function (current copy) → either of those.
 * Query-only updates keep the scroll position.
 */
export function useSearchParams() {
  const router = useRouter()
  const pathname = usePathname()
  const current = useNextSearchParams()
  const search = current?.toString() ?? ''
  const params = useMemo(() => new URLSearchParams(search), [search])
  const setParams = useCallback((next, { replace } = {}) => {
    const value = typeof next === 'function' ? next(new URLSearchParams(window.location.search)) : next
    const qs = new URLSearchParams(value).toString()
    const href = qs ? `${pathname}?${qs}` : pathname
    if (replace) router.replace(href, { scroll: false })
    else router.push(href, { scroll: false })
  }, [router, pathname])
  return [params, setParams]
}
