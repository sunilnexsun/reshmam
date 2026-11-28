import type { Metadata } from 'next'
import BlogEditorRoute from './BlogEditorRoute'

export const instant = false

export const metadata: Metadata = { title: 'Edit Blog Article' }

export default function Page() {
  return <BlogEditorRoute />
}
