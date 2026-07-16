import { useEffect, useId, useState } from 'react'
import { createPortal } from 'react-dom'
import { submitInquiry } from '../services/catalog.js'

/**
 * Viewport-centered enquiry modal (ported to document.body so it never
 * sticks to the top of a scrolled/transformed page).
 */
export default function InquiryModal({ product, onClose }) {
  const titleId = useId()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [status, setStatus] = useState('form') // form | success | error
  const [errorText, setErrorText] = useState('')
  const [formFields, setFormFields] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    quantity: 1,
    message: product
      ? `Hi, I am interested in ${product.name}. Please provide a quotation.`
      : '',
  })

  useEffect(() => {
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormFields((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setErrorText('')
    try {
      const phone = String(formFields.phone || '').trim()
      if (phone.replace(/\D/g, '').length < 8) {
        throw new Error('Please enter a valid phone number')
      }
      await submitInquiry({
        name: formFields.name,
        email: formFields.email,
        phone,
        company: formFields.company,
        message: formFields.message,
        items: [
          {
            name: product.name,
            slug: product.slug,
            price: product.price,
            quantity: Math.max(1, Math.floor(Number(formFields.quantity) || 1)),
          },
        ],
      })
      setStatus('success')
    } catch (err) {
      console.error(err)
      setErrorText(err.message || 'Something went wrong. Please try again.')
      setStatus('error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const panel = (
    <div
      className="se-inquiry-overlay"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="se-inquiry-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="se-inquiry-close"
          onClick={onClose}
          aria-label="Close"
        >
          <i className="fas fa-times" />
        </button>

        {status === 'success' ? (
          <div className="se-inquiry-result text-center">
            <div className="se-inquiry-result-icon is-success">
              <i className="fas fa-check" />
            </div>
            <h4 id={titleId}>Enquiry sent</h4>
            <p>
              Thanks for your interest in <strong>{product.name}</strong>.
              We’ll get back to you shortly.
            </p>
            <button type="button" className="se-inquiry-btn" onClick={onClose}>
              Continue browsing
            </button>
          </div>
        ) : status === 'error' ? (
          <div className="se-inquiry-result text-center">
            <div className="se-inquiry-result-icon is-error">
              <i className="fas fa-exclamation" />
            </div>
            <h4 id={titleId}>Couldn’t send enquiry</h4>
            <p>{errorText}</p>
            <div className="d-flex gap-2 justify-content-center flex-wrap">
              <button
                type="button"
                className="se-inquiry-btn se-inquiry-btn-ghost"
                onClick={() => setStatus('form')}
              >
                Edit details
              </button>
              <button type="button" className="se-inquiry-btn" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        ) : (
          <>
            <h4 id={titleId} className="se-inquiry-title">
              Send enquiry
            </h4>
            <p className="se-inquiry-product">
              Product: <strong>{product.name}</strong>
              {product.price ? (
                <span className="se-inquiry-price"> · {product.price}</span>
              ) : null}
            </p>

            <form onSubmit={handleSubmit} className="se-inquiry-form">
              <div className="row g-2">
                <div className="col-sm-6">
                  <label className="se-inquiry-label" htmlFor="inq-name">Name *</label>
                  <input
                    id="inq-name"
                    type="text"
                    name="name"
                    required
                    autoFocus
                    value={formFields.name}
                    onChange={handleInputChange}
                    className="form-control form-control-sm bg-dark text-white border-secondary"
                  />
                </div>
                <div className="col-sm-6">
                  <label className="se-inquiry-label" htmlFor="inq-email">Email *</label>
                  <input
                    id="inq-email"
                    type="email"
                    name="email"
                    required
                    value={formFields.email}
                    onChange={handleInputChange}
                    className="form-control form-control-sm bg-dark text-white border-secondary"
                  />
                </div>
                <div className="col-sm-6">
                  <label className="se-inquiry-label" htmlFor="inq-phone">Phone *</label>
                  <input
                    id="inq-phone"
                    type="tel"
                    name="phone"
                    required
                    minLength={8}
                    pattern="[\d\s+\-()]{8,}"
                    title="Enter a valid phone number"
                    value={formFields.phone}
                    onChange={handleInputChange}
                    className="form-control form-control-sm bg-dark text-white border-secondary"
                  />
                </div>
                <div className="col-sm-3">
                  <label className="se-inquiry-label" htmlFor="inq-qty">Qty *</label>
                  <input
                    id="inq-qty"
                    type="number"
                    name="quantity"
                    required
                    min="1"
                    step="1"
                    value={formFields.quantity}
                    onChange={handleInputChange}
                    className="form-control form-control-sm bg-dark text-white border-secondary"
                  />
                </div>
                <div className="col-sm-3">
                  <label className="se-inquiry-label" htmlFor="inq-company">Company</label>
                  <input
                    id="inq-company"
                    type="text"
                    name="company"
                    value={formFields.company}
                    onChange={handleInputChange}
                    className="form-control form-control-sm bg-dark text-white border-secondary"
                  />
                </div>
                <div className="col-12">
                  <label className="se-inquiry-label" htmlFor="inq-message">Message *</label>
                  <textarea
                    id="inq-message"
                    name="message"
                    required
                    rows="3"
                    value={formFields.message}
                    onChange={handleInputChange}
                    className="form-control form-control-sm bg-dark text-white border-secondary"
                  />
                </div>
              </div>

              <div className="se-inquiry-actions">
                <button
                  type="button"
                  className="se-inquiry-btn se-inquiry-btn-ghost"
                  onClick={onClose}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="se-inquiry-btn"
                >
                  {isSubmitting ? 'Sending…' : 'Send enquiry'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )

  return createPortal(panel, document.body)
}
