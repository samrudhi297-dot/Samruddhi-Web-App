import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../utils/supabaseClient.js'
import { deleteInquiry, getInquiries, verifyAdminAccess, isSupabaseBackendEnabled } from '../services/catalog.js'

import '../admin-panel.css'

export default function AdminInquiryDetail() {
  const navigate = useNavigate()
  const { id } = useParams()

  const [isLoading, setIsLoading] = useState(true)
  const [feedbackMsg, setFeedbackMsg] = useState({ type: '', text: '' })
  const [inquiry, setInquiry] = useState(null)
  const [notFound, setNotFound] = useState(false)

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

  const handleDeleteInquiry = async () => {
    if (!window.confirm('Delete this inquiry permanently?')) return
    try {
      await deleteInquiry(id)
      showFeedback('success', 'Inquiry deleted')
      navigate('/admin?tab=inquiries')
    } catch (err) {
      console.error(err)
      if (err.status === 401 || err.status === 403) {
        handleLogout()
        return
      }
      showFeedback('danger', err.message || 'Failed to delete inquiry')
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

        const all = await getInquiries()
        if (cancelled) return
        const found = all.find((x) => String(x.id) === String(id))
        if (!found) {
          setNotFound(true)
          setInquiry(null)
        } else {
          setInquiry(found)
        }
      } catch (err) {
        console.warn('Admin inquiry detail init failed:', err)
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
  }, [navigate, id])

  return (
    <section className="admin-page">
      <div className="admin-container">
        <header className="admin-header-bar">
          <div className="admin-brand-wrap">
            <img src="/assets/img/logo/logo1.png" alt="Samruddhi" className="admin-brand-logo" />
            <div>
              <h1 className="admin-page-title">Admin CRM</h1>
              <p className="admin-page-subtitle">Inquiry details</p>
            </div>
          </div>
          <div className="d-flex align-items-center gap-2">
            <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => navigate('/admin?tab=inquiries')}>
              <i className="fas fa-arrow-left me-2" />
              Back
            </button>
            <button type="button" className="admin-btn admin-btn-muted admin-btn-sm" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </header>

        {feedbackMsg.text && (
          <div
            className={`admin-alert ${feedbackMsg.type === 'success' ? 'admin-alert-success' : 'admin-alert-danger'}`}
            role="alert"
          >
            {feedbackMsg.text}
          </div>
        )}

        {isLoading ? (
          <div className="admin-panel admin-empty"><p>Loading…</p></div>
        ) : notFound ? (
          <div className="admin-panel admin-empty">
            <h3>Inquiry not found</h3>
            <p>It may have been deleted already.</p>
            <button type="button" className="admin-btn admin-btn-primary admin-btn-sm mt-2" onClick={() => navigate('/admin?tab=inquiries')}>
              Back to inquiries
            </button>
          </div>
        ) : (
          <div className="admin-panel">
            <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
              <div>
                <h2 className="admin-section-title" style={{ fontSize: 18 }}>{inquiry?.name}</h2>
                <p className="admin-card-sub">
                  Submitted {inquiry?.createdAt ? new Date(inquiry.createdAt).toLocaleString() : '—'}
                </p>
              </div>
              <button type="button" className="admin-btn admin-btn-danger admin-btn-sm" onClick={handleDeleteInquiry}>
                Delete
              </button>
            </div>

            <div className="admin-form-row">
              <div>
                <p className="admin-form-label">Email</p>
                <p>{inquiry?.email}</p>
              </div>
              <div>
                <p className="admin-form-label">Phone</p>
                <p>{inquiry?.phone}</p>
              </div>
              <div>
                <p className="admin-form-label">Company</p>
                <p>{inquiry?.company || '—'}</p>
              </div>
            </div>

            {inquiry?.items?.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <p className="admin-form-label">Requested products</p>
                <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--admin-text)' }}>
                  {inquiry.items.map((item, idx) => (
                    <li key={`${item.name}-${idx}`}>
                      {item.name} (Qty: {item.quantity || 1}){item.price ? ` — ${item.price}` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div style={{ marginTop: 20 }}>
              <p className="admin-form-label">Message</p>
              <div className="admin-message-box" style={{ color: 'var(--admin-text)' }}>
                {inquiry?.message || '—'}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
