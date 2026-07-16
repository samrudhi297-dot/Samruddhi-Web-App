import { useEffect, useState } from 'react'
import {
  getTestimonials,
  saveTestimonial,
  deleteTestimonial,
  getBlogs,
  saveBlog,
  deleteBlog,
  getResources,
  saveResource,
  deleteResource,
} from '../../services/content.js'

const CONFIG = {
  testimonials: {
    title: 'Testimonials',
    load: () => getTestimonials({ admin: true }),
    save: saveTestimonial,
    remove: deleteTestimonial,
    empty: { quote: '', authorName: '', location: '', sortOrder: 0, published: true },
    fields: [
      { key: 'quote', label: 'Quote', type: 'textarea', required: true, full: true },
      { key: 'authorName', label: 'Author name', required: true },
      { key: 'location', label: 'Location' },
      { key: 'sortOrder', label: 'Sort order', type: 'number' },
    ],
    columns: [
      { key: 'authorName', label: 'Author' },
      { key: 'location', label: 'Location' },
      { key: 'quote', label: 'Quote', clip: true },
    ],
  },
  blogs: {
    title: 'Blog posts',
    load: () => getBlogs({ admin: true }),
    save: saveBlog,
    remove: deleteBlog,
    empty: {
      slug: '',
      title: '',
      excerpt: '',
      body: '',
      coverImage: '',
      published: true,
      publishedAt: new Date().toISOString(),
    },
    fields: [
      { key: 'title', label: 'Title', required: true, full: true },
      { key: 'slug', label: 'Slug (URL)', required: true },
      { key: 'coverImage', label: 'Cover image URL' },
      { key: 'excerpt', label: 'Excerpt', type: 'textarea', full: true },
      { key: 'body', label: 'Body', type: 'textarea', full: true },
    ],
    columns: [
      { key: 'title', label: 'Title' },
      { key: 'slug', label: 'Slug' },
      { key: 'publishedAt', label: 'Published', date: true },
    ],
  },
  resources: {
    title: 'Resources',
    load: () => getResources({ admin: true }),
    save: saveResource,
    remove: deleteResource,
    empty: {
      title: '',
      description: '',
      fileUrl: '',
      category: 'general',
      sortOrder: 0,
      published: true,
    },
    fields: [
      { key: 'title', label: 'Title', required: true, full: true },
      { key: 'fileUrl', label: 'File / link URL', required: true, full: true },
      { key: 'category', label: 'Category' },
      { key: 'sortOrder', label: 'Sort order', type: 'number' },
      { key: 'description', label: 'Description', type: 'textarea', full: true },
    ],
    columns: [
      { key: 'title', label: 'Title' },
      { key: 'category', label: 'Category' },
      { key: 'fileUrl', label: 'URL', clip: true },
    ],
  },
}

function slugify(text) {
  return String(text || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export default function ContentManager({ type, onFeedback }) {
  const cfg = CONFIG[type]
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(cfg.empty)
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const data = await cfg.load()
      setItems(data)
    } catch (err) {
      onFeedback?.('danger', err.message || 'Failed to load content')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setEditing(null)
    setForm(cfg.empty)
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type])

  function startAdd() {
    setEditing('new')
    setForm({ ...cfg.empty })
  }

  function startEdit(item) {
    setEditing(item.id)
    setForm({ ...item })
  }

  function cancelForm() {
    setEditing(null)
    setForm(cfg.empty)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { ...form }
      if (type === 'blogs' && editing === 'new' && !payload.slug && payload.title) {
        payload.slug = slugify(payload.title)
      }
      await cfg.save(payload)
      onFeedback?.('success', 'Saved successfully')
      cancelForm()
      await load()
    } catch (err) {
      onFeedback?.('danger', err.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this item?')) return
    try {
      await cfg.remove(id)
      onFeedback?.('success', 'Deleted')
      await load()
    } catch (err) {
      onFeedback?.('danger', err.message || 'Failed to delete')
    }
  }

  if (loading) {
    return (
      <div className="admin-panel admin-empty">
        <p>Loading…</p>
      </div>
    )
  }

  return (
    <div>
      <div className="admin-section-head">
        <h2 className="admin-section-title">
          {cfg.title} <span className="admin-section-count">({items.length})</span>
        </h2>
        <button type="button" className="admin-btn admin-btn-primary admin-btn-sm" onClick={startAdd}>
          <i className="fas fa-plus" />
          Add new
        </button>
      </div>

      {editing && (
        <form className="admin-content-form" onSubmit={handleSubmit}>
          <h4>{editing === 'new' ? `New ${cfg.title.slice(0, -1)}` : 'Edit item'}</h4>
          <div className="admin-form-row">
            {cfg.fields.map((field) => (
              <div key={field.key} style={field.full ? { gridColumn: '1 / -1' } : undefined}>
                <label className="admin-form-label" htmlFor={`cf-${field.key}`}>
                  {field.label}
                  {field.required ? ' *' : ''}
                </label>
                {field.type === 'textarea' ? (
                  <textarea
                    id={`cf-${field.key}`}
                    className="admin-textarea"
                    required={field.required}
                    value={form[field.key] ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, [field.key]: e.target.value }))}
                  />
                ) : (
                  <input
                    id={`cf-${field.key}`}
                    type={field.type || 'text'}
                    className="admin-input"
                    required={field.required}
                    value={form[field.key] ?? ''}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        [field.key]: field.type === 'number' ? Number(e.target.value) : e.target.value,
                      }))
                    }
                  />
                )}
              </div>
            ))}
            <div>
              <label className="admin-form-label">Status</label>
              <select
                className="admin-select"
                value={form.published !== false ? 'published' : 'draft'}
                onChange={(e) => setForm((f) => ({ ...f, published: e.target.value === 'published' }))}
              >
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
            </div>
          </div>
          <div className="admin-form-actions">
            <button type="button" className="admin-btn admin-btn-ghost" onClick={cancelForm}>
              Cancel
            </button>
            <button type="submit" className="admin-btn admin-btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      )}

      {items.length === 0 ? (
        <div className="admin-panel admin-empty">
          <h3>No items yet</h3>
          <p>Add content to display it on the website.</p>
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                {cfg.columns.map((col) => (
                  <th key={col.key}>{col.label}</th>
                ))}
                <th>Status</th>
                <th style={{ width: 140, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  {cfg.columns.map((col) => (
                    <td key={col.key} className={col.clip ? 'cell-clip' : ''}>
                      {col.date && item[col.key]
                        ? new Date(item[col.key]).toLocaleDateString()
                        : item[col.key] || '—'}
                    </td>
                  ))}
                  <td>
                    <span
                      className={`admin-status-pill ${item.published !== false ? 'is-live' : 'is-draft'}`}
                    >
                      {item.published !== false ? 'Live' : 'Draft'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      type="button"
                      className="admin-btn admin-btn-muted admin-btn-sm me-1"
                      onClick={() => startEdit(item)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="admin-btn admin-btn-danger admin-btn-sm"
                      onClick={() => handleDelete(item.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
