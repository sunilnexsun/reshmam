import type { Metadata } from 'next'
import BlogEditor from '@admin/blogs/BlogEditor'

export const instant = false

export const metadata: Metadata = { title: 'Create Blog Article' }

export default function Page() {
  return <BlogEditor />
}
