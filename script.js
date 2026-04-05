/* ============================================
   OUJI — Premium Editorial JavaScript v5.0
   Cinematic Scroll · Editorial Reveals · Luxury Motion
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  // Core reveals
  initScrollReveal();
  initBlurReveal();
  initStaggerReveal();
  initScaleReveal();
  initDirectionReveals();
  initSectionFloat();
  initMoodBoardReveal();
  initLookbookInView();
  initDividerReveal();
  initSplitText();
  initWordReveal();

  // Navigation & UI
  initMobileNav();
  initHeaderScroll();
  initFilterSidebar();
  initProductTabs();
  initQuantityControls();
  initVariantSelectors();
  initCartActions();

  // Premium scroll effects
  initKoraHeroScroll();
  initKoraTextScale();
  initScrollParallaxImages();
  initCountUp();
  initScrollProgress();
  initMarqueeHoverPause();
  initHScrollDrag();
  initSmoothImages();

  // Removed for premium restraint:
  // initTiltCards, initMagneticButtons, initCursorGlow,
  // initRippleButtons, initFloatingParticles, initParallax, initBokeh

  // Safety fallback: if IntersectionObserver hasn't triggered after 2s,
  // force all reveal elements visible to prevent blank page
  setTimeout(function () {
    document.querySelectorAll('.reveal:not(.is-visible), .reveal-blur:not(.is-visible), .reveal-stagger:not(.is-visible), .reveal-scale:not(.is-visible), .reveal-left:not(.is-visible), .reveal-right:not(.is-visible), .reveal-clip:not(.is-visible), .reveal-clip--right:not(.is-visible), .reveal-clip--up:not(.is-visible), .section-float:not(.is-visible), .section-divider:not(.is-visible), .split-text:not(.is-visible), .word-reveal:not(.is-visible), .mood-board:not(.is-visible)').forEach(function (el) {
      el.classList.add('is-visible');
    });
  }, 2000);
});

/* ----- Scroll Reveal ----- */
function initScrollReveal() {
  const reveals = document.querySelectorAll('.reveal');
  if (!reveals.length) return;
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.08, rootMargin: '0px 0px -30px 0px' }
  );
  reveals.forEach((el) => observer.observe(el));
}

/* ----- Stagger Reveal ----- */
function initStaggerReveal() {
  const staggers = document.querySelectorAll('.reveal-stagger');
  if (!staggers.length) return;
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.05, rootMargin: '0px 0px -20px 0px' }
  );
  staggers.forEach((el) => observer.observe(el));
}

/* ----- Scale Reveal ----- */
function initScaleReveal() {
  const scales = document.querySelectorAll('.reveal-scale');
  if (!scales.length) return;
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1 }
  );
  scales.forEach((el) => observer.observe(el));
}

/* ----- Parallax ----- */
function initParallax() {
  const parallaxElements = document.querySelectorAll('[data-parallax]');
  if (!parallaxElements.length) return;
  let ticking = false;

  function updateParallax() {
    const scrollY = window.scrollY;
    parallaxElements.forEach((el) => {
      const speed = parseFloat(el.dataset.parallax) || 0.1;
      const rect = el.getBoundingClientRect();
      const inView = rect.top < window.innerHeight && rect.bottom > 0;
      if (inView) {
        const offset = (scrollY - el.offsetTop + window.innerHeight) * speed;
        el.style.transform = `translateY(${offset}px)`;
      }
    });
    ticking = false;
  }

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(updateParallax);
      ticking = true;
    }
  }, { passive: true });
}

/* ----- Header Scroll ----- */
function initHeaderScroll() {
  const header = document.querySelector('.header');
  if (!header) return;
  // Only toggle on pages without is-scrolled set in HTML (i.e. homepage with dark hero).
  // Other pages always keep is-scrolled for dark text on light backgrounds.
  if (header.classList.contains('is-scrolled')) return;
  window.addEventListener('scroll', () => {
    header.classList.toggle('is-scrolled', window.scrollY > 60);
  }, { passive: true });
}

/* ----- Smooth Image Load ----- */
function initSmoothImages() {
  const images = document.querySelectorAll('img[data-src]');
  if (!images.length) return;
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.style.opacity = '0';
          img.style.transition = 'opacity 0.6s ease';
          img.src = img.dataset.src;
          img.onload = () => {
            img.style.opacity = '1';
            img.removeAttribute('data-src');
          };
          observer.unobserve(img);
        }
      });
    },
    { rootMargin: '100px' }
  );
  images.forEach((img) => observer.observe(img));
}

