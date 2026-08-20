/**
 * 護膚配方 — 拉桿：一個介面，一組答案。
 *
 * The build shipped five ways of answering — tapping a grid, swiping a card
 * away, replying in a thread, dragging a lever, walking a shelf sideways —
 * so the shop could choose one by using them rather than by reading about
 * them. It chose 拉桿. The other four are deleted, along with their CSS and
 * the switcher above them: four unused interfaces do not become free by
 * being hidden, they become four things the next person has to read.
 *
 * What survives is the chooser contract. This file writes into `ans` and
 * knows nothing about matching, so the levers can be rebuilt again without
 * touching a scoring rule.
 */

/* ── shared bits ─────────────────────────────────────────────────────── */

const smQ = (k) => SM_QUESTIONS.find((q) => q.key === k);

function smPickToggle(ans, q, v) {
  if (q.multi) {
    const at = ans[q.key].indexOf(v);
    if (at > -1) ans[q.key].splice(at, 1);
    else if (ans[q.key].length < q.max) ans[q.key].push(v);
  } else {
    ans[q.key] = v;
  }
}

/* One question, one control.
 *
 * The off-scale answers used to sit under the rail as their own chips, so
 * every row was two controls that did the same job and nothing said which
 * one to use. They are stops now — the last ones on the rail, past a gap
 * where the line stops, because 唔清楚 is an answer but it is not a point
 * between 乾 and 油.
 *
 * `off` counts the stops at the tail that are not on the scale. */
// 門口寫「答三條」，就只可以有三條。呢兩支加埋想改善就係嗰三條。
const SM_FIRST = ['skin', 'tex'];

/* 漸進式展開（2026-08-21，Y2K Revision 07）
 *
 * 一入嚟五支拉桿一次過推晒出嚟，首屏成 1500px 高，客未答第一條就要碌。
 * 而家：入嚟淨係得「你嘅皮膚」，答完先向下展開其餘。
 *
 * 敏感程度由「再精準啲」抽返出嚟，擺喺膚質正下方 —— 敏感係獨立一條軸，
 * 唔係乾／中／混合／油入面其中一格：乾性都可以係敏感肌。收埋喺進階區
 * 等於叫客喺「油性」同「敏感」之間二揀一。
 * 答案 key、value、同 skincare-match.js 嗰邊嘅敏感肌排除邏輯一個字都冇改。 */
const SM_TOP = ['skin'];
const SM_FOLLOW = ['sens', 'tex'];

const SM_ROWS = [
  { key: 'skin', label: '你嘅皮膚', req: true, off: 1,
    stops: [['dry', '乾性'], ['normal', '中性'], ['combo', '混合性'], ['oily', '油性'],
      ['unsure', '唔清楚']] },
  // Sensitivity is its own axis, not a point on the oil one.
  //
  // It was a stop on the skin rail, which forced a choice nobody should have
  // to make: a shopper who is 乾性 *and* 敏感 had to give up one of them. It
  // was then taken off that rail on the grounds that 泛紅敏感 already exists
  // in 想改善 — but that is a goal ("I want the redness fixed"), and this is
  // a fact about her skin that holds whether or not she is trying to fix
  // anything. 131 of 503 products are labelled avoid for sensitive skin;
  // being unable to state the fact meant being unable to exclude them.
  { key: 'sens', label: '皮膚易唔易敏感？', off: 0,
    hint: '同上面嗰條唔衝突 —— 乾性、油性都可以係敏感肌',
    stops: [['no', '唔算'], ['some', '有時會'], ['high', '好易敏感']] },
  { key: 'tex', label: '想要咩質地', off: 1,
    stops: [['1', '清爽'], ['2', '中度'], ['3', '滋潤'], ['any', '隨便']] },
  // Age never excludes anything — see SM_AGE_LEAN. It is asked because a
  // 20-year-old and a 50-year-old walking into the same shelf are not
  // shopping for the same thing, and because the shop has never once been
  // able to say who its skincare customers are.
  { key: 'age', label: '年齡', hint: '只用嚟排先後，唔會篩走任何嘢', off: 1,
    stops: [['u24', '24 歲或以下'], ['a25', '25–34'], ['a35', '35–44'], ['a45', '45 歲或以上'],
      ['skip', '唔講']] },
  // The safety gate, asked without the jargon.
  //
  // It read 「用過酸類或者 A 醇未？」 with 未用過／用過少少／好耐受, which is a
  // question about ingredient categories most shoppers have never heard
  // named — the ones who most need the gentle end are exactly the ones who
  // cannot answer it. The values are unchanged and so is the rule they
  // drive (SM_IRR_CAP); only the words are. It cannot simply be dropped:
  // without it every routine is either capped at the mildest third of the
  // shelf or free to hand a beginner the strongest thing on it.
  { key: 'tol', label: '想個配方有幾溫和？', req: true,
    hint: '新手揀「要好溫和」就啱',
    stops: [['none', '要好溫和'], ['some', '一般'], ['ok', '夠力都得']] },
];

