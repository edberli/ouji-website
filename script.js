/* ============================================
   OUJI — Enhanced JavaScript v4.0
   Rich Animations, Parallax, Interactions
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  const reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const lite = isLiteDevice();
  if (lite) document.documentElement.classList.add('is-lite');

  // Entrance reveals (CSS makes these instant under reduced-motion) + essential UI
  initScrollReveal();
  initBlurReveal();
  initStaggerReveal();
  initScaleReveal();
  initSplitText();
  initWordReveal();
  initDirectionReveals();
  initSectionFloat();
  initMoodBoardReveal();
  initLookbookInView();
  initRiseReveal();
  initShimaFrames();
  initPromoLive();
  initPromoPop();
  initDividerReveal();
  initMobileNav();
  initMegaMenu();
  initHeaderScroll();
  initFilterSidebar();
  initProductTabs();
  initQuantityControls();
  initVariantSelectors();
  initCartActions();
  initQuickAdd();
  initSmoothImages();
  initScrollProgress();
  initRippleButtons();
  initMarqueeHoverPause();
  initBrandMarquee();
  initOffscreenPause();
  initHScrollDrag();
  initHScrollArrows();
  watchFrameRate();

  if (reduceMotion) {
    // Show final counter values immediately, skip the count-up animation
    document.querySelectorAll('[data-count]').forEach((el) => {
      const t = parseInt(el.dataset.count);
      if (!isNaN(t)) {
        el.textContent = (el.dataset.prefix || '') + t.toLocaleString() + (el.dataset.suffix || '');
      }
    });
  } else {
    initCountUp();
    // 每一 frame 都要計數／改 transform 嘅效果。慢機行到 20fps，
    // 靚機先睇得出分別，所以低配一律唔行。
    if (!lite) {
      initParallax();
      initTiltCards();
      initMagneticButtons();
      initCursorGlow();
      initHeroScrollParallax();
      initScrollParallaxImages();
      initFloatingParticles();
    }
  }

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

  // scrollHeight 讀一次就要成頁重新計 layout。之前每一下 scroll 事件
  // 都讀（一秒可以幾十次），慢機就係卡喺呢度。改成量度一次、
  // 每 frame 最多寫一次。
  let docHeight = 0;
  function measure() {
    docHeight = document.documentElement.scrollHeight - window.innerHeight;
  }
  measure();
  window.addEventListener('resize', measure);
  if ('ResizeObserver' in window) {
    new ResizeObserver(measure).observe(document.body);
  }

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const progress = docHeight > 0 ? (window.scrollY / docHeight) * 100 : 0;
      bar.style.width = progress + '%';
      ticking = false;
    });
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

/* ----- 品牌跑馬燈：掂到先停低、顯示品牌名，撳第二下先入去 -----

   之前個行為係：logo 一路飄，滑鼠掂到就即刻可以撳入去。問題係
   (1) 只得個 logo，認唔出係邊個牌子先撳落去；
   (2) 手機上面碌版順手掂到就跳咗去第二版，好易撳錯。
   而家掂到會停晒兩行、所有品牌名一齊浮出嚟，睇清楚先撳。
   手機（冇 hover）要撳兩下：第一下停低兼顯示名，第二下先真係入去。 */
function initBrandMarquee() {
  const section = document.querySelector('.brand-marquees');
  if (!section) return;
  const tracks = section.querySelectorAll('.brand-marquee__track');
  if (!tracks.length) return;

  /* 特登唔加品牌名。試過 hover 顯示個名，但每個 logo 本身就係嗰個
     英文名 —— 喺 logo 下面再寫多次「TIRTIR」係同一個字講兩次。 */

  let armed = null;
  function disarm() {
    if (armed) armed.classList.remove('is-armed');
    armed = null;
  }
  function setPaused(on) {
    section.classList.toggle('is-paused', on);
    tracks.forEach((t) => { t.style.animationPlayState = on ? 'paused' : ''; });
  }

  section.querySelectorAll('.brand-marquee').forEach((row) => {
    row.addEventListener('mouseenter', () => setPaused(true));
    row.addEventListener('mouseleave', () => { setPaused(false); disarm(); });
    row.addEventListener('focusin', () => setPaused(true));
    row.addEventListener('focusout', () => setPaused(false));
  });

  const coarse = window.matchMedia && window.matchMedia('(hover: none)').matches;
  if (!coarse) return;

  section.addEventListener('click', (e) => {
    const item = e.target.closest('.brand-marquee__item');
    if (!item) return;
    if (armed === item) { disarm(); return; }   // 第二下：放行，照跳
    e.preventDefault();
    disarm();
    armed = item;
    item.classList.add('is-armed');
    setPaused(true);
  });

  // 撳去第二度就取消，唔好一直停住
  document.addEventListener('click', (e) => {
    if (e.target.closest('.brand-marquee__item')) return;
    if (!armed) return;
    disarm();
    setPaused(false);
  });
}

