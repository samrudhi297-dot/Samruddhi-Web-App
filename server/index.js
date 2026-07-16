import cors from 'cors'
import crypto from 'crypto'
import dotenv from 'dotenv'
import express from 'express'
import { Resend } from 'resend'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const isSupabaseConfigured = 
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('placeholder') && 
  !supabaseUrl.includes('your-project-id')

const supabase = isSupabaseConfigured ? createClient(supabaseUrl, supabaseAnonKey) : null

/** Service-role client for server-side writes (inquiries sync). Never expose to the browser. */
const supabaseAdmin =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null

async function saveInquiryToSupabase(row) {
  if (!supabaseAdmin) return { ok: false, skipped: true }
  const { error } = await supabaseAdmin.from('inquiries').insert({
    name: row.name,
    email: row.email,
    phone: row.phone,
    company: row.company || '',
    message: row.message,
    items: Array.isArray(row.items) ? row.items : [],
    ...(row.createdAt ? { created_at: row.createdAt } : {}),
  })
  if (error) {
    console.error('Supabase inquiry insert failed:', error.message)
    return { ok: false, error: error.message }
  }
  return { ok: true }
}

/** Comma-separated allowlist of admin emails (recommended when using Supabase Auth). */
function getAdminEmails() {
  return String(process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

function isAdminUser(user) {
  if (!user) return false
  const role = user.app_metadata?.role || user.user_metadata?.role
  if (role === 'admin') return true
  const emails = getAdminEmails()
  if (emails.length === 0) {
    // No allowlist configured: reject Supabase users (prevents open signup = admin)
    return false
  }
  const email = String(user.email || '').toLowerCase()
  return emails.includes(email)
}

function getAdminPasscode() {
  const pass = process.env.ADMIN_PASSCODE
  if (pass && pass.trim()) return pass.trim()
  // Dev-only fallback; production must set ADMIN_PASSCODE
  if (process.env.NODE_ENV === 'production') return null
  return 'admin123'
}

const app = express()

app.use(cors({
  origin: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
    : true,
}))
app.use(express.json({ limit: '10mb' })) // Increase limit to handle base64 image uploads

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.join(__dirname, '..')
const publicPath = path.join(projectRoot, 'public')
const PRODUCTS_FILE = path.join(__dirname, 'data', 'products.json')
const INQUIRIES_FILE = path.join(__dirname, 'data', 'inquiries.json')
const TESTIMONIALS_FILE = path.join(__dirname, 'data', 'testimonials.json')
const BLOGS_FILE = path.join(__dirname, 'data', 'blogs.json')
const RESOURCES_FILE = path.join(__dirname, 'data', 'resources.json')

/** Serialize read-modify-write per file to avoid lost updates under concurrent requests. */
const fileWriteQueues = new Map()

function withFileLock(filePath, fn) {
  const prev = fileWriteQueues.get(filePath) || Promise.resolve()
  const next = prev.then(fn, fn)
  fileWriteQueues.set(
    filePath,
    next.catch(() => {}).finally(() => {
      if (fileWriteQueues.get(filePath) === next) fileWriteQueues.delete(filePath)
    })
  )
  return next
}

function readJsonFile(filePath, defaultValue = []) {
  if (!fs.existsSync(filePath)) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2), 'utf8')
    return defaultValue
  }
  const data = fs.readFileSync(filePath, 'utf8')
  try {
    return JSON.parse(data)
  } catch (err) {
    // Do not return [] and allow callers to overwrite a corrupt file silently
    const parseErr = new Error(`Corrupt JSON in ${filePath}: ${err.message}`)
    parseErr.cause = err
    throw parseErr
  }
}

function writeJsonFile(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf8')
  fs.renameSync(tmpPath, filePath)
}

async function updateJsonFile(filePath, defaultValue, updater) {
  return withFileLock(filePath, async () => {
    const current = readJsonFile(filePath, defaultValue)
    const next = await updater(current)
    writeJsonFile(filePath, next)
    return next
  })
}

