import { rewriteLegacyHrefsInHtml } from './legacyRoutes.js'
import { runPremiumEnhancements } from './premiumEnhancements.js'

/** Normalize relative legacy paths so assets work on nested routes like /products/SAM14N */
export function normalizeLegacyHtml(html) {
  return rewriteLegacyHrefsInHtml(
    html
      .replace(/<div id=["']preloader["'][^>]*><\/div>/gi, '')
      .replace(/((?:src|href)=["'])assets\//gi, '$1/assets/')
      .replace(/data-background=["']assets\//gi, 'data-background="/assets/')
      .replace(/url\((['"]?)assets\//gi, 'url($1/assets/')
      // Some legacy pages have a corrupted logo link: `%21.html#` (should be home)
      .replace(/href=(["'])%21\.html#\1/gi, 'href="/"')
      // Fix common copy typo across product pages
      .replace(/Get\s+Quotaion/gi, 'Get Quotation')
      // Remove dead template links to non-existent shop single page
      .replace(/href=(["'])shop-single\.html\1/gi, 'href="/products"')
      // Fix invalid nested anchors in sponsor sliders: <a href="#"><a href="...">...</a></a>
      .replace(/<a\s+href=["']#["']>\s*(<a\b)/gi, '$1')
      .replace(/<\/a>\s*<\/a>/gi, '</a>')
      // Nav polish: clearer labels + About route
      .replace(/href=(["'])#ori-service-1\1/gi, 'href="/about"')
      .replace(/href=(["'])index\.html#ori-service-1\1/gi, 'href="/about"')
      .replace(/>(\s*)profile(\s*)</gi, '>$1About$2<')
      .replace(/>(\s*)Testimonial(\s*)</gi, '>$1Testimonials$2<')
      .replace(/(<div class="brand-logo">\s*<a\s+)href=["']#["']/gi, '$1href="/"'),
  )
}

function getJQuery() {
  return window.jQuery || window.$
}

function unslickIfNeeded($el) {
  try {
    if ($el.length && $el.hasClass('slick-initialized')) {
      $el.slick('unslick')
    }
  } catch {
    // Slick can throw if DOM was already replaced by React
  }
}

const SPONSOR_SLIDER_OPTS = {
  arrow: false,
  dots: false,
  loop: true,
  infinite: false,
  slidesToShow: 5,
  autoplay: true,
  slidesToScroll: 1,
  responsive: [
    { breakpoint: 1024, settings: { slidesToShow: 5, slidesToScroll: 1, infinite: true } },
    { breakpoint: 1000, settings: { slidesToShow: 4, slidesToScroll: 1 } },
    { breakpoint: 800, settings: { slidesToShow: 4, slidesToScroll: 1 } },
    { breakpoint: 600, settings: { slidesToShow: 3, slidesToScroll: 2 } },
    { breakpoint: 500, settings: { slidesToShow: 2, slidesToScroll: 1 } },
  ],
}

const TESTIMONIAL_SLIDER_OPTS = {
  arrows: true,
  dots: true,
  infinite: true,
  slidesToShow: 1,
  slidesToScroll: 1,
  autoplay: true,
  autoplaySpeed: 7000,
  pauseOnHover: true,
  adaptiveHeight: true,
}

function initTestimonialSlider(container) {
  const $ = getJQuery()
  if (!$ || !container) return

  const $root = container.jquery ? container : $(container)

  $root.find('.ori-testimonial-slider-1').each(function () {
    const $slider = $(this)
    if ($slider.hasClass('slick-initialized')) return

    const $content = $slider.closest('.ori-testimonial-content-1')
    const $prev = $content.find('.testi-left_arrow')
    const $next = $content.find('.testi-right_arrow')

    try {
      $slider.slick({
        ...TESTIMONIAL_SLIDER_OPTS,
        prevArrow: $prev.length ? $prev : undefined,
        nextArrow: $next.length ? $next : undefined,
      })
    } catch (err) {
      console.warn('Testimonial slider init failed:', err)
    }
  })
}

function scheduleTestimonialSlider(container) {
  initTestimonialSlider(container)
  window.setTimeout(() => initTestimonialSlider(container), 200)
}

const MAIN_SLIDER_OPTS = {
  arrow: false,
  dots: true,
  infinite: true,
  slidesToShow: 1,
  fade: true,
  autoplay: false,
  slidesToScroll: 1,
  customPaging: (_slider, i) => `0${i + 1}`,
}

function inferProductCategory(href = '') {
  const slug = href.split('/').pop()?.replace(/\.html$/i, '').toLowerCase() || ''
  if (/^sam\d|sam14|sam12|sam30|sam35|sam74/.test(slug)) return 'doors'
  if (slug.includes('interlocking')) return 'interlocking'
  if (slug.includes('pass-box')) return 'pass-box'
  if (/seal|drop|brush|rubber|pvc|acoustic|tear|external|bottom/.test(slug)) return 'seals'
  if (/bolt|handle|corner|covering|aluminium|ssd|tdf|ss-/.test(slug)) return 'hardware'
  return 'seals'
}

function enhancePremiumHeader(container) {
  const header = container.querySelector('#ori-header')
  if (!header) return

  const headerContent = header.querySelector('.ori-header-content')
  if (headerContent && !headerContent.querySelector('.se-header-cta')) {
    const cta = document.createElement('div')
    cta.className = 'se-header-cta'
    cta.innerHTML = `
      <a class="se-header-phone" href="tel:+919900454111"><i class="fas fa-phone"></i> +91 9900454111</a>
      <a class="se-btn-primary" href="/contact">Get Quote</a>
    `
    headerContent.appendChild(cta)
  }
}

function initProductCategoryFilter(container) {
  const chips = container.querySelectorAll('.se-chip[data-filter]')
  if (!chips.length) return

  const items = container.querySelectorAll('#ori-shop-feed .col-md-4')
  items.forEach((col) => {
    const link = col.querySelector('.shop-text a, .add-cart-btn a')
    col.dataset.category = inferProductCategory(link?.getAttribute('href') || '')
  })

  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      chips.forEach((c) => c.classList.remove('is-active'))
      chip.classList.add('is-active')
      const filter = chip.dataset.filter
      items.forEach((col) => {
        const show = filter === 'all' || col.dataset.category === filter
        col.classList.toggle('se-filter-hidden', !show)
      })
    })
  })
}

/** Re-run theme behaviors for HTML injected into the SPA */
export function reinitializeLegacyTheme(container, { skipTestimonialSlider = false } = {}) {
  const $ = getJQuery()
  if (!$ || !container) return

  const $root = $(container)
  if (!$root.children().length) return

  $root.find('#preloader').remove()

  runPremiumEnhancements(container)

  $root.find('[data-background]').each(function () {
    const bg = $(this).attr('data-background')
    if (bg) {
      const url = bg.startsWith('/') ? bg : `/${bg.replace(/^\//, '')}`
      $(this).css('background-image', `url(${url})`)
    }
  })

  try {
    const $mainSlider = $root.find('.ori-slider-wrap-1')
    if ($mainSlider.length) {
      unslickIfNeeded($mainSlider)
      if (!$mainSlider.hasClass('slick-initialized')) {
        $mainSlider.slick(MAIN_SLIDER_OPTS)
      }
    }

    $root.find('.ori-sponsor-slider').each(function () {
      if ($(this).closest('.se-trust-marquee').length) return
      const $slider = $(this)
      unslickIfNeeded($slider)
      if (!$slider.hasClass('slick-initialized')) {
        $slider.slick(SPONSOR_SLIDER_OPTS)
      }
    })

    const $slideFor = $root.find('.ori-shop-details-slide-for')
    if ($slideFor.length) {
      unslickIfNeeded($slideFor)
      const $slideNav = $root.find('.ori-shop-details-slide-nav')
      if ($slideNav.length) {
        unslickIfNeeded($slideNav)
        $slideFor.slick({
          slidesToShow: 1,
          slidesToScroll: 1,
          arrows: false,
          asNavFor: $slideNav,
        })
        $slideNav.slick({
          slidesToShow: 3,
          slidesToScroll: 1,
          infinite: true,
          asNavFor: $slideFor,
          dots: true,
          focusOnSelect: true,
        })
      } else if (!$slideFor.hasClass('slick-initialized')) {
        $slideFor.slick({
          slidesToShow: 1,
          slidesToScroll: 1,
          arrows: false,
          dots: false,
          fade: true,
        })
      }
    }
  } catch (err) {
    console.warn('Legacy theme slider init skipped:', err)
  }

  try {
    if ($.fn.counterUp && $root.find('.counter').length) {
      $root.find('.counter').counterUp({ delay: 15, time: 1500 })
    }
  } catch {
    // optional enhancement
  }

  try {
    if (window.WOW) {
      new window.WOW({ live: true }).init()
    }
  } catch {
    // optional enhancement
  }

  $root.find('.open_mobile_menu').off('click.legacy').on('click.legacy', function () {
    $root.find('.mobile_menu_wrap').toggleClass('mobile_menu_on')
    $('body').toggleClass('mobile_menu_overlay_on')
  })

  $root.find('.scrollup').off('click.legacy').on('click.legacy', function (e) {
    e.preventDefault()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  })

  enhancePremiumHeader(container)
  initProductCategoryFilter(container)
  if (!skipTestimonialSlider) {
    scheduleTestimonialSlider(container)
  }
}

export function destroyLegacyTheme(container) {
  if (!container) return

  const $ = getJQuery()
  if ($) {
    $(container).find('.open_mobile_menu, .scrollup').off('click.legacy')
    $('body').removeClass('mobile_menu_overlay_on')
  }
  // Do NOT call slick('unslick') here — it mutates DOM that React owns and causes blank pages.
}
