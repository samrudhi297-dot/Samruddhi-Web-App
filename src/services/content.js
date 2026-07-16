import { supabase, isSupabaseConfigured } from '../utils/supabaseClient.js'
import { apiUrl, readJsonSafe } from '../utils/api.js'

function backendEnabled() {
  return isSupabaseConfigured && !!supabase
}

function authHeaders() {
  const token = localStorage.getItem('adminToken')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// --- Testimonials ---

function normalizeTestimonial(row) {
  return {
    id: row.id,
    quote: row.quote || '',
    authorName: row.author_name || row.authorName || '',
    location: row.location || '',
    sortOrder: row.sort_order ?? row.sortOrder ?? 0,
    published: row.published !== false,
    createdAt: row.created_at || row.createdAt,
  }
}

export async function getTestimonials({ admin = false } = {}) {
  if (backendEnabled()) {
    let q = supabase.from('testimonials').select('*').order('sort_order', { ascending: true })
    if (!admin) q = q.eq('published', true)
    const { data, error } = await q
    if (error) throw new Error(error.message)
    return (data || []).map(normalizeTestimonial)
  }
  const url = admin ? apiUrl('/api/testimonials?admin=1') : apiUrl('/api/testimonials')
  const res = await fetch(url, admin ? { headers: authHeaders() } : undefined)
  if (!res.ok) throw new Error('Failed to load testimonials')
  const data = await res.json()
  return Array.isArray(data) ? data.map(normalizeTestimonial) : []
}

export async function saveTestimonial(item) {
  const payload = {
    quote: item.quote,
    author_name: item.authorName,
    location: item.location || '',
    sort_order: Number(item.sortOrder) || 0,
    published: item.published !== false,
  }
  if (backendEnabled()) {
    if (item.id) {
      const { data, error } = await supabase.from('testimonials').update(payload).eq('id', item.id).select('*').single()
      if (error) throw new Error(error.message)
      return normalizeTestimonial(data)
    }
    const { data, error } = await supabase.from('testimonials').insert(payload).select('*').single()
    if (error) throw new Error(error.message)
    return normalizeTestimonial(data)
  }
  const method = item.id ? 'PUT' : 'POST'
  const url = item.id ? apiUrl(`/api/testimonials/${item.id}`) : apiUrl('/api/testimonials')
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(item),
  })
  const body = await readJsonSafe(res)
  if (!res.ok) throw new Error(body?.error || 'Failed to save testimonial')
  return normalizeTestimonial(body.item || item)
}

export async function deleteTestimonial(id) {
  if (backendEnabled()) {
    const { error } = await supabase.from('testimonials').delete().eq('id', id)
    if (error) throw new Error(error.message)
    return
  }
  const res = await fetch(apiUrl(`/api/testimonials/${id}`), { method: 'DELETE', headers: authHeaders() })
  if (!res.ok) {
    const body = await readJsonSafe(res)
    throw new Error(body?.error || 'Failed to delete')
  }
}

// --- Blogs ---

function normalizeBlog(row) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt || '',
    body: row.body || '',
    coverImage: row.cover_image || row.coverImage || '',
    published: row.published !== false,
    publishedAt: row.published_at || row.publishedAt,
    createdAt: row.created_at || row.createdAt,
  }
}

export async function getBlogs({ admin = false } = {}) {
  if (backendEnabled()) {
    let q = supabase.from('blogs').select('*').order('published_at', { ascending: false })
    if (!admin) q = q.eq('published', true)
    const { data, error } = await q
    if (error) throw new Error(error.message)
    return (data || []).map(normalizeBlog)
  }
  const url = admin ? apiUrl('/api/blogs?admin=1') : apiUrl('/api/blogs')
  const res = await fetch(url, admin ? { headers: authHeaders() } : undefined)
  if (!res.ok) throw new Error('Failed to load blogs')
  const data = await res.json()
  return Array.isArray(data) ? data.map(normalizeBlog) : []
}

