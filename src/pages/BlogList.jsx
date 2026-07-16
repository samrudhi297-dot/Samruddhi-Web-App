import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Header from '../components/Header.jsx'
import Footer from '../components/Footer.jsx'
import { getBlogs } from '../services/content.js'

export default function BlogList() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    getBlogs()
      .then((data) => {
        if (!cancelled) setPosts(data)
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
          <h1 style={{ fontWeight: 800, marginBottom: 8 }}>Blog</h1>
          <p style={{ color: '#94a3b8', marginBottom: 40 }}>Insights on clean room doors, seals, and hardware.</p>

          {loading && <p style={{ color: '#94a3b8' }}>Loading…</p>}
          {error && <p style={{ color: '#f87171' }}>{error}</p>}

          {!loading && !error && posts.length === 0 && (
            <p style={{ color: '#94a3b8' }}>No articles published yet.</p>
          )}

          <div className="row g-4">
            {posts.map((post) => (
              <div className="col-md-6 col-lg-4" key={post.id}>
                <article
                  style={{
                    background: '#111',
                    border: '1px solid #222',
                    borderRadius: 12,
                    overflow: 'hidden',
                    height: '100%',
                  }}
                >
                  {post.coverImage && (
                    <img
                      src={post.coverImage}
                      alt=""
                      style={{ width: '100%', height: 180, objectFit: 'cover', background: '#1a1a1a' }}
                    />
                  )}
                  <div style={{ padding: 20 }}>
                    <time style={{ fontSize: 12, color: '#64748b' }}>
                      {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : ''}
                    </time>
                    <h2 style={{ fontSize: 18, fontWeight: 700, margin: '8px 0 10px' }}>
                      <Link to={`/blog/${post.slug}`} style={{ color: '#fff', textDecoration: 'none' }}>
                        {post.title}
                      </Link>
                    </h2>
                    <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 16 }}>{post.excerpt}</p>
                    <Link to={`/blog/${post.slug}`} className="se-btn-primary" style={{ fontSize: 13, padding: '8px 18px' }}>
                      Read more
                    </Link>
                  </div>
                </article>
              </div>
            ))}
          </div>
        </div>
      </section>
      <Footer />
    </>
  )
}
