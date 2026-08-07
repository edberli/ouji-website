/**
 * What a product costs per 100ml, what is in it, and what not to use it with.
 *
 * Every K-beauty shop in Hong Kong sells the same serums at the same
 * prices and tells you nothing that helps you choose between them. Three
 * questions a shopper actually has, and nobody answers:
 *
 *   - is this one better value than that one? (43 serums, all "HK$2xx")
 *   - does it have alcohol or fragrance in it? (the first thing anyone
 *     with reactive skin wants to know)
 *   - can I use these two together? (retinol and an acid in the same
 *     basket is a real problem, and no shop says a word)
 *
 * The answers come from ingredients.json, built offline by
 * scripts/build_ingredients.py. Nothing here calls an API at page load:
 * the data is a single static file, so the badges appear with the card
 * rather than a second later.
 *
 * The honesty rule that shapes all of it: a product whose ingredient list
 * we do not hold shows 未有成分資料, never a clean bill. Half this
 * catalogue has no published list, and reading silence as "safe" would
 * make the label worse than useless — it would make it a lie for the
 * exact person who relies on it.
 */

let INGREDIENTS = null;
let ingredientsPromise = null;

function loadIngredients() {
  if (INGREDIENTS) return Promise.resolve(INGREDIENTS);
  if (!ingredientsPromise) {
    ingredientsPromise = fetch('/ingredients.json')
      .then((r) => (r.ok ? r.json() : {}))
      .catch(() => ({}))
      .then((d) => (INGREDIENTS = d));
  }
  return ingredientsPromise;
}

function ing(handle) {
  return (INGREDIENTS && INGREDIENTS[handle]) || null;
}

/* ─────────────────────────────────────────────
   每 100ml 幾錢
   ───────────────────────────────────────────── */

const UNIT_LABEL = { ml: 'ml', g: 'g', 片: '片' };

/** "HK$112 / 100ml" — or nothing, when we do not know the size. */
function unitPriceLabel(handle) {
  const r = ing(handle);
  if (!r || !r.unitPrice) return '';
  const per = r.per === 10 ? '10片' : `${r.per}${UNIT_LABEL[r.unit] || r.unit}`;
  return `HK$${r.unitPrice % 1 ? r.unitPrice.toFixed(1) : r.unitPrice} / ${per}`;
}

/**
 * Where this sits among the same kind of product — cheapest quarter,
 * dearest quarter, or in between. Rank is only meaningful against like
 * for like, so a toner is compared with toners.
 */
function valueRank(handle) {
  const r = ing(handle);
  if (!r || !r.unitPrice || !INGREDIENTS) return null;
  const peers = Object.values(INGREDIENTS)
    .filter((x) => x.type === r.type && x.unitPrice && x.unit === r.unit)
    .map((x) => x.unitPrice)
    .sort((a, b) => a - b);
  if (peers.length < 6) return null;
  const at = peers.filter((v) => v < r.unitPrice).length / peers.length;
  if (at <= 0.25) return { label: '同類最抵四分一', tone: 'good' };
  if (at >= 0.75) return { label: '同類最貴四分一', tone: 'warn' };
  return null;
}

/* ─────────────────────────────────────────────
   成分避雷
   ───────────────────────────────────────────── */

const FLAG_NOTE = {
  酒精: '含變性酒精，敏感肌或者乾肌可能會覺得繃緊',
  香料: '含香料／香精，係常見致敏原之一',
  精油: '含精油，敏感肌要留意',
};

/** null = 我哋冇佢嘅成分表，唔係「安全」。 */
function safetyFlags(handle) {
  const r = ing(handle);
  if (!r || !r.inci) return null;
  return r.flags || [];
}

function flagChips(handle) {
  const flags = safetyFlags(handle);
  if (flags === null) {
    return '<span class="ing-chip ing-chip--unknown" title="品牌未有公開全成分表">未有成分資料</span>';
  }
  if (!flags.length) {
    return '<span class="ing-chip ing-chip--clean">無酒精 · 無香料 · 無精油</span>';
  }
  return flags
    .map((f) => `<span class="ing-chip ing-chip--warn" title="${FLAG_NOTE[f] || ''}">含${f}</span>`)
    .join('');
}

function activeChips(handle) {
  const r = ing(handle);
  if (!r || !r.actives?.length) return '';
  return r.actives
    .slice(0, 4)
    .map((a) => {
      const pct = strengthOf(r, a);
      return `<span class="ing-chip ing-chip--active">${a}${pct ? ` ${pct}%` : ''}</span>`;
    })
    .join('');
}

const STRENGTH_KEY = {
  視黃醇: ['retinol', 'retinal', '視黃醇', '視黃醛'],
  維他命C: ['vitamin c', 'ascorbic', '維他命 c', '維他命c'],
  煙酰胺: ['niacinamide', '煙酰胺', '煙醯胺'],
  PDRN: ['pdrn'],
  'AHA/BHA': ['aha', 'bha', 'pha'],
};

function strengthOf(r, active) {
  if (!r.strength) return null;
  for (const k of STRENGTH_KEY[active] || []) {
    if (r.strength[k] != null) return r.strength[k];
  }
  return null;
}

/* ─────────────────────────────────────────────
   唔好一齊用
   ───────────────────────────────────────────── */

/**
 * Pairs that irritate when layered on the same night. This is the
 * ordinary advice a good counter assistant gives — use them on alternate
 * evenings — not a medical claim, and the wording stays on that side of
 * the line: it says what may sting, never what will heal.
 */
const CLASHES = [
  ['視黃醇', 'AHA/BHA', '一齊用刺激性會疊加，建議分開早晚或者隔日'],
  ['視黃醇', '維他命C', 'A 醇同高濃度維 C 一齊用容易泛紅，建議維 C 早上、A 醇晚上'],
  ['維他命C', 'AHA/BHA', '兩樣都係酸性活性成分，同一次用可能刺痛'],
];

/**
 * Warnings for a basket. Returns both the clashes and the duplicates —
 * two retinol products is not dangerous, it is just money spent twice.
 */
function basketNotes(handles) {
  const notes = [];
  // Only what a product is sold as counts. Reading the full active list
  // would warn about a moisturiser that happens to contain a trace of
  // salicylic acid, and a warning that fires on everything is ignored.
  const has = {};
  handles.forEach((h) => {
    (ing(h)?.head || []).forEach((a) => {
      has[a] = (has[a] || 0) + 1;
    });
  });
  CLASHES.forEach(([a, b, why]) => {
    if (has[a] && has[b]) notes.push({ kind: 'clash', what: `${a} ＋ ${b}`, why });
  });
  ['視黃醇', '維他命C', 'AHA/BHA'].forEach((a) => {
    if (has[a] > 1) {
      notes.push({
        kind: 'dup',
        what: `${a} × ${has[a]}`,
        why: `你揀咗 ${has[a]} 件${a}產品，功效重疊，一件通常夠用`,
      });
    }
  });
  return notes;
}

function basketNotesHtml(handles) {
  const notes = basketNotes(handles);
  if (!notes.length) return '';
  return `<div class="ing-notes">
    ${notes
      .map(
        (n) => `<div class="ing-note ing-note--${n.kind}">
          <strong>${n.what}</strong><span>${n.why}</span>
        </div>`
      )
      .join('')}
  </div>`;
}