// Admin Auth Middleware
async function checkAdminAuth(req, res, next) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]
  
  if (!token) {
    return res.status(401).json({ ok: false, error: 'Unauthorized: No token provided' })
  }

  // 1. Verify Supabase JWT and enforce allowlist / admin role
  if (supabase) {
    try {
      const { data: { user }, error } = await supabase.auth.getUser(token)
      if (user && !error && isAdminUser(user)) {
        req.user = user
        return next()
      }
      if (user && !error && !isAdminUser(user)) {
        return res.status(403).json({
          ok: false,
          error: 'Forbidden: This account is not authorized for admin access',
        })
      }
    } catch (err) {
      console.warn('Supabase auth verification failed:', err.message)
    }
  }

  // 2. Fallback to ADMIN_PASSCODE (dev / emergency)
  const expectedPasscode = getAdminPasscode()
  if (expectedPasscode && token === expectedPasscode) {
    return next()
  }
  
  res.status(401).json({ ok: false, error: 'Unauthorized: Invalid credentials' })
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

// --- PRODUCT ENDPOINTS ---

// Get all products
app.get('/api/products', (req, res) => {
  try {
    const products = readJsonFile(PRODUCTS_FILE, [])
    res.json(Array.isArray(products) ? products : [])
  } catch (err) {
    console.error('Failed to read products:', err)
    res.status(500).json({ ok: false, error: 'Failed to load products' })
  }
})

// Get single product
app.get('/api/products/:slug', (req, res) => {
  try {
    const products = readJsonFile(PRODUCTS_FILE, [])
    const product = (Array.isArray(products) ? products : []).find(p => p.slug === req.params.slug)
    if (!product) {
      return res.status(404).json({ ok: false, error: 'Product not found' })
    }
    res.json(product)
  } catch (err) {
    console.error('Failed to read product:', err)
    res.status(500).json({ ok: false, error: 'Failed to load product' })
  }
})

// Create product (Admin)
app.post('/api/products', checkAdminAuth, async (req, res) => {
  const newProduct = req.body
  
  if (!newProduct.name || !newProduct.slug || !newProduct.category) {
    return res.status(400).json({ ok: false, error: 'Missing required fields' })
  }

  try {
    await updateJsonFile(PRODUCTS_FILE, [], (products) => {
      const list = Array.isArray(products) ? products : []
      if (list.some(p => p.slug === newProduct.slug)) {
        const err = new Error('Product slug already exists')
        err.status = 400
        throw err
      }
      return [...list, newProduct]
    })
    res.json({ ok: true, product: newProduct })
  } catch (err) {
    const status = err.status || 500
    if (status >= 500) console.error('Failed to create product:', err)
    res.status(status).json({ ok: false, error: err.message || 'Failed to create product' })
  }
})

// Update product (Admin)
app.put('/api/products/:slug', checkAdminAuth, async (req, res) => {
  try {
    let updatedProduct = null
    await updateJsonFile(PRODUCTS_FILE, [], (products) => {
      const list = Array.isArray(products) ? products : []
      const idx = list.findIndex(p => p.slug === req.params.slug)
      if (idx === -1) {
        const err = new Error('Product not found')
        err.status = 404
        throw err
      }

      updatedProduct = { ...list[idx], ...req.body }
      if (updatedProduct.slug !== req.params.slug && list.some(p => p.slug === updatedProduct.slug)) {
        const err = new Error('Target slug already exists')
        err.status = 400
        throw err
      }

      const next = [...list]
      next[idx] = updatedProduct
      return next
    })
    res.json({ ok: true, product: updatedProduct })
  } catch (err) {
    const status = err.status || 500
    if (status >= 500) console.error('Failed to update product:', err)
    res.status(status).json({ ok: false, error: err.message || 'Failed to update product' })
  }
})

// Delete product (Admin)
app.delete('/api/products/:slug', checkAdminAuth, async (req, res) => {
  try {
    await updateJsonFile(PRODUCTS_FILE, [], (products) => {
      const list = Array.isArray(products) ? products : []
      const filtered = list.filter(p => p.slug !== req.params.slug)
      if (filtered.length === list.length) {
        const err = new Error('Product not found')
        err.status = 404
        throw err
      }
      return filtered
    })
    res.json({ ok: true })
  } catch (err) {
    const status = err.status || 500
    if (status >= 500) console.error('Failed to delete product:', err)
    res.status(status).json({ ok: false, error: err.message || 'Failed to delete product' })
  }
})

