'use client'
import { useEffect, useSyncExternalStore } from 'react'
import { AuthProvider } from '@admin/_lib/auth'
import { useLocation } from '@admin/_lib/navigation'
import { takeLoadNotice } from '@admin/_lib/store'
import { AdminLayout } from './layout/AdminLayout'
import { ConfirmProvider, ToastProvider, useToast } from './ui'

const noop = () => () => {}

/**
 * Client-side root of the admin panel. Its data lives in the browser (localStorage) until the
 * backend is connected, so nothing is rendered on the server: the first paint happens after
 * hydration, which avoids markup that differs between server and browser.
 * Every page except /admin/login gets the sidebar shell, which also requires a signed-in user.
 */
export function AdminApp({ children }) {
  const mounted = useSyncExternalStore(noop, () => true, () => false)
  if (!mounted) return null
  return (
    <ToastProvider>
      <ConfirmProvider>
        <AuthProvider><Shell>{children}</Shell></AuthProvider>
      </ConfirmProvider>
    </ToastProvider>
  )
}

function Shell({ children }) {
  const { pathname } = useLocation()
  const toast = useToast()
  useEffect(() => {
    const notice = takeLoadNotice()
    if (notice) toast.warning(notice)
  }, [toast])
  return pathname === '/login' ? children : <AdminLayout>{children}</AdminLayout>
}
