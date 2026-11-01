'use client'
import { SearchX } from 'lucide-react'
import { Button, EmptyState } from './ui'

export default function NotFound({ title = 'Page not found', text = 'The page you are looking for does not exist or was removed.', back = '/', backLabel = 'Back to Dashboard' }) {
  return <EmptyState icon={SearchX} title={title} text={text} action={<Button as="link" to={back}>{backLabel}</Button>} className="card py-20" />
}
