import { useEffect, useState } from 'react'
import Header from '../components/Header.jsx'
import Footer from '../components/Footer.jsx'
import { getResources } from '../services/content.js'

export default function ResourcesPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    getResources()
      .then((data) => {
        if (!cancelled) setItems(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <>
      <Header />
      <section style={{ background: '#0a0a0a', color: '#fff', padding: '60px 0 80px', minHeight: '60vh' }}>
        <div className="container">
          <h1 style={{ fontWeight: 800, marginBottom: 8 }}>Resources</h1>
          <p style={{ color: '#94a3b8', marginBottom: 40 }}>
            Catalogues, specification sheets, and downloadable materials.
          </p>

          {loading && <p style={{ color: '#94a3b8' }}>Loading…</p>}
          {error && <p style={{ color: '#f87171' }}>{error}</p>}

          {!loading && !error && items.length === 0 && (
            <p style={{ color: '#94a3b8' }}>No resources available yet.</p>
          )}

          <div className="row g-3">
            {items.map((item) => (
              <div className="col-12 col-md-6" key={item.id}>
                <div
                  style={{
                    background: '#111',
                    border: '1px solid #222',
                    borderRadius: 12,
                    padding: 20,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: 16,
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        color: '#64748b',
                        letterSpacing: '0.05em',
                      }}
                    >
                      {item.category}
                    </span>
                    <h2 style={{ fontSize: 17, fontWeight: 700, margin: '6px 0 8px' }}>{item.title}</h2>
                    <p style={{ color: '#94a3b8', fontSize: 14, margin: 0 }}>{item.description}</p>
                  </div>
                  {item.fileUrl && (
                    <a
                      href={item.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="se-btn-primary"
                      style={{ fontSize: 13, padding: '8px 16px', flexShrink: 0 }}
                    >
                      Download
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <Footer />
    </>
  )
}
