import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../utils/supabaseClient.js'
import {
  createProduct,
  updateProduct,
  uploadProductImage,
  getProductBySlug,
  verifyAdminAccess,
  isSupabaseBackendEnabled,
} from '../services/catalog.js'

import '../admin-panel.css'

export default function AdminProductEditor({ mode }) {
  const navigate = useNavigate()
  const { slug } = useParams()

  const isEdit = mode === 'edit'
  const slugLocked = isEdit

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [feedbackMsg, setFeedbackMsg] = useState({ type: '', text: '' })

  const [formFields, setFormFields] = useState({
    name: '',
    slug: '',
    category: 'seals',
    price: '',
    description: '',
    images: [''],
    specs: [],
  })

  const [newSpecKey, setNewSpecKey] = useState('')
  const [newSpecVal, setNewSpecVal] = useState('')

  const showFeedback = (type, text) => {
    setFeedbackMsg({ type, text })
    setTimeout(() => setFeedbackMsg({ type: '', text: '' }), 5000)
  }

  const handleLogout = async () => {
    localStorage.removeItem('adminToken')
    if (supabase) {
      try {
        await supabase.auth.signOut()
      } catch (err) {
        console.warn('Supabase signout error:', err)
      }
    }
    navigate('/admin/login')
  }

  // Generate Title-Case-ish slug to match existing catalog URLs (e.g. Acoustic-Door-Seal)
  const handleNameChange = (e) => {
    const val = e.target.value
    const autoSlug = val
      .trim()
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .split('-')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join('-')

    setFormFields((prev) => ({
      ...prev,
      name: val,
      slug: slugLocked ? prev.slug : autoSlug,
    }))
  }

  const handleAddSpec = () => {
    if (!newSpecKey.trim() || !newSpecVal.trim()) return
    setFormFields((prev) => ({
      ...prev,
      specs: [...prev.specs, { key: newSpecKey.trim(), value: newSpecVal.trim() }],
    }))
    setNewSpecKey('')
    setNewSpecVal('')
  }

  const handleRemoveSpec = (index) => {
    setFormFields((prev) => ({
      ...prev,
      specs: prev.specs.filter((_, idx) => idx !== index),
    }))
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const url = await uploadProductImage(file)
      setFormFields((prev) => {
        const updatedImgs = [...prev.images]
        updatedImgs[0] = url
        return { ...prev, images: updatedImgs }
      })
      showFeedback('success', 'Image uploaded successfully!')
    } catch (err) {
      console.error(err)
      showFeedback('danger', err.message || 'Error uploading image')
    }
  }

  const handleSaveProduct = async (e) => {
    e.preventDefault()
    if (isSaving) return

    const cleanedImages = (formFields.images || [])
      .map((img) => String(img || '').trim())
      .filter((img) => img !== '')

    if (cleanedImages.length === 0) {
      // Keep your existing default so cards always render an image.
      cleanedImages.push('/assets/img/shop/shop1.png')
    }

    const payload = {
      ...formFields,
      images: cleanedImages,
    }

    setIsSaving(true)
    try {
      if (isEdit) {
        await updateProduct(slug, payload)
        showFeedback('success', 'Product updated successfully')
      } else {
        await createProduct(payload)
        showFeedback('success', 'Product created successfully')
      }
      navigate('/admin?tab=products')
    } catch (err) {
      console.error(err)
      if (err.status === 401 || err.status === 403) {
        handleLogout()
        return
      }
      showFeedback('danger', err.message || 'Failed to save product')
    } finally {
      setIsSaving(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    async function init() {
      setIsLoading(true)
      try {
        if (isSupabaseBackendEnabled() && supabase) {
          const {
            data: { session },
          } = await supabase.auth.getSession()
          if (!session) {
            navigate('/admin/login')
            return
          }

          await verifyAdminAccess()
          localStorage.setItem('adminToken', session.access_token)
        } else {
          const savedToken = localStorage.getItem('adminToken')
          if (!savedToken) {
            navigate('/admin/login')
            return
          }
          await verifyAdminAccess()
        }

        if (isEdit) {
          const product = await getProductBySlug(slug)
          if (cancelled) return

          setFormFields({
            name: product.name || '',
            slug: product.slug || '',
            category: product.category || 'seals',
            price: product.price || '',
            description: product.description || '',
            images: product.images && product.images.length > 0 ? [...product.images] : [''],
            specs: product.specs ? [...product.specs] : [],
          })
        } else {
          // Defaults for Add New Product.
          setFormFields({
            name: '',
            slug: '',
            category: 'seals',
            price: '',
            description: '',
            images: [''],
            specs: [],
          })
        }
      } catch (err) {
        console.warn('Admin editor auth failed:', err)
        localStorage.removeItem('adminToken')
        if (supabase) {
          try {
            await supabase.auth.signOut()
          } catch {
            /* ignore */
          }
        }
        if (!cancelled) navigate('/admin/login')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    init()
    return () => {
      cancelled = true
    }
  }, [navigate, isEdit, slug])

  const editorTitle = useMemo(
    () => (isEdit ? `Edit Product: ${formFields.name || slug || ''}` : 'Add New Product'),
    [isEdit, formFields.name, slug],
  )

  return (
    <section className="admin-page">
      <div className="admin-container">
        <div className="admin-header-bar">
          <div className="admin-brand-wrap">
            <img src="/assets/img/logo/logo1.png" alt="Logo" className="admin-brand-logo" />
            <div>
              <h1 className="admin-page-title">Admin CRM</h1>
              <p className="admin-page-subtitle">Manage product content</p>
            </div>
          </div>

          <div className="d-flex align-items-center gap-3">
            <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => navigate('/admin?tab=products')}>
              <i className="fas fa-arrow-left me-2" />
              Back
            </button>
            <button type="button" className="admin-btn admin-btn-muted admin-btn-sm" onClick={handleLogout}>
              <i className="fas fa-sign-out-alt me-2" />
              Logout
            </button>
          </div>
        </div>

        {feedbackMsg.text && (
          <div className={`admin-alert ${feedbackMsg.type === 'success' ? 'admin-alert-success' : 'admin-alert-danger'} mb-4`} role="alert">
            {feedbackMsg.type === 'success' ? (
              <i className="fas fa-check-circle me-2" />
            ) : (
              <i className="fas fa-exclamation-circle me-2" />
            )}
            {feedbackMsg.text}
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-info" role="status">
              <span className="visually-hidden">Loading data...</span>
            </div>
          </div>
        ) : (
          <div className="admin-panel">
            <h2 className="admin-section-title" style={{ marginBottom: 20 }}>{editorTitle}</h2>

            <form onSubmit={handleSaveProduct}>
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="admin-form-label">Product Name *</label>
                  <input
                    type="text"
                    required
                    value={formFields.name}
                    onChange={handleNameChange}
                    className="admin-input"
                  />
                </div>

                <div className="col-md-6 mb-3">
                  <label className="admin-form-label">Slug (URL endpoint) *</label>
                  <input
                    type="text"
                    required
                    disabled={slugLocked}
                    value={formFields.slug}
                    onChange={(e) => setFormFields((prev) => ({ ...prev, slug: e.target.value }))}
                    className="admin-input"
                  />
                </div>

                <div className="col-md-6 mb-3">
                  <label className="admin-form-label">Category *</label>
                  <select
                    value={formFields.category}
                    onChange={(e) => setFormFields((prev) => ({ ...prev, category: e.target.value }))}
                    className="admin-select"
                  >
                    <option value="seals">Seals</option>
                    <option value="hardware">Hardware</option>
                    <option value="interlocking">Interlocking</option>
                    <option value="doors">Clean Room Doors</option>
                    <option value="pass-box">Pass Box</option>
                  </select>
                </div>

                <div className="col-md-6 mb-3">
                  <label className="admin-form-label">Price Display (e.g. "₹65 / Meter" or "Get Quotation")</label>
                  <input
                    type="text"
                    value={formFields.price}
                    onChange={(e) => setFormFields((prev) => ({ ...prev, price: e.target.value }))}
                    className="admin-input"
                  />
                </div>

                <div className="col-12 mb-3">
                  <label className="admin-form-label">Description</label>
                  <textarea
                    rows="3"
                    value={formFields.description}
                    onChange={(e) => setFormFields((prev) => ({ ...prev, description: e.target.value }))}
                    className="admin-input"
                  />
                </div>

                <div className="col-12 mb-4">
                  <label className="admin-form-label">Product Image</label>
                  <div className="row align-items-center">
                    <div className="col-md-8 mb-2 mb-md-0">
                      <input
                        type="text"
                        placeholder="/assets/img/shop/shop1.png"
                        value={formFields.images?.[0] || ''}
                        onChange={(e) => {
                          const val = e.target.value
                          setFormFields((prev) => {
                            const updated = [...(prev.images || [])]
                            updated[0] = val
                            return { ...prev, images: updated }
                          })
                        }}
                        className="admin-input"
                      />
                    </div>
                    <div className="col-md-4">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        style={{ display: 'none' }}
                        id="product-image-upload"
                      />
                      <label
                        htmlFor="product-image-upload"
                        className="admin-btn admin-btn-ghost w-100"
                        style={{ cursor: 'pointer', margin: 0, padding: '9px' }}
                      >
                        <i className="fas fa-upload me-2" />
                        Upload Local Image
                      </label>
                    </div>
                  </div>
                </div>

                <div className="col-12 mb-4">
                  <h3 className="admin-section-title" style={{ fontSize: 15, marginBottom: 12 }}>
                    Product Specifications
                  </h3>

                  {formFields.specs.length > 0 ? (
                    <div className="admin-table-wrap mb-3">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Key</th>
                          <th>Value</th>
                          <th style={{ width: '80px', textAlign: 'center' }}>Remove</th>
                        </tr>
                      </thead>
                      <tbody>
                        {formFields.specs.map((spec, index) => (
                          <tr key={`${spec.key}-${index}`}>
                            <td>{spec.key}</td>
                            <td>{spec.value}</td>
                            <td style={{ textAlign: 'center' }}>
                              <button
                                type="button"
                                className="btn btn-link text-danger p-0"
                                onClick={() => handleRemoveSpec(index)}
                              >
                                <i className="fas fa-minus-circle" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    </div>
                  ) : (
                    <p className="text-muted" style={{ fontSize: '13px' }}>
                      No specifications added yet.
                    </p>
                  )}

                  <div className="d-flex gap-2">
                    <input
                      type="text"
                      placeholder="Key (e.g. Material)"
                      value={newSpecKey}
                      onChange={(e) => setNewSpecKey(e.target.value)}
                      className="admin-input"
                      style={{ width: '40%' }}
                    />
                    <input
                      type="text"
                      placeholder="Value (e.g. Rubber)"
                      value={newSpecVal}
                      onChange={(e) => setNewSpecVal(e.target.value)}
                      className="admin-input"
                      style={{ width: '45%' }}
                    />
                    <button type="button" className="admin-btn admin-btn-muted" onClick={handleAddSpec} style={{ width: '15%' }}>
                      Add Spec
                    </button>
                  </div>
                </div>

                <div className="col-12 text-end mt-3">
                  <button
                    type="button"
                    className="admin-btn admin-btn-ghost me-2"
                    onClick={() => navigate('/admin?tab=products')}
                    disabled={isSaving}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="admin-btn admin-btn-primary"
                    disabled={isSaving}
                    style={{ paddingLeft: 26, paddingRight: 26 }}
                  >
                    {isSaving ? 'Saving...' : 'Save Product'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}
      </div>
    </section>
  )
}