/* ----- 睇唔到嘅動畫就停 -----
   跑馬燈同背景煙霧片就算碌到十萬八千里之外都照行，慢機成日
   得幾成 CPU 淨，白白畀咗佢哋食。 */
function initOffscreenPause() {
  if (!('IntersectionObserver' in window)) return;

  const targets = [];
  document.querySelectorAll('.brand-marquees').forEach((section) => {
    targets.push({
      el: section,
      on() {
        section.querySelectorAll('.brand-marquee__track').forEach((t) => {
          if (!section.classList.contains('is-paused')) t.style.animationPlayState = '';
        });
        const v = section.querySelector('video');
        if (v && v.paused) v.play().catch(() => {});
      },
      off() {
        section.querySelectorAll('.brand-marquee__track').forEach((t) => {
          t.style.animationPlayState = 'paused';
        });
        const v = section.querySelector('video');
        if (v && !v.paused) v.pause();
      },
    });
  });

  if (!targets.length) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const t = targets.find((x) => x.el === entry.target);
      if (t) (entry.isIntersecting ? t.on : t.off)();
    });
  }, { rootMargin: '120px' });
  targets.forEach((t) => io.observe(t.el));
}

/* ----- 低配電腦：熄咗最食效能嗰批效果 ----- */
function isLiteDevice() {
  const cores = navigator.hardwareConcurrency || 8;
  const mem = navigator.deviceMemory || 8;
  return cores <= 4 || mem <= 4;
}

/* 開頭兩秒實測畫面順唔順。規格數字呃得人（有啲舊機報 8 核但
   整合顯示卡好弱），跌得太交關就即刻轉慳電模式。 */
function watchFrameRate() {
  if (document.documentElement.classList.contains('is-lite')) return;
  if (!window.requestAnimationFrame) return;

  let frames = 0;
  let start = null;
  function tick(now) {
    if (start === null) start = now;
    frames++;
    const elapsed = now - start;
    if (elapsed < 2000) { requestAnimationFrame(tick); return; }
    if (frames / (elapsed / 1000) < 40) {
      document.documentElement.classList.add('is-lite');
    }
  }
  requestAnimationFrame(tick);
}

/* ----- 卡片上面嘅「快速加入」同「通知我補貨」 -----

   兩粒掣都坐喺成張卡嘅 <a> 入面，所以第一件事係攔住個連結，
   否則撳完會跳咗去產品頁，加冇加到都唔知。
   用委派：卡片係即時砌出嚟嘅，逐張掛 listener 會漏咗之後先出現嗰批。 */
