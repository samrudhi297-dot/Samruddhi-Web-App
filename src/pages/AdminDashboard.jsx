import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../utils/supabaseClient.js'
import {
  getProducts,
  getInquiries,
  deleteProduct,
  deleteInquiry,
  verifyAdminAccess,
  isSupabaseBackendEnabled,
} from '../services/catalog.js'
import { getPresetRange, inquiryInRange } from '../utils/dateRange.js'
import AdminShell from '../components/admin/AdminShell.jsx'
import ContentManager from '../components/admin/ContentManager.jsx'
import DateRangeFilter from '../components/admin/DateRangeFilter.jsx'

import '../admin-panel.css'

const CONTENT_TABS = ['testimonials', 'blogs', 'resources']

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState(() => searchParams.get('tab') || 'products')

  const [products, setProducts] = useState([])
  const [inquiries, setInquiries] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [feedbackMsg, setFeedbackMsg] = useState({ type: '', text: '' })

  const [inquirySearch, setInquirySearch] = useState('')
  const [dateFilter, setDateFilter] = useState({ preset: 'all', customStart: '', customEnd: '' })

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab && tab !== activeTab) setActiveTab(tab)
  }, [searchParams]) // eslint-disable-line react-hooks/exhaustive-deps

  const showFeedback = (type, text) => {
    setFeedbackMsg({ type, text })
    setTimeout(() => setFeedbackMsg({ type: '', text: '' }), 5000)
  }

  async function loadData() {
    setIsLoading(true)
    try {
      const [prodData, inqData] = await Promise.all([getProducts(), getInquiries()])
      setProducts(prodData)
      setInquiries(inqData)
    } catch (err) {
      console.error(err)
      if (err.status === 401 || err.status === 403) {
        localStorage.removeItem('adminToken')
        if (supabase) {
          try {
            await supabase.auth.signOut()
          } catch {
            /* ignore */
          }
        }
        navigate('/admin/login')
        return
      }
      showFeedback('danger', err.message || 'Failed to load data')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    async function checkAuth() {
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
        await loadData()
      } catch (err) {
        console.warn('Admin auth failed:', err)
        localStorage.removeItem('adminToken')
        if (supabase) {
          try {
            await supabase.auth.signOut()
          } catch {
            /* ignore */
          }
        }
        navigate('/admin/login')
      }
    }
    checkAuth()
  }, [navigate])

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    setSearchParams({ tab })
  }

  const handleDeleteProduct = async (slug) => {
    if (!window.confirm(`Delete product "${slug}"?`)) return
    try {
      await deleteProduct(slug)
      showFeedback('success', 'Product deleted')
      loadData()
    } catch (err) {
      if (err.status === 401 || err.status === 403) {
        navigate('/admin/login')
        return
      }
      showFeedback('danger', err.message || 'Failed to delete product')
    }
  }

  const handleDeleteInquiry = async (id) => {
    if (!window.confirm('Delete this inquiry?')) return
    try {
      await deleteInquiry(id)
      showFeedback('success', 'Inquiry deleted')
      loadData()
    } catch (err) {
      if (err.status === 401 || err.status === 403) {
        navigate('/admin/login')
        return
      }
      showFeedback('danger', err.message || 'Failed to delete inquiry')
    }
  }

  const dateRange = useMemo(
    () => getPresetRange(dateFilter.preset, dateFilter.customStart, dateFilter.customEnd),
    [dateFilter],
  )

  const filteredInquiries = useMemo(() => {
    const q = inquirySearch.trim().toLowerCase()
    return inquiries.filter((inq) => {
      if (!inquiryInRange(inq.createdAt, dateRange)) return false
      if (!q) return true
      const hay = [inq.name, inq.email, inq.phone, inq.company, inq.message]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [inquiries, dateRange, inquirySearch])

  const renderProducts = () => (
    <div>
      <div className="admin-section-head">
        <h2 className="admin-section-title">
          Products <span className="admin-section-count">({products.length})</span>
        </h2>
        <button
          type="button"
          className="admin-btn admin-btn-primary admin-btn-sm"
          onClick={() => navigate('/admin/products/new')}
        >
          <i className="fas fa-plus" />
          Add product
        </button>
      </div>

      {products.length === 0 ? (
        <div className="admin-panel admin-empty">
          <h3>No products</h3>
          <p>Add your first product to the catalogue.</p>
        </div>
      ) : (
        <div className="row g-3">
          {products.map((prod) => (
            <div className="col-12 col-md-6 col-lg-4" key={prod.slug}>
              <div className="admin-card">
                <div className="d-flex gap-3">
                  <img
                    src={prod.images?.[0] || '/assets/img/shop/shop1.png'}
                    alt=""
                    className="admin-product-thumb"
                  />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p className="admin-card-title">
                      <Link to={`/products/${prod.slug}`} target="_blank" rel="noreferrer">
                        {prod.name}
                      </Link>
                    </p>
                    <p className="admin-card-sub">{prod.slug}</p>
                    <div className="d-flex align-items-center gap-2 mt-2 flex-wrap">
                      <span className="admin-badge">{prod.category}</span>
                      <span className="admin-price">{prod.price}</span>
                    </div>
                  </div>
                </div>
                <div className="admin-card-actions">
                  <button
                    type="button"
                    className="admin-btn admin-btn-muted admin-btn-sm"
                    onClick={() => navigate(`/admin/products/${prod.slug}/edit`)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="admin-btn admin-btn-danger admin-btn-sm"
                    onClick={() => handleDeleteProduct(prod.slug)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const renderInquiries = () => (
    <div>
      <div className="admin-section-head">
        <h2 className="admin-section-title">
          Inquiries <span className="admin-section-count">({filteredInquiries.length})</span>
        </h2>
      </div>

      <div className="admin-filters">
        <div className="admin-search">
          <i className="fas fa-search" aria-hidden="true" />
          <input
            type="search"
            className="admin-input"
            placeholder="Search name, email, phone…"
            value={inquirySearch}
            onChange={(e) => setInquirySearch(e.target.value)}
          />
        </div>
        <DateRangeFilter value={dateFilter} onChange={setDateFilter} />
        {(dateFilter.preset !== 'all' || inquirySearch.trim()) && (
          <button
            type="button"
            className="admin-btn admin-btn-muted admin-btn-sm"
            onClick={() => {
              setInquirySearch('')
              setDateFilter({ preset: 'all', customStart: '', customEnd: '' })
            }}
          >
            Clear filters
          </button>
        )}
      </div>

      {filteredInquiries.length === 0 ? (
        <div className="admin-panel admin-empty">
          <h3>No inquiries found</h3>
          <p>Try adjusting your date range or search.</p>
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Name</th>
                <th>Contact</th>
                <th>Company</th>
                <th>Message</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInquiries.map((inq) => (
                <tr key={inq.id}>
                  <td className="cell-muted">
                    {inq.createdAt ? new Date(inq.createdAt).toLocaleString() : '—'}
                  </td>
                  <td style={{ fontWeight: 600 }}>{inq.name}</td>
                  <td className="cell-muted">
                    <div>{inq.email}</div>
                    <div>{inq.phone}</div>
                  </td>
                  <td>{inq.company || '—'}</td>
                  <td className="cell-clip">{inq.message}</td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button
                      type="button"
                      className="admin-btn admin-btn-muted admin-btn-sm me-1"
                      onClick={() => navigate(`/admin/inquiries/${inq.id}`)}
                    >
                      View
                    </button>
                    <button
                      type="button"
                      className="admin-btn admin-btn-danger admin-btn-sm"
                      onClick={() => handleDeleteInquiry(inq.id)}
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

  let body
  if (isLoading && !CONTENT_TABS.includes(activeTab)) {
    body = (
      <div className="admin-panel admin-empty">
        <p>Loading…</p>
      </div>
    )
  } else if (activeTab === 'products') {
    body = renderProducts()
  } else if (activeTab === 'inquiries') {
    body = renderInquiries()
  } else if (CONTENT_TABS.includes(activeTab)) {
    body = <ContentManager type={activeTab} onFeedback={showFeedback} />
  }

  return (
    <AdminShell activeTab={activeTab} onTabChange={handleTabChange} feedback={feedbackMsg}>
      {body}
    </AdminShell>
  )
}
