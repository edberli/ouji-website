/**
 * Awards a product has actually won.
 *
 * Every entry is a published result from a named award — the body, the
 * year, the category and the place, as that body published them. Nothing
 * here is read off a badge printed on a packshot, and nothing is inferred
 * from a brand's own marketing.
 *
 * A line is listed only where the winning product is the line we stock.
 * Where an award went to a variant we do not carry — a mini, a shade, a
 * differently-named sibling — it is left out rather than claimed, which
 * is why some obvious brands have fewer entries than their PR suggests.
 *
 * Bodies used, and what they measure:
 *   OLIVE_YOUNG  올리브영 어워즈 — ranked on Olive Young's own sales and
 *                review data; the 2025 round drew on 180m purchase records
 *   GLOWPICK     글로우픽 어워드 — ranked purely on verified consumer reviews
 *   HWAHAE       화해 어워드 — Korea's largest ingredient-and-review platform
 *   ALLURE_RC    Allure Readers' Choice — voted by Allure's readership
 *   ALLURE_BOB   Allure Best of Beauty — chosen by Allure's editors
 *   COSME        @cosme ベストコスメアワード — Japan's largest review site
 */
const AWARD_BODIES = {
  OLIVE_YOUNG: { name: 'Olive Young Awards', short: '올리브영', region: '韓國' },
  GLOWPICK: { name: 'Glowpick Awards', short: 'GLOWPICK', region: '韓國' },
  HWAHAE: { name: '화해 Hwahae Awards', short: '화해', region: '韓國' },
  ALLURE_RC: { name: "Allure Readers' Choice Awards", short: 'Allure', region: '美國' },
  ALLURE_BOB: { name: 'Allure Best of Beauty', short: 'Allure', region: '美國' },
  COSME: { name: '@cosme Best Cosmetics Award', short: '@cosme', region: '日本' },
};

/* handle -> [{ body, year, category, rank, note }]
   rank 0 means the body named it a winner without ranking it. */