// --- INQUIRY ENDPOINTS ---

// Get all inquiries (Admin)
app.get('/api/inquiries', checkAdminAuth, (req, res) => {
  try {
    const inquiries = readJsonFile(INQUIRIES_FILE, [])
    const list = Array.isArray(inquiries) ? inquiries : []
    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    res.json(list.map((inq) => ({ ...inq, items: Array.isArray(inq.items) ? inq.items : [] })))
  } catch (err) {
    console.error('Failed to read inquiries:', err)
    res.status(500).json({ ok: false, error: 'Failed to load inquiries' })
  }
})

// Delete inquiry (Admin)
app.delete('/api/inquiries/:id', checkAdminAuth, async (req, res) => {
  try {
    await updateJsonFile(INQUIRIES_FILE, [], (inquiries) => {
      const list = Array.isArray(inquiries) ? inquiries : []
      const filtered = list.filter(i => i.id !== req.params.id)
      if (filtered.length === list.length) {
        const err = new Error('Inquiry not found')
        err.status = 404
        throw err
      }
      return filtered
    })
    res.json({ ok: true })
  } catch (err) {
    const status = err.status || 500
    if (status >= 500) console.error('Failed to delete inquiry:', err)
    res.status(status).json({ ok: false, error: err.message || 'Failed to delete inquiry' })
  }
})

function registerContentRoutes({
  basePath,
  filePath,
  idField = 'id',
  publicFilter = (item) => item.published !== false,
}) {
  app.get(basePath, (req, res) => {
    try {
      const list = readJsonFile(filePath, [])
      const items = Array.isArray(list) ? list : []
      const isAdmin = req.query.admin === '1'
      res.json(isAdmin ? items : items.filter(publicFilter))
    } catch (err) {
      console.error(`Failed to read ${basePath}:`, err)
      res.status(500).json({ ok: false, error: 'Failed to load content' })
    }
  })

  app.get(`${basePath}/:idOrSlug`, (req, res) => {
    try {
      const list = readJsonFile(filePath, [])
      const items = Array.isArray(list) ? list : []
      const item = items.find(
        (x) => x[idField] === req.params.idOrSlug || x.slug === req.params.idOrSlug,
      )
      if (!item || (item.published === false && req.query.admin !== '1')) {
        return res.status(404).json({ ok: false, error: 'Not found' })
      }
      res.json(item)
    } catch (err) {
      res.status(500).json({ ok: false, error: 'Failed to load content' })
    }
  })

  app.post(basePath, checkAdminAuth, async (req, res) => {
    const item = { ...req.body, id: req.body.id || `item-${Date.now()}` }
    try {
      await updateJsonFile(filePath, [], (list) => [...(Array.isArray(list) ? list : []), item])
      res.json({ ok: true, item })
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message || 'Failed to create' })
    }
  })

  app.put(`${basePath}/:id`, checkAdminAuth, async (req, res) => {
    try {
      let updated = null
      await updateJsonFile(filePath, [], (list) => {
        const items = Array.isArray(list) ? list : []
        const idx = items.findIndex((x) => x.id === req.params.id)
        if (idx === -1) {
          const err = new Error('Not found')
          err.status = 404
          throw err
        }
        updated = { ...items[idx], ...req.body, id: req.params.id }
        const next = [...items]
        next[idx] = updated
        return next
      })
      res.json({ ok: true, item: updated })
    } catch (err) {
      const status = err.status || 500
      res.status(status).json({ ok: false, error: err.message || 'Failed to update' })
    }
  })

  app.delete(`${basePath}/:id`, checkAdminAuth, async (req, res) => {
    try {
      await updateJsonFile(filePath, [], (list) => {
        const items = Array.isArray(list) ? list : []
        const filtered = items.filter((x) => x.id !== req.params.id)
        if (filtered.length === items.length) {
          const err = new Error('Not found')
          err.status = 404
          throw err
        }
        return filtered
      })
      res.json({ ok: true })
    } catch (err) {
      const status = err.status || 500
      res.status(status).json({ ok: false, error: err.message || 'Failed to delete' })
    }
  })
}