/* ----- Scroll Progress Bar ----- */
function initScrollProgress() {
  const bar = document.querySelector('.scroll-progress');
  if (!bar) return;
  window.addEventListener('scroll', () => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    bar.style.width = progress + '%';
  }, { passive: true });
}

/* ----- 3D Tilt on Product Cards ----- */
function initTiltCards() {
  const cards = document.querySelectorAll('.product-card__image-wrap');
  if (!cards.length) return;

  cards.forEach((card) => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = ((y - centerY) / centerY) * -4;
      const rotateY = ((x - centerX) / centerX) * 4;
      card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(800px) rotateX(0) rotateY(0) scale(1)';
      card.style.transition = 'transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)';
    });

    card.addEventListener('mouseenter', () => {
      card.style.transition = 'transform 0.1s ease';
    });
  });
}

/* ----- Magnetic Buttons ----- */
function initMagneticButtons() {
  const buttons = document.querySelectorAll('.btn--primary, .btn--secondary');
  if (!buttons.length) return;

  buttons.forEach((btn) => {
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      btn.style.transform = `translate(${x * 0.15}px, ${y * 0.15}px)`;
    });

    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'translate(0, 0)';
      btn.style.transition = 'transform 0.4s cubic-bezier(0.22, 1, 0.36, 1)';
    });

    btn.addEventListener('mouseenter', () => {
      btn.style.transition = 'transform 0.1s ease';
    });
  });
}

/* ----- Cursor Glow on Hero ----- */
function initCursorGlow() {
  const hero = document.querySelector('.hero');
  if (!hero) return;

  const glow = document.createElement('div');
  glow.classList.add('hero__cursor-glow');
  hero.appendChild(glow);

  hero.addEventListener('mousemove', (e) => {
    const rect = hero.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    glow.style.left = x + 'px';
    glow.style.top = y + 'px';
    glow.style.opacity = '1';
  });

  hero.addEventListener('mouseleave', () => {
    glow.style.opacity = '0';
  });
}

/* ----- Count Up Animation ----- */
function initCountUp() {
  const counters = document.querySelectorAll('[data-count]');
  if (!counters.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const target = parseInt(el.dataset.count);
          const suffix = el.dataset.suffix || '';
          const prefix = el.dataset.prefix || '';
          const duration = 2000;
          const start = 0;
          const startTime = performance.now();

          function update(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 4);
            const current = Math.floor(start + (target - start) * eased);
            el.textContent = prefix + current.toLocaleString() + suffix;
            if (progress < 1) {
              requestAnimationFrame(update);
            }
          }

          el.classList.add('is-counting');
          requestAnimationFrame(update);
          observer.unobserve(el);
        }
      });
    },
    { threshold: 0.5 }
  );

  counters.forEach((el) => observer.observe(el));
}

/* ----- Ripple on Buttons ----- */
function initRippleButtons() {
  document.querySelectorAll('.btn').forEach((btn) => {
    btn.addEventListener('click', function (e) {
      const ripple = document.createElement('span');
      ripple.classList.add('btn__ripple');
      const rect = btn.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
      ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
      btn.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);
    });
  });
}

/* ----- Marquee Hover Pause ----- */
function initMarqueeHoverPause() {
  const marquees = document.querySelectorAll('.marquee');
  marquees.forEach((m) => {
    const inner = m.querySelector('.marquee__inner');
    if (!inner) return;
    m.addEventListener('mouseenter', () => {
      inner.style.animationPlayState = 'paused';
    });
    m.addEventListener('mouseleave', () => {
      inner.style.animationPlayState = 'running';
    });
  });
}

