'use client'
import { useParams } from '@admin/_lib/navigation'
import BlogEditor from '@admin/blogs/BlogEditor'

export default function BlogEditorRoute() {
  const { id } = useParams()
  return <BlogEditor blogId={id} />
}