export async function getBlogBySlug(slug) {
  if (backendEnabled()) {
    const { data, error } = await supabase.from('blogs').select('*').eq('slug', slug).eq('published', true).maybeSingle()
    if (error) throw new Error(error.message)
    if (!data) throw new Error('Blog not found')
    return normalizeBlog(data)
  }
  const res = await fetch(apiUrl(`/api/blogs/${slug}`))
  if (!res.ok) throw new Error('Blog not found')
  return normalizeBlog(await res.json())
}

export async function saveBlog(item) {
  const payload = {
    slug: item.slug,
    title: item.title,
    excerpt: item.excerpt || '',
    body: item.body || '',
    cover_image: item.coverImage || '',
    published: item.published !== false,
    published_at: item.publishedAt || new Date().toISOString(),
  }
  if (backendEnabled()) {
    if (item.id) {
      const { data, error } = await supabase.from('blogs').update(payload).eq('id', item.id).select('*').single()
      if (error) throw new Error(error.message)
      return normalizeBlog(data)
    }
    const { data, error } = await supabase.from('blogs').insert(payload).select('*').single()
    if (error) throw new Error(error.message)
    return normalizeBlog(data)
  }
  const method = item.id ? 'PUT' : 'POST'
  const url = item.id ? apiUrl(`/api/blogs/${item.id}`) : apiUrl('/api/blogs')
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(item),
  })
  const body = await readJsonSafe(res)
  if (!res.ok) throw new Error(body?.error || 'Failed to save blog')
  return normalizeBlog(body.item || item)
}

export async function deleteBlog(id) {
  if (backendEnabled()) {
    const { error } = await supabase.from('blogs').delete().eq('id', id)
    if (error) throw new Error(error.message)
    return
  }
  const res = await fetch(apiUrl(`/api/blogs/${id}`), { method: 'DELETE', headers: authHeaders() })
  if (!res.ok) {
    const body = await readJsonSafe(res)
    throw new Error(body?.error || 'Failed to delete')
  }
}

// --- Resources ---

function normalizeResource(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    fileUrl: row.file_url || row.fileUrl || '',
    category: row.category || 'general',
    sortOrder: row.sort_order ?? row.sortOrder ?? 0,
    published: row.published !== false,
    createdAt: row.created_at || row.createdAt,
  }
}

export async function getResources({ admin = false } = {}) {
  if (backendEnabled()) {
    let q = supabase.from('resources').select('*').order('sort_order', { ascending: true })
    if (!admin) q = q.eq('published', true)
    const { data, error } = await q
    if (error) throw new Error(error.message)
    return (data || []).map(normalizeResource)
  }
  const url = admin ? apiUrl('/api/resources?admin=1') : apiUrl('/api/resources')
  const res = await fetch(url, admin ? { headers: authHeaders() } : undefined)
  if (!res.ok) throw new Error('Failed to load resources')
  const data = await res.json()
  return Array.isArray(data) ? data.map(normalizeResource) : []
}

export async function saveResource(item) {
  const payload = {
    title: item.title,
    description: item.description || '',
    file_url: item.fileUrl || '',
    category: item.category || 'general',
    sort_order: Number(item.sortOrder) || 0,
    published: item.published !== false,
  }
  if (backendEnabled()) {
    if (item.id) {
      const { data, error } = await supabase.from('resources').update(payload).eq('id', item.id).select('*').single()
      if (error) throw new Error(error.message)
      return normalizeResource(data)
    }
    const { data, error } = await supabase.from('resources').insert(payload).select('*').single()
    if (error) throw new Error(error.message)
    return normalizeResource(data)
  }
  const method = item.id ? 'PUT' : 'POST'
  const url = item.id ? apiUrl(`/api/resources/${item.id}`) : apiUrl('/api/resources')
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(item),
  })
  const body = await readJsonSafe(res)
  if (!res.ok) throw new Error(body?.error || 'Failed to save resource')
  return normalizeResource(body.item || item)
}

export async function deleteResource(id) {
  if (backendEnabled()) {
    const { error } = await supabase.from('resources').delete().eq('id', id)
    if (error) throw new Error(error.message)
    return
  }
  const res = await fetch(apiUrl(`/api/resources/${id}`), { method: 'DELETE', headers: authHeaders() })
  if (!res.ok) {
    const body = await readJsonSafe(res)
    throw new Error(body?.error || 'Failed to delete')
  }
}