/* ----- Mobile Navigation ----- */
function initMobileNav() {
  const toggle = document.querySelector('.header__menu-toggle');
  const nav = document.querySelector('.mobile-nav');
  const overlay = document.querySelector('.mobile-nav-overlay');
  const close = document.querySelector('.mobile-nav__close');
  if (!toggle || !nav) return;

  function openNav() {
    nav.classList.add('is-open');
    overlay?.classList.add('is-visible');
    document.body.style.overflow = 'hidden';
  }
  function closeNav() {
    nav.classList.remove('is-open');
    overlay?.classList.remove('is-visible');
    document.body.style.overflow = '';
  }

  toggle.addEventListener('click', openNav);
  close?.addEventListener('click', closeNav);
  overlay?.addEventListener('click', closeNav);

  // Bottom nav menu button also opens the same nav
  const bottomMenuBtn = document.querySelector('.mobile-bottom-nav__menu-btn');
  bottomMenuBtn?.addEventListener('click', openNav);
}

/* ----- Filter Sidebar ----- */
function initFilterSidebar() {
  const filterBtn = document.querySelector('[data-filter-toggle]');
  const sidebar = document.querySelector('.filter-sidebar');
  const overlay = document.querySelector('.filter-overlay');
  const closeBtn = document.querySelector('.filter-sidebar__close');
  if (!filterBtn || !sidebar) return;

  function openFilter() {
    sidebar.classList.add('is-open');
    overlay?.classList.add('is-visible');
    document.body.style.overflow = 'hidden';
  }
  function closeFilter() {
    sidebar.classList.remove('is-open');
    overlay?.classList.remove('is-visible');
    document.body.style.overflow = '';
  }

  filterBtn.addEventListener('click', openFilter);
  closeBtn?.addEventListener('click', closeFilter);
  overlay?.addEventListener('click', closeFilter);
}

/* ----- Product Tabs ----- */
function initProductTabs() {
  const tabs = document.querySelectorAll('.product-tabs__tab');
  const panels = document.querySelectorAll('.product-tabs__panel');
  if (!tabs.length) return;

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      tabs.forEach((t) => t.classList.remove('is-active'));
      panels.forEach((p) => {
        p.classList.remove('is-active');
        p.style.opacity = '0';
      });
      tab.classList.add('is-active');
      const panel = document.getElementById(target);
      if (panel) {
        panel.classList.add('is-active');
        requestAnimationFrame(() => {
          panel.style.transition = 'opacity 0.4s ease';
          panel.style.opacity = '1';
        });
      }
    });
  });
}

/* ----- Quantity Controls ----- */
function initQuantityControls() {
  document.querySelectorAll('.qty-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const input = btn.parentElement.querySelector('.qty-input');
      if (!input) return;
      let val = parseInt(input.value) || 1;
      if (btn.dataset.action === 'decrease') {
        val = Math.max(1, val - 1);
      } else {
        val = Math.min(99, val + 1);
      }
      input.value = val;
      updateCartTotals();
    });
  });
}

/* ----- Variant Selectors ----- */
function initVariantSelectors() {
  document.querySelectorAll('.variant-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const group = btn.closest('.product-info__variants');
      group?.querySelectorAll('.variant-btn').forEach((b) => b.classList.remove('is-selected'));
      btn.classList.add('is-selected');
    });
  });
}

/* ----- Cart Actions ----- */
function initCartActions() {
  document.querySelectorAll('.cart-item__remove').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const item = btn.closest('.cart-item');
      if (item) {
        item.style.opacity = '0';
        item.style.transform = 'translateX(-30px)';
        item.style.transition = 'all 0.4s cubic-bezier(0.22, 1, 0.36, 1)';
        setTimeout(() => {
          item.style.height = item.offsetHeight + 'px';
          requestAnimationFrame(() => {
            item.style.height = '0';
            item.style.padding = '0';
            item.style.margin = '0';
            item.style.overflow = 'hidden';
          });
          setTimeout(() => {
            item.remove();
            updateCartTotals();
          }, 400);
        }, 300);
      }
    });
  });
}

/* ----- Update Cart Totals ----- */
function updateCartTotals() {
  const items = document.querySelectorAll('.cart-item');
  let subtotal = 0;
  items.forEach((item) => {
    const priceEl = item.querySelector('.cart-item__price');
    const qtyInput = item.querySelector('.qty-input');
    if (!priceEl || !qtyInput) return;
    const price = parseFloat(priceEl.textContent.replace(/[^0-9.]/g, ''));
    const qty = parseInt(qtyInput.value) || 1;
    subtotal += price * qty;
  });
  const subtotalEl = document.querySelector('[data-subtotal]');
  const totalEl = document.querySelector('[data-total]');
  if (subtotalEl) subtotalEl.textContent = `HK$${subtotal.toFixed(0)}`;
  if (totalEl) totalEl.textContent = `HK$${subtotal.toFixed(0)}`;
}

