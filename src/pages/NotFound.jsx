import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <div style={{ maxWidth: 720, textAlign: 'center' }}>
        <div style={{ fontSize: 64, fontWeight: 800, lineHeight: 1, marginBottom: 12 }}>404</div>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>Page not found</h1>
        <p style={{ marginTop: 12, opacity: 0.8 }}>
          The page you’re looking for doesn’t exist (or the old URL is no longer used).
        </p>
        <div style={{ marginTop: 18, display: 'flex', gap: 12, justifyContent: 'center' }}>
          <Link to="/" style={{ padding: '10px 14px', border: '1px solid #fff3', borderRadius: 10 }}>
            Go to Home
          </Link>
          <Link to="/products" style={{ padding: '10px 14px', border: '1px solid #fff3', borderRadius: 10 }}>
            View Products
          </Link>
        </div>
      </div>
    </div>
  )
}

