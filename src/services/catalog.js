import { supabase, isSupabaseConfigured } from '../utils/supabaseClient.js'
import { apiUrl, readJsonSafe } from '../utils/api.js'

/** True when the app should talk to Supabase instead of the Express API. */
export function isSupabaseBackendEnabled() {
  return isSupabaseConfigured && !!supabase
}

function normalizeProduct(row) {
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    category: row.category,
    price: row.price || '',
    description: row.description || '',
    images: Array.isArray(row.images) ? row.images : [],
    specs: Array.isArray(row.specs) ? row.specs : [],
  }
}

export async function getProducts() {
  if (isSupabaseBackendEnabled()) {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('name', { ascending: true })
    if (error) throw new Error(error.message)
    return (data || []).map(normalizeProduct)
  }

  const res = await fetch(apiUrl('/api/products'))
  if (!res.ok) throw new Error(`Could not load products (${res.status})`)
  const data = await res.json()
  return Array.isArray(data) ? data.map(normalizeProduct) : []
}

export async function getProductBySlug(slug) {
  if (isSupabaseBackendEnabled()) {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('slug', slug)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!data) throw new Error('Product not found')
    return normalizeProduct(data)
  }

  const res = await fetch(apiUrl(`/api/products/${slug}`))
  if (!res.ok) throw new Error('Product not found')
  return normalizeProduct(await res.json())
}

export async function createProduct(product) {
  if (isSupabaseBackendEnabled()) {
    const payload = {
      name: product.name,
      slug: product.slug,
      category: product.category,
      price: product.price || '',
      description: product.description || '',
      images: product.images || [],
      specs: product.specs || [],
    }
    const { data, error } = await supabase.from('products').insert(payload).select('*').single()
    if (error) throw new Error(error.message)
    return normalizeProduct(data)
  }

  const token = localStorage.getItem('adminToken')
  const res = await fetch(apiUrl('/api/products'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(product),
  })
  const body = await readJsonSafe(res)
  if (!res.ok) throw new Error(body?.error || 'Failed to create product')
  return normalizeProduct(body.product || product)
}

export async function updateProduct(slug, product) {
  if (isSupabaseBackendEnabled()) {
    const payload = {
      name: product.name,
      slug: product.slug,
      category: product.category,
      price: product.price || '',
      description: product.description || '',
      images: product.images || [],
      specs: product.specs || [],
      updated_at: new Date().toISOString(),
    }
    const { data, error } = await supabase
      .from('products')
      .update(payload)
      .eq('slug', slug)
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    return normalizeProduct(data)
  }

  const token = localStorage.getItem('adminToken')
  const res = await fetch(apiUrl(`/api/products/${slug}`), {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(product),
  })
  const body = await readJsonSafe(res)
  if (!res.ok) throw new Error(body?.error || 'Failed to update product')
  return normalizeProduct(body.product || product)
}

export async function deleteProduct(slug) {
  if (isSupabaseBackendEnabled()) {
    const { error } = await supabase.from('products').delete().eq('slug', slug)
    if (error) throw new Error(error.message)
    return
  }

  const token = localStorage.getItem('adminToken')
  const res = await fetch(apiUrl(`/api/products/${slug}`), {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (res.status === 401 || res.status === 403) {
    const err = new Error('Unauthorized')
    err.status = res.status
    throw err
  }
  if (!res.ok) {
    const body = await readJsonSafe(res)
    throw new Error(body?.error || 'Failed to delete product')
  }
}

export async function getInquiries() {
  if (isSupabaseBackendEnabled()) {
    const { data, error } = await supabase
      .from('inquiries')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) {
      const err = new Error(error.message)
      err.status = error.code === 'PGRST301' || /jwt|permission|rls/i.test(error.message) ? 403 : 500
      throw err
    }
    return (data || []).map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      company: row.company || '',
      message: row.message,
      items: Array.isArray(row.items) ? row.items : [],
      createdAt: row.created_at,
    }))
  }

  const token = localStorage.getItem('adminToken')
  const res = await fetch(apiUrl('/api/inquiries'), {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (res.status === 401 || res.status === 403) {
    const err = new Error('Unauthorized')
    err.status = res.status
    throw err
  }
  if (!res.ok) throw new Error('Failed to load inquiries')
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

export async function deleteInquiry(id) {
  if (isSupabaseBackendEnabled()) {
    const { error } = await supabase.from('inquiries').delete().eq('id', id)
    if (error) throw new Error(error.message)
    return
  }

  const token = localStorage.getItem('adminToken')
  const res = await fetch(apiUrl(`/api/inquiries/${id}`), {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const body = await readJsonSafe(res)
    throw new Error(body?.error || 'Failed to delete inquiry')
  }
}

export async function submitInquiry(payload) {
  const clean = {
    name: String(payload.name || '').trim(),
    email: String(payload.email || '').trim(),
    phone: String(payload.phone || '').trim(),
    company: String(payload.company || '').trim(),
    message: String(payload.message || '').trim(),
    items: Array.isArray(payload.items) ? payload.items : [],
  }

  if (!clean.name || !clean.email || !clean.phone || !clean.message) {
    throw new Error('Missing required fields')
  }

  if (isSupabaseBackendEnabled()) {
    const { error } = await supabase.from('inquiries').insert({
      name: clean.name,
      email: clean.email,
      phone: clean.phone,
      company: clean.company,
      message: clean.message,
      items: clean.items,
    })
    if (error) throw new Error(error.message)
    return { ok: true }
  }

  const res = await fetch(apiUrl('/api/contact'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(clean),
  })
  const body = await readJsonSafe(res)
  if (!res.ok) throw new Error(body?.error || 'Submission failed')
  return body || { ok: true }
}

export async function uploadProductImage(file) {
  if (!file) throw new Error('No file selected')

  if (isSupabaseBackendEnabled()) {
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '')
    const path = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext || 'jpg'}`
    const { error } = await supabase.storage.from('product-images').upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || 'image/jpeg',
    })
    if (error) throw new Error(error.message)
    const { data } = supabase.storage.from('product-images').getPublicUrl(path)
    return data.publicUrl
  }

  const token = localStorage.getItem('adminToken')
  const base64Data = await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

  const res = await fetch(apiUrl('/api/admin/upload'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ fileName: file.name, base64Data }),
  })
  const data = await readJsonSafe(res)
  if (!res.ok || !data?.ok) throw new Error(data?.error || 'Upload failed')
  return data.url
}

export async function verifyAdminAccess() {
  if (isSupabaseBackendEnabled()) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) {
      const err = new Error('Not signed in')
      err.status = 401
      throw err
    }

    const role = session.user.app_metadata?.role || session.user.user_metadata?.role
    if (role === 'admin') {
      return { ok: true, via: 'supabase', email: session.user.email || null }
    }

    // RLS returns empty rows (not always an error) for non-admins — don't treat that as success
    const err = new Error(
      'This account is not authorized for admin access. In Supabase SQL Editor run: update auth.users set raw_app_meta_data = coalesce(raw_app_meta_data, \'{}\'::jsonb) || \'{"role":"admin"}\'::jsonb where email = \'' +
        (session.user.email || 'your@email.com') +
        '\'; then sign out and sign in again.'
    )
    err.status = 403
    throw err
  }

  const token = localStorage.getItem('adminToken')
  if (!token) {
    const err = new Error('Not signed in')
    err.status = 401
    throw err
  }
  const response = await fetch(apiUrl('/api/admin/session'), {
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await readJsonSafe(response)
  if (!response.ok || !data?.ok) {
    const err = new Error(data?.error || 'Not authorized')
    err.status = response.status
    throw err
  }
  return data
}
