/* Shima's seaside shop: the animated stage behind 同芝麻揀護膚.
 *
 * Every room is a painted, animated scene: the shop door, the reading
 * corner, the texture table, the shelves, the packing and the goodbye are
 * short clips rendered from the shop's own illustration (first and last
 * frame identical, so they loop without a seam). The banner on the category
 * page keeps its slow sea and clouds and plays Shima's greeting over them.
 * Clips play only when they can be seen, stop under reduced motion or the
 * pause control, and fall back to their still.
 */
(() => {
  'use strict';
  const VID = '/assets/video/skin-studio/';
  const CUT = '?v=20261022c';  // bump when a clip is re-cut
  const OUT = 'cubic-bezier(.16,1,.3,1)';
  const IN_OUT = 'cubic-bezier(.65,0,.35,1)';
  let serial = 0;
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  // One 16:9 cut per room: phones show it whole, the tall desktop panel shows
  // its middle, where every keyframe keeps Shima. The pack plays once. Rooms
  // marked hd also have a 2x cut (2560x1440) for that panel on Retina screens.
  const CLIPS = {s0:{hd:true}, s1:{hd:true}, s2:{hd:true}, s3:{hd:true}, pack:{once:true, hd:true}, result:{}};
  const SCENES = ['s0', 's1', 's2', 's3'];
  const ORDER = [...SCENES, 'pack', 'result'];

  /* ── the invitation on the category page ─────────────────────────── */

  function panorama(id, mobile) {
    const width = mobile ? 680 : 1220;
    const shopScale = mobile ? .56 : 1.08;
    const shopX = mobile ? -10 : 20;
    const cloudX = mobile ? 205 : 415;
    return `<svg class="ss-panorama ss-panorama--${mobile ? 'mobile' : 'desktop'}" viewBox="0 0 ${width} 210" preserveAspectRatio="xMinYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="${id}-sky" x2="0" y2="1"><stop stop-color="#d9e8df"/><stop offset="1" stop-color="#e9e8d6"/></linearGradient>
        <linearGradient id="${id}-water" x2="0" y2="1"><stop stop-color="#86afb0"/><stop offset="1" stop-color="#b5cec5"/></linearGradient>
        <linearGradient id="${id}-wall" x2="1" y2="1"><stop stop-color="#f4edd9"/><stop offset="1" stop-color="#d4d9c2"/></linearGradient>
        <filter id="${id}-grain"><feTurbulence type="fractalNoise" baseFrequency=".36" numOctaves="2" seed="11"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope=".045"/></feComponentTransfer></filter>
      </defs>
      <rect width="${width}" height="210" fill="url(#${id}-sky)"/>
      <g class="ss-cloud ss-cloud--one" fill="#f7f5e7" opacity=".55"><ellipse cx="${cloudX}" cy="42" rx="74" ry="19"/><ellipse cx="${cloudX + 48}" cy="37" rx="48" ry="21"/></g>
      <g class="ss-cloud ss-cloud--two" fill="#f8f5e7" opacity=".4"><ellipse cx="${mobile ? 340 : 845}" cy="22" rx="79" ry="14"/><ellipse cx="${mobile ? 366 : 894}" cy="19" rx="45" ry="18"/></g>
      <path d="M0 133 Q${width * .27} 118 ${width * .49} 134 T${width} 130 V190 H0Z" fill="url(#${id}-water)"/>
      <path d="M0 131 Q${width * .27} 116 ${width * .49} 132 T${width} 128" fill="none" stroke="#f7f2dd" stroke-width="2" opacity=".7"/>
      <g class="ss-water" fill="none" stroke="#e8f0e5" stroke-width="1.5" opacity=".75"><path d="M-20 151 Q55 148 130 151 T280 151 T430 151 T580 151 T730 151 T880 151 T1030 151 T1230 151"/><path d="M-30 169 Q60 166 150 169 T330 169 T510 169 T690 169 T870 169 T1050 169 T1230 169"/><path d="M-20 183 Q95 180 210 183 T440 183 T670 183 T900 183 T1230 183"/></g>
      <g transform="translate(${mobile ? 394 : 640} ${mobile ? 116 : 150}) scale(${mobile ? .68 : .6})"><g class="ss-boat"><path d="M-18 4h41l-8 8h-25Z" fill="#f5e8cb" stroke="#788f8a"/><path d="M2-37V3H-17Z" fill="#fff8e8"/><path d="M7-28V3h17Z" fill="#d8b895"/><path d="M3-39v51" stroke="#728e8c"/></g></g>
      <path d="M0 185 Q${width * .2} 174 ${width * .4} 190 T${width} 189 V210H0Z" fill="#e7d4b4"/>
      <path d="M0 192 Q${width * .26} 181 ${width * .47} 198 T${width} 194" fill="none" stroke="#cfbb9c" stroke-width="1.5" opacity=".6"/>
      <g class="ss-shop" transform="translate(${shopX} -5) scale(${shopScale})">
        <path d="M24 32 200 19l35 28v145H24Z" fill="url(#${id}-wall)" stroke="#93aaa1" stroke-width="1.5"/>
        <path d="m24 32 176-13 35 28-183 5Z" fill="#2d6268"/>
        <path d="M43 70h173v116H43Z" fill="#618d83"/>
        <path d="M53 80h76v106H53Z" fill="#315e60"/>
        <path d="M55 83 116 88v98H55Z" fill="#96b1a1" stroke="#416e69" stroke-width="2"/>
        <path d="M64 96h41v50H64Zm0 62h40v20H64Z" fill="#cbdcca" stroke="#719b8d"/>
        <circle cx="108" cy="151" r="3" fill="#d5b36e"/>
        <path d="M140 80h64v72h-64Z" fill="#bfd5ce" stroke="#f4ead1" stroke-width="4"/>
        <path d="M172 81v71m-31-35h62" stroke="#f5e8cd" stroke-width="4"/>
        <path d="M20 45h197l11 28q-13 15-26 0-13 15-26 0-13 15-26 0-13 15-26 0-13 15-26 0-13 15-26 0-13 15-26 0-13 15-26 0Z" fill="#faf0d9" stroke="#95a99d" stroke-width="1.5"/><path d="M45 45 41 72q13 15 26 0l5-27m25 0-2 27q13 15 26 0l1-27m25 0 4 27q13 15 26 0l-4-27m28 0 11 27q13 15 26 0l-11-27" fill="#87aaa1"/>
        <path d="M24 186h212v7H24Zm-8 7h228v6H16Z" fill="#b8a280"/>
        <g class="ss-sign" style="transform-origin:205px 88px"><path d="M205 88v9" stroke="#987e61"/><path d="M190 98h30v18h-30Z" fill="#f7e9c9" stroke="#aa9678"/><circle cx="205" cy="107" r="4" fill="#8fae9b"/></g>
      </g>
      ${mobile ? '' : '<path d="M315 197q11-17 25 0m-15 0q-5-20-20-22m23 21q6-22 17-26" fill="none" stroke="#829a81" stroke-width="2" opacity=".7"/>'}
      <rect width="${width}" height="210" fill="#fff" filter="url(#${id}-grain)" opacity=".5" pointer-events="none"/>
    </svg>`;
  }

  function entryMarkup({still = false} = {}) {
    const id = `ss${++serial}`;
    return `<div class="ss-entry" data-entry-story>${panorama(id + 'd', false)}${panorama(id + 'm', true)}<div class="ss-entry-mist" aria-hidden="true"></div>${still
      ? '<img class="ss-entry-cat" src="/assets/images/skin-story/welcome.webp" width="640" height="576" alt="" decoding="async">'
      : '<video class="ss-entry-video" muted playsinline loop preload="none" aria-hidden="true"></video>'}</div>`;
  }

  /* ── the studio stage ────────────────────────────────────────────── */

  function stageMarkup({only} = {}) {
    const names = only === undefined ? [...SCENES, 'pack'] : [typeof only === 'number' ? SCENES[only] : only];
    return `<div class="ss-stage" data-story>${names.map(name => `<div class="ss-scene" data-scene="${name}" aria-hidden="true"><video class="ss-video" muted playsinline preload="none" ${CLIPS[name].once ? '' : 'loop'} data-clip="${name}"></video></div>`).join('')}${only === undefined ? '<span class="ss-spark" aria-hidden="true"></span>' : ''}</div>`;
  }

  /* ── controllers ─────────────────────────────────────────────────── */

  // Whether anything may move: paused, hidden, off screen or reduced motion all say no.
  function watch(host, isPaused, onSync) {
    const sync = () => {
      host.dataset.motion = !isPaused() && !reduced() && !document.hidden && host.dataset.visible !== 'false' ? 'on' : 'off';
      onSync?.(host.dataset.motion === 'on');
    };
    const io = new IntersectionObserver(entries => { host.dataset.visible = String(entries[0].isIntersecting); sync(); }, {threshold:.05});
    io.observe(host);
    document.addEventListener('visibilitychange', sync);
    sync();
    return {sync, stop() { io.disconnect(); document.removeEventListener('visibilitychange', sync); }};
  }

  function setSource(video, src, poster) {
    if (video.dataset.src === src) return;
    video.dataset.src = src;
    video.poster = poster;
    video.src = src;
  }

  function mountEntry(host, {paused = () => false} = {}) {
    if (!host) return null;
    const video = host.querySelector('.ss-entry-video');
    if (video) setSource(video, `${VID}banner.mp4${CUT}`, `${VID}banner.jpg${CUT}`);
    const w = watch(host, paused, on => {
      if (!video) return;
      if (on) video.play().catch(() => {}); else video.pause();
    });
    return {sync:w.sync, destroy() { w.stop(); video?.pause(); }};
  }

  function mount(host, {paused = () => false} = {}) {
    if (!host) return null;
    let current = null, ticket = 0;
    const sceneEl = key => host.querySelector(`.ss-scene[data-scene="${key}"]`);
    const videoOf = key => sceneEl(key)?.querySelector('.ss-video');
    const key = n => (typeof n === 'number' ? SCENES[Math.max(0, Math.min(3, n))] : n);
    const still = () => host.dataset.motion !== 'on';

    // Only the room on screen and the one after it load, so the next cut
    // is ready before she gets there and nothing else is fetched.
    function prepare(name) {
      const v = videoOf(name);
      if (!v) return;
      // Decided by screen, not by measuring: the dialog may not be laid out yet.
      const sharp = CLIPS[name].hd && devicePixelRatio >= 1.5 && matchMedia('(min-width: 761px)').matches;
      const file = sharp ? `${name}-hd` : name;
      setSource(v, `${VID}${file}.mp4${CUT}`, `${VID}${file}.jpg${CUT}`);
      v.preload = 'auto';
    }
    function run() {
      host.querySelectorAll('.ss-video').forEach(v => {
        const on = v.dataset.clip === current;
        if (on && !still() && !(CLIPS[v.dataset.clip].once && v.dataset.played)) v.play().catch(() => {});
        else v.pause();
      });
    }
    const w = watch(host, paused, () => run());

    function go(n, {instant = false} = {}) {
      const next = key(n);
      if (next === current) return;
      const prev = current;
      current = next;
      host.dataset.scene = next;
      prepare(next);
      prepare(ORDER[ORDER.indexOf(next) + 1]);
      host.querySelectorAll('.ss-scene').forEach(el => el.classList.toggle('is-current', el.dataset.scene === next));
      const v = videoOf(next);
      if (v && !CLIPS[next].once) { try { v.currentTime = 0; } catch (_) { /* not loaded yet */ } }
      run();
      if (instant || prev === null || still()) return;
      // A camera move inside the same shop: the next room settles in while
      // the last one falls away. No carousel, no blank frame.
      const dir = ORDER.indexOf(next) >= ORDER.indexOf(prev) ? 1 : -1;
      const incoming = sceneEl(next), outgoing = sceneEl(prev);
      outgoing?.classList.add('is-leaving');
      outgoing?.animate([{opacity:1, transform:'scale(1)'}, {opacity:0, transform:`scale(1.03) translateX(${-dir * 2}%)`}], {duration:520, easing:IN_OUT})
        .finished.catch(() => {}).finally(() => outgoing.classList.remove('is-leaving'));
      incoming?.animate([{opacity:0, transform:`scale(1.05) translateX(${dir * 2.5}%)`}, {opacity:1, transform:'scale(1)'}], {duration:680, easing:OUT});
    }

    // What she picks travels from the control into the shop and lands with a glow.
    function give(from, art) {
      if (!from || still()) return;
      const a = from.getBoundingClientRect(), b = host.getBoundingClientRect();
      if (!a.width || !b.width) return;
      const token = document.createElement('span');
      token.className = 'ss-token';
      token.innerHTML = art || '';
      const size = 44;
      Object.assign(token.style, {left:`${a.left + a.width / 2 - size / 2}px`, top:`${a.top + a.height / 2 - size / 2}px`});
      (host.closest('dialog') || document.body).appendChild(token);
      const tx = b.left + b.width * .52 - (a.left + a.width / 2), ty = b.top + b.height * .5 - (a.top + a.height / 2);
      token.animate([
        {transform:'translate(0,0) scale(1)', opacity:1},
        {transform:`translate(${tx * .5}px, ${ty * .5 - 40}px) scale(.9)`, opacity:1, offset:.55},
        {transform:`translate(${tx}px, ${ty}px) scale(.4)`, opacity:0}
      ], {duration:560, easing:IN_OUT}).finished.catch(() => {}).finally(() => {
        token.remove();
        host.querySelector('.ss-spark')?.animate([{opacity:0, transform:'translate(-50%,-50%) scale(.4)'}, {opacity:.9, transform:'translate(-50%,-50%) scale(1)', offset:.35}, {opacity:0, transform:'translate(-50%,-50%) scale(1.6)'}], {duration:620, easing:'ease-out'});
      });
    }

    function react(kind, value, from, art) { give(from, art); }

    /* The packing: Shima fills the OUJI bag while the receipt fills beside
       her, one line per product, timed across the clip. The clip is six
       seconds of drawing; played at PACK_SPEED the moment takes about three,
       which is as long as a wait should feel. Skip ends it now. */
    const PACK_SPEED = 1.9;
    let finishPack = null;
    function pack(products, {onCount} = {}) {
      const run = ++ticket;
      go('pack');
      const v = videoOf('pack');
      if (!v || still() || !products.length) return Promise.resolve();
      delete v.dataset.played;
      try { v.currentTime = 0; } catch (_) { /* fresh element */ }
      v.playbackRate = PACK_SPEED;
      v.play().catch(() => {});
      const span = (Number.isFinite(v.duration) && v.duration > 1 ? v.duration * 1000 : 6000) / PACK_SPEED - 250;
      const start = 250;
      products.forEach((_, i) => setTimeout(() => { if (run === ticket) onCount?.(i + 1); }, start + (i + 1) * (span - start) / products.length - 200));
      return new Promise(resolve => {
        const end = () => {
          if (finishPack !== end) return;
          finishPack = null;
          v.dataset.played = '1';
          resolve();
        };
        finishPack = end;
        v.addEventListener('ended', end, {once:true});
        setTimeout(end, span + 700);
      });
    }

    function skip() {
      ticket++;
      videoOf('pack')?.pause();
      finishPack?.();
    }

    return {go, react, pack, skip, sync:w.sync, destroy() { ticket++; w.stop(); host.querySelectorAll('video').forEach(v => v.pause()); }, get scene() { return current; }};
  }

  window.SkinStory = {entryMarkup, stageMarkup, mount, mountEntry};
})();
