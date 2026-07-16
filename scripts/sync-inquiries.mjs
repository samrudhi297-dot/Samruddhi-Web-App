#!/usr/bin/env node
/**
 * Push existing server/data/inquiries.json rows into Supabase.
 * Usage: npm run sync:inquiries
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
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env')
  process.exit(1)
}

const file = path.join(root, 'server/data/inquiries.json')
const list = JSON.parse(fs.readFileSync(file, 'utf8'))
if (!Array.isArray(list) || list.length === 0) {
  console.log('No local inquiries to sync.')
  process.exit(0)
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const rows = list.map((inq) => ({
  name: inq.name,
  email: inq.email,
  phone: inq.phone,
  company: inq.company || '',
  message: inq.message,
  items: Array.isArray(inq.items) ? inq.items : [],
  created_at: inq.createdAt || new Date().toISOString(),
}))

const { data, error } = await supabase.from('inquiries').insert(rows).select('id')
if (error) {
  console.error('Sync failed:', error.message)
  console.error('Did you run supabase/schema.sql in the SQL Editor?')
  process.exit(1)
}

console.log(`Synced ${data?.length ?? rows.length} inquiries to Supabase.`)
