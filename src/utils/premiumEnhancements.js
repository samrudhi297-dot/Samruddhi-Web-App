/** Phase 2 premium UI enhancements applied after legacy HTML is injected */

function parseSpecLine(text) {
  const cleaned = text.replace(/\s+/g, ' ').trim()
  if (cleaned.includes(':')) {
    const idx = cleaned.indexOf(':')
    return {
      label: cleaned.slice(0, idx).trim(),
      value: cleaned.slice(idx + 1).trim(),
    }
  }
  return { label: '', value: cleaned }
}

export function enhanceProductDetailPage(container) {
  const section = container.querySelector('#ori-shop-details')
  if (!section || section.dataset.seEnhanced) return
  section.dataset.seEnhanced = 'true'
  section.classList.add('se-product-detail')

  container.querySelector('.shop-review-tab-btn')?.remove()
  container.querySelector('.ori-shop-details-review-content')?.remove()

  const crumbs = container.querySelector('#ori-breadcrumbs ul')
  if (crumbs && !crumbs.dataset.seEnhanced) {
    crumbs.dataset.seEnhanced = 'true'
    const items = crumbs.querySelectorAll('li')
    if (items.length === 2 && !crumbs.querySelector('a[href="/products"]')) {
      const productsLi = document.createElement('li')
      productsLi.innerHTML = '<a href="/products">Products</a>'
      items[0].after(productsLi)
    }
  }

  const slideFor = container.querySelector('.ori-shop-details-slide-for')
  if (slideFor) {
    const seen = new Set()
    slideFor.querySelectorAll('.slider-inner-img').forEach((slide) => {
      const src = slide.querySelector('img')?.getAttribute('src') || ''
      if (!src || seen.has(src)) slide.remove()
      else seen.add(src)
    })
  }

  const specsBlock = container.querySelector('.ori-code-category')
  const specsList = specsBlock?.querySelector('ul')
  if (specsList && !specsList.dataset.seEnhanced) {
    specsList.dataset.seEnhanced = 'true'
    const table = document.createElement('table')
    table.className = 'se-specs-table'
    specsList.querySelectorAll('li').forEach((li) => {
      const { label, value } = parseSpecLine(li.textContent || '')
      if (!value) return
      const row = document.createElement('tr')
      row.innerHTML = `<th>${label || 'Detail'}</th><td>${value}</td>`
      table.appendChild(row)
    })
    const wrap = document.createElement('div')
    wrap.className = 'se-specs-wrap'
    wrap.innerHTML = '<h4>Specifications</h4>'
    wrap.appendChild(table)
    specsBlock.replaceWith(wrap)
  }

  const detailsCol = container.querySelector('.ori-shop-details-text-wrapper')
  if (detailsCol && !detailsCol.querySelector('.se-product-quote-box')) {
    const box = document.createElement('div')
    box.className = 'se-product-quote-box'
    box.innerHTML = `
      <p class="se-product-quote-label">Need pricing or bulk supply?</p>
      <a href="/contact" class="se-btn-primary">Request a Quote</a>
      <p class="se-product-quote-note">We typically respond within 24 hours.</p>
      <a class="se-product-phone" href="tel:+919900454111"><i class="fas fa-phone"></i> +91 9900454111</a>
    `
    detailsCol.appendChild(box)
  }

  const related = container.querySelector('.ori-shop-related-product')
  if (related) {
    related.querySelector('h3')?.classList.add('se-section-subtitle')
  }
}

