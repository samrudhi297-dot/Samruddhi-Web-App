import { getTestimonials } from '../services/content.js'
import { enhanceTestimonialCards } from './premiumEnhancements.js'

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function initTestimonialSlider(slider) {
  const $ = window.jQuery
  if (!$?.fn?.slick || !slider) return

  const $slider = $(slider)
  const $content = $slider.closest('.ori-testimonial-content-1')
  const $prev = $content.find('.testi-left_arrow')
  const $next = $content.find('.testi-right_arrow')

  try {
    $slider.slick({
      arrows: true,
      dots: true,
      infinite: true,
      slidesToShow: 1,
      slidesToScroll: 1,
      autoplay: true,
      autoplaySpeed: 7000,
      pauseOnHover: true,
      adaptiveHeight: true,
      prevArrow: $prev.length ? $prev : undefined,
      nextArrow: $next.length ? $next : undefined,
    })
  } catch (err) {
    console.warn('Testimonial slider init failed:', err)
  }
}

export async function injectTestimonials(container) {
  if (!container) return
  const slider = container.querySelector('.ori-testimonial-slider-1')
  if (!slider) return

  try {
    const items = await getTestimonials()
    if (!items.length) return

    const $ = window.jQuery
    if ($?.fn?.slick && slider.classList.contains('slick-initialized')) {
      // Must unslick before replacing markup — unslick restores Slick's cached HTML.
      try {
        $(slider).slick('unslick')
      } catch {
        // Slider DOM may already be out of sync; continue with a fresh rebuild.
      }
    }

    slider.innerHTML = items
      .map(
        (t) => `
      <div class="ori-testimonial-item-area">
        <div class="ori-testimonial-item-1">
          <div class="ori-testimonial-text text-center pera-content">
            <p>${escapeHtml(t.quote)}</p>
            <div class="ori-testimonial-author text-center text-uppercase">
              <h4>${escapeHtml(t.authorName)}</h4>
              <span>${escapeHtml(t.location)}</span>
            </div>
          </div>
        </div>
      </div>`,
      )
      .join('')

    enhanceTestimonialCards(container)
    initTestimonialSlider(slider)
  } catch (err) {
    console.warn('Could not load dynamic testimonials:', err)
  }
}
