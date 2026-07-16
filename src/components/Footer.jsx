import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer id="ori-footer" className="ori-footer-section footer-style-one">
      <div className="container">
        <div className="ori-footer-title text-center text-uppercase">
          <h2>Get In <span>Touch</span> <i className="fas fa-arrow-right"></i></h2>
        </div>
        <div className="ori-footer-widget-wrapper">
          <div className="row">
            <div className="col-lg-3 col-md-6">
              <div className="ori-footer-widget">
                <div className="logo-widget">
                  {/* Kept empty to match the legacy homepage logo widget */}
                </div>
              </div>
            </div>
            <div className="col-lg-3 col-md-6">
              <div className="ori-footer-widget">
                <div className="menu-location-widget ul-li-block">
                  <h2 className="widget-title text-uppercase">Our Location</h2>
                  <ul>
                    <li>
                      <a
                        href="https://maps.google.com/?q=Kaveri+layout,+Vajarahalli,+Nelamangala,+Bangalore,+Karnataka+562123"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Kaveri layout, Vajarahalli, Nelamangala, Bangalore, Karnataka – 562123
                      </a>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="col-lg-3 col-md-6">
              <div className="ori-footer-widget">
                <div className="contact-widget ul-li-block">
                  <h2 className="widget-title text-uppercase">Contact info</h2>
                  <div className="contact-info">
                    <span>Phone: +91 9900454111 / 9036111365</span>
                    <span>Mail: samruddhi.575@gmail.com</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-lg-3 col-md-6">
              <div className="ori-footer-widget">
                <div className="menu-location-widget ul-li-block">
                  <h2 className="widget-title text-uppercase">Quick Links</h2>
                  <ul>
                    <li>
                      <Link to="/terms">Terms & Conditions</Link>
                    </li>
                    <li>
                      <Link to="/privacy">Privacy Policy</Link>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="ori-footer-copyright text-center">
          <span>© {new Date().getFullYear()} Samruddhi Enterprises. All rights reserved.</span>
        </div>
      </div>
    </footer>
  )
}