registerContentRoutes({ basePath: '/api/testimonials', filePath: TESTIMONIALS_FILE })
registerContentRoutes({ basePath: '/api/blogs', filePath: BLOGS_FILE })
registerContentRoutes({ basePath: '/api/resources', filePath: RESOURCES_FILE })

// --- ADMIN LOGIN & UTILS ---

// Admin Login
app.post('/api/admin/login', (req, res) => {
  const { passcode } = req.body || {}
  const expectedPasscode = getAdminPasscode()
  if (!expectedPasscode) {
    return res.status(503).json({
      ok: false,
      error: 'Passcode login disabled. Set ADMIN_PASSCODE or use Supabase Sign In.',
    })
  }
  if (passcode === expectedPasscode) {
    res.json({ ok: true, token: passcode })
  } else {
    res.status(401).json({ ok: false, error: 'Invalid passcode' })
  }
})

// Verify current admin session (Supabase JWT or passcode)
app.get('/api/admin/session', checkAdminAuth, (req, res) => {
  res.json({
    ok: true,
    email: req.user?.email || null,
    via: req.user ? 'supabase' : 'passcode',
  })
})

// Upload Image (Admin)
app.post('/api/admin/upload', checkAdminAuth, (req, res) => {
  const { fileName, base64Data } = req.body || {}
  if (!fileName || !base64Data) {
    return res.status(400).json({ ok: false, error: 'Missing file data' })
  }

  try {
    const mimeMatch = String(base64Data).match(/^data:(image\/(png|jpe?g|webp|gif));base64,/i)
    if (!mimeMatch) {
      return res.status(400).json({ ok: false, error: 'Only PNG, JPEG, WebP, or GIF images are allowed' })
    }
    const extMap = { png: '.png', jpg: '.jpg', jpeg: '.jpg', webp: '.webp', gif: '.gif' }
    const ext = extMap[mimeMatch[2].toLowerCase()] || '.png'
    const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '')
    const buffer = Buffer.from(cleanBase64, 'base64')
    if (buffer.length > 5 * 1024 * 1024) {
      return res.status(400).json({ ok: false, error: 'Image must be under 5MB' })
    }

    const relativePath = `/uploads/${Date.now()}_${crypto.randomUUID().slice(0, 8)}${ext}`
    const absolutePath = path.join(publicPath, relativePath)
    
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true })
    fs.writeFileSync(absolutePath, buffer)
    
    res.json({ ok: true, url: relativePath })
  } catch (err) {
    console.error('File write failed:', err)
    res.status(500).json({ ok: false, error: 'Failed to save image file' })
  }
})

// --- PUBLIC INQUIRY SUBMISSION ---

