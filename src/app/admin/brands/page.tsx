import type { Metadata } from 'next'
import BrandList from './BrandList'

export const instant = false

export const metadata: Metadata = { title: 'Brands' }

export default function Page() {
  return <BrandList />
}