/* One row of the lever.
 *
 * The lever was right; what was wrong was that it opened parked on its
 * middle notch with two of three segments already filled gold, and that the
 * notches were blank boxes with only the two ends named. So: every stop
 * says what it is, and until she moves it there is no handle on the rail at
 * all — an empty track cannot be mistaken for an answer.
 *
 * The answers that are not positions on the scale — 唔清楚, 隨便, 唔講 — are
 * the last stops on the same rail, past a break where the line stops. They
 * took the same handle and the same gesture; they were never a second
 * control sitting underneath the first. */
function smLever(d, ans) {
  const i = d.stops.findIndex(([v]) => v === ans[d.key]);
  const off = d.off || 0;
  const scale = d.stops.length - off;
  const stop = ([v, name], k) => `<button type="button"
    class="dl__stop${k >= scale ? ' dl__stop--off' : ''}" role="radio"
    data-row="${smEsc(d.key)}" data-val="${smEsc(v)}" data-i="${k}"
    aria-checked="${ans[d.key] === v}"><span class="dl__stop-dot"></span>
    <span class="dl__stop-name">${smEsc(name)}</span></button>`;

  // Two columns, always. The scale takes the same share of the row on every
  // lever and the off-scale answers take the same fixed column beside it —
  // including on 用過酸類, which has none. Without that reserved column each
  // rail ended wherever its own stop count happened to put it, and four
  // levers of four different lengths read as four unrelated controls.
  return `<div class="dl__row">
    <p class="dl__label">${smEsc(d.label)}${d.req && !ans[d.key]
      ? '<span class="dl__req">要揀</span>' : ''}${d.hint
      ? `<span class="dl__hint">${smEsc(d.hint)}</span>` : ''}</p>
    <div class="dl__stops${i < 0 ? ' is-unset' : ''}${i >= scale ? ' is-off' : ''}"
         data-lever="${smEsc(d.key)}"
         style="--s:${scale};--o:${off || 1};--i:${i < 0 || i >= scale ? 0 : i};--j:${
           i >= scale ? i - scale : 0}"
         role="radiogroup" aria-label="${smEsc(d.label)}">
      <span class="dl__scale">
        <span class="dl__rail" aria-hidden="true"></span>
        <span class="dl__knob" aria-hidden="true"></span>
        ${d.stops.slice(0, scale).map((s, k) => stop(s, k)).join('')}
      </span>
      <span class="dl__off">
        <span class="dl__knob" aria-hidden="true"></span>
        ${d.stops.slice(scale).map((s, k) => stop(s, scale + k)).join('')}
      </span>
    </div>
    ${i < 0 ? '<p class="dl__unset">拉或者撳一撳</p>' : ''}
  </div>`;
}

/* What you want out of the shop today. Not everyone arrives wanting a
   whole routine; plenty know they need one serum and nothing else. */
const SM_WANT = [
  { v: 'set', name: '成套' }, { v: 'cleanse', name: '潔面' },
  { v: 'toner', name: '爽膚水' }, { v: 'serum', name: '精華' },
  { v: 'cream', name: '面霜' }, { v: 'sun', name: '防曬' },
];

/* Advanced, and folded away, because most people do not need any of it —
   but the ones who do are the ones who get hurt by getting it wrong.
   Every switch here reads the brand's own ingredient list. Products with
   no published list cannot satisfy these, and the count says so out loud
   rather than quietly dropping them. */
const SM_ADV = [
  { k: 'noAlcohol', name: '無酒精' },
  { k: 'noFragrance', name: '無香料' },
  { k: 'noOil', name: '無精油' },
  { k: 'noAcid', name: '唔要酸類' },
  { k: 'preg', name: '孕婦／哺乳' },
  { k: 'beg', name: '新手友好' },
];