app.post('/api/contact', async (req, res) => {
  const { name, email, phone, company, message, items } = req.body || {}

  const clean = {
    name: String(name || '').trim(),
    email: String(email || '').trim(),
    phone: String(phone || '').trim(),
    company: String(company || '').trim(),
    message: String(message || '').trim(),
  }

  if (!clean.name || !clean.email || !clean.phone || !clean.message) {
    return res.status(400).json({ ok: false, error: 'Missing required fields' })
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean.email)) {
    return res.status(400).json({ ok: false, error: 'Invalid email' })
  }

  const inquiryItems = Array.isArray(items) ? items : []
  let saved = false
  const createdAt = new Date().toISOString()
  const inquiryRow = {
    id: crypto.randomUUID(),
    name: clean.name,
    email: clean.email,
    phone: clean.phone,
    company: clean.company,
    message: clean.message,
    items: inquiryItems,
    createdAt,
  }

  // 1. Save to local JSON database
  try {
    await updateJsonFile(INQUIRIES_FILE, [], (inquiries) => {
      const list = Array.isArray(inquiries) ? inquiries : []
      list.push(inquiryRow)
      return list
    })
    saved = true
  } catch (saveErr) {
    console.error('Failed to save inquiry to file:', saveErr)
  }

  // 1b. Also write to Supabase when service role is configured
  const sbResult = await saveInquiryToSupabase(inquiryRow)
  if (sbResult.ok) {
    saved = true
  }

  // 2. Email Notification (Resend) — optional if env is configured
  let emailed = false
  const hasResend =
    process.env.RESEND_API_KEY && process.env.RESEND_TO_EMAIL && process.env.RESEND_FROM_EMAIL

  if (hasResend) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY)
      const toEmail = process.env.RESEND_TO_EMAIL
      const fromEmail = process.env.RESEND_FROM_EMAIL

      const subject = `New lead: ${clean.name}`
      const companyLine = clean.company ? `<strong>Company:</strong> ${escapeHtml(clean.company)}<br>` : ''

      let itemsHtml = ''
      if (inquiryItems.length > 0) {
        itemsHtml = '<h3>Requested Items / Requirements:</h3><ul>'
        inquiryItems.forEach(item => {
          itemsHtml += `<li><strong>${escapeHtml(item.name)}</strong> (Qty: ${item.quantity || 1}) ${item.price ? ` - ${escapeHtml(item.price)}` : ''}</li>`
        })
        itemsHtml += '</ul><br>'
      }

      await resend.emails.send({
        from: fromEmail,
        to: toEmail,
        replyTo: clean.email,
        subject,
        html:
          `<p><strong>New enquiry from the website</strong></p>` +
          `<p>` +
          `<strong>Name:</strong> ${escapeHtml(clean.name)}<br>` +
          companyLine +
          `<strong>Email:</strong> ${escapeHtml(clean.email)}<br>` +
          `<strong>Phone:</strong> ${escapeHtml(clean.phone)}<br>` +
          `</p>` +
          itemsHtml +
          `<p><strong>Message / Notes:</strong><br>${escapeHtml(clean.message).replace(/\n/g, '<br>')}</p>`,
      })

      if (process.env.RESEND_ENABLE_AUTOREPLY !== 'false') {
        await resend.emails.send({
          from: fromEmail,
          to: clean.email,
          subject: 'We received your enquiry - Samruddhi Enterprises',
          html:
            `<p>Dear ${escapeHtml(clean.name)},</p>` +
            `<p>Thank you for contacting Samruddhi Enterprises. We have received your message and will get back to you soon.</p>` +
            `<p>Phone: +91 9900454111 / 9036111365<br>Email: samruddhi.575@gmail.com</p>` +
            `<p><small>Please do not reply to this automated email.</small></p>`,
        })
      }

      emailed = true
    } catch (err) {
      console.error('Contact email send failed:', err?.message || err)
    }
  }

  if (!saved && !emailed) {
    return res.status(503).json({
      ok: false,
      error: 'Could not save or email your enquiry. Please try again or call us.',
    })
  }

  if (saved && !emailed && hasResend) {
    return res.json({ ok: true, warning: 'Enquiry saved, but email notification could not be sent' })
  }

  return res.json({ ok: true })
})

function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

// Serve uploaded images (written to public/uploads) and built SPA
const distPath = path.join(projectRoot, 'dist')
app.use('/uploads', express.static(path.join(publicPath, 'uploads')))
app.use(express.static(publicPath))
app.use(express.static(distPath))

// Catch-all route to serve React app for frontend navigation
// Express 5 / path-to-regexp requires a named wildcard (not bare '*')
app.get('/{*path}', (req, res) => {
  if (req.path.startsWith('/api/') || req.path === '/api') {
    return res.status(404).json({ ok: false, error: 'Not found' })
  }

  const indexPath = path.join(distPath, 'index.html')
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath)
  }
  return res.status(404).send('Frontend build not found. Run "npm run build" first.')
})

const port = Number(process.env.PORT || 8787)
const host = process.env.HOST || '127.0.0.1'
app.listen(port, host, () => {
  console.log(`API server listening on http://${host}:${port}`)
})

