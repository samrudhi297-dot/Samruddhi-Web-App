import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Header from '../components/Header.jsx'
import Footer from '../components/Footer.jsx'
import InquiryModal from '../components/InquiryModal.jsx'
import { useCart } from '../context/CartContext.jsx'
import { getProducts } from '../services/catalog.js'

export default function ProductsCatalog() {
  const { addToCart } = useCart()

  const [products, setProducts] = useState([])
  const [filteredProducts, setFilteredProducts] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)

  const [inquiryProduct, setInquiryProduct] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function fetchProducts() {
      setLoadError(null)
      try {
        const list = await getProducts()
        if (cancelled) return
        setProducts(list)
        setFilteredProducts(list)
      } catch (err) {
        console.error('Failed to fetch products:', err)
        if (!cancelled) {
          setProducts([])
          setFilteredProducts([])
          setLoadError(err.message || 'Failed to load products')
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    fetchProducts()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let result = products

    if (selectedCategory !== 'all') {
      result = result.filter(p => p.category === selectedCategory)
    }

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase()
      result = result.filter(p => (p.name || '').toLowerCase().includes(q))
    }

    setFilteredProducts(result)
  }, [selectedCategory, searchQuery, products])

  const categories = [
    { key: 'all', label: 'All Products' },
    { key: 'seals', label: 'Seals' },
    { key: 'hardware', label: 'Hardware' },
    { key: 'interlocking', label: 'Interlocking' },
    { key: 'doors', label: 'Clean Room Doors' },
    { key: 'pass-box', label: 'Pass Box' }
  ]

  return (
    <>
      <Header />

      <section
        id="ori-breadcrumbs"
        className="ori-breadcrumbs-section position-relative"
        style={{ backgroundImage: "url('/assets/img/bg/bread-bg.png')", backgroundSize: 'cover' }}
      >
        <div className="container">
          <div className="ori-breadcrumb-content text-center ul-li">
            <h1>Products Catalog</h1>
            <ul>
              <li><Link to="/">Samruddhi Enterprise</Link></li>
              <li>Products</li>
            </ul>
            <div className="mt-3">
              <a
                href="/catalogues/samruddhi-product-catalogue.pdf"
                download="Samruddhi-Product-Catalogue.pdf"
                className="btn btn-sm d-inline-flex align-items-center gap-2"
                style={{
                  background: 'rgba(226, 232, 240, 0.12)',
                  border: '1px solid #64748b',
                  color: '#e2e8f0',
                  fontWeight: '600',
                  borderRadius: '6px',
                  padding: '8px 18px',
                  textDecoration: 'none',
                }}
              >
                <i className="fas fa-download" aria-hidden="true" />
                Download Product Catalogue (PDF)
              </a>
            </div>
          </div>
        </div>
      </section>

      <section id="ori-shop-feed" className="ori-shop-feed-section" style={{ padding: '60px 0' }}>
        <div className="container">
          <div className="ori-shop-feed-content">

            <div className="row justify-content-between align-items-center mb-3">
              <div className="col-lg-8 mb-3 mb-lg-0">
                <div className="se-category-chips d-flex flex-wrap gap-2" role="tablist">
                  {categories.map((cat) => (
                    <button
                      key={cat.key}
                      type="button"
                      className={`se-chip ${selectedCategory === cat.key ? 'is-active' : ''}`}
                      onClick={() => setSelectedCategory(cat.key)}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="col-lg-4 d-flex flex-column flex-sm-row gap-2 justify-content-lg-end">
                <a
                  href="/catalogues/samruddhi-product-catalogue.pdf"
                  download="Samruddhi-Product-Catalogue.pdf"
                  className="btn btn-sm d-inline-flex align-items-center justify-content-center gap-2"
                  style={{
                    background: '#334155',
                    color: '#f8fafc',
                    fontWeight: '600',
                    border: '1px solid #475569',
                    borderRadius: '6px',
                    padding: '10px 16px',
                    textDecoration: 'none',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <i className="fas fa-file-pdf" aria-hidden="true" />
                  Download Catalogue
                </a>
              </div>
            </div>
            <div className="row justify-content-end mb-4">
              <div className="col-md-4">
                <div className="search-box" style={{ position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 15px',
                      borderRadius: '5px',
                      border: '1px solid #333',
                      background: '#1a1a1a',
                      color: '#fff',
                      fontSize: '14px'
                    }}
                  />
                  <i className="fas fa-search" style={{ position: 'absolute', right: '15px', top: '13px', color: '#888' }} />
                </div>
              </div>
            </div>

            <div className="ori-shop-feed-post-content mt-4">
              {isLoading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-light" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : loadError ? (
                <div className="text-center py-5" style={{ color: '#aaa' }}>
                  <h3 style={{ color: '#ff6b6b' }}>Could not load products</h3>
                  <p>{loadError}</p>
                  <button
                    type="button"
                    className="btn btn-sm mt-2"
                    style={{ background: '#334155', color: '#f8fafc', fontWeight: '600', border: '1px solid #475569' }}
                    onClick={() => window.location.reload()}
                  >
                    Retry
                  </button>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-5" style={{ color: '#aaa' }}>
                  <h3>No products found</h3>
                  <p>Try resetting the category filter or changing your search term.</p>
                </div>
              ) : (
                <div className="row">
                  {filteredProducts.map((product) => (
                    <div key={product.slug} className="col-lg-4 col-md-6 col-sm-12 mb-4">
                      <div className="ori-shop-inner-item text-center" style={{ background: '#111', padding: '20px', borderRadius: '8px', border: '1px solid #222' }}>
                        <div className="shop-img-cart-btn position-relative" style={{ overflow: 'hidden', borderRadius: '4px' }}>
                          <div className="shop-img" style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#080808' }}>
                            <Link to={`/products/${product.slug}`} style={{ display: 'block', width: '100%', height: '100%' }}>
                              <img
                                src={product.images && product.images.length > 0 ? product.images[0] : '/assets/img/shop/shop1.png'}
                                alt={product.name}
                                style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
                              />
                            </Link>
                          </div>
                        </div>
                        <div className="shop-text mt-3">
                          <h3 style={{ fontSize: '18px', margin: '5px 0', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Link to={`/products/${product.slug}`} style={{ color: '#fff', textDecoration: 'none' }}>
                              {product.name}
                            </Link>
                          </h3>
                          <div style={{ color: '#cbd5e1', fontWeight: '600', fontSize: '15px', marginBottom: '15px' }}>
                            {product.price}
                          </div>

                          <div className="d-flex flex-wrap gap-2 justify-content-center mt-3">
                            <Link
                              to={`/products/${product.slug}`}
                              className="btn btn-sm"
                              style={{
                                background: '#222',
                                border: '1px solid #444',
                                color: '#fff',
                                fontSize: '11px',
                                padding: '6px 10px',
                                fontWeight: 'bold',
                                borderRadius: '4px',
                                textDecoration: 'none'
                              }}
                            >
                              <i className="fas fa-info-circle me-1" /> Details
                            </Link>
                            <button
                              onClick={() => addToCart(product, 1)}
                              className="btn btn-sm"
                              style={{
                                background: 'transparent',
                                border: '1px solid #64748b',
                                color: '#cbd5e1',
                                fontSize: '11px',
                                padding: '6px 10px',
                                fontWeight: '600',
                                borderRadius: '4px'
                              }}
                            >
                              <i className="fas fa-cart-plus me-1" /> + Cart
                            </button>
                            <button
                              onClick={() => setInquiryProduct(product)}
                              className="btn btn-sm"
                              style={{
                                background: '#475569',
                                color: '#f8fafc',
                                fontSize: '11px',
                                padding: '6px 10px',
                                fontWeight: '600',
                                border: '1px solid #64748b',
                                borderRadius: '4px'
                              }}
                            >
                              <i className="far fa-paper-plane me-1" /> Send Req
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      </section>

      {inquiryProduct && (
        <InquiryModal
          product={inquiryProduct}
          onClose={() => setInquiryProduct(null)}
        />
      )}

      <Footer />
    </>
  )
}