/* ----- Blur Reveal ----- */
function initBlurReveal() {
  const els = document.querySelectorAll('.reveal-blur');
  if (!els.length) return;
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.08, rootMargin: '0px 0px -30px 0px' }
  );
  els.forEach((el) => observer.observe(el));
}

/* ----- Horizontal Scroll Drag ----- */
function initHScrollDrag() {
  const tracks = document.querySelectorAll('.hscroll-showcase__track');
  tracks.forEach((track) => {
    let isDown = false;
    let startX;
    let scrollLeft;

    track.addEventListener('mousedown', (e) => {
      isDown = true;
      startX = e.pageX - track.offsetLeft;
      scrollLeft = track.scrollLeft;
    });

    track.addEventListener('mouseleave', () => { isDown = false; });
    track.addEventListener('mouseup', () => { isDown = false; });

    track.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - track.offsetLeft;
      const walk = (x - startX) * 1.5;
      track.scrollLeft = scrollLeft - walk;
    });
  });
}

/* ----- Floating Particles ----- */
function initFloatingParticles() {
  const container = document.querySelector('.particles');
  if (!container) return;

  for (let i = 0; i < 20; i++) {
    const particle = document.createElement('div');
    particle.classList.add('particle');
    particle.style.left = Math.random() * 100 + '%';
    particle.style.width = particle.style.height = (Math.random() * 4 + 2) + 'px';
    particle.style.animationDuration = (Math.random() * 15 + 10) + 's';
    particle.style.animationDelay = (Math.random() * 10) + 's';
    particle.style.opacity = Math.random() * 0.2 + 0.05;
    container.appendChild(particle);
  }
}

/* ----- Split Text into Characters ----- */
function initSplitText() {
  const els = document.querySelectorAll('[data-split-text]');
  els.forEach(el => {
    const text = el.textContent;
    el.innerHTML = '';
    el.classList.add('split-text');
    let charIndex = 0;
    [...text].forEach(c => {
      const span = document.createElement('span');
      if (c === ' ') {
        span.classList.add('char', 'char--space');
        span.innerHTML = '&nbsp;';
      } else {
        span.classList.add('char');
        span.textContent = c;
      }
      span.style.transitionDelay = (charIndex * 0.035) + 's';
      el.appendChild(span);
      charIndex++;
    });
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3 });
  els.forEach(el => observer.observe(el));
}

/* ----- Word-by-Word Reveal ----- */
function initWordReveal() {
  const els = document.querySelectorAll('[data-word-reveal]');
  els.forEach(el => {
    const words = el.textContent.trim().split(/\s+/);
    el.innerHTML = '';
    el.classList.add('word-reveal');
    words.forEach((word, i) => {
      const span = document.createElement('span');
      span.classList.add('word');
      span.textContent = word;
      span.style.transitionDelay = (i * 0.08) + 's';
      el.appendChild(span);
      if (i < words.length - 1) {
        el.appendChild(document.createTextNode(' '));
      }
    });
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3 });
  els.forEach(el => observer.observe(el));
}

/* ----- Direction Reveals (left/right/clip) ----- */
function initDirectionReveals() {
  const els = document.querySelectorAll('.reveal-left, .reveal-right, .reveal-clip, .reveal-clip--right, .reveal-clip--up');
  if (!els.length) return;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
  els.forEach(el => observer.observe(el));
}

/* ----- Section Float Entrance ----- */
function initSectionFloat() {
  const els = document.querySelectorAll('.section-float');
  if (!els.length) return;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.05, rootMargin: '0px 0px -60px 0px' });
  els.forEach(el => observer.observe(el));
}

/* ----- Mood Board Stagger Reveal ----- */
function initMoodBoardReveal() {
  const board = document.querySelector('.mood-board');
  if (!board) return;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  observer.observe(board);
}

/* ----- Lookbook Cards In-View Detection ----- */
function initLookbookInView() {
  const cards = document.querySelectorAll('.hscroll-showcase__card');
  if (!cards.length) return;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      entry.target.classList.toggle('is-in-view', entry.isIntersecting);
    });
  }, { threshold: 0.5 });
  cards.forEach(card => observer.observe(card));
}

