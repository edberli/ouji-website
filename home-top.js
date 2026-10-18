/* 首頁頂部三段嘅互動：品牌海報輪播、商品分類左右捲動提示。
   2026-10-12 由設計預覽（ouji-design-review）嘅 mountHomeCampaignHero／
   mountHomeCategories 搬過嚟，改成唔使 module 都行得。 */
(function () {
  function mountHero(hero) {
    var track = hero.querySelector('[data-hero-track]');
    var slides = Array.prototype.slice.call(hero.querySelectorAll('[data-hero-slide]'));
    var pages = Array.prototype.slice.call(hero.querySelectorAll('[data-hero-page]'));
    var previous = hero.querySelector('[data-hero-prev]');
    var pause = hero.querySelector('[data-hero-pause]');
    var next = hero.querySelector('[data-hero-next]');
    var status = hero.querySelector('[data-hero-status]');
    if (!track || !slides.length) return;

    /* 每張海報嘅色調同品牌名由 class／aria-label 讀，唔使另外維護一份清單。 */
    var campaigns = slides.map(function (slide) {
      var tone = (slide.className.match(/home-campaign-hero__slide--([a-z]+)/) || [])[1] || '';
      var brand = (slide.getAttribute('aria-label') || '').split('·').pop().trim();
      return { tone: tone, brand: brand };
    });
    var enabled = !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    var index = 0;
    var paused = false;
    var visible = !('IntersectionObserver' in window);
    var hovered = false, focused = false;
    var timer = 0, scrollFrame = 0, scrollEnd = 0;

    function stop() { window.clearTimeout(timer); timer = 0; }
    function canRun() { return enabled && !paused && visible && !hovered && !focused && !document.hidden; }
    function schedule() {
      stop();
      if (canRun()) timer = window.setTimeout(function () { go(index + 1, false); }, 7000);
    }
    function paint(announce) {
      hero.dataset.heroIndex = String(index);
      hero.dataset.heroTone = campaigns[index].tone;
      pages.forEach(function (page, i) {
        if (i === index) page.setAttribute('aria-current', 'true');
        else page.removeAttribute('aria-current');
      });
      slides.forEach(function (slide, i) {
        slide.inert = i !== index;
        if (i === index) slide.removeAttribute('aria-hidden');
        else slide.setAttribute('aria-hidden', 'true');
      });
      if (pause) {
        pause.hidden = !enabled;
        pause.setAttribute('aria-pressed', String(paused));
        var pauseLabel = paused ? '播放海報輪播' : '暫停海報輪播';
        pause.setAttribute('aria-label', window.OUJI_translate ? window.OUJI_translate(pauseLabel) : pauseLabel);
        pause.innerHTML = paused
          ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true"><path d="m9 5 10 7-10 7Z"/></svg>'
          : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M9 6v12M15 6v12"/></svg>';
      }
      if (announce && status) status.textContent = campaigns[index].brand + ' · ' + (index + 1) + ' / ' + slides.length;
    }
    function go(value, manual) {
      if (manual === undefined) manual = true;
      index = (value + slides.length) % slides.length;
      if (manual) paused = true;
      track.scrollTo({ left: index * track.clientWidth, behavior: enabled ? 'smooth' : 'auto' });
      paint(manual);
      schedule();
    }

    track.addEventListener('scroll', function () {
      stop();
      if (!scrollFrame) scrollFrame = requestAnimationFrame(function () {
        scrollFrame = 0;
        var current = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
        if (current !== index) { index = current; paint(false); }
      });
      window.clearTimeout(scrollEnd);
      scrollEnd = window.setTimeout(schedule, 180);
    }, { passive: true });
    hero.addEventListener('keydown', function (event) {
      var target;
      if (event.key === 'ArrowRight') target = index + 1;
      if (event.key === 'ArrowLeft') target = index - 1;
      if (event.key === 'Home') target = 0;
      if (event.key === 'End') target = slides.length - 1;
      if (target === undefined) return;
      event.preventDefault(); go(target);
    });
    pages.forEach(function (page, i) { page.addEventListener('click', function () { go(i); }); });
    if (previous) previous.addEventListener('click', function () { go(index - 1); });
    if (next) next.addEventListener('click', function () { go(index + 1); });
    if (pause) pause.addEventListener('click', function () { paused = !paused; paint(false); schedule(); });
    hero.addEventListener('mouseenter', function () { hovered = true; stop(); });
    hero.addEventListener('mouseleave', function () { hovered = false; schedule(); });
    hero.addEventListener('focusin', function () { focused = true; stop(); });
    hero.addEventListener('focusout', function (event) {
      if (!hero.contains(event.relatedTarget)) { focused = false; schedule(); }
    });
    document.addEventListener('visibilitychange', schedule);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting && entries[0].intersectionRatio >= 0.4;
        schedule();
      }, { threshold: [0, 0.4] }).observe(hero);
    }
    if ('ResizeObserver' in window) {
      new ResizeObserver(function () {
        track.scrollTo({ left: index * track.clientWidth, behavior: 'auto' });
      }).observe(track);
    }
    paint(false);
    requestAnimationFrame(function () {
      track.scrollTo({ left: 0, behavior: 'auto' }); schedule();
    });
  }

  function mountCategories(root) {
    var viewport = root.querySelector('.home-categories__viewport');
    var rail = viewport && viewport.querySelector('.home-categories__links');
    var hint = root.querySelector('.home-categories__hint');
    if (!rail || !hint) return;
    var frame = 0;
    function update() {
      frame = 0;
      var max = Math.max(0, rail.scrollWidth - rail.clientWidth);
      var left = Math.max(0, rail.scrollLeft);
      viewport.classList.toggle('can-scroll-prev', left > 2);
      viewport.classList.toggle('can-scroll-next', max - left > 2);
      hint.hidden = max <= 2;
    }
    function schedule() { if (!frame) frame = requestAnimationFrame(update); }
    rail.addEventListener('scroll', schedule, { passive: true });
    rail.addEventListener('keydown', function (event) {
      if (event.target !== rail || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return;
      event.preventDefault();
      rail.scrollBy({ left: (event.key === 'ArrowRight' ? 1 : -1) * Math.max(160, rail.clientWidth * 0.7), behavior: 'auto' });
    });
    window.addEventListener('resize', schedule);
    if (typeof ResizeObserver === 'function') new ResizeObserver(schedule).observe(rail);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(schedule);
    update();
  }

  /* SEOUL BEAUTY 跑馬燈：入到畫面先郁；慳數據／減少動態就唔郁；
     速度跟闊度計，芝麻每秒行 57px、字每秒 27px，闊螢幕唔會特別快。 */
  function mountStrip(strip) {
    var scene = strip.querySelector('[data-watercolor-scene]');
    var route = strip.querySelector('.home-play-strip__cat-route');
    var group = strip.querySelector('.home-play-strip__marquee-group');
    var track = strip.querySelector('.home-play-strip__marquee-track');
    var button = strip.querySelector('[data-strip-motion]');
    if (!scene) return;
    var reduced = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
    var connection = navigator.connection;
    var on = !reduced.matches;
    var seen = !('IntersectionObserver' in window);

    function allowed() {
      return on && !reduced.matches && !(connection && connection.saveData) &&
        !(connection && /^(slow-2g|2g)$/.test(connection.effectiveType || '')) && !document.hidden;
    }
    function sync() {
      scene.dataset.active = String(allowed() && seen);
      strip.dataset.motion = on ? 'on' : 'off';
      if (button) {
        button.setAttribute('aria-pressed', String(on));
        button.setAttribute('aria-label', on ? '暫停動畫' : '播放動畫');
        var icon = button.querySelector('span');
        if (icon) icon.textContent = on ? 'Ⅱ' : '▶';
      }
    }
    function setDuration(el, seconds) {
      var anim = el.getAnimations ? el.getAnimations()[0] : null;
      var oldMs = parseFloat(getComputedStyle(el).animationDuration) * 1000;
      var phase = anim && oldMs > 0 && typeof anim.currentTime === 'number' ? (anim.currentTime % oldMs) / oldMs : null;
      el.style.animationDuration = seconds + 's';
      if (anim && phase !== null) anim.currentTime = phase * seconds * 1000;
    }
    function size() {
      if (route) {
        var distance = route.getBoundingClientRect().width * 0.74 - 75;
        if (distance > 0) setDuration(route, distance / 57);
      }
      if (group && track) {
        var width = group.getBoundingClientRect().width;
        if (width > 0) setDuration(track, width / 27);
      }
    }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        seen = entries[0].isIntersecting; sync();
      }, { threshold: 0.01 }).observe(scene);
    }
    if (button) button.addEventListener('click', function () { on = !on; sync(); });
    if (reduced.addEventListener) reduced.addEventListener('change', sync);
    document.addEventListener('visibilitychange', sync);
    if (typeof ResizeObserver === 'function') {
      var ro = new ResizeObserver(size);
      if (route) ro.observe(route);
      if (group) ro.observe(group);
    } else {
      window.addEventListener('resize', size);
    }
    size();
    sync();
  }

  function init() {
    var hero = document.querySelector('.home-top [data-campaign-hero]');
    if (hero) mountHero(hero);
    var cats = document.querySelector('.home-top .home-categories');
    if (cats) mountCategories(cats);
    var strip = document.querySelector('.home-top .home-play-strip');
    if (strip) mountStrip(strip);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
