import type { Metadata } from 'next'
import TestimonialList from './TestimonialList'

export const instant = false

export const metadata: Metadata = { title: 'Testimonials' }

export default function Page() {
  return <TestimonialList />
}
