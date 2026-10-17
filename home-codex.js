/* 首頁 Codex 新設計段落嘅互動（2026-10-15 由 Codex 預覽搬過嚟，邏輯照抄 Codex 原碼）：
   - 美妝品牌：兩行品牌名自動慢慢捲（hover／focus／手指撳住就停，reduced-motion 唔郁）。
   - 妝感同護膚、好物啱價：桌面兩格並排；手機（≤760px）變分頁，一次睇一格。
   - 美妝以外：桌面兩個章節各自有分頁；手機一條分頁列管晒六個分類。
   - 好物啱價：芝麻短片入咗畫面先載入同播放，出咗畫面就停。
   貨架、海報、數字由 home.js 用實時目錄填（貨架嘅新卡用 product-card-lc.js）。 */
(function () {
  const MOBILE = '(max-width:760px)';
  const reducedMotion = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

  /* ---------- 美妝品牌：自動捲動（Codex home-brand-rail.js mountHomeBrandRail）---------- */
  function mountBrandRail(root, enabled) {
    const track = root.querySelector('#home-brand-track');
    if (!track) return;
    const rows = [...track.querySelectorAll('.home-brand-rail__row')].map((element, index) => ({
      element,
      groups: [...element.querySelectorAll('.home-brand-rail__group')],
      speed: index === 0 ? 22 : -18,
      loopWidth: 0,
      phase: 0,
      lastPosition: 0,
      expectedPosition: null,
      userScrollUntil: 0,
      moving: false,
      moveTimer: 0,
    }));
    if (!rows.length) return;

    let frame = 0, wakeTimer = 0, controlsTimer = 0, last = 0;
    let visible = false, hover = false, focus = false, pointer = false, manualUntil = 0;
    const modulo = (value, size) => (size > 0 ? ((value % size) + size) % size : 0);
    const section = track.closest('.home-brand-rail');
    const revealControls = () => {
      track.classList.add('is-controls-visible');
      clearTimeout(controlsTimer);
      controlsTimer = setTimeout(() => {
        controlsTimer = 0;
        track.classList.remove('is-controls-visible');
      }, 1400);
    };
    const setPosition = (row, position) => {
      row.lastPosition = position;
      row.phase = modulo(position, row.loopWidth);
      row.expectedPosition = position;
      row.element.scrollLeft = position;
    };
    const stopFrame = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      last = 0;
    };
    const canRun = () => enabled && visible && !document.hidden && !hover && !focus && !pointer && performance.now() >= manualUntil;
    const resume = () => {
      if (canRun() && !frame) frame = requestAnimationFrame(tick);
    };
    const tick = (now) => {
      frame = 0;
      if (!canRun()) { last = 0; return; }
      if (last) {
        const elapsed = Math.min(now - last, 250) / 1000;
        for (const row of rows) {
          if (!row.loopWidth || row.moving) continue;
          row.phase = modulo(row.phase + row.speed * elapsed, row.loopWidth);
          setPosition(row, row.phase);
        }
      }
      last = now;
      frame = requestAnimationFrame(tick);
    };
    const pauseForInteraction = () => {
      manualUntil = performance.now() + 3500;
      stopFrame();
      clearTimeout(wakeTimer);
      wakeTimer = setTimeout(() => { wakeTimer = 0; resume(); }, 3550);
    };
    const syncRow = (row) => {
      const [original, clone] = row.groups;
      if (!original || !clone) return;
      const measured = clone.getBoundingClientRect().left - original.getBoundingClientRect().left;
      if (!(measured > 0)) return;
      // 一個循環要放得落捲動範圍先郁得
      if (row.element.scrollWidth - row.element.clientWidth < measured) {
        row.loopWidth = 0;
        return;
      }
      if (!row.loopWidth) {
        row.loopWidth = measured;
        setPosition(row, modulo(row.element.scrollLeft, measured));
        return;
      }
      if (Math.abs(measured - row.loopWidth) > 0.5) {
        const phaseRatio = row.phase / row.loopWidth;
        row.loopWidth = measured;
        setPosition(row, modulo(phaseRatio * measured, measured));
      }
    };
    const syncAll = () => rows.forEach(syncRow);
    const finishMove = (row) => {
      if (!row.moving) return;
      row.moving = false;
      clearTimeout(row.moveTimer);
      row.moveTimer = 0;
      if (row.loopWidth) {
        row.phase = modulo(row.element.scrollLeft, row.loopWidth);
        setPosition(row, row.phase);
      }
    };
    const moveRow = (row, direction) => {
      if (!row.loopWidth) syncRow(row);
      if (!row.loopWidth) return;
      const width = row.loopWidth;
      const distance = Math.min(row.element.clientWidth + 12, width * 0.75);
      let start = row.element.scrollLeft;
      const max = Math.max(0, row.element.scrollWidth - row.element.clientWidth);
      if (direction < 0 && start < distance) start += width;
      const step = direction > 0 ? Math.min(distance, Math.max(0, max - start)) : distance;
      const target = direction > 0 ? start + step : Math.max(start - step, 0);
      if (Math.abs(target - row.element.scrollLeft) < 1) return;
      row.moving = true;
      setPosition(row, start);
      row.phase = modulo(start, width);
      row.element.scrollTo({ left: target, behavior: enabled ? 'smooth' : 'auto' });
      clearTimeout(row.moveTimer);
      if (enabled) row.moveTimer = setTimeout(() => finishMove(row), 700);
      else finishMove(row);
    };
    const keyboard = (event) => {
      if (event.altKey || event.ctrlKey || event.metaKey || (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft')) return;
      event.preventDefault();
      pauseForInteraction();
      moveRow(rows.find((row) => row.element === event.currentTarget), event.key === 'ArrowRight' ? 1 : -1);
    };
    const onScroll = (row) => {
      if (!row.loopWidth) return;
      let position = row.element.scrollLeft;
      if (pointer) row.userScrollUntil = performance.now() + 3500;
      if (row.expectedPosition != null && Math.abs(position - row.expectedPosition) < 1) {
        // 保留小數位相位：瀏覽器嘅捲動位置可能四捨五入
        row.expectedPosition = null;
        row.lastPosition = position;
        return;
      }
      row.expectedPosition = null;
      if (!row.moving && position >= row.loopWidth) {
        position -= row.loopWidth;
        setPosition(row, position);
      } else if (!row.moving && position < 0) {
        position += row.loopWidth;
        setPosition(row, position);
      } else if (!row.moving && position < 1 && row.lastPosition > position && performance.now() < row.userScrollUntil) {
        position = row.loopWidth;
        setPosition(row, position);
      }
      row.phase = modulo(position, row.loopWidth);
      row.lastPosition = position;
    };
    const rowOf = (event) => rows.find((candidate) => candidate.element === event.target.closest?.('.home-brand-rail__row'));
    const onPointerDown = (event) => {
      pointer = true;
      if (event.pointerType === 'touch' || event.pointerType === 'pen') revealControls();
      pauseForInteraction();
      const row = rowOf(event);
      if (!row) return;
      row.expectedPosition = null;
      row.userScrollUntil = performance.now() + 3500;
      if (row.loopWidth && row.element.scrollLeft < 1) {
        setPosition(row, row.loopWidth);
        row.phase = 0;
      }
    };
    const onWheel = (event) => {
      pauseForInteraction();
      const row = rowOf(event);
      if (!row) return;
      row.expectedPosition = null;
      row.userScrollUntil = performance.now() + 3500;
      if (row.loopWidth && (event.deltaX < 0 || (event.shiftKey && event.deltaY < 0)) && row.element.scrollLeft < 1) {
        setPosition(row, row.loopWidth);
        row.phase = 0;
      }
    };
    const pointerUp = (event) => {
      if (!pointer) return;
      pointer = false;
      if (event.pointerType === 'touch' || event.pointerType === 'pen') revealControls();
      resume();
    };
    const observer = new ResizeObserver(syncAll);
    rows.forEach((row) => {
      observer.observe(row.element);
      row.groups.forEach((group) => {
        observer.observe(group);
        group.querySelectorAll('.home-brand-rail__item').forEach((item) => observer.observe(item));
      });
      row.element.addEventListener('scroll', () => onScroll(row), { passive: true });
      row.element.addEventListener('scrollend', () => finishMove(row));
      row.element.addEventListener('keydown', keyboard);
    });
    document.fonts?.addEventListener?.('loadingdone', syncAll);
    document.fonts?.ready?.then(syncAll);
    new IntersectionObserver((entries) => {
      visible = entries.some((entry) => entry.isIntersecting);
      if (visible) resume(); else stopFrame();
    }, { threshold: 0.05 }).observe(section);
    syncAll();
    section.addEventListener('pointerenter', (event) => { if (event.pointerType === 'touch') return; hover = true; stopFrame(); });
    section.addEventListener('pointerleave', () => { hover = false; resume(); });
    section.addEventListener('focusin', () => { focus = true; stopFrame(); });
    section.addEventListener('focusout', (event) => { focus = section.contains(event.relatedTarget); if (!focus) resume(); });
    section.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', pointerUp);
    window.addEventListener('pointercancel', pointerUp);
    section.addEventListener('wheel', onWheel, { passive: true });
    document.addEventListener('visibilitychange', () => { if (document.hidden) stopFrame(); else resume(); });
  }

  /* ---------- 桌面並排、手機分頁（Codex mountHomeBrandEdits／mountHomeOffers）----------
     每次都由 DOM 重新攞分頁掣同格：home.js 收起冇貨嘅格（連分頁掣一齊剷）之後叫 refresh() 就得。 */
  function mountChapterTabs(section, { tablist, listTabs, keyOf, panelFor, label, setActive }) {
    if (!tablist) return null;
    const media = window.matchMedia(MOBILE);
    let active = null;
    const pairs = () => listTabs().map((tab) => [tab, panelFor(keyOf(tab))]).filter(([, panel]) => panel);
    const sync = () => {
      const list = pairs();
      if (!list.length) return;
      if (!list.some(([tab]) => keyOf(tab) === active)) active = keyOf(list[0][0]);
      const mobile = media.matches;
      setActive(active);
      tablist.hidden = !mobile || list.length < 2;
      if (mobile) {
        tablist.setAttribute('role', 'tablist');
        if (label) tablist.setAttribute('aria-label', label);
        tablist.setAttribute('aria-orientation', 'horizontal');
      } else {
        tablist.removeAttribute('role');
        tablist.removeAttribute('aria-orientation');
      }
      list.forEach(([tab, panel]) => {
        const key = keyOf(tab);
        if (mobile) {
          tab.setAttribute('role', 'tab');
          tab.setAttribute('aria-controls', panel.id);
          tab.setAttribute('aria-selected', String(key === active));
          tab.tabIndex = key === active ? 0 : -1;
          panel.setAttribute('role', 'tabpanel');
          panel.setAttribute('aria-labelledby', tab.id);
          panel.tabIndex = 0;
          panel.hidden = key !== active;
        } else {
          tab.removeAttribute('role');
          tab.removeAttribute('aria-controls');
          tab.removeAttribute('aria-selected');
          tab.tabIndex = -1;
          panel.removeAttribute('role');
          panel.removeAttribute('aria-labelledby');
          panel.removeAttribute('tabindex');
          panel.hidden = false;
        }
      });
    };
    const select = (tab, focus) => {
      if (!media.matches || !listTabs().includes(tab)) return;
      active = keyOf(tab);
      sync();
      if (focus) tab.focus();
    };
    section.addEventListener('click', (event) => {
      const tab = event.target.closest?.('button');
      if (tab && tablist.contains(tab)) select(tab);
    });
    section.addEventListener('keydown', (event) => {
      if (!media.matches) return;
      const tabs = pairs().map(([tab]) => tab);
      const index = tabs.indexOf(event.target.closest?.('button'));
      if (index < 0) return;
      const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length
        : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length
          : event.key === 'Home' ? 0
            : event.key === 'End' ? tabs.length - 1 : -1;
      if (next < 0) return;
      event.preventDefault();
      select(tabs[next], true);
    });
    media.addEventListener?.('change', sync);
    sync();
    return { refresh: sync };
  }

  /* ---------- 好物啱價：芝麻短片（Codex mountBargainScene，入畫先載入）---------- */
  function mountFilm(section) {
    const film = section.querySelector('.offer-finds__film');
    const video = film?.querySelector('.offer-finds__video');
    if (!film || !video || !('IntersectionObserver' in window)) return;
    let visible = false, sourceAssigned = false, playing = false, failed = false, playRejected = false, pendingPlay = null;
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.loop = true;
    const canPlay = () => !failed && !playRejected && !reducedMotion?.matches && visible && !document.hidden;
    const render = () => {
      film.dataset.motion = failed ? 'error'
        : reducedMotion?.matches ? 'reduced'
          : !sourceAssigned ? 'idle'
            : !canPlay() ? 'paused'
              : playing && !video.paused ? 'playing'
                : pendingPlay || !video.paused ? 'loading' : 'paused';
      if (failed || reducedMotion?.matches) film.classList.remove('is-showing-video');
    };
    const pause = () => {
      if (pendingPlay) pendingPlay.cancelled = true;
      if (pendingPlay || !video.paused) video.pause();
      playing = false;
    };
    const settle = (request, rejected) => {
      if (pendingPlay !== request) return;
      pendingPlay = null;
      if (video.error) failed = true;
      else if (rejected && !request.cancelled) playRejected = true;
      sync();
    };
    const requestPlay = () => {
      const request = { cancelled: false };
      pendingPlay = request;
      try {
        Promise.resolve(video.play()).then(() => settle(request, false), () => settle(request, true));
      } catch (e) {
        settle(request, true);
      }
    };
    const sync = () => {
      if (!canPlay()) pause();
      else {
        if (!sourceAssigned) {
          sourceAssigned = true;
          video.preload = 'auto';
          video.src = video.dataset.src;
          video.load();
        }
        if (!pendingPlay && video.paused) requestPlay();
      }
      render();
    };
    video.addEventListener('playing', () => {
      if (!canPlay()) pause();
      else { playing = true; film.classList.add('is-showing-video'); }
      render();
    });
    video.addEventListener('pause', () => { if (video.paused) playing = false; sync(); });
    video.addEventListener('waiting', () => { playing = false; render(); });
    video.addEventListener('error', () => { if (video.error) { failed = true; sync(); } });
    document.addEventListener('visibilitychange', () => { if (document.hidden) playRejected = false; sync(); });
    reducedMotion?.addEventListener?.('change', () => { if (!reducedMotion.matches) playRejected = false; sync(); });
    new IntersectionObserver((entries) => {
      const entry = entries[entries.length - 1];
      if (!entry) return;
      if (visible && !entry.isIntersecting) playRejected = false;
      visible = entry.isIntersecting;
      sync();
    }, { threshold: 0 }).observe(film);
    sync();
  }

  /* ---------- 美妝以外：兩個章節各自分頁＋手機總分頁（Codex mountHomeLifestyle）---------- */
  const LIFE_CHAPTERS = { care: ['seasonal', 'bath', 'bodycare'], extras: ['toys', 'fragrance', 'kpop'] };
  function mountLifestyle(section) {
    const chapters = [...section.querySelectorAll('[data-lifestyle-chapter]')];
    if (!chapters.length) return;
    const ctrl = chapters.map((chapter) => {
      const tablist = chapter.querySelector('.home-lifestyle__tabs');
      const tabs = [...(tablist?.querySelectorAll('button[data-key]') || [])];
      const panels = new Map([...chapter.querySelectorAll('.home-lifestyle__panel[data-category]')].map((p) => [p.dataset.category, p]));
      const sync = (key) => {
        const live = tabs.filter((tab) => !tab.hidden);
        const active = live.some((tab) => tab.dataset.key === key) ? key : live[0]?.dataset.key;
        chapter.dataset.activekey = active || '';
        if (tablist) tablist.dataset.activekey = active || '';
        tabs.forEach((tab) => {
          const selected = tab.dataset.key === active;
          tab.setAttribute('aria-selected', String(selected));
          tab.tabIndex = selected ? 0 : -1;
          const panel = panels.get(tab.dataset.key);
          if (!panel) return;
          panel.hidden = !selected;
          panel.setAttribute('aria-hidden', String(!selected));
        });
      };
      const select = (tab, focus) => { if (!tabs.includes(tab)) return; sync(tab.dataset.key); if (focus) tab.focus(); };
      tablist?.addEventListener('click', (event) => {
        const tab = event.target.closest?.('button[data-key]');
        if (tab && tablist.contains(tab)) select(tab);
      });
      tablist?.addEventListener('keydown', (event) => {
        const live = tabs.filter((tab) => !tab.hidden);
        const current = live.indexOf(event.target.closest?.('button[data-key]'));
        if (current < 0) return;
        const target = event.key === 'ArrowRight' ? (current + 1) % live.length
          : event.key === 'ArrowLeft' ? (current + live.length - 1) % live.length
            : event.key === 'Home' ? 0
              : event.key === 'End' ? live.length - 1 : -1;
        if (target < 0) return;
        event.preventDefault();
        select(live[target], true);
      });
      sync(chapter.dataset.activekey);
      return { chapter, sync, current: () => chapter.dataset.activekey };
    });

    const tablist = section.querySelector('.home-lifestyle__mobile-tabs');
    const tabs = [...(tablist?.querySelectorAll('button[data-key]') || [])];
    const media = window.matchMedia(MOBILE);
    let active = 'seasonal';
    const layout = () => {
      const chapterKey = Object.keys(LIFE_CHAPTERS).find((k) => LIFE_CHAPTERS[k].includes(active));
      ctrl.forEach(({ chapter }) => {
        chapter.hidden = media.matches && chapter.dataset.lifestyleChapter !== chapterKey;
        chapter.querySelectorAll('.home-lifestyle__panel').forEach((panel) => {
          const desktopTab = chapter.querySelector(`button[aria-controls="${panel.id}"]`);
          const mobileTab = tabs.find((tab) => tab.getAttribute('aria-controls') === panel.id);
          const by = media.matches ? mobileTab : desktopTab;
          if (by) panel.setAttribute('aria-labelledby', by.id);
        });
      });
      if (media.matches) ctrl.find(({ chapter }) => chapter.dataset.lifestyleChapter === chapterKey)?.sync(active);
    };
    const select = (tab, focus) => {
      active = tab.dataset.key;
      tabs.forEach((item) => {
        item.setAttribute('aria-selected', String(item === tab));
        item.tabIndex = item === tab ? 0 : -1;
      });
      layout();
      if (focus) tab.focus();
    };
    tablist?.addEventListener('click', (event) => {
      const tab = event.target.closest?.('button[data-key]');
      if (tabs.includes(tab)) select(tab);
    });
    tablist?.addEventListener('keydown', (event) => {
      const live = tabs.filter((tab) => !tab.hidden);
      const current = live.indexOf(event.target.closest?.('button[data-key]'));
      if (current < 0) return;
      const target = event.key === 'ArrowRight' ? (current + 1) % live.length
        : event.key === 'ArrowLeft' ? (current + live.length - 1) % live.length
          : event.key === 'Home' ? 0 : event.key === 'End' ? live.length - 1 : -1;
      if (target < 0) return;
      event.preventDefault();
      select(live[target], true);
    });
    media.addEventListener?.('change', layout);
    const first = tabs.find((tab) => !tab.hidden);
    if (first) select(first);
    // home.js 收起冇貨嘅分類之後，叫呢個重新揀返第一個仲有貨嘅分頁
    section.oujiLifestyleRefresh = () => {
      ctrl.forEach((c) => c.sync(c.current()));
      const cur = tabs.find((tab) => tab.dataset.key === active && !tab.hidden) || tabs.find((tab) => !tab.hidden);
      if (cur) select(cur);
    };
  }


  /* ---------- 名行數：同一條貨架有一張卡名要兩行先成條留兩行位，全部一行就留一行（同預覽一樣）---------- */
  /* 桌面兩格並排（美妝以外、好物啱價）：同一行嘅貨架要一齊計，否則一格兩行一格一行就一高一低（Winston 2026-10-17） */
  function fitRail(rail) {
    if (!rail.offsetParent) return;
    const top = Math.round(rail.getBoundingClientRect().top);
    const section = rail.closest('.home-lifestyle, .home-offers, .home-brand-edits') || rail.parentElement;
    const rails = [...section.querySelectorAll('[data-codex-rail]')]
      .filter((r) => r.offsetParent && Math.abs(Math.round(r.getBoundingClientRect().top) - top) <= 2);
    if (!rails.includes(rail)) rails.push(rail);
    const cards = rails.flatMap((r) => [...r.querySelectorAll(':scope > .cx-slot > a.product-card.lc, :scope > a.product-card.lc')]).filter((c) => c.offsetParent);
    if (!cards.length) return;
    cards.forEach((c) => c.style.setProperty('--lc-lines', '2'));
    const two = cards.some((c) => {
      const t = c.querySelector('.lc__title');
      if (!t || !t.offsetHeight) return false;
      return Math.round(t.getBoundingClientRect().height / parseFloat(getComputedStyle(t).lineHeight)) > 1;
    });
    cards.forEach((c) => c.style.setProperty('--lc-lines', two ? '2' : '1'));
  }
  const railIO = 'IntersectionObserver' in window
    ? new IntersectionObserver((entries) => entries.forEach((en) => { if (en.isIntersecting) fitRail(en.target); }), { rootMargin: '600px 0px' })
    : null;
  function fitAll() {
    document.querySelectorAll('.home-codex [data-codex-rail]').forEach((rail) => {
      if (railIO) { railIO.unobserve(rail); railIO.observe(rail); } else fitRail(rail);
    });
  }

  function init() {
    const root = document;
    if (!root.querySelector('.home-codex')) return;
    mountBrandRail(root, !reducedMotion?.matches);

    const edits = root.querySelector('.home-codex .home-brand-edits');
    if (edits) {
      const tablist = edits.querySelector('.home-brand-edits__tabs');
      const grid = edits.querySelector('.home-brand-edits__grid');
      edits.oujiTabs = mountChapterTabs(edits, {
        tablist,
        listTabs: () => [...(tablist?.querySelectorAll('button[data-brand-edit-tab]:not([data-codex-empty])') || [])],
        keyOf: (tab) => tab.dataset.brandEditTab,
        panelFor: (key) => [...(grid?.children || [])].find((c) => c.matches('section[data-brand-edit]:not([data-codex-empty])') && c.dataset.brandEdit === key),
        label: '韓妝品牌專題',
        setActive: (key) => { edits.dataset.brandEditActive = key; },
      });
    }

    const offers = root.querySelector('.home-codex .home-offers');
    if (offers) {
      const tablist = offers.querySelector('.home-offers__tabs');
      const grid = offers.querySelector('.home-offers__grid');
      offers.oujiTabs = mountChapterTabs(offers, {
        tablist,
        listTabs: () => [...(tablist?.querySelectorAll('button[data-campaign]:not([data-codex-empty])') || [])],
        keyOf: (tab) => tab.dataset.campaign,
        panelFor: (key) => [...(grid?.children || [])].find((c) => c.matches('.home-offers__panel[data-offer-category]:not([data-codex-empty])') && c.dataset.offerCategory === key),
        label: '優惠分類',
        setActive: (key) => { offers.dataset.offerCampaign = key; },
      });
      mountFilm(offers);
      const shopButton = offers.querySelector('[data-finds-shop]');
      shopButton?.addEventListener('click', () => {
        const panel = grid?.querySelector('.home-offers__panel:not([hidden]):not([data-codex-empty])');
        if (!panel) return;
        const headerBottom = document.querySelector('header.header')?.getBoundingClientRect().bottom || 0;
        window.scrollTo({
          top: window.scrollY + panel.getBoundingClientRect().top - Math.max(0, headerBottom) - 16,
          behavior: reducedMotion?.matches ? 'auto' : 'smooth',
        });
      });
    }

    const life = root.querySelector('.home-codex .home-lifestyle');
    if (life) mountLifestyle(life);

    // home.js 用實時目錄填完貨架（或者收起咗冇貨嘅格）之後：分頁重新揀、名行數重新對
    const refresh = () => {
      edits?.oujiTabs?.refresh();
      offers?.oujiTabs?.refresh();
      life?.oujiLifestyleRefresh?.();
      fitAll();
    };
    document.addEventListener('ouji:codex-filled', refresh);
    refresh();
    let lastW = window.innerWidth;
    let timer = 0;
    window.addEventListener('resize', () => {
      if (window.innerWidth === lastW) return;
      lastW = window.innerWidth;
      clearTimeout(timer);
      timer = setTimeout(fitAll, 150);
    }, { passive: true });
    document.fonts?.ready?.then(fitAll);
    // 手機切分頁：新顯示嗰格嘅貨架要再對一次
    root.querySelectorAll('.home-codex .home-brand-edits, .home-codex .home-offers, .home-codex .home-lifestyle')
      .forEach((sec) => sec.addEventListener('click', (e) => { if (e.target.closest('button')) requestAnimationFrame(fitAll); }));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
