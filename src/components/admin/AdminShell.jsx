import { useNavigate } from 'react-router-dom'
import { supabase } from '../../utils/supabaseClient.js'

const TABS = [
  { id: 'products', label: 'Products', icon: 'fas fa-box' },
  { id: 'inquiries', label: 'Inquiries', icon: 'far fa-envelope' },
  { id: 'testimonials', label: 'Testimonials', icon: 'fas fa-quote-left' },
  { id: 'blogs', label: 'Blog', icon: 'fas fa-newspaper' },
  { id: 'resources', label: 'Resources', icon: 'fas fa-folder-open' },
]

export default function AdminShell({
  activeTab,
  onTabChange,
  subtitle = 'Manage website content and customer leads',
  children,
  feedback,
}) {
  const navigate = useNavigate()

  const handleLogout = async () => {
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

  return (
    <section className="admin-page">
      <div className="admin-container">
        <header className="admin-header-bar">
          <div className="admin-brand-wrap">
            <img src="/assets/img/logo/logo1.png" alt="Samruddhi" className="admin-brand-logo" />
            <div>
              <h1 className="admin-page-title">Admin CRM</h1>
              <p className="admin-page-subtitle">{subtitle}</p>
            </div>
          </div>
          <div className="d-flex align-items-center gap-2">
            <span className="admin-header-meta">Signed in</span>
            <button type="button" className="admin-btn admin-btn-muted admin-btn-sm" onClick={handleLogout}>
              <i className="fas fa-sign-out-alt" />
              Logout
            </button>
          </div>
        </header>

        {feedback?.text && (
          <div
            className={`admin-alert ${feedback.type === 'success' ? 'admin-alert-success' : 'admin-alert-danger'}`}
            role="alert"
          >
            {feedback.text}
          </div>
        )}

        <nav className="admin-tabs-bar" aria-label="Admin sections">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`admin-tab-btn${activeTab === tab.id ? ' is-active' : ''}`}
              onClick={() => onTabChange(tab.id)}
            >
              <i className={`${tab.icon} me-2`} aria-hidden="true" />
              {tab.label}
            </button>
          ))}
        </nav>

        {children}
      </div>
    </section>
  )
}