export function enhanceFooter(container) {
  const footer = container.querySelector('#ori-footer')
  if (!footer || footer.classList.contains('se-footer-enhanced')) return
  footer.classList.add('se-footer-enhanced')

  const row = footer.querySelector('.ori-footer-widget-wrapper .row')
  if (!row) return

  row.innerHTML = `
    <div class="col-lg-3 col-md-6">
      <div class="se-footer-brand">
        <a href="/"><img src="/assets/img/logo/logo1.png" alt="Samruddhi Enterprises" /></a>
        <p>Clean room doors, seals and hardware trusted by pharmaceutical and life-science facilities across India.</p>
      </div>
    </div>
    <div class="col-lg-3 col-md-6">
      <h3 class="se-footer-heading">Products</h3>
      <ul class="se-footer-links">
        <li><a href="/products">All Products</a></li>
        <li><a href="/products/PVC-Door-Seal">PVC Door Seal</a></li>
        <li><a href="/products/Automatic-Drop-Down-Seal">Drop Down Seals</a></li>
        <li><a href="/products/Door-Interlocking-System">Interlocking Systems</a></li>
        <li><a href="/products/SAM14N">Clean Room Doors</a></li>
      </ul>
    </div>
    <div class="col-lg-3 col-md-6">
      <h3 class="se-footer-heading">Company</h3>
      <ul class="se-footer-links">
        <li><a href="/about">About Us</a></li>
        <li><a href="/mission">Our Mission</a></li>
        <li><a href="/#ori-testimonial-1">Testimonials</a></li>
        <li><a href="/contact">Contact</a></li>
        <li><a href="/privacy">Privacy Policy</a></li>
        <li><a href="/terms">Terms &amp; Conditions</a></li>
      </ul>
    </div>
    <div class="col-lg-3 col-md-6">
      <h3 class="se-footer-heading">Contact</h3>
      <ul class="se-footer-contact">
        <li><i class="fas fa-phone"></i> <a href="tel:+919900454111">+91 9900454111</a></li>
        <li><i class="fas fa-phone"></i> <a href="tel:+919036111365">+91 9036111365</a></li>
        <li><i class="fas fa-envelope"></i> <a href="mailto:samruddhi.575@gmail.com">samruddhi.575@gmail.com</a></li>
        <li><i class="fas fa-map-marker-alt"></i> Kaveri layout, Vajarahalli, Nelamangala, Bangalore – 562123</li>
      </ul>
      <a class="se-footer-map-link" href="https://www.google.com/maps/search/?api=1&amp;query=Samruddhi+Enterprises+Vajarahalli+Bangalore" target="_blank" rel="noopener noreferrer">View on Google Maps</a>
      <div class="se-footer-actions">
        <a href="tel:+919900454111" class="se-footer-btn">Call</a>
        <a href="https://wa.me/919900454111" class="se-footer-btn se-footer-btn-whatsapp" target="_blank" rel="noopener noreferrer">WhatsApp</a>
      </div>
    </div>
  `
}

export function enhanceAboutPage(container) {
  const about = container.querySelector('#ori-about-play')
  if (!about || container.querySelector('.se-why-pharma')) return

  const counter = about.querySelector('.ori-about-counter-area')
  if (!counter) return

  const section = document.createElement('section')
  section.className = 'se-why-pharma'
  section.innerHTML = `
    <div class="container">
      <div class="se-section-heading text-center">
        <span class="se-eyebrow">Why choose us</span>
        <h2>Why pharmaceutical facilities trust Samruddhi</h2>
        <p>We help clean room projects meet contamination control, airflow and access requirements.</p>
      </div>
      <div class="row g-4">
        <div class="col-md-4">
          <div class="se-value-card">
            <div class="se-value-icon"><i class="fas fa-shield-alt"></i></div>
            <h3>Compliance ready</h3>
            <p>Products designed for classified areas, airlocks and controlled production environments.</p>
          </div>
        </div>
        <div class="col-md-4">
          <div class="se-value-card">
            <div class="se-value-icon"><i class="fas fa-industry"></i></div>
            <h3>Quality manufacturing</h3>
            <p>Durable seals, hardware and door systems built for long service life in demanding facilities.</p>
          </div>
        </div>
        <div class="col-md-4">
          <div class="se-value-card">
            <div class="se-value-icon"><i class="fas fa-headset"></i></div>
            <h3>Dedicated support</h3>
            <p>Guidance on product selection, installation and after-sales support from our Bangalore team.</p>
          </div>
        </div>
      </div>
    </div>
  `
  counter.after(section)
}