function initQuickAdd() {
  document.addEventListener('click', async (e) => {
    const add = e.target.closest('[data-quick-add]');
    if (add) {
      e.preventDefault();
      e.stopPropagation();
      if (add.disabled) return;
      const label = add.textContent;
      add.disabled = true;
      add.textContent = '加緊…';
      try {
        const ok = await addToCart(add.dataset.quickAdd, 1);
        add.textContent = ok ? '加咗入袋 ✓' : '加唔到，再試';
      } catch (err) {
        add.textContent = '加唔到，再試';
      }
      setTimeout(() => { add.textContent = label; add.disabled = false; }, 1800);
      return;
    }

    /* 卡片個心心。以前個 onclick 只係
       `event.preventDefault(); event.stopPropagation();` —— 即係
       攔住咗成張卡條連結，然後乜都唔做。撳落去一世都冇反應，
       同「快速加入」係同一個病。 */
    const wish = e.target.closest('[data-wish]');
    if (wish) {
      e.preventDefault();
      e.stopPropagation();
      if (typeof isInWishlist !== 'function') return;
      const id = wish.dataset.wish;
      if (isInWishlist(id)) {
        removeFromWishlist(id);
      } else {
        addToWishlist({ id, handle: wish.dataset.wishHandle, title: wish.dataset.wishTitle });
      }
      // addToWishlist 未登入會彈登入流程，嗰陣個心心唔應該扮咗做加咗
      wish.classList.toggle('is-active', isInWishlist(id));
      return;
    }

    const ask = e.target.closest('[data-restock]');
    if (ask) {
      e.preventDefault();
      e.stopPropagation();
      if (ask.disabled) return;
      ask.disabled = true;
      const before = ask.textContent;
      ask.textContent = '記低咗…';
      /* 兩條路，行得通邊條就邊條。
         伺服器嗰邊要一個 Shopify 權杖先寫得入 metafield，而嗰個
         設定要老闆自己喺 Vercel 加。未加之前唔可以就咁彈個
         「記唔到」畀客睇 —— 客乜都做唔到，我哋亦都收唔到需求。
         所以寫唔入就開 WhatsApp，訊息預先填好邊件貨，客撳一下send
         就到老闆手。點票冇咗，但個需求傳到，而且即刻用得。 */
      let counted = false;
      try {
        const r = await fetch('/api/restock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ handle: ask.dataset.restock, title: ask.dataset.restockTitle || '' }),
        });
        counted = r.ok;
      } catch (err) { counted = false; }

      if (counted) {
        ask.textContent = '收到，有貨會補返 ✓';
        return;
      }

      const name = ask.dataset.restockTitle || ask.dataset.restock;
      const msg = `你好，我想要呢件貨：${name}\n（${location.origin}/products/${ask.dataset.restock}）\n請問幾時補返貨？`;
      window.open('https://wa.me/85290195092?text=' + encodeURIComponent(msg), '_blank', 'noopener');
      ask.textContent = '幫你開咗 WhatsApp ✓';
      setTimeout(() => { ask.textContent = before; ask.disabled = false; }, 3000);
    }
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

  // Accordion toggles for grouped nav items (護膚, 彩妝) — entire row is the trigger
  nav.querySelectorAll('.mobile-nav__group-row').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const group = btn.closest('.mobile-nav__group');
      if (!group) return;
      const open = group.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  });
}

/* ----- 桌面版「全部產品」摺疊選單 -----
 *
 * 同上面手機抽屜嗰個係同一個行為，特登嘅。之前桌面係一塊五欄嘅淺色
 * 半透明面板 —— 一蓋落產品格上面，後面啲產品相就透上嚟，啲字讀唔到。
 * 而家兩邊都係：一行一個大分類，撳落去先展開。
 *
 * 面板本身仲係靠 CSS 嘅 :hover / :focus-within 開合，呢度淨係管展開。
 */
function initMegaMenu() {
  const mega = document.querySelector('.header__mega');
  if (!mega) return;

  /* 「隱形眼鏡」同「K-pop 周邊」係直接連結，冇下拉。以前連佢哋都當
     成摺疊掣，落咗 preventDefault，結果撳極都唔會去到嗰版。 */
  mega.querySelectorAll('.header__mega-row:not(.header__mega-row--link)').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const group = btn.closest('.header__mega-group');
      if (!group) return;
      /* 一次只開一個。桌面面板有高度上限，兩三個一齊開就要捲，
         而「要捲先揾到嘢」正正係第一版最為人詬病嗰點。 */
      mega.querySelectorAll('.header__mega-group.is-open').forEach((other) => {
        if (other === group) return;
        other.classList.remove('is-open');
        other.querySelector('.header__mega-row')
          ?.setAttribute('aria-expanded', 'false');
      });
      const open = group.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  });

  /* 滑鼠離開成個選單就收返，唔好留住上次撳開嗰個。 */
  const item = mega.closest('.header__nav-item--mega');
  item?.addEventListener('mouseleave', () => {
    mega.querySelectorAll('.header__mega-group.is-open').forEach((g) => {
      g.classList.remove('is-open');
      g.querySelector('.header__mega-row')?.setAttribute('aria-expanded', 'false');
    });
  });
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