/* ----- Section Divider Reveal ----- */
function initDividerReveal() {
  const dividers = document.querySelectorAll('.section-divider');
  if (!dividers.length) return;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });
  dividers.forEach(d => observer.observe(d));
}

/* ----- Kora Hero Scroll — cinematic sticky hero with scale + blur + darken ----- */
function initKoraHeroScroll() {
  var hero = document.querySelector('.hero.kora-hero');
  if (!hero) return;

  var overlay = hero.querySelector('.hero__scroll-overlay');
  var ticking = false;

  window.addEventListener('scroll', function () {
    if (!ticking) {
      requestAnimationFrame(function () {
        var scrollY = window.scrollY;
        var heroH = hero.offsetHeight;
        var progress = Math.min(scrollY / (heroH * 0.8), 1);

        // Scale: 1 → 0.92 (restrained, premium)
        var scale = 1 - progress * 0.08;
        // Border radius: 0 → 28px
        var radius = progress * 28;
        // Blur: 0 → 6px (subtle)
        var blur = progress * 6;

        hero.style.transform = 'scale(' + scale + ')';
        hero.style.borderRadius = radius + 'px';
        hero.style.filter = 'blur(' + blur + 'px)';

        // Darken overlay: 0 → 0.5
        if (overlay) {
          overlay.style.opacity = progress * 0.5;
        }

        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
}

/* ----- Kora Text Scale — scroll-linked typography shrink ----- */
function initKoraTextScale() {
  var els = document.querySelectorAll('[data-kora-scale]');
  if (!els.length) return;

  var ticking = false;

  function update() {
    var viewH = window.innerHeight;

    els.forEach(function (el) {
      var rect = el.getBoundingClientRect();
      var elCenter = rect.top + rect.height / 2;
      // Progress: 0 at bottom of viewport, 1 at center
      var progress = 1 - (elCenter / viewH);
      progress = Math.max(0, Math.min(progress, 1));

      // Scale: starts at 1.25, shrinks to 1
      var scale = 1.25 - progress * 0.25;
      // Opacity: 0.3 → 1
      var opacity = 0.3 + progress * 0.7;

      el.style.transform = 'scale(' + scale + ')';
      el.style.opacity = opacity;
    });
    ticking = false;
  }

  window.addEventListener('scroll', function () {
    if (!ticking) {
      requestAnimationFrame(update);
      ticking = true;
    }
  }, { passive: true });

  update();
}

/* ----- Parallax Images Inside Containers ----- */
function initScrollParallaxImages() {
  const containers = document.querySelectorAll('.parallax-img');
  if (!containers.length) return;

  let ticking = false;
  function update() {
    containers.forEach(container => {
      const img = container.querySelector('img');
      if (!img) return;
      const rect = container.getBoundingClientRect();
      const inView = rect.top < window.innerHeight && rect.bottom > 0;
      if (inView) {
        const progress = (rect.top + rect.height) / (window.innerHeight + rect.height);
        const offset = (progress - 0.5) * -30;
        img.style.transform = 'scale(1.18) translateY(' + offset + 'px)';
      }
    });
    ticking = false;
  }

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(update);
      ticking = true;
    }
  }, { passive: true });

  // Initial call
  update();
}

/* ----- Ambient Bokeh Orbs ----- */
function initBokeh() {
  const container = document.querySelector('.particles');
  if (!container) return;

  for (let i = 0; i < 6; i++) {
    const orb = document.createElement('div');
    orb.classList.add('bokeh');
    const size = Math.random() * 200 + 100;
    orb.style.width = size + 'px';
    orb.style.height = size + 'px';
    orb.style.left = Math.random() * 100 + '%';
    orb.style.top = Math.random() * 100 + '%';
    orb.style.setProperty('--bx', (Math.random() * 60 - 30) + 'px');
    orb.style.setProperty('--by', (Math.random() * 60 - 30) + 'px');
    orb.style.setProperty('--bs', (Math.random() * 0.3 + 0.9).toFixed(2));
    orb.style.animationDuration = (Math.random() * 12 + 8) + 's';
    orb.style.animationDelay = -(Math.random() * 12) + 's';
    container.appendChild(orb);
  }
}
