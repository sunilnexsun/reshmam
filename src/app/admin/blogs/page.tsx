import type { Metadata } from 'next'
import BlogList from './BlogList'

export const instant = false

export const metadata: Metadata = { title: 'Blogs' }

export default function Page() {
  return <BlogList />
}
