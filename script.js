/* ============================================
   OUJI — Enhanced JavaScript v4.0
   Rich Animations, Parallax, Interactions
   ============================================ */

/* 全部 .reveal* 元素喺 CSS 度係 opacity:0，等 JS 加 .is-visible 先現形。
   所以**任何一個 init 拋錯，成版就會白晒** —— 客見到嘅就係一版白紙。
   （2026-08-30 老闆報：有時 load 唔到個網站，客都反映過。）

   兩重保險：
   1. 安全網喺**最頂**就 setTimeout 排咗隊，唔會因為下面拋錯而登記唔到。
   2. 每個 init 各自包 try/catch，一個死唔會拖冧其他。 */
function oujiRevealAll() {
  document.querySelectorAll('.rise:not(.is-in)').forEach(function (el) { el.classList.add('is-in'); });
  document.querySelectorAll('.reveal:not(.is-visible), .reveal-blur:not(.is-visible), .reveal-stagger:not(.is-visible), .reveal-scale:not(.is-visible), .reveal-left:not(.is-visible), .reveal-right:not(.is-visible), .reveal-clip:not(.is-visible), .reveal-clip--right:not(.is-visible), .reveal-clip--up:not(.is-visible), .section-float:not(.is-visible), .section-divider:not(.is-visible), .split-text:not(.is-visible), .word-reveal:not(.is-visible), .mood-board:not(.is-visible)').forEach(function (el) {
    el.classList.add('is-visible');
  });
}
// 唔等 DOMContentLoaded —— 越早排隊越安全
setTimeout(oujiRevealAll, 2500);
window.addEventListener('error', function () { oujiRevealAll(); });

/* ----- 白畫面看門狗 ＋ 報返嚟 -----
 *
 * 已經修好三個成因（Google Fonts 阻住 render、listener 越疊越多、
 * 一次過畫千三張卡爆記憶體），但老闆話仲有。我哋自己撞唔到 ——
 * 伺服器每次都 200、半秒內回，出事係喺客部機。所以：
 *
 *   1. 六秒之後量一次「畫面中間有冇嘢」。真係吉就先試自救
 *      （oujiRevealAll），同時報返一行去 /api/jserr。
 *   2. 再等三秒仲係吉，就重載一次。**一個 session 淨係做一次**，
 *      唔會變成無限重載 —— 寧願客見到一次閃，好過對住一版白紙。
 *
 * 睇報告：`vercel logs --since 1d | grep OUJI-JSERR`
 */
(function () {
  var sent = 0;
  function report(kind, msg) {
    if (sent >= 3) return;          // 一版最多報三次，唔好當 log 倉用
    sent += 1;
    var main = document.querySelector('main');
    var mid = null;
    try { mid = document.elementFromPoint(innerWidth / 2, innerHeight * 0.6); } catch (e) { /* 冇得量就當唔知 */ }
    var payload = {
      kind: kind,
      page: location.pathname + location.search,
      msg: String(msg || '').slice(0, 300),
      at: mid ? (mid.tagName + '.' + (mid.className || '').toString().slice(0, 60)) : '',
      blank: looksBlank(),
      mainH: main ? Math.round(main.getBoundingClientRect().height) : 0,
      fonts: (document.fonts && document.fonts.status) || '',
      ready: document.readyState,
    };
    try {
      var body = JSON.stringify(payload);
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/jserr', new Blob([body], { type: 'application/json' }));
      } else {
        fetch('/api/jserr', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body, keepalive: true });
      }
    } catch (e) { /* 報唔到就算，唔好因為報錯而再拋多個錯 */ }
  }

  /* 「吉」＝畫面中下方嗰點乜都撞唔到（淨係 html／body），
     而且 <main> 幾乎冇高度。兩個條件都要中先算，唔好誤判一版
     本身就短嘅頁（例如空購物袋）。 */
  function looksBlank() {
    var main = document.querySelector('main');
    var h = main ? main.getBoundingClientRect().height : 0;
    if (h > 200) return false;
    var el = null;
    try { el = document.elementFromPoint(innerWidth / 2, innerHeight * 0.6); } catch (e) { return false; }
    if (!el) return true;
    return el.tagName === 'HTML' || el.tagName === 'BODY';
  }

  /* 淨係一句錯誤訊息唔夠用。實測收到一條 iPhone 報「The string did not
     match the expected pattern.」—— Safari 十幾個 API 都會出呢句，冇
     stack 就估唔到係邊句碼。所以連 stack 頭兩行同檔案行號一齊報。 */
  function where(err, e) {
    var bits = [];
    if (err && err.stack) {
      bits.push(String(err.stack).split('\n').slice(0, 3).join(' | '));
    }
    if (e && e.filename) bits.push(e.filename + ':' + e.lineno + ':' + e.colno);
    return bits.join(' @ ').slice(0, 400);
  }
  window.addEventListener('error', function (e) {
    var err = e && e.error;
    report('error', ((e && e.message) || (err && err.message) || 'error')
      + ' ‖ ' + where(err, e));
  });
  window.addEventListener('unhandledrejection', function (e) {
    var r = e && e.reason;
    report('reject', ((r && r.message) || String(r) || 'rejection')
      + ' ‖ ' + where(r, null));
  });

  setTimeout(function () {
    if (!looksBlank()) return;
    oujiRevealAll();                 // 先自救
    report('blank-6s', '六秒之後畫面仲係吉');
    setTimeout(function () {
      if (!looksBlank()) return;
      try {
        if (sessionStorage.getItem('ouji-blank-reload')) return;   // 一個 session 只重載一次
        sessionStorage.setItem('ouji-blank-reload', '1');
      } catch (e) { return; }        // 無痕模式讀唔到就唔重載，好過亂重載
      report('blank-reload', '九秒仲係吉，重載一次');
      location.reload();
    }, 3000);
  }, 6000);
})();

