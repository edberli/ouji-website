/**
 * Awards a product has actually won.
 *
 * Every entry is a published result from a named award, with the body,
 * the year and the rank as that body published it — nothing here is a
 * marketing line lifted off a packshot. A product is listed only if we
 * stock the exact line that won; where a brand won with a shade we do
 * not carry, the line is still listed and the winning shade named, which
 * is what the award bodies themselves publish.
 *
 * Bodies used, and what they are:
 *   OLIVE_YOUNG  올리브영 어워즈 — ranked on Olive Young's own sales and
 *                review data, the biggest health-and-beauty chain in Korea
 *   GLOWPICK     글로우픽 — ranked purely on verified consumer reviews
 *   ALLURE       Allure Readers' Choice — voted by Allure's readership
 *   COSME        @cosme ベストコスメアワード — Japan's largest review site
 */
const AWARD_BODIES = {
  OLIVE_YOUNG: { name: 'Olive Young Awards', short: '올리브영', region: '韓國' },
  GLOWPICK: { name: 'Glowpick Awards', short: 'GLOWPICK', region: '韓國' },
  ALLURE: { name: "Allure Readers' Choice Awards", short: 'Allure', region: '美國' },
  COSME: { name: '@cosme Best Cosmetics Award', short: '@cosme', region: '日本' },
};

/* handle -> [{ body, year, category, rank, note }] */
const AWARDS = {
  'romand-juicy-lasting-tint': [
    { body: 'OLIVE_YOUNG', year: 2023, category: '唇妝', rank: 1, note: '25 Bare Grape' },
    { body: 'OLIVE_YOUNG', year: 2025, category: '唇釉', rank: 1 },
  ],
  'peripera-ink-mood-glowytint': [
    { body: 'OLIVE_YOUNG', year: 2023, category: '唇妝', rank: 2, note: '03 Rose in Mind' },
    { body: 'OLIVE_YOUNG', year: 2025, category: '唇釉', rank: 3 },
  ],
  'wakemake-soft-blurring-eye-palette': [
    { body: 'OLIVE_YOUNG', year: 2023, category: '彩妝', rank: 1, note: '02 Vitality Blurring' },
    { body: 'OLIVE_YOUNG', year: 2025, category: '眼影盤', rank: 1 },
  ],
  'dasique-eyeshadow-palette': [
    { body: 'OLIVE_YOUNG', year: 2023, category: '彩妝', rank: 2, note: '07 Milk Latte' },
    { body: 'OLIVE_YOUNG', year: 2025, category: '眼影盤', rank: 2 },
  ],
  'romand-better-than-palette': [
    { body: 'OLIVE_YOUNG', year: 2023, category: '彩妝', rank: 3, note: '06 Peony Nude Garden' },
  ],
  'clio-kill-lash-superproof-mascara': [
    { body: 'OLIVE_YOUNG', year: 2023, category: '眼妝', rank: 1 },
  ],
  'clio-kill-brow-auto-hard-pencil': [
    { body: 'OLIVE_YOUNG', year: 2023, category: '眼妝', rank: 3 },
    { body: 'OLIVE_YOUNG', year: 2025, category: '眼妝', rank: 3 },
  ],
  'clio-kill-cover-founwear-cushion': [
    { body: 'OLIVE_YOUNG', year: 2023, category: '氣墊粉底', rank: 1, note: 'The New Founwear' },
    { body: 'OLIVE_YOUNG', year: 2025, category: '氣墊粉底', rank: 2 },
  ],
  'hince-second-skin-mesh-matte-cushion': [
    { body: 'OLIVE_YOUNG', year: 2025, category: '氣墊粉底', rank: 3 },
  ],
  'fwee-lip-cheek-blurry-pudding-pot': [
    { body: 'OLIVE_YOUNG', year: 2025, category: '修容', rank: 1 },
  ],
  'glint-highlighter': [
    { body: 'GLOWPICK', year: 2023, category: '高光', rank: 1 },
    { body: 'GLOWPICK', year: 2024, category: '粉狀高光', rank: 1, note: '連續兩年' },
  ],
  'hince-raw-glow-gel-tint': [
    { body: 'GLOWPICK', year: 2025, category: '水光唇釉', rank: 1 },
  ],
  'tirtir-mask-fit-red-cushion': [
    { body: 'ALLURE', year: 2026, category: '韓國美妝', rank: 1 },
    { body: 'COSME', year: 2024, category: '氣墊粉底', rank: 1, note: '首個奪得日本年度氣墊第一嘅韓國品牌' },
  ],
};

function awardsFor(handle) {
  return AWARDS[handle] || [];
}

/** The single line worth putting on a product card. */
function topAward(handle) {
  const list = awardsFor(handle);
  if (!list.length) return null;
  // Newest first, then best rank — a 2025 first place outranks a 2023 one.
  const best = [...list].sort((a, b) => b.year - a.year || a.rank - b.rank)[0];
  return { ...best, bodyName: AWARD_BODIES[best.body].short };
}

function awardLabel(a) {
  const rank = a.rank === 1 ? '第一位' : `第${a.rank}位`;
  return `${a.year} ${AWARD_BODIES[a.body].short} ${a.category}${rank}`;
}

function awardRibbon(handle) {
  const a = topAward(handle);
  if (!a) return '';
  const rank = a.rank === 1 ? 'NO.1' : `NO.${a.rank}`;
  return `<span class="award-ribbon" title="${awardLabel(a)}">
    <span class="award-ribbon__rank">${rank}</span>
    <span class="award-ribbon__body">${a.bodyName} ${a.year}</span>
  </span>`;
}
