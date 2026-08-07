/**
 * What a product is made of, and what it needs alongside it.
 *
 * This started out doing more: unit prices, a cheapest-quarter badge, and
 * a basket warning when two products overlapped. All of it worked and all
 * of it was wrong for a shop — it coached people to buy less and to shop
 * on price. Removed. What is left is the part that sells: telling a
 * shopper what a product is built on, and what completes the routine they
 * have already started.
 *
 * Data comes from ingredients.json, built offline by
 * scripts/build_ingredients.py — a single static file, so the chips
 * appear with the card rather than a second later.
 *
 * Silence stays silent. A product whose ingredient list we do not hold
 * shows nothing at all, not a placeholder: an empty label draws the eye
 * to an absence and answers a question nobody asked.
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
  // No published list means no chip. A "未有成分資料" placeholder puts a
  // shrug where a fact should be, on a product that has done nothing
  // wrong.
  if (flags === null) return '';
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
   仲差咩先完整
   ───────────────────────────────────────────── */

/**
 * The steps a basket is missing.
 *
 * Someone buying a serum is building a routine, not buying an object. The
 * serum needs something to seal it in and something to protect it in the
 * morning, and saying so is both the most useful thing on the page and
 * the thing that grows the order. It reads as advice because it is
 * advice — it just happens to sell.
 */
const ROUTINE_STEPS = ['潔面', '爽膚水', '精華', '面霜', '防曬'];

const STEP_PITCH = {
  潔面: '洗得乾淨但唔繃緊，後面幾步先入到去',
  爽膚水: '皮膚濕住嘅時候上精華，吸收得快好多',
  精華: '一套護膚入面真正做嘢嗰支',
  面霜: '冇面霜嘅話，前面搽落去嘅精華會蒸發走',
  防曬: '日頭唔搽防曬，晚上做嘅嘢會白做',
};

/** Which of the five steps this basket has, and which it has not. */
function routineGaps(handles) {
  const have = new Set();
  handles.forEach((h) => {
    const t = ing(h)?.type;
    if (t) have.add(t);
  });
  // 乳液 finishes the same job as 面霜; owning either closes that step.
  if (have.has('乳液')) have.add('面霜');
  if (have.has('安瓶')) have.add('精華');
  if (have.has('化妝水')) have.add('爽膚水');
  return {
    have: ROUTINE_STEPS.filter((s) => have.has(s)),
    missing: ROUTINE_STEPS.filter((s) => !have.has(s)),
  };
}