export function enhanceMissionPage(container) {
  const mission = container.querySelector('#ori-mission')
  if (!mission || mission.querySelector('.se-mission-values')) return

  const content = mission.querySelector('.ori-mission-content')
  if (!content) return

  const values = document.createElement('div')
  values.className = 'se-mission-values'
  values.innerHTML = `
    <div class="row g-4">
      <div class="col-md-4">
        <div class="se-value-card">
          <div class="se-value-icon"><i class="fas fa-gem"></i></div>
          <h3>Quality</h3>
          <p>Precision-engineered door hardware and seals that meet the demands of pharma production.</p>
        </div>
      </div>
      <div class="col-md-4">
        <div class="se-value-card">
          <div class="se-value-icon"><i class="fas fa-check-circle"></i></div>
          <h3>Compliance</h3>
          <p>Solutions aligned with clean room airflow, contamination control and access requirements.</p>
        </div>
      </div>
      <div class="col-md-4">
        <div class="se-value-card">
          <div class="se-value-icon"><i class="fas fa-hands-helping"></i></div>
          <h3>Support</h3>
          <p>Responsive quotes, technical guidance and reliable supply for projects across India.</p>
        </div>
      </div>
    </div>
  `
  content.appendChild(values)
}

export function enhanceTestimonialCards(container) {
  container.querySelectorAll('.ori-testimonial-item-1').forEach((item) => {
    if (item.querySelector('.se-stars')) return
    const textWrap = item.querySelector('.ori-testimonial-text')
    if (!textWrap) return
    const stars = document.createElement('div')
    stars.className = 'se-stars'
    stars.setAttribute('aria-label', '5 star rating')
    stars.textContent = '★★★★★'
    textWrap.insertBefore(stars, textWrap.firstChild)
    item.classList.add('se-testimonial-card')
  })
}

export function runPremiumEnhancements(container) {
  if (!container) return
  enhanceProductDetailPage(container)
  enhanceAboutPage(container)
  enhanceMissionPage(container)
  enhanceTestimonialCards(container)
  enhanceHomepagePhase3(container)
  enhanceContactFaq(container)
  enhanceFooter(container)
}

/* ─── Phase 3: Enterprise polish ─── */

const FAQ_ITEMS = [
  {
    q: 'What clean room door and seal products do you supply?',
    a: 'We supply PVC and acoustic door seals, automatic drop-down seals, clean room doors (SAM series), door interlocking systems, pass box hardware, aluminium profiles, handles, bolts and related accessories for pharmaceutical and life-science facilities.',
  },
  {
    q: 'Are your products suitable for GMP and classified areas?',
    a: 'Our products are designed for clean room airflow control, contamination barriers and access management in classified production areas. We help you select seals, doors and hardware aligned with your facility classification and SOP requirements.',
  },
  {
    q: 'Do you provide installation support?',
    a: 'Yes. We offer technical guidance on product selection, installation best practices and coordination with your civil/MEP teams. For larger projects we can advise on sequencing for airlocks, interlocking and seal integration.',
  },
  {
    q: 'What is the typical lead time for orders?',
    a: 'Standard products are typically dispatched within 3–7 working days after order confirmation. Custom door sizes, bulk project orders or interlocking panels may require 2–4 weeks — we confirm timelines when you request a quote.',
  },
  {
    q: 'How do I get pricing or a formal quotation?',
    a: 'Share your product list, quantities and project location via our contact form, phone or WhatsApp. We respond within 24 hours with pricing and availability for most enquiries.',
  },
]

