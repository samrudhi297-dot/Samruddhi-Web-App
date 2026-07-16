import { Link, useLocation } from 'react-router-dom'

export default function PremiumChrome({ children }) {
  const location = useLocation()
  const isAdmin = location.pathname.startsWith('/admin')

  return (
    <>
      {children}

      {!isAdmin && (
        <>
          <a
            href="https://wa.me/919900454111?text=Hi%2C%20I%20would%20like%20to%20inquire%20about%20your%20products."
            target="_blank"
            rel="noopener noreferrer"
            className="se-floating-whatsapp"
            title="Chat on WhatsApp"
          >
            <i className="fab fa-whatsapp" />
            <span className="se-whatsapp-tooltip">Chat with us</span>
          </a>

          <nav className="se-mobile-cta" aria-label="Quick actions">
            <a className="se-cta-call" href="tel:+919900454111">
              <i className="fas fa-phone-alt" aria-hidden="true" />
              Call
            </a>
            <a
              className="se-cta-whatsapp"
              href="https://wa.me/919900454111?text=Hi%2C%20I%20would%20like%20a%20quote%20for%20clean%20room%20doors%20and%20seals."
              target="_blank"
              rel="noopener noreferrer"
            >
              <i className="fab fa-whatsapp" aria-hidden="true" />
              WhatsApp
            </a>
            <Link className="se-cta-quote" to="/contact">
              Get Quote
            </Link>
          </nav>
        </>
      )}
    </>
  )
}