function oujiSafe(fn, name) {
  try { fn(); } catch (e) {
    if (window.console) console.error('[OUJI] ' + name + ' 出錯，跳過：', e);
    oujiRevealAll();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const lite = isLiteDevice();
  if (lite) document.documentElement.classList.add('is-lite');

  // Entrance reveals (CSS makes these instant under reduced-motion) + essential UI
  oujiSafe(initScrollReveal, 'initScrollReveal');
  oujiSafe(initBlurReveal, 'initBlurReveal');
  oujiSafe(initStaggerReveal, 'initStaggerReveal');
  oujiSafe(initScaleReveal, 'initScaleReveal');
  oujiSafe(initSplitText, 'initSplitText');
  oujiSafe(initWordReveal, 'initWordReveal');
  oujiSafe(initDirectionReveals, 'initDirectionReveals');
  oujiSafe(initSectionFloat, 'initSectionFloat');
  oujiSafe(initMoodBoardReveal, 'initMoodBoardReveal');
  oujiSafe(initLookbookInView, 'initLookbookInView');
  oujiSafe(initRiseReveal, 'initRiseReveal');
  oujiSafe(initShimaFrames, 'initShimaFrames');
  oujiSafe(initPromoLive, 'initPromoLive');
  oujiSafe(initPromoPop, 'initPromoPop');
  oujiSafe(initDividerReveal, 'initDividerReveal');
  /* 先砌底欄，initMobileNav 先搵得到移到底部嗰粒選購掣。 */
  oujiSafe(initMobileBottomNav, 'initMobileBottomNav');
  oujiSafe(initMobileNav, 'initMobileNav');
  oujiSafe(initMegaMenu, 'initMegaMenu');
  oujiSafe(initHeaderScroll, 'initHeaderScroll');
  oujiSafe(initFilterSidebar, 'initFilterSidebar');
  oujiSafe(initProductTabs, 'initProductTabs');
  oujiSafe(initQuantityControls, 'initQuantityControls');
  oujiSafe(initVariantSelectors, 'initVariantSelectors');
  oujiSafe(initCartActions, 'initCartActions');
  oujiSafe(initQuickAdd, 'initQuickAdd');
  oujiSafe(initSmoothImages, 'initSmoothImages');
  oujiSafe(initScrollProgress, 'initScrollProgress');
  oujiSafe(initRippleButtons, 'initRippleButtons');
  oujiSafe(initMarqueeHoverPause, 'initMarqueeHoverPause');
  oujiSafe(initBrandMarquee, 'initBrandMarquee');
  oujiSafe(initOffscreenPause, 'initOffscreenPause');
  oujiSafe(initHScrollDrag, 'initHScrollDrag');
  oujiSafe(initHScrollArrows, 'initHScrollArrows');
  oujiSafe(watchFrameRate, 'watchFrameRate');

  if (reduceMotion) {
    // Show final counter values immediately, skip the count-up animation
    document.querySelectorAll('[data-count]').forEach((el) => {
      const t = parseInt(el.dataset.count);
      if (!isNaN(t)) {
        el.textContent = (el.dataset.prefix || '') + t.toLocaleString() + (el.dataset.suffix || '');
      }
    });
  } else {
    oujiSafe(initCountUp, 'initCountUp');
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
  setTimeout(oujiRevealAll, 2000);
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

/* ----- Mobile bottom navigation -----
 *
 * 手機版唔再有「首頁」：頂部 OUJI logo 已經係返首頁。搜尋亦保留喺頂部。
 * 底欄只留五種真正唔同嘅意圖：
 *   選購 / 發現 / 幫我揀 / 購物袋 / 我的
 *
 * 53 個靜態頁本來各自複製一份舊底欄。喺共用 script 度統一砌，避免之後
 * 改一粒字要逐頁追；舊 markup 仍然係無 JS 時嘅 fallback。 */
function initMobileBottomNav() {
  const bar = document.querySelector('.mobile-bottom-nav');
  if (!bar) return;

  /* Keep the exact Phosphor swatches + round crystal composition selected by
     the user. Three clipped copies preserve the original glyph while giving
     each card its own muted Morandi colour; the crystal is a plain circle —
     never a check mark. */
  if (!document.querySelector('link[data-ouji-phosphor]')) {
    const phosphorStyles = document.createElement('link');
    phosphorStyles.rel = 'stylesheet';
    phosphorStyles.href = 'https://cdn.jsdelivr.net/npm/@phosphor-icons/web@2.1.2/src/duotone/style.css';
    phosphorStyles.dataset.oujiPhosphor = '';
    document.head.appendChild(phosphorStyles);
  }
  if (!document.querySelector('link[data-ouji-phosphor-fill]')) {
    const phosphorFillStyles = document.createElement('link');
    phosphorFillStyles.rel = 'stylesheet';
    phosphorFillStyles.href = 'https://cdn.jsdelivr.net/npm/@phosphor-icons/web@2.1.2/src/fill/style.css';
    phosphorFillStyles.dataset.oujiPhosphorFill = '';
    document.head.appendChild(phosphorFillStyles);
  }

  const icon = {
    catalogue: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true">
      <circle cx="3" cy="6" r=".95" fill="currentColor" stroke="none"/><path d="M6 6h15.5"/>
      <circle cx="3" cy="12" r=".95" fill="currentColor" stroke="none"/><path d="M6 12h15.5"/>
      <circle cx="3" cy="18" r=".95" fill="currentColor" stroke="none"/><path d="M6 18h15.5"/>
    </svg>`,
    discover: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9.5"/><path d="m16 8-2.35 5.65L8 16l2.35-5.65z"/></svg>`,
    assist: `<span class="ouji-shade-match-mark" aria-hidden="true">
      <span class="ouji-shade-match-mark__cards">
        <i class="ph-fill ph-swatches ouji-shade-match-mark__card ouji-shade-match-mark__card--mauve"></i>
        <i class="ph-fill ph-swatches ouji-shade-match-mark__card ouji-shade-match-mark__card--blue"></i>
        <i class="ph-fill ph-swatches ouji-shade-match-mark__card ouji-shade-match-mark__card--taupe"></i>
        <i class="ph-duotone ph-swatches ouji-shade-match-mark__outline"></i>
      </span>
      <span class="ouji-shade-match-mark__crystal">
        <i class="ph-fill ph-circle ouji-shade-match-mark__crystal-fill"></i>
        <i class="ph-duotone ph-circle ouji-shade-match-mark__crystal-ring"></i>
      </span>
    </span>`,
    bag: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>`,
  };

  bar.setAttribute('aria-label', '主要導覽');
  bar.innerHTML = `
    <button type="button" class="mobile-bottom-nav__item mobile-bottom-nav__menu-btn" aria-label="選購產品" aria-haspopup="true" aria-expanded="false">
      ${icon.catalogue}<span>選購</span>
    </button>
    <button type="button" class="mobile-bottom-nav__item mobile-bottom-nav__discover-btn" aria-label="發現新品、得獎產品同美妝專欄" aria-haspopup="dialog" aria-expanded="false">
      ${icon.discover}<span>發現</span>
    </button>
    <button type="button" class="mobile-bottom-nav__item mobile-bottom-nav__item--assist" aria-label="幫我揀：妝感同護膚配對" aria-haspopup="dialog" aria-expanded="false">
      <span class="mobile-bottom-nav__assist-icon">${icon.assist}</span><span>幫我揀</span>
    </button>
    <a href="/cart.html" class="mobile-bottom-nav__item" aria-label="購物袋">
      <span class="mobile-bottom-nav__icon-wrap">${icon.bag}<span class="mobile-bottom-nav__badge" style="display:none;">0</span></span>
      <span>購物袋</span>
    </a>
    <a href="/account.html" class="mobile-bottom-nav__item mobile-bottom-nav__item--me" aria-label="我的：心願清單、訂單同會員資料">
      <img class="mobile-bottom-nav__face" src="/assets/images/shima/shima-face.webp" alt="" width="128" height="128" loading="lazy" decoding="async">
      <span>我的</span>
    </a>`;

  /* 現在所在頁：首頁冇 tab，因為 logo 先係首頁入口。 */
  const path = location.pathname.toLowerCase();
  const mark = (selector) => {
    const item = bar.querySelector(selector);
    if (!item) return;
    item.classList.add('active');
    item.dataset.current = 'true';
    if (item.tagName === 'A') item.setAttribute('aria-current', 'page');
  };
  if (/\/(match)\.html$/.test(path)
      || (/\/(category)\.html$/.test(path) && location.hash === '#skincare-match')) {
    mark('.mobile-bottom-nav__item--assist');
  }
  else if (/\/(cart)\.html$/.test(path)) mark('[href="/cart.html"]');
  else if (/\/(account|wishlist)\.html$/.test(path)) mark('.mobile-bottom-nav__item--me');
  else if (/\/articles\/|\/(awards|column)\.html$/.test(path)) mark('.mobile-bottom-nav__discover-btn');
  else if (/\/(shop|category|makeup|lens|kpop|bath|health|seasonal|tools|fragrance|brands|product)\.html$/.test(path)) mark('.mobile-bottom-nav__menu-btn');

  prepareMobileShopNav();
  initDiscoverSheet(bar.querySelector('.mobile-bottom-nav__discover-btn'));
  initAssistSheet(bar.querySelector('.mobile-bottom-nav__item--assist'));
}

/* 「選購」沿用原本深藍玻璃 drawer，但內容只做產品目錄。
   發現、AI、我的已有自己底欄入口，唔再塞埋入同一張選單。 */
function prepareMobileShopNav() {
  const nav = document.querySelector('.mobile-nav');
  const links = nav?.querySelector('.mobile-nav__links');
  if (!nav || !links) return;
  nav.setAttribute('aria-label', '選購產品');
  nav.setAttribute('aria-hidden', 'true');

  Array.from(links.children).forEach((child) => {
    if (child.tagName !== 'A') return;
    const href = (child.getAttribute('href') || '').toLowerCase();
    if (/(awards|match|column|account)\.html(?:$|[?#])/.test(href)) child.remove();
  });

  if (!links.querySelector('.mobile-nav__all-products')) {
    const all = document.createElement('a');
    all.className = 'mobile-nav__all-products';
    all.href = '/shop.html';
    all.innerHTML = `<span><strong>睇全部產品</strong><small>瀏覽 OUJI 所有現貨</small></span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>`;
    links.prepend(all);
  }
}

function initDiscoverSheet(btn) {
  if (!btn) return;
  const old = document.querySelector('.discover-sheet');
  if (old) old.remove();

  const sheet = document.createElement('div');
  sheet.className = 'discover-sheet';
  sheet.innerHTML = `
    <section class="discover-sheet__panel" role="dialog" aria-labelledby="discover-title">
      <span class="discover-sheet__grip" aria-hidden="true"></span>
      <header class="discover-sheet__head">
        <div><p>OUJI EDIT</p><h2 id="discover-title">發現值得帶走嘅</h2></div>
        <button type="button" class="discover-sheet__close" aria-label="關閉發現選單"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
      </header>
      <div class="discover-sheet__cards">
        <a class="discover-card discover-card--new" href="/shop.html?sort=new">
          <span class="discover-card__no">01</span><span><strong>新品上架</strong><small>最近到店嘅韓妝同護膚</small></span><b aria-hidden="true">↗</b>
        </a>
        <a class="discover-card discover-card--award" href="/awards.html">
          <span class="discover-card__no">02</span><span><strong>獲獎產品</strong><small>由韓國美妝大獎開始揀</small></span><b aria-hidden="true">↗</b>
        </a>
        <a class="discover-card discover-card--column" href="/column.html">
          <span class="discover-card__no">03</span><span><strong>美妝專欄</strong><small>成分、用法同選購指南</small></span><b aria-hidden="true">↗</b>
        </a>
      </div>
    </section>`;
  document.body.appendChild(sheet);

  const closeBtn = sheet.querySelector('.discover-sheet__close');
  let returnFocus = null;
  const close = () => {
    sheet.classList.remove('is-open');
    if (btn.dataset.current !== 'true') btn.classList.remove('active');
    btn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    returnFocus?.focus({ preventScroll: true });
  };
  const open = () => {
    document.querySelector('.mobile-nav')?.classList.remove('is-open');
    document.querySelector('.mobile-nav-overlay')?.classList.remove('is-visible');
    document.querySelector('.mobile-bottom-nav__menu-btn')?.setAttribute('aria-expanded', 'false');
    document.querySelector('.assist-sheet')?.classList.remove('is-open');
    const assistBtn = document.querySelector('.mobile-bottom-nav__item--assist');
    assistBtn?.setAttribute('aria-expanded', 'false');
    if (assistBtn?.dataset.current !== 'true') assistBtn?.classList.remove('active');
    returnFocus = document.activeElement;
    sheet.classList.add('is-open');
    btn.classList.add('active');
    btn.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    closeBtn?.focus({ preventScroll: true });
  };
  btn.addEventListener('click', () => sheet.classList.contains('is-open') ? close() : open());
  closeBtn?.addEventListener('click', close);
  sheet.addEventListener('click', (e) => { if (!e.target.closest('.discover-sheet__panel')) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && sheet.classList.contains('is-open')) close(); });
}

function initAssistSheet(btn) {
  if (!btn) return;
  document.querySelector('.assist-sheet')?.remove();

  const sheet = document.createElement('div');
  sheet.className = 'assist-sheet';
  sheet.innerHTML = `
    <section class="assist-sheet__panel" role="dialog" aria-labelledby="assist-title">
      <span class="assist-sheet__grip" aria-hidden="true"></span>
      <header class="assist-sheet__head">
        <div><p>OUJI 幫你揀</p><h2 id="assist-title">你想由邊度開始？</h2></div>
        <button type="button" class="assist-sheet__close" aria-label="關閉幫我揀"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
      </header>
      <div class="assist-sheet__choices">
        <a class="assist-choice assist-choice--makeup" href="/match.html">
          <span class="assist-choice__media" aria-hidden="true"><img src="/assets/looks/celeb-wonyoung.webp" alt="" decoding="async"></span>
          <span class="assist-choice__glint assist-choice__glint--one" aria-hidden="true">✦</span>
          <span class="assist-choice__glint assist-choice__glint--two" aria-hidden="true">✦</span>
          <span class="assist-choice__content">
            <span class="assist-choice__eyebrow">明星妝感配對</span>
            <strong>想化到相中嗰種<br>明星妝感？</strong>
            <small>揀一張相，我哋按你嘅膚色同膚質配返現貨色號。</small>
            <span class="assist-choice__cta">開始配對 <b aria-hidden="true">→</b></span>
          </span>
        </a>
        <a class="assist-choice assist-choice--skin" href="/category.html#skincare-match">
          <span class="assist-choice__bubble assist-choice__bubble--one" aria-hidden="true"></span>
          <span class="assist-choice__bubble assist-choice__bubble--two" aria-hidden="true"></span>
          <span class="assist-choice__media" aria-hidden="true"><img src="/assets/images/shima/shima-skincare.webp" alt="" decoding="async"></span>
          <span class="assist-choice__content">
            <span class="assist-choice__eyebrow">芝麻護膚配方</span>
            <strong>唔知塊面而家<br>最需要啲乜？</strong>
            <small>話我哋知膚質同煩惱，芝麻幫你砌一套日常流程。</small>
            <span class="assist-choice__cta">開始配方 <b aria-hidden="true">→</b></span>
          </span>
        </a>
      </div>
      <p class="assist-sheet__fine">兩個工具都只會由 OUJI 現貨入面幫你收窄選擇。</p>
    </section>`;
  document.body.appendChild(sheet);

  const closeBtn = sheet.querySelector('.assist-sheet__close');
  let returnFocus = null;
  const close = () => {
    sheet.classList.remove('is-open');
    if (btn.dataset.current !== 'true') btn.classList.remove('active');
    btn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    returnFocus?.focus({ preventScroll: true });
  };
  const open = () => {
    document.querySelector('.mobile-nav')?.classList.remove('is-open');
    document.querySelector('.mobile-nav-overlay')?.classList.remove('is-visible');
    document.querySelector('.mobile-bottom-nav__menu-btn')?.setAttribute('aria-expanded', 'false');
    document.querySelector('.discover-sheet')?.classList.remove('is-open');
    const discoverBtn = document.querySelector('.mobile-bottom-nav__discover-btn');
    discoverBtn?.setAttribute('aria-expanded', 'false');
    if (discoverBtn?.dataset.current !== 'true') discoverBtn?.classList.remove('active');
    returnFocus = document.activeElement;
    sheet.classList.add('is-open');
    btn.classList.add('active');
    btn.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    closeBtn?.focus({ preventScroll: true });
  };
  btn.addEventListener('click', () => sheet.classList.contains('is-open') ? close() : open());
  closeBtn?.addEventListener('click', close);
  sheet.addEventListener('click', (e) => { if (!e.target.closest('.assist-sheet__panel')) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && sheet.classList.contains('is-open')) close(); });
}

/* ----- Mobile Navigation ----- */
function initMobileNav() {
  const toggle = document.querySelector('.header__menu-toggle');
  const nav = document.querySelector('.mobile-nav');
  const overlay = document.querySelector('.mobile-nav-overlay');
  const close = document.querySelector('.mobile-nav__close');
  if (!nav) return;
  const bottomMenuBtn = document.querySelector('.mobile-bottom-nav__menu-btn');

  function openNav() {
    document.querySelector('.discover-sheet')?.classList.remove('is-open');
    document.querySelector('.mobile-bottom-nav__discover-btn')?.classList.remove('active');
    document.querySelector('.mobile-bottom-nav__discover-btn')?.setAttribute('aria-expanded', 'false');
    document.querySelector('.assist-sheet')?.classList.remove('is-open');
    const assistBtn = document.querySelector('.mobile-bottom-nav__item--assist');
    if (assistBtn?.dataset.current !== 'true') assistBtn?.classList.remove('active');
    assistBtn?.setAttribute('aria-expanded', 'false');
    nav.classList.add('is-open');
    nav.setAttribute('aria-hidden', 'false');
    overlay?.classList.add('is-visible');
    bottomMenuBtn?.classList.add('active');
    bottomMenuBtn?.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }
  function closeNav() {
    nav.classList.remove('is-open');
    nav.setAttribute('aria-hidden', 'true');
    overlay?.classList.remove('is-visible');
    if (bottomMenuBtn?.dataset.current !== 'true') bottomMenuBtn?.classList.remove('active');
    bottomMenuBtn?.setAttribute('aria-expanded', 'false');
    const discoverBtn = document.querySelector('.mobile-bottom-nav__discover-btn');
    if (discoverBtn?.dataset.current === 'true') discoverBtn.classList.add('active');
    const assistBtn = document.querySelector('.mobile-bottom-nav__item--assist');
    if (assistBtn?.dataset.current === 'true') assistBtn.classList.add('active');
    document.body.style.overflow = '';
  }

  toggle?.addEventListener('click', openNav);
  close?.addEventListener('click', closeNav);
  overlay?.addEventListener('click', closeNav);

  // Bottom nav menu button also opens the same nav
  bottomMenuBtn?.addEventListener('click', openNav);
  nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeNav));

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
/* ⚠️ 呢個要 idempotent —— 分類海報係目錄載完先由 home.js 砌出嚟嘅，
   即係喺 DOMContentLoaded 之後。第一次行嗰陣 .rise 未存在，如果唔可以
   再叫多次，啲海報就永遠停喺 opacity: 0 —— 成段分類區塊白晒。
   （首頁優惠 banner 之前就係中過呢個窿。）
   用 data-rise 標住睇過嘅，重複叫都唔會重複 observe。 */
function initRiseReveal() {
  const rises = [...document.querySelectorAll('.rise')].filter((el) => !el.dataset.rise);
  rises.forEach((el) => { el.dataset.rise = '1'; });
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
/* ============================================================
   優惠全屏通知
   老闆 2026-08-28：「啲人入到嚟呢個界面，咁隔咗十零秒，就會有一個
   覆蓋全個屏幕嘅通知彈出嚟⋯⋯好靚嘅，即係好似首頁嗰個 session 咁樣
   彈出嚟，變咗啲人一定會睇到。」

   本來係右下角一張細卡 —— 手機上面同 cookie 提示冇分別，掃走咗都唔
   知睇過乜。而家改成全屏。

   全屏通知係打斷客，所以幾個規矩要守實：
   - **一日一次。** localStorage 記住日期，同一日唔會再彈。
   - **購物袋頁唔彈。** 佢已經喺度結帳，打斷佢係倒自己米。
   - **Promo 完就唔存在**（9 月 15 日之後直接 return）。
   - **四條路都關得到**：X、背景、Esc、撳「開始揀貨」。
   - **鎖返 body scroll**，開住嗰陣背後唔會跟住郁；關咗要還返個
     scrollTop，否則 iOS 會跳返頂。
   ============================================================ */
function initPromoPop() {
  const END = new Date('2026-09-15T23:59:00+08:00');
  if (Date.now() > END.getTime()) return;
  if (/\/cart(\.html)?$/.test(location.pathname)) return;
  // 截圖／視覺檢查用：?nopromo=1 就唔彈，方便睇返底下個版面
  if (new URLSearchParams(location.search).has('nopromo')) return;

  const KEY = 'ouji:promoPop';
  const today = new Date().toISOString().slice(0, 10);
  try { if (localStorage.getItem(KEY) === today) return; } catch (e) { /* 私隱模式 */ }

  const days = Math.max(0, Math.ceil((END - new Date()) / 86400000));
  const el = document.createElement('div');
  el.className = 'promo-full';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-label', '現正推廣');
  el.innerHTML = `
    <div class="promo-full__sheet" role="document">
      <button type="button" class="promo-full__x" aria-label="關閉">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
             aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
      <img class="promo-full__cat" src="assets/images/shima/shima-wink1.webp" alt=""
           width="230" height="219" decoding="async">
      <p class="promo-full__days">9 月 15 日前 · 仲有 <b>${days}</b> 日</p>
      <h2 class="promo-full__title">全單 <em>88</em> 折</h2>
      <ul class="promo-full__list">
        <li><b>HK$399</b><span>折實滿呢個數，免運費</span></li>
        <li><b>HK$499</b><span>折實滿呢個數，送下面呢支面霜</span></li>
      </ul>
      <a class="promo-full__gift" href="products/round-lab-round-lab-80ml-0221">
        <img src="https://cdn.shopify.com/s/files/1/0765/3405/5070/files/birch-moisturizing-cream-round-lab-3.jpg?width=200"
             alt="Round Lab 白樺樹保濕面霜 80ml" width="200" height="200" decoding="async">
        <span class="promo-full__gift-t">
          <b>Round Lab 白樺樹保濕面霜 80ml</b>
          <em>價值 HK$148 · 滿 $499 免費送</em>
        </span>
      </a>
      <a class="promo-full__go" href="shop.html">開始揀貨</a>
      <button type="button" class="promo-full__later">下次先</button>
    </div>`;

  let lastY = 0;
  const close = (why) => {
    el.classList.remove('is-in');
    try { localStorage.setItem(KEY, today); } catch (e) { /* 冇得記就算 */ }
    document.body.classList.remove('is-promo-open');
    document.body.style.top = '';
    window.scrollTo(0, lastY);
    document.removeEventListener('keydown', onKey);
    setTimeout(() => el.remove(), 340);
    if (window.trackEvent) window.trackEvent('promo_pop_close', { why });
  };
  const onKey = (e) => { if (e.key === 'Escape') close('esc'); };

  el.querySelector('.promo-full__x').addEventListener('click', () => close('x'));
  el.querySelector('.promo-full__later').addEventListener('click', () => close('later'));
  el.querySelector('.promo-full__go').addEventListener('click', () => close('go'));
  el.addEventListener('click', (e) => {
    if (!e.target.closest('.promo-full__sheet')) close('backdrop');
  });

  setTimeout(() => {
    /* 客已經滑咗落去睇緊嘢就唔好打斷；下次再嚟先講。 */
    lastY = window.scrollY;
    document.body.style.top = `-${lastY}px`;
    document.body.classList.add('is-promo-open');
    document.body.appendChild(el);
    document.addEventListener('keydown', onKey);
    requestAnimationFrame(() => {
      el.classList.add('is-in');
      el.querySelector('.promo-full__x').focus({ preventScroll: true });
    });
  }, 11000);
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
  { href: 'bath.html', label: '沐浴洗護', note: '潔面 · 洗髮 · 沐浴' },
  { href: 'health.html', label: '保健品', note: '益生菌 · 膠原蛋白' },
  { href: 'seasonal.html', label: '季節性', note: '防曬 · 護手霜' },
  { href: 'tools.html', label: '美妝工具', note: '化妝掃 · 粉撲 · 髮梳' },
  { href: 'fragrance.html', label: '香水香氛', note: '香水 · 身體噴霧' },
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


/* ============================================================
   頂部導覽：向下滑收起、向上滑彈返出嚟
   老闆 2026-08-27：「咁樣更加可以喺比較細嘅屏幕睇到成個畫面，唔會浪費
   啲位置。」

   幾個位要小心：
   - **頂部 140px 之內永遠顯示。** 唔係嘅話，一入版向下掃少少個 header
     就閃一閃，好核突。
   - **開住抽屜／選購面板／搜尋／篩選嗰陣唔准收。** 嗰啲 overlay 嘅關閉
     掣同 logo 就喺 header 度，收埋咗客就出唔返嚟。
   - **iOS 回彈** scrollY 會變負數，要 clamp，否則一拉到頂就當「向上滑」
     unstick 完又 stick，會抽搐。
   - 只用 transform，唔郁 main 嘅 padding-top —— 郁咗成版內容會跳。
   ============================================================ */
function initHeaderAutoHide() {
  const header = document.querySelector('.header');
  if (!header) return;

  const TOP_ZONE = 140;   // 呢個範圍內永遠顯示
  const STEP = 8;         // 掃夠呢個距離先當數，免得手指震都觸發

  const body = document.body;
  const blocked = () => !!document.querySelector(
    '.mobile-nav.is-open, .shop-sheet.is-open, .discover-sheet.is-open, .assist-sheet.is-open, .search-overlay.is-open, '
    + '.filter-sidebar.is-open, .mobile-nav-overlay.is-visible');

  let last = Math.max(window.scrollY, 0);

  /* ⚠️ 唔用 requestAnimationFrame 做節流。
     本來寫成「ticking = true → rAF 入面做嘢再 ticking = false」，但 rAF
     喺頁面被隱藏／背景 tab 係會停跑嘅 —— 一停，ticking 就永遠卡住 true，
     之後所有 scroll 都當冇發生，個 header 收埋咗就再彈唔返出嚟。
     實測就係咁：向下滑收起之後，向上滑同埋滑返到頂都仲係收埋。
     裏面做嘅嘢好平（讀 scrollY ＋ toggle 一個 class，唔會觸發 layout），
     直接喺 scroll handler 做反而穩陣。 */
  const update = () => {
    const y = Math.max(window.scrollY, 0);
    const d = y - last;

    if (blocked() || y < TOP_ZONE) {
      body.classList.remove('is-nav-tucked');
      last = y;
      return;
    }
    if (d > STEP) {
      body.classList.add('is-nav-tucked');
      last = y;
    } else if (d < -STEP) {
      body.classList.remove('is-nav-tucked');
      last = y;
    }
  };

  window.addEventListener('scroll', update, { passive: true });
  /* 由背景切返出嚟、或者用返上一頁嗰陣，重新對一次 */
  window.addEventListener('pageshow', () => { last = Math.max(window.scrollY, 0); update(); });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) { last = Math.max(window.scrollY, 0); update(); }
  });

  /* 開／關 overlay 嗰陣即刻反應，唔使等下一次滑動 */
  /* class 冇存在就唔好再 remove。Chromium 會將冇變化嘅 class 操作都當
     attribute mutation；之前開 drawer 會觸發 observer → remove → observer
     無限循環，結果撳 hamburger 成個 main thread 卡住。 */
  const mo = new MutationObserver(() => {
    if (blocked() && body.classList.contains('is-nav-tucked')) {
      body.classList.remove('is-nav-tucked');
    }
  });
  mo.observe(document.body, { attributes: true, subtree: true, attributeFilter: ['class'] });
}

document.addEventListener('DOMContentLoaded', initHeaderAutoHide);