const AWARDS = {
  /* ---------- 唇 ---------- */
  'romand-juicy-lasting-tint': [
    { body: 'OLIVE_YOUNG', year: 2023, category: '唇妝', rank: 1, note: '25 Bare Grape' },
    { body: 'OLIVE_YOUNG', year: 2024, category: '唇妝', rank: 1, note: '03 Bare Grape' },
    { body: 'OLIVE_YOUNG', year: 2025, category: '唇釉', rank: 1 },
    { body: 'HWAHAE', year: 2024, category: '唇釉', rank: 1 },
    { body: 'HWAHAE', year: 2025, category: '唇釉', rank: 2 },
  ],
  'peripera-ink-mood-glowytint': [
    { body: 'OLIVE_YOUNG', year: 2023, category: '唇妝', rank: 2, note: '03 Rose in Mind' },
    { body: 'OLIVE_YOUNG', year: 2024, category: '唇妝', rank: 3, note: '03 Rose in Mind' },
    { body: 'OLIVE_YOUNG', year: 2025, category: '唇釉', rank: 3 },
    { body: 'HWAHAE', year: 2024, category: '唇釉', rank: 2 },
    { body: 'HWAHAE', year: 2025, category: '唇釉', rank: 3 },
  ],
  'hince-raw-glow-gel-tint': [
    { body: 'GLOWPICK', year: 2024, category: '水光唇釉', rank: 1 },
    { body: 'GLOWPICK', year: 2025, category: '水光唇釉', rank: 1 },
  ],
  'dasique-juicy-dewy-lip-tint': [
    { body: 'GLOWPICK', year: 2024, category: '水感唇釉', rank: 1 },
  ],
  'laka-fruity-glam-tint-mini-duo': [
    { body: 'GLOWPICK', year: 2025, category: '水光唇釉', rank: 3 },
  ],
  'tirtir-waterism-glow-tint': [
    { body: 'GLOWPICK', year: 2025, category: '水光唇釉', rank: 2, note: '得獎嘅係迷你裝' },
  ],
  'romand-glasting-color-gloss': [
    { body: 'GLOWPICK', year: 2024, category: '唇蜜', rank: 2 },
    { body: 'GLOWPICK', year: 2025, category: '唇蜜', rank: 2 },
    { body: 'HWAHAE', year: 2024, category: '唇蜜', rank: 2 },
    { body: 'HWAHAE', year: 2025, category: '唇蜜', rank: 2 },
  ],
  'romand-lip-mate-pencil': [
    { body: 'GLOWPICK', year: 2024, category: '唇筆', rank: 3 },
    { body: 'GLOWPICK', year: 2025, category: '唇筆', rank: 1 },
  ],
  'heart-percent-lip-pencil': [
    { body: 'GLOWPICK', year: 2024, category: '唇筆', rank: 2 },
    { body: 'GLOWPICK', year: 2025, category: '唇筆', rank: 3 },
    { body: 'HWAHAE', year: 2024, category: '唇膏', rank: 3 },
    { body: 'HWAHAE', year: 2025, category: '唇膏', rank: 3 },
  ],
  'heart-percent-lip-pencil-slim': [
    { body: 'GLOWPICK', year: 2024, category: '唇線筆', rank: 3 },
  ],
  'coralhaze-volumizing-lip-fondue': [
    { body: 'GLOWPICK', year: 2024, category: '有色潤唇膏', rank: 2 },
  ],
  'braye-lipsleek': [
    { body: 'GLOWPICK', year: 2024, category: '唇頰兩用', rank: 1 },
    { body: 'GLOWPICK', year: 2025, category: '唇頰兩用', rank: 1 },
  ],
  'hince-raw-glow-dewy-ball': [
    { body: 'GLOWPICK', year: 2025, category: '唇頰兩用', rank: 2 },
  ],

  /* ---------- 眼 ---------- */
  'wakemake-soft-blurring-eye-palette': [
    { body: 'OLIVE_YOUNG', year: 2023, category: '彩妝', rank: 1, note: '02 Vitality Blurring' },
    { body: 'OLIVE_YOUNG', year: 2024, category: '眼影盤', rank: 1, note: '04 Lavender Blurring' },
    { body: 'OLIVE_YOUNG', year: 2025, category: '眼影盤', rank: 1 },
    { body: 'HWAHAE', year: 2025, category: '眼影', rank: 2 },
  ],
  'dasique-eyeshadow-palette': [
    { body: 'OLIVE_YOUNG', year: 2023, category: '彩妝', rank: 2, note: '07 Milk Latte' },
    { body: 'OLIVE_YOUNG', year: 2024, category: '眼影盤', rank: 2, note: '07 Milk Latte' },
    { body: 'OLIVE_YOUNG', year: 2025, category: '眼影盤', rank: 2 },
  ],
  'romand-better-than-palette': [
    { body: 'OLIVE_YOUNG', year: 2023, category: '彩妝', rank: 3, note: '06 Peony Nude Garden' },
    { body: 'HWAHAE', year: 2024, category: '眼影', rank: 2 },
  ],
  'clio-kill-lash-superproof-mascara': [
    { body: 'OLIVE_YOUNG', year: 2023, category: '眼妝', rank: 1 },
    { body: 'OLIVE_YOUNG', year: 2024, category: '眼妝', rank: 1 },
    { body: 'GLOWPICK', year: 2024, category: '濃密睫毛膏', rank: 3 },
    { body: 'GLOWPICK', year: 2025, category: '纖長睫毛膏', rank: 1 },
    { body: 'GLOWPICK', year: 2025, category: '濃密睫毛膏', rank: 3 },
  ],
  'dasique-volume-curl-mascara': [
    { body: 'GLOWPICK', year: 2024, category: '纖長睫毛膏', rank: 2 },
  ],
  'clio-sharp-so-simple-pencil-liner': [
    { body: 'GLOWPICK', year: 2024, category: '眼線筆', rank: 1 },
    { body: 'GLOWPICK', year: 2025, category: '眼線筆', rank: 1 },
    { body: 'HWAHAE', year: 2024, category: '眼線', rank: 1 },
    { body: 'HWAHAE', year: 2025, category: '眼線', rank: 1 },
  ],
  'lilybyred-starry-eyes-gel-eyeliner': [
    { body: 'GLOWPICK', year: 2024, category: '眼線膠筆', rank: 2 },
    { body: 'GLOWPICK', year: 2025, category: '眼線膠筆', rank: 3 },
  ],
  'clio-kill-brow-auto-hard-pencil': [
    { body: 'OLIVE_YOUNG', year: 2023, category: '眼妝', rank: 3 },
    { body: 'OLIVE_YOUNG', year: 2025, category: '眼妝', rank: 3 },
    { body: 'GLOWPICK', year: 2024, category: '眉筆', rank: 3 },
    { body: 'HWAHAE', year: 2024, category: '眉部產品', rank: 1 },
    { body: 'HWAHAE', year: 2025, category: '眉部產品', rank: 2 },
  ],
  'romand-han-all-brow-cara': [
    { body: 'GLOWPICK', year: 2024, category: '染眉膏', rank: 2 },
  ],

  /* ---------- 頰 · 修容 ---------- */
  'fwee-lip-cheek-blurry-pudding-pot': [
    { body: 'OLIVE_YOUNG', year: 2024, category: '修容', rank: 0, note: "Olive Young's Pick" },
    { body: 'OLIVE_YOUNG', year: 2025, category: '修容', rank: 1 },
    { body: 'HWAHAE', year: 2024, category: '唇膏', rank: 2 },
  ],
  'romand-better-than-cheek': [
    { body: 'OLIVE_YOUNG', year: 2024, category: '修容', rank: 3, note: 'C02 Blueberry Chip' },
    { body: 'HWAHAE', year: 2024, category: '胭脂', rank: 1 },
    { body: 'HWAHAE', year: 2025, category: '胭脂', rank: 2 },
  ],
  'dasique-blending-mood-cheek': [
    { body: 'GLOWPICK', year: 2024, category: '胭脂盤', rank: 1 },
    { body: 'GLOWPICK', year: 2025, category: '胭脂盤', rank: 2 },
  ],
  'hince-dewy-liquid-cheek': [
    { body: 'GLOWPICK', year: 2024, category: '液態胭脂', rank: 3 },
  ],
  '2an-dual-cheek': [
    { body: 'GLOWPICK', year: 2025, category: '粉狀胭脂', rank: 3 },
  ],
  'peripera-new-v-shading': [
    { body: 'GLOWPICK', year: 2025, category: '粉狀修容', rank: 1 },
    { body: 'HWAHAE', year: 2024, category: '修容', rank: 2 },
    { body: 'HWAHAE', year: 2025, category: '修容', rank: 1 },
  ],
  'hince-true-dimension-radiance-balm': [
    { body: 'GLOWPICK', year: 2024, category: '膏狀高光', rank: 1 },
    { body: 'GLOWPICK', year: 2025, category: '膏狀高光', rank: 1 },
    { body: 'HWAHAE', year: 2024, category: '高光', rank: 1 },
  ],
  'glint-highlighter': [
    { body: 'GLOWPICK', year: 2023, category: '高光', rank: 1 },
    { body: 'GLOWPICK', year: 2024, category: '粉狀高光', rank: 1, note: '連續兩年' },
  ],
  'glint-stick-highlighter': [
    { body: 'GLOWPICK', year: 2024, category: '膏狀高光', rank: 3 },
  ],
  '2an-pure-glash-highlighter': [
    { body: 'GLOWPICK', year: 2025, category: '粉狀高光', rank: 3 },
  ],
  'lilybyred-luv-beam-glow-veil': [
    { body: 'HWAHAE', year: 2024, category: '高光', rank: 3 },
  ],

  /* ---------- 底妝 ---------- */
  'clio-kill-cover-founwear-cushion': [
    { body: 'OLIVE_YOUNG', year: 2023, category: '氣墊粉底', rank: 1, note: 'The New Founwear' },
    { body: 'OLIVE_YOUNG', year: 2024, category: '氣墊粉底', rank: 3, note: 'The Original' },
    { body: 'OLIVE_YOUNG', year: 2025, category: '氣墊粉底', rank: 2 },
  ],
  'hince-second-skin-mesh-matte-cushion': [
    { body: 'OLIVE_YOUNG', year: 2024, category: '氣墊粉底', rank: 0, note: "Olive Young's Pick" },
    { body: 'OLIVE_YOUNG', year: 2025, category: '氣墊粉底', rank: 3 },
    { body: 'GLOWPICK', year: 2025, category: '啞光氣墊', rank: 2 },
  ],
  'tirtir-mask-fit-red-cushion': [
    { body: 'ALLURE_RC', year: 2026, category: '韓國美妝', rank: 1 },
    { body: 'COSME', year: 2024, category: '氣墊粉底', rank: 1, note: '首個攞到日本年度氣墊第一嘅韓國品牌' },
  ],
  'tirtir-mask-fit-makeup-fixer': [
    { body: 'ALLURE_BOB', year: 2025, category: '定妝噴霧', rank: 0 },
  ],

  /* ---------- 工具 ---------- */
  'braye-pocket-lip-brush': [
    { body: 'GLOWPICK', year: 2024, category: '唇刷', rank: 1 },
    { body: 'GLOWPICK', year: 2025, category: '唇刷', rank: 1 },
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
  // rank 0 (unranked winner) sorts last within its year.
  const key = (a) => (a.rank === 0 ? 99 : a.rank);
  const best = [...list].sort((a, b) => b.year - a.year || key(a) - key(b))[0];
  return { ...best, bodyName: AWARD_BODIES[best.body].short };
}

function rankLabel(rank) {
  return rank === 0 ? '得獎' : rank === 1 ? '第一位' : `第${rank}位`;
}

function awardLabel(a) {
  return `${a.year} ${AWARD_BODIES[a.body].short} ${a.category}${rankLabel(a.rank)}`;
}

function awardRibbon(handle) {
  const a = topAward(handle);
  if (!a) return '';
  const rank = a.rank === 0 ? 'WINNER' : `NO.${a.rank}`;
  const count = awardsFor(handle).length;
  return `<span class="award-ribbon" title="${awardLabel(a)}${count > 1 ? ` · 共 ${count} 項` : ''}">
    <span class="award-ribbon__rank">${rank}</span>
    <span class="award-ribbon__body">${a.bodyName} ${a.year}</span>
  </span>`;
}
