'use client'
import { useEffect, useSyncExternalStore } from 'react'
import { AuthProvider } from '@admin/_lib/auth'
import { useLocation } from '@admin/_lib/navigation'
import { takeLoadNotice } from '@admin/_lib/store'
import { AdminLayout } from './layout/AdminLayout'
import { ConfirmProvider, ToastProvider, useToast } from './ui'

const noop = () => () => {}

/**
 * Client-side root of the admin panel.
 * Loads admin data from Firestore once a staff member is signed in.
 */
export function AdminApp({ children }) {
  const mounted = useSyncExternalStore(noop, () => true, () => false)
  // Data sync starts in AuthProvider once a staff member is signed in.

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
