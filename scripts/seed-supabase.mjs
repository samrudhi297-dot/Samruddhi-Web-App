#!/usr/bin/env node
/**
 * Seed Supabase products table from server/data/products.json
 *
 * Usage:
 *   npm run seed:supabase
 *   (reads SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env)
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

dotenv.config({ path: path.join(root, '.env') })

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error('Missing SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env')
  process.exit(1)
}

const productsPath = path.join(root, 'server/data/products.json')
const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'))

const supabase = createClient(url, serviceKey)

const rows = products.map((p) => ({
  name: p.name,
  slug: p.slug,
  category: p.category,
  price: p.price || '',
  description: p.description || '',
  images: p.images || [],
  specs: p.specs || [],
}))

const { data, error } = await supabase
  .from('products')
  .upsert(rows, { onConflict: 'slug' })
  .select('slug')

if (error) {
  console.error('Seed failed:', error.message)
  process.exit(1)
}

console.log(`Seeded ${data?.length ?? rows.length} products.`)