function buildFaqSection({ id = 'se-faq', compact = false } = {}) {
  const section = document.createElement('section')
  section.id = id
  section.className = compact ? 'se-faq-section se-faq-section--compact' : 'se-faq-section'
  section.innerHTML = `
    <div class="container">
      <div class="se-section-heading text-center">
        <span class="se-eyebrow">FAQ</span>
        <h2>Frequently asked questions</h2>
        <p>Common questions about clean room doors, seals, compliance and project supply.</p>
      </div>
      <div class="se-faq-list" role="list">
        ${FAQ_ITEMS.map(
          (item, i) => `
          <div class="se-faq-item${i === 0 ? ' is-open' : ''}" role="listitem">
            <button type="button" class="se-faq-question" aria-expanded="${i === 0 ? 'true' : 'false'}">
              <span>${item.q}</span>
              <i class="fas fa-chevron-down" aria-hidden="true"></i>
            </button>
            <div class="se-faq-answer">
              <p>${item.a}</p>
            </div>
          </div>`,
        ).join('')}
      </div>
      <div class="se-faq-cta">
        <p>Still have questions? Our team is ready to help.</p>
        <a href="/contact" class="se-btn-primary">Contact Us</a>
      </div>
    </div>
  `
  return section
}

export function initFaqAccordion(container) {
  container.querySelectorAll('.se-faq-item').forEach((item) => {
    const btn = item.querySelector('.se-faq-question')
    if (!btn || btn.dataset.seBound) return
    btn.dataset.seBound = 'true'

    btn.addEventListener('click', () => {
      const isOpen = item.classList.contains('is-open')
      container.querySelectorAll('.se-faq-item').forEach((el) => {
        el.classList.remove('is-open')
        el.querySelector('.se-faq-question')?.setAttribute('aria-expanded', 'false')
      })
      if (!isOpen) {
        item.classList.add('is-open')
        btn.setAttribute('aria-expanded', 'true')
      }
    })
  })
}

export function enhanceHomepagePhase3(container) {
  if (!container.querySelector('#ori-slider-1')) return

  if (!container.querySelector('.se-certifications')) {
    const sponsor = container.querySelector('#ori-sponsor-1')
    if (sponsor) {
      const certs = document.createElement('section')
      certs.className = 'se-certifications'
      certs.innerHTML = `
        <div class="container">
          <div class="se-section-heading text-center">
            <span class="se-eyebrow">Compliance &amp; quality</span>
            <h2>Built for regulated environments</h2>
            <p>Products and processes aligned with pharmaceutical clean room requirements.</p>
          </div>
          <div class="se-cert-grid">
            <div class="se-cert-badge">
              <div class="se-cert-icon"><i class="fas fa-certificate"></i></div>
              <h3>GMP ready</h3>
              <p>Suitable for GMP production and classified manufacturing areas.</p>
            </div>
            <div class="se-cert-badge">
              <div class="se-cert-icon"><i class="fas fa-wind"></i></div>
              <h3>Clean room compliant</h3>
              <p>Seals and doors designed for airflow and contamination control.</p>
            </div>
            <div class="se-cert-badge">
              <div class="se-cert-icon"><i class="fas fa-award"></i></div>
              <h3>ISO quality systems</h3>
              <p>Consistent quality checks and traceable manufacturing practices.</p>
            </div>
            <div class="se-cert-badge">
              <div class="se-cert-icon"><i class="fas fa-truck"></i></div>
              <h3>Pan-India supply</h3>
              <p>Reliable dispatch and support for projects across India.</p>
            </div>
          </div>
        </div>
      `
      sponsor.after(certs)
    }
  }

  if (!container.querySelector('#se-faq-home')) {
    const contact = container.querySelector('#ori-contact-form')
    if (contact) {
      const faq = buildFaqSection({ id: 'se-faq-home' })
      contact.before(faq)
      initFaqAccordion(faq)
    }
  }
}

export function enhanceContactFaq(container) {
  if (!container.querySelector('#ori-contact-form')) return
  if (container.querySelector('#ori-slider-1') || container.querySelector('#se-faq-home')) return
  if (container.querySelector('#se-faq-contact')) return

  const contact = container.querySelector('#ori-contact-form')
  const faq = buildFaqSection({ id: 'se-faq-contact', compact: true })
  contact.before(faq)
  initFaqAccordion(faq)
}

