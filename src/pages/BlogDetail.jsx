import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Header from '../components/Header.jsx'
import Footer from '../components/Footer.jsx'
import { getBlogBySlug } from '../services/content.js'

export default function BlogDetail() {
  const { slug } = useParams()
  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getBlogBySlug(slug)
      .then((data) => {
        if (!cancelled) setPost(data)
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
  }, [slug])

  return (
    <>
      <Header />
      <section style={{ background: '#0a0a0a', color: '#fff', padding: '60px 0 80px', minHeight: '60vh' }}>
        <div className="container" style={{ maxWidth: 800 }}>
          <Link to="/blog" style={{ color: '#94a3b8', fontSize: 14, textDecoration: 'none' }}>
            ← Back to blog
          </Link>

          {loading && <p style={{ marginTop: 24, color: '#94a3b8' }}>Loading…</p>}
          {error && <p style={{ marginTop: 24, color: '#f87171' }}>{error}</p>}

          {post && (
            <article style={{ marginTop: 24 }}>
              <time style={{ fontSize: 13, color: '#64748b' }}>
                {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : ''}
              </time>
              <h1 style={{ fontWeight: 800, margin: '12px 0 20px', fontSize: 'clamp(28px, 4vw, 40px)' }}>
                {post.title}
              </h1>
              {post.coverImage && (
                <img
                  src={post.coverImage}
                  alt=""
                  style={{
                    width: '100%',
                    borderRadius: 12,
                    marginBottom: 28,
                    maxHeight: 400,
                    objectFit: 'cover',
                  }}
                />
              )}
              <div style={{ color: '#cbd5e1', lineHeight: 1.75, whiteSpace: 'pre-wrap', fontSize: 16 }}>
                {post.body}
              </div>
            </article>
          )}
        </div>
      </section>
      <Footer />
    </>
  )
}