/* ----- .rise 進場顯現 -----
 * ⚠️ 呢個 observer 本來淨係喺 preview-promo.html 入面，搬 CSS 落 styles.css
 * 嗰陣冇一齊搬過嚟 —— 結果首頁個優惠 banner 兩嚿嘢永遠 opacity:0，
 * 成格淨係見到片淺藍底（實測 .promo .rise 兩個都停喺 opacity 0）。
 * 冇 IntersectionObserver 或者用戶收咗動畫，就直接顯示，唔可以留喺透明。
 */
function initRiseReveal() {
  const rises = document.querySelectorAll('.rise');
  if (!rises.length) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (reduce.matches || !('IntersectionObserver' in window)) {
    rises.forEach(el => el.classList.add('is-in'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const group = entry.target.parentElement
        ? entry.target.parentElement.querySelectorAll('.rise')
        : [entry.target];
      const idx = Array.prototype.indexOf.call(group, entry.target);
      entry.target.style.transitionDelay = Math.max(0, idx) * 70 + 'ms';
      entry.target.classList.add('is-in');
      io.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
  rises.forEach(el => io.observe(el));
}

/* ----- 芝麻換格動畫 -----
 * 六格連續分解圖疊住，一次顯示一格，260ms 換一格。
 * ⚠️ 唔可以加 transition —— 260ms 一格再淡入會兩格疊住，變鬼影。
 * ⚠️ 一定要「同一動作嘅連續分解」，唔可以攞幾個唔同動作快播。
 * 本來喺 cart.html／index.html 各抄一份 inline script，而家搬入嚟，
 * 全站任何一頁有 .shima 都自動行。
 * 捲出視窗停、背景 tab 停、reduced-motion 唔行。
 */
function initShimaFrames() {
  /* 兩套 class 都要收：.shima/.shima__f 係後來全站共用嗰套，
     .promo__shima/.promo__frame 係首頁 banner 原本嗰套（佢個 CSS
     用緊 .promo__frame 做定位，唔可以就咁改名）。 */
  const groups = [['.shima', '.shima__f'], ['.promo__shima', '.promo__frame']];
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  groups.forEach(([boxSel, frameSel]) => document.querySelectorAll(boxSel).forEach(box => {
    /* 有啲盒係後來先由 JS 砌出嚟（例如護膚頁個 Skin Control Panel），
       下面個 MutationObserver 會再叫一次呢個 function —— 所以要記住
       邊個盒已經接咗線，唔好接兩次（接兩次＝兩個 timer 搶住換格）。 */
    if (box.dataset.shimaOn) return;
    const f = box.querySelectorAll(frameSel);
    if (f.length < 2) return;
    box.dataset.shimaOn = '1';
    let i = 0, timer = null;
    const tick = () => {
      f[i].classList.remove('is-on');
      i = (i + 1) % f.length;
      f[i].classList.add('is-on');
    };
    const start = () => {
      f.forEach(im => { im.loading = 'eager'; });
      if (!timer) timer = setInterval(tick, 260);
    };
    const stop = () => { clearInterval(timer); timer = null; };

    /* ⚠️ 呢度以前用 IntersectionObserver 做「捲出視窗就熄、捲返入就開」。
       剷咗，因為佢帶嚟嘅 bug 遠多過佢慳到嘅嘢：
       ① 喺任何 document.hidden 嘅環境（背景 tab、內嵌 webview、預覽窗）
          IO 一世唔派 callback，隻貓永遠停喺第一格；
       ② 個盒俾 JS 重新 render／搬過位之後，IO 嘅記錄會失效，
          停咗就唔會再開返（實測護膚頁個面板貓卡死喺第 4 格）。
       慳到啲乜？一個 element、260ms 換一個 class。等於零。
       真正值得慳嘅係背景 tab，嗰個 visibilitychange 已經處理。 */
    start();
    document.addEventListener('visibilitychange', () => { document.hidden ? stop() : start(); });
  }));

  /* 動態砌出嚟嘅盒都要接返線。只係喺有新 element 加入嗰陣再掃一次，
     已經接咗線嘅會被上面個 dataset 擋住，唔會重複。 */
  if (!initShimaFrames._watching && 'MutationObserver' in window) {
    initShimaFrames._watching = true;
    let pending = null;
    new MutationObserver(() => {
      clearTimeout(pending);
      pending = setTimeout(initShimaFrames, 200);
    }).observe(document.body, { childList: true, subtree: true });
  }
}

/* ----- 優惠條嘅活數 -----
 * 倒數同「送量有限」本來 inline 喺 index.html，而家每一版產品頁都有條
 * 幼優惠條，所以搬入嚟共用。
 * ⚠️ 倒數係計出嚟，唔准寫死 —— 寫死就會有一日變咗講大話。
 */
function initPromoLive() {
  const end = new Date('2026-09-15T23:59:00+08:00');
  const d = Math.max(0, Math.ceil((end - new Date()) / 86400000));
  document.querySelectorAll('[data-countdown]').forEach((el) => { el.textContent = d; });
  /* 送量有限，但唔講實數 —— 講咗個數就要負責送到嗰個數（人手好易漏）。 */
  document.querySelectorAll('[data-giftleft], [data-giftstock]').forEach((el) => {
    el.textContent = '送量有限';
    el.hidden = false;
  });
}

/* ----- 優惠彈卡 -----
 * 老闆：「可能隔十零二十秒就彈一個 pop up 通知⋯⋯佢可以撳關閉。」
 * 規矩（唔想變成煩人嗰種彈窗）：
 *   · 入嚟 12 秒之後先彈，唔係一入就撲面
 *   · 撳咗關閉／撳咗入去揀貨，**當日唔會再彈**（記喺 localStorage）
 *   · 優惠完咗（2026-09-15）自動唔再出，唔使人手落架
 *   · 購物袋頁唔彈 —— 人哋已經喺度埋單，冇必要再嘈
 *   · prefers-reduced-motion 唔做滑入動畫，直接出
 * 整段 markup 由 JS 生成，唔使 24 版 HTML 各抄一次。
 */
function initPromoPop() {
  const END = new Date('2026-09-15T23:59:00+08:00');
  if (Date.now() > END.getTime()) return;
  if (/\/cart(\.html)?$/.test(location.pathname)) return;

  const KEY = 'ouji:promoPop';
  const today = new Date().toISOString().slice(0, 10);
  try { if (localStorage.getItem(KEY) === today) return; } catch (e) { /* 私隱模式 */ }

  const days = Math.max(0, Math.ceil((END - new Date()) / 86400000));
  const el = document.createElement('aside');
  el.className = 'promo-pop';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', '現正推廣');
  el.innerHTML = `
    <button type="button" class="promo-pop__x" aria-label="關閉">&times;</button>
    <img class="promo-pop__cat" src="assets/images/shima/shima-wink1.webp" alt=""
         width="230" height="219" decoding="async">
    <div class="promo-pop__body">
      <b class="promo-pop__title">全單 88 折</b>
      <ul class="promo-pop__list">
        <li>折實滿 <b>HK$399</b> 免運費</li>
        <li>折實滿 <b>HK$499</b> 送面霜</li>
      </ul>
      <p class="promo-pop__end">9 月 15 日前 · 仲有 <b>${days}</b> 日</p>
      <a class="promo-pop__go" href="shop.html">開始揀貨 →</a>
    </div>`;

  const close = (why) => {
    el.classList.remove('is-in');
    try { localStorage.setItem(KEY, today); } catch (e) { /* 冇得記就算 */ }
    setTimeout(() => el.remove(), 320);
    if (window.trackEvent) window.trackEvent('promo_pop_close', { why });
  };
  el.querySelector('.promo-pop__x').addEventListener('click', () => close('x'));
  el.querySelector('.promo-pop__go').addEventListener('click', () => close('go'));

  setTimeout(() => {
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('is-in'));
  }, 12000);
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

/* ----- Hero Scroll Parallax (shrink + fade on scroll) ----- */
function initHeroScrollParallax() {
  const hero = document.querySelector('.hero');
  if (!hero) return;

  // offsetHeight 一讀就迫瀏覽器重算 layout，唔好逐 frame 讀
  let heroH = hero.offsetHeight || 1;
  window.addEventListener('resize', () => { heroH = hero.offsetHeight || 1; });

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        const scrollY = window.scrollY;
        if (scrollY < heroH * 1.5) {
          const progress = Math.min(scrollY / heroH, 1);
          const scale = 1 - progress * 0.06;
          hero.style.transform = 'scale3d(' + scale + ',' + scale + ',1)';
          hero.style.opacity = 1 - progress * 0.4;
          // 之前仲逐 frame 改 border-radius。transform／opacity 顯示卡
          // 自己搞得掂，圓角一改就要成個 hero 重畫一次，好貴又幾乎睇唔到。
        }
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
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

/* ----- Mobile bottom nav: the shop sheet -----
   The middle tab used to go to category.html, a full page of nested
   subcategories — three taps deep before you saw a product. It opens a
   sheet instead.

   The sheet listed 全部 / 彩妝 / 護膚 and stopped there, which was the
   whole catalogue when it was written. Lenses and K-pop went up and were
   reachable from the bottom bar by nobody: the one control a phone user
   presses to browse did not know two of the four things the shop sells. */
const SHOP_SHEET = [
  { href: 'shop.html', label: '全部產品', note: '成個目錄', all: true },
  { href: 'makeup.html', label: '彩妝', note: '底妝 · 眼妝 · 唇妝' },
  { href: 'category.html', label: '護膚', note: '潔面 · 精華 · 面霜 · 防曬' },
  { href: 'lens.html', label: '隱形眼鏡', note: '日拋 · 全度數' },
  { href: 'kpop.html', label: 'K-pop 周邊', note: '專輯 · 寫真書' },
  // 細類別都要有位企 —— 唔喺呢度出現，手機用戶就淨係喺 footer 搵到。
  { href: 'bodycare.html', label: '身體護理', note: '沐浴 · 護手 · 頭皮' },
  { href: 'fragrance.html', label: '香氛', note: '香水' },
  { href: 'lifestyle.html', label: '生活風格', note: '美容工具 · 配件' },
];

function initShopSheet() {
  const btn = document.querySelector('[data-shop-menu]');
  if (!btn) return;

  const sheet = document.createElement('div');
  sheet.className = 'shop-sheet';
  sheet.innerHTML = `
    <div class="shop-sheet__panel" role="menu" aria-label="選購">
      <span class="shop-sheet__grip" aria-hidden="true"></span>
      ${SHOP_SHEET.map((i) => `
        <a class="shop-sheet__item${i.all ? ' shop-sheet__item--all' : ''}"
           role="menuitem" href="${i.href}">
          <span class="shop-sheet__label">${i.label}</span>
          <span class="shop-sheet__note">${i.note}</span>
          <svg class="shop-sheet__chev" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>
        </a>`).join('')}
    </div>`;
  document.body.appendChild(sheet);

  const close = () => {
    sheet.classList.remove('is-open');
    btn.setAttribute('aria-expanded', 'false');
  };
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    const open = sheet.classList.toggle('is-open');
    btn.setAttribute('aria-expanded', String(open));
  });
  // A tap on the backdrop closes it; one on the panel is a menu choice.
  sheet.addEventListener('click', (e) => {
    if (!e.target.closest('.shop-sheet__panel')) close();
  });
  document.addEventListener('keydown', (e) => e.key === 'Escape' && close());
}

document.addEventListener('DOMContentLoaded', initShopSheet);

/* 橫向捲軸嘅左右箭嘴。
   本來喺 .cat-cards 加咗條睇得見嘅滾動條，老闆話唔好睇 —— 一條灰槓
   成日擺喺度。改成一對細箭嘴：平時透明，滑鼠掂到成個區先浮出嚟，
   掃到盡頭嗰邊自動收埋。手機唔出，手指本身就掃得。

   注意：分類卡同首頁產品行係 JS 砌出嚟嘅，所以要等佢哋出咗先包得到。
   用 MutationObserver 睇住，唔使估幾時砌完。 */
function initHScrollArrows() {
  const SELECTORS = '.cat-cards, .home-rail__track, .brand-strip, .new-brands';
  const ICON = (dir) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
      stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${
      dir === 'prev' ? 'M15 18l-6-6 6-6' : 'M9 18l6-6-6-6'}"/></svg>`;

  function wrap(track) {
    if (track.dataset.hscroll) return;
    track.dataset.hscroll = '1';

    const shell = document.createElement('div');
    shell.className = 'h-scroll';
    // 深色底嘅行（品牌牆）要白箭嘴，否則白掣壓喺深藍上面好突兀
    if (track.closest('.brand-marquees, .dark-section')) shell.classList.add('h-scroll--dark');
    track.parentNode.insertBefore(shell, track);
    shell.appendChild(track);

    const mk = (dir) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `h-scroll__arrow h-scroll__arrow--${dir}`;
      b.setAttribute('aria-label', dir === 'prev' ? '睇返左邊' : '睇多啲');
      b.innerHTML = ICON(dir);
      b.addEventListener('click', (e) => {
        e.preventDefault();
        // 掃八成闊度，留少少重疊位畀客對得返上文下理
        const step = Math.max(160, track.clientWidth * 0.8);
        track.scrollBy({ left: dir === 'prev' ? -step : step, behavior: 'smooth' });
      });
      shell.appendChild(b);
      return b;
    };
    const prev = mk('prev');
    const next = mk('next');

    const sync = () => {
      const max = track.scrollWidth - track.clientWidth;
      // 冇嘢好掃就兩邊都收埋，唔好畀個掣客撳完乜都唔郁
      const none = max <= 4;
      prev.hidden = none || track.scrollLeft <= 2;
      next.hidden = none || track.scrollLeft >= max - 2;

      /* 兩個掣要企喺「第一／最後一張卡」嗰條線上面，唔係企喺螢幕邊。
         外殼係成行闊，但入面條 track 喺闊螢幕度有 max-width ＋ 48px
         padding，兩者可以差成三百幾 px —— 之前 right:4px 就係咁樣
         飄咗去右邊好遠嘅位。呢度度返 track 內容區相對外殼嘅邊界，
         寫入 CSS 變數，等 CSS 唔使猜邊條 rail 用緊咩闊度。 */
      const t = track.getBoundingClientRect();
      const s = shell.getBoundingClientRect();
      /* 貼嘅係條 rail 嘅「可視邊界」，唔係「內容邊界」。
         試過減埋 padding，結果一掃就穿崩 —— padding 唔會遮住內容，
         啲卡會滑入 padding 區照樣睇到，淡出帶就變咗浮喺行中間，
         右手邊仲露出成張卡。貼可視邊界先遮得到滑出嚟嗰啲。 */
      shell.style.setProperty('--hs-inset-start', Math.round(t.left - s.left) + 'px');
      shell.style.setProperty('--hs-inset-end', Math.round(s.right - t.right) + 'px');

      /* 垂直方向對齊「張相」嘅中心，唔係成行嘅中心。
         產品卡係相 ＋ 品牌 ＋ 名 ＋ 星 ＋ 價錢，文字佔咗成半高度；
         用 top:50% 個掣就會沉咗落去卡嘅文字度，睇落唔知佢對緊咩。 */
      const card = track.firstElementChild;
      const media = card && (card.querySelector('img') || card.firstElementChild);
      if (media) {
        const m = media.getBoundingClientRect();
        if (m.height > 8) {
          shell.style.setProperty('--hs-mid', Math.round(m.top - s.top + m.height / 2) + 'px');
          /* 淡出條同張相一樣高 —— 咁睇落係「相片邊緣散開」，
             唔係一嚿嘢浮咗喺卡上面 */
          shell.style.setProperty('--hs-media-h', Math.round(m.height) + 'px');
        }
      }
    };
    sync();
    track._hsSync = sync;
    track.addEventListener('scroll', () => {
      if (track._hsTick) return;
      track._hsTick = true;
      requestAnimationFrame(() => { track._hsTick = false; sync(); });
    }, { passive: true });
    window.addEventListener('resize', sync);
    if ('ResizeObserver' in window) new ResizeObserver(sync).observe(track);
  }

  /* 包完之後仲要再算一次。啲卡係 fetch 返嚟先塞入去，包嗰陣條行仲係空
     —— 果陣 scrollWidth 等於 clientWidth，兩邊箭嘴都會收埋，之後就冇嘢
     再叫佢重算（ResizeObserver 睇條行本身，入面加仔女佢唔會响）。 */
  const scan = () => {
    document.querySelectorAll(SELECTORS).forEach(wrap);
    document.querySelectorAll(SELECTORS).forEach((t) => t._hsSync && t._hsSync());
  };
  scan();
  // 啲行係 fetch 返嚟先砌，所以要一路望住
  new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
}

/* ============================================================
   頂部公告條 + header：實際高度度返出嚟
   ------------------------------------------------------------
   本來 CSS 寫死「條 bar 高 36px」，但條 bar 嘅字係中文、長度會變，
   窄機一摺行就變 62px；同時 .header render 出嚟係 64px 而唔係
   --header-height 個 56px。兩重誤差夾埋，內容被個 header 遮咗 34px。

   所以呢度做兩件事：
   1. 度返兩件嘢嘅真高度，寫入 --ann-h / --hdr-h，畀 CSS 用。
   2. 條 bar 嘅字擺唔落一行就改成輪流出，等佢永遠得一行。
   ============================================================ */
(() => {
  const bar = document.querySelector('.announcement-bar');
  const header = document.querySelector('.header');
  const root = document.documentElement;
  if (!bar && !header) return;

  const publish = () => {
    if (bar) root.style.setProperty('--ann-h', `${Math.round(bar.getBoundingClientRect().height)}px`);
    if (header) root.style.setProperty('--hdr-h', `${Math.round(header.getBoundingClientRect().height)}px`);
  };
  publish();
  if ('ResizeObserver' in window) {
    const ro = new ResizeObserver(publish);
    if (bar) ro.observe(bar);
    if (header) ro.observe(header);
  }
  window.addEventListener('resize', publish);
  /* web font 落到之後行高會變，度多次 */
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(publish);

  if (!bar) return;

  /* 原文係「A &nbsp;·&nbsp; B &nbsp;·&nbsp; C」，24 版 HTML 都一樣。
     唔改 HTML —— 喺呢度拆，改咗 markup 就要改 24 個檔。 */
  const full = bar.textContent.replace(/\s+/g, ' ').trim();
  const offers = full.split('·').map((t) => t.trim()).filter(Boolean);
  if (!offers.length) return;

  /* 窄機版：最少嘅字，但三個優惠都要齊。
     老闆：「咁有限嘅位置入邊⋯⋯用最少嘅字去表達。」
     之前窄機淨係得輪流播，客一次只見到一個優惠，好易走寶。 */
  const SHORT = ['88 折', '$399 免運', '$499 送面霜'];

  bar.textContent = '';
  const make = (text) => {
    const el = document.createElement('span');
    el.className = 'announcement-bar__offer';
    el.textContent = text;
    bar.appendChild(el);
    return el;
  };

  let nodes = [];
  let timer = null;
  let mode = null;          // 'all' = 一行出晒；'rotate' = 輪流

  const stop = () => { clearInterval(timer); timer = null; };

  let shown = null;
  const build = (next, list) => {
    if (next === mode && list === shown) return;
    stop();
    mode = next; shown = list;
    bar.textContent = '';
    nodes = next === 'all' ? [make(list.join('  ·  '))] : list.map(make);
    nodes[0].classList.add('is-on');
    if (next === 'rotate' && list.length > 1) start();
  };

  const start = () => {
    let i = 0;
    stop();
    timer = setInterval(() => {
      if (document.hidden) return;              // 睇唔到就唔好轉，慳電
      nodes[i].classList.remove('is-on');
      i = (i + 1) % nodes.length;
      nodes[i].classList.add('is-on');
    }, 4200);
  };

  /* 用一個離屏量度器問「三句夾埋擺唔擺得落一行」。
     唔可以問 nodes[0].scrollWidth —— 佢 white-space:nowrap，永遠等於內容闊度。
     擺喺 body 唔擺喺 bar 入面：build() 會清空條 bar，擺入去會連佢一齊清走。 */
  const ruler = document.createElement('span');
  ruler.setAttribute('aria-hidden', 'true');
  ruler.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;pointer-events:none;left:-9999px;top:0';
  document.body.appendChild(ruler);

  const decide = () => {
    const cs = getComputedStyle(bar);
    ruler.style.fontFamily = cs.fontFamily;
    ruler.style.fontSize = cs.fontSize;
    ruler.style.fontWeight = cs.fontWeight;
    ruler.style.letterSpacing = cs.letterSpacing;
    const room = bar.clientWidth - 32;          // 兩邊各留 16px
    const fits = (list) => {
      ruler.textContent = list.join('  ·  ');
      return ruler.getBoundingClientRect().width <= room;
    };
    /* 三級：講足 → 短寫（三個都齊）→ 真係擺唔落先輪流播 */
    if (fits(offers)) build('all', offers);
    else if (fits(SHORT)) build('all', SHORT);
    else build('rotate', offers);
    publish();
  };

  decide();
  let t;
  window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(decide, 150); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else if (mode === 'rotate' && offers.length > 1) start();
  });
})();
