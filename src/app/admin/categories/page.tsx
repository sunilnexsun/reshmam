import type { Metadata } from 'next'
import CategoryList from './CategoryList'

export const instant = false

export const metadata: Metadata = { title: 'Categories' }

export default function Page() {
  return <CategoryList />
}