const SM_WANT_ACTIVE = ['煙酰胺', '積雪草', '透明質酸', '神經醯胺', '維他命C', '胜肽', '視黃醇'];

/* The routine as it stands, computed offline so it can move under a thumb.
   Ties are common — at a loose setting two dozen creams can share the top
   score — so they are broken on transparency: a product whose brand
   published its full ingredient list wins, because that is the thing this
   shop can actually stand behind. Never on price; ranking our own stock by
   what it costs is the shop marking its own homework. */
function smPreview(ans) {
  const used = new Set();
  const steps = (ans.want && ans.want !== 'set') ? ans.want : SM_STEPS;
  return steps.map((step) => {
    const pool = [];
    for (const [h, a] of Object.entries(SM.attrs)) {
      if (a.step !== step || !smEligible(a, ans, h)) continue;
      pool.push({ h, a, s: smScore(a, ans) });
    }
    pool.sort(smRank);
    const top = smSpread(pool, used);
    if (top) { const v = SM_BAKED?.[top.h]?.vendor; if (v) used.add(v); }
    return {
      step,
      handle: top ? top.h : null,
      vendor: top ? (top.a.v || '') : '',
      title: top ? (top.a.t || '') : '',
    };
  });
}

/* 展開之後嘅善後：碌位 ＋ 讀屏宣告。
   prefers-reduced-motion 之下唔用 smooth scroll。 */
function smAfterReveal() {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const target = document.querySelector('[data-lever="sens"]')?.closest('.dl__row');
  if (target) {
    target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
  }
  let live = document.getElementById('sm-live');
  if (!live) {
    live = document.createElement('p');
    live.id = 'sm-live';
    live.className = 'visually-hidden';
    live.setAttribute('aria-live', 'polite');
    document.body.appendChild(live);
  }
  live.textContent = '其他問題已展開';
}

const smModeDials = {
  id: 'dials', name: '拉桿', gesture: '拉住郁 · 即時見到套嘢',
  /* 「答三條」以前係講大話：門口寫三條，撳開係五支拉桿、十一個 chip、
     兩個抽屜，1592px 高。呢度唔係改文案 —— 係將張表縮返做三條。
     頭三條＝皮膚、質地、想改善（要揀嘅只有皮膚同想改善）。
     敏感、年齡、酸類耐受、品牌、進階要求全部收埋落一個「再精準啲」，
     由本來兩個抽屜合併成一個。 */
  init(st, ans) {
    // 質地 is the only one with a real default, because 「隨便」 is a genuine
    // answer and it is the one shown as chosen. Everything else stays empty.
    ans.tex = ans.tex || 'any';
    ans.want = ans.want || 'set';
    ans.adv = ans.adv || {};
    ans.brands = ans.brands || [];
    ans.fine = ans.fine || {};
    st.fine = st.fine || false;
  },
  render(st, ans) {
    const c = smQ('concerns');
    const advOn = Object.values(ans.adv).filter(Boolean).length;

    /* Brands, folded away and defaulted to all of them.
       Someone who walked in for Round Lab and nothing else should be able
       to say so before being handed a routine of five other names — but
       putting 23 chips above the dials would turn a shop into a filter
       sidebar, and this shop's whole argument is that it chooses for you.
       So: shut by default, open in one tap, counts on every chip. */
    const steps = (ans.want && ans.want !== 'set') ? ans.want : SM_STEPS;
    const vendors = smVendors(ans, steps);

    const revealed = !!ans.skin;

    return `<div class="dl">
      <div class="dl__xp">
        <div class="dl__bar-top">
          <span class="dl__bar-name">OUJI Skin Control Panel — 護膚配方</span>
          <span class="dl__bar-ctl" aria-hidden="true"><i>_</i><i>□</i><i>×</i></span>
        </div>
        <div class="dl__menu" aria-hidden="true"><span>配方(F)</span><span>設定(S)</span><span>說明(H)</span></div>
        <div class="dl__ws">
          <aside class="dl__cat">
            <ol class="dl__steps" aria-hidden="true">
              <li><b>1</b>你嘅皮膚</li><li><b>2</b>敏感程度＋質地</li><li><b>3</b>想改善</li>
            </ol>
            <p class="dl__bubble" aria-hidden="true">先答膚質，下面就會自動展開啦～</p>
            <img class="dl__cat-img" src="assets/images/home/ouji-shima-cat.png"
                 alt="" width="1200" height="1310" loading="lazy" decoding="async">
          </aside>
          <div class="dl__form">
            <div class="dl__cat-strip" aria-hidden="true">
              <img src="assets/images/home/ouji-shima-cat.png" alt=""
                   width="1200" height="1310" loading="lazy" decoding="async">
              <span><b>芝麻幫你揀</b>先答第一條，其他選項會喺下面展開。</span>
            </div>

      ${SM_ROWS.filter((d) => SM_TOP.includes(d.key)).map((d) => smLever(d, ans)).join('')}

      ${revealed ? '' : `<p class="dl__cue"><span>揀一項，下面會展開其他問題</span><b>↓</b></p>`}

      <div class="dl__follow"${revealed ? '' : ' hidden'}>
      ${SM_ROWS.filter((d) => SM_FOLLOW.includes(d.key)).map((d) => smLever(d, ans)).join('')}

      <div class="dl__concerns">
        <p class="dl__label">想改善<span class="dl__req">要揀</span>
          <span class="dl__hint">最多三樣，撳嘅次序＝優先</span></p>
        <div class="dl__tags">
          ${c.options.map((o) => {
            const at = ans.concerns.indexOf(o.v);
            return `<button type="button" class="dl__tag" data-pick="${smEsc(o.v)}"
              aria-pressed="${at > -1}">${at > -1 ? `<b>${at + 1}</b>` : ''}${smEsc(o.name)}</button>`;
          }).join('')}
        </div>
      </div>

      <button type="button" class="dl__more" data-fine aria-expanded="${st.fine}">
        再精準啲${(() => {
          const n = (ans.sens ? 1 : 0) + (ans.age ? 1 : 0) + (ans.tol ? 1 : 0)
            + ans.brands.length + advOn;
          return n ? `（開咗 ${n} 項）` : '';
        })()}
      </button>
      ${st.fine ? `<div class="dl__adv">
        ${SM_ROWS.filter((d) => !SM_TOP.includes(d.key) && !SM_FOLLOW.includes(d.key)).map((d) => smLever(d, ans)).join('')}

        <p class="dl__label" style="margin-top:1.4rem">品牌${
          ans.brands.length ? `（揀咗 ${ans.brands.length} 個）` : `（全部 ${vendors.length} 個）`}</p>
        <div class="dl__tags">
          <button type="button" class="dl__tag" data-brand-all
            aria-pressed="${!ans.brands.length}">全部品牌</button>
          ${vendors.map((x) => `<button type="button" class="dl__tag" data-brand="${smEsc(x.v)}"
            aria-pressed="${ans.brands.includes(x.v)}">${smEsc(x.v)}<i>${x.n}</i></button>`).join('')}
        </div>
        <p class="dl__note">唔揀＝全部品牌。個數係喺你而家嘅條件下，嗰個牌子仲有幾多件啱你。</p>

        <p class="dl__label" style="margin-top:1.4rem">進階要求${advOn ? `（開咗 ${advOn} 項）` : ''}</p>
        <div class="dl__tags">
          ${SM_ADV.map((a) => `<button type="button" class="dl__tag" data-adv-k="${a.k}"
            aria-pressed="${!!ans.adv[a.k]}">${smEsc(a.name)}</button>`).join('')}
        </div>
        <p class="dl__label" style="margin-top:1rem">指定要含</p>
        <div class="dl__tags">
          <button type="button" class="dl__tag" data-active="" aria-pressed="${!ans.adv.want}">唔指定</button>
          ${SM_WANT_ACTIVE.map((n) => `<button type="button" class="dl__tag" data-active="${smEsc(n)}"
            aria-pressed="${ans.adv.want === n}">${smEsc(n)}</button>`).join('')}
        </div>
        <p class="dl__note">成分類要求只會揀到<b>品牌公開咗全成分表</b>嘅產品（唔係每件貨都公開）。
          冇公開成分表唔代表含有，只係我哋唔知 —— 所以唔會當作符合。</p>
      </div>` : ''}

      ${(() => {
        // Say what is still missing rather than greying out and going quiet.
        const need = SM_ROWS.filter((d) => SM_TOP.includes(d.key) && d.req && !ans[d.key])
          .map((d) => d.label)
          .concat(ans.concerns.length ? [] : ['想改善']);
        // 質地 starts on 隨便 by design, so it does not count as touched.
        const touched = ans.skin || ans.sens || ans.tol || ans.age || ans.tex !== 'any'
          || ans.concerns.length || ans.brands.length || ans.want !== 'set'
          || Object.values(ans.adv).some(Boolean);
        // One count, not twenty. A number on every chip turns a shop into a
        // scoreboard; the single running total is the thing she was promised
        // and the only one that changes meaningfully as she answers.
        /* What she is shopping for sits with the button that acts on it.
           It used to be the first row of the panel — asked before she had
           said a word about her skin, and then eight rows away from the
           button whose wording it changes. Down here 「精華」 and 「睇精華」
           are the same gesture, one after the other. */
        return `<div class="dl__bar">
          <div class="dl__want" role="group" aria-label="要邊幾步">
            ${SM_WANT.map((w) => `<button type="button" class="dl__want-b" data-want="${w.v}"
              aria-pressed="${w.v === 'set' ? ans.want === 'set'
                : (ans.want !== 'set' && ans.want.includes(w.v))}">${smEsc(w.name)}</button>`).join('')}
          </div>
          <div class="dl__acts">
            <button type="button" class="dl__go" data-finish ${need.length ? 'disabled' : ''}>
              ${need.length ? '仲要揀：' + need.map((x) => smEsc(x.replace(/[？?].*$/, ''))).join('、')
                : (ans.want === 'set' ? '睇成套'
                  : '睇' + ans.want.map((k) => SM_STEP_ZH[k]).join('、'))}</button>
            ${touched ? '<button type="button" class="dl__reset" data-reset>重設</button>' : ''}
          </div>
        </div>`;
      })()}
      </div>
          </div>
        </div>
      </div>
    </div>`;
  },
  click(e, st, ans) {
    const n = e.target.closest('[data-row]');
    if (n) {
      const first = n.dataset.row === 'skin' && !ans.skin;
      ans[n.dataset.row] = n.dataset.val;
      /* 第一次答膚質先做：碌去「皮膚易唔易敏感？」附近，讀屏補一句。
         唔搶 focus —— 客可能仲想改膚質，focus 應該留喺原本嗰粒掣。
         redraw 係同步嘅，所以下一個 tick 個 DOM 已經砌好。 */
      if (first) setTimeout(() => smAfterReveal(), 0);
      return 'redraw';
    }
    if (e.target.closest('[data-reset]')) {
      Object.assign(ans, { skin: '', sens: '', concerns: [], tol: '', tex: 'any', age: '',
        want: 'set', adv: {}, brands: [], fine: {} });
      st.fine = false;
      return 'redraw';
    }
    const w = e.target.closest('[data-want]');
    if (w) {
      const v = w.dataset.want;
      if (v === 'set') ans.want = 'set';
      else {
        const cur = ans.want === 'set' ? [] : ans.want.slice();
        const at = cur.indexOf(v);
        if (at > -1) cur.splice(at, 1); else cur.push(v);
        ans.want = cur.length ? cur : 'set';
      }
      return 'redraw';
    }
    const p = e.target.closest('[data-pick]');
    if (p) { smPickToggle(ans, smQ('concerns'), p.dataset.pick); return 'redraw'; }
    if (e.target.closest('[data-fine]')) { st.fine = !st.fine; return 'redraw'; }
    if (e.target.closest('[data-brand-all]')) { ans.brands = []; return 'redraw'; }
    const bd = e.target.closest('[data-brand]');
    if (bd) {
      const at = ans.brands.indexOf(bd.dataset.brand);
      if (at > -1) ans.brands.splice(at, 1); else ans.brands.push(bd.dataset.brand);
      return 'redraw';
    }
    const ak = e.target.closest('[data-adv-k]');
    if (ak) { ans.adv[ak.dataset.advK] = !ans.adv[ak.dataset.advK]; return 'redraw'; }
    const av = e.target.closest('[data-active]');
    if (av) { ans.adv.want = av.dataset.active || null; return 'redraw'; }
    if (e.target.closest('[data-finish]')) return 'finish';
  },
};


/* One mode. The build shipped five ways of answering so the shop could
   pick; it picked 拉桿, and the other four are gone rather than left to rot
   behind a switcher nobody would ever be shown. */
const SM_MODES = [smModeDials];
