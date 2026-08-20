/**
 * 護膚配方 — the edit, not the form.
 *
 * Five questions, then five products in the order you use them, each with
 * the one sentence that says why it is yours. Mounts inline wherever the
 * markup puts it; there is no destination page to travel to.
 *
 * Attributes come from data/attrs.json, labelled offline. Price and stock
 * come live from Shopify at the moment of building the routine, because a
 * baked stock flag is a lie waiting to happen: match-data.json shipped
 * `inStock: true` for products whose only shade was sold out.
 *
 * Nothing here writes copy. Every reason a shopper reads is looked up from
 * the label tables the data file carries, so the wording stays ours.
 */

const SM_STEPS = ['cleanse', 'toner', 'serum', 'cream', 'sun'];

/* What each step is doing in the routine, in the shop's own voice. These
   already exist in ingredients.js as STEP_PITCH for the basket's gap
   prompt; kept in step order so the edit reads as a sequence. */
const SM_STEP_ZH = {
  cleanse: '潔面', toner: '爽膚水', serum: '精華', cream: '面霜', sun: '防曬',
};

const SM_QUESTIONS = [
  {
    key: 'skin', field: 'persimmon', multi: false,
    ask: '你嘅皮膚，平時係點？',
    options: [
      { v: 'dry', name: '乾性', note: '洗完面繃緊，容易起皮' },
      { v: 'oily', name: '油性', note: '中午已經一面油光' },
      { v: 'combo', name: '混合性', note: 'T 字位油，兩頰乾' },
      { v: 'normal', name: '中性', note: '大致穩定，唔算乾又唔算油' },
      { v: 'unsure', name: '唔清楚', note: '冇特別留意過' },
    ],
    wide: true,
  },
  {
    key: 'concerns', field: 'indigo', multi: true, max: 3,
    ask: '想改善嘅，揀最多三樣。',
    hint: '你撳嘅次序就係優先次序。',
    // 黑頭 and 膚質粗糙 were labelled on 30 and 56 products in the five steps
    // and offered to nobody — the option list had been written by hand and
    // never checked against the vocabulary the data actually uses.
    // 眼周暗沉／浮腫 are in the data too but live almost entirely on 眼霜,
    // which is not one of the five steps, so offering them would be offering
    // a filter that matches two products. See OPEN-QUESTIONS.
    options: [
      { v: 'dry', name: '乾燥繃緊' },
      { v: 'sensitive', name: '泛紅敏感' },
      { v: 'barrier', name: '屏障脆弱' },
      { v: 'acne', name: '粉刺暗瘡' },
      { v: 'blackhead', name: '黑頭' },
      { v: 'pore', name: '毛孔粗大' },
      { v: 'oil', name: '油光' },
      { v: 'texture', name: '膚質粗糙' },
      { v: 'dull', name: '暗沉不均' },
      { v: 'spot', name: '印痕色斑' },
      { v: 'wrinkle', name: '細紋鬆弛' },
    ],
    three: true,
  },
  {
    key: 'tol', field: 'gardenia', multi: false,
    ask: '用過酸類或者 A 醇未？',
    hint: '呢條唔係幫你揀，係幫你避開太刺激嘅嘢。',
    options: [
      { v: 'none', name: '未用過', note: '由溫和嘅開始' },
      { v: 'some', name: '用過少少', note: '偶爾用，未算習慣' },
      { v: 'ok', name: '好耐受', note: '日常有用，冇乜反應' },
    ],
    three: true,
  },
  {
    key: 'tex', field: 'jade', multi: false,
    ask: '鍾意咩質地？',
    options: [
      { v: '1', name: '清爽', note: '水感，快吸收' },
      { v: '2', name: '中度', note: '唔算輕又唔算厚' },
      { v: '3', name: '滋潤', note: '綿密，包得住' },
      { v: 'any', name: '隨便', note: '睇你點推薦' },
    ],
  },
];

const SM_IRR_CAP = { none: 1, some: 2, ok: 3 };

let SM = { attrs: null, labels: null, live: null };

async function smLoad() {
  if (SM.attrs) return SM;
  const data = await fetch('data/attrs.json')
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);
  if (!data) throw new Error('attrs');
  SM.attrs = data.products;
  SM.labels = data.labels;
  return SM;
}

/* Live stock for the handful of products we are about to name.
 *
 * This used to call getAllProducts(): three paginated round-trips pulling
 * all 730 products with their images, to read stock on about ten of them.
 * On LTE that is the difference between a routine and an error page, and
 * the error page is what shipped. Ask for the shortlist instead — one
 * request, ten handles.
 *
 * Everything needed to *render* the routine already exists offline in
 * ingredients.json, so a failure here costs the stock check and the cart
 * button, not the answer. */

const SM_LIVE_FIELDS = `
  handle title vendor
  priceRange { minVariantPrice { amount } }
  images(first: 1) { edges { node { url } } }
  variants(first: 1) { edges { node { id availableForSale } } }`;

async function smLive(handles) {
  // One request, aliased. `products(query: "handle:...")` looks like it
  // should work and silently does not — it ignores the filter and hands
  // back the front of the catalogue, which would have shipped a routine
  // of whatever product happens to be first. Aliased product(handle:)
  // asks the question that actually gets answered.
  const q = `query Shortlist {
    ${handles.map((h, i) => `p${i}: product(handle: ${JSON.stringify(h)}) { ${SM_LIVE_FIELDS} }`).join('\n')}
  }`;
  const data = await shopifyFetch(q, {});
  const map = new Map();
  Object.values(data || {}).forEach((p) => {
    if (!p || !p.handle) return;
    const v = p.variants?.edges?.[0]?.node;
    map.set(p.handle, {
      title: p.title,
      vendor: p.vendor,
      image: p.images?.edges?.[0]?.node?.url || '',
      price: p.priceRange?.minVariantPrice?.amount,
      available: !!v?.availableForSale,
      variantId: v?.id,
    });
  });
  return map;
}

/* What we know without the network. Enough to show the routine and say
   what it costs; not enough to promise it is in stock. */
let SM_BAKED = null;
async function smBaked() {
  if (SM_BAKED) return SM_BAKED;
  SM_BAKED = await fetch('ingredients.json')
    .then((r) => (r.ok ? r.json() : {}))
    .catch(() => ({}));
  return SM_BAKED;
}

/* ── matching ─────────────────────────────────────────────────────────
   Hard rules exclude; everything else is weight. The merchant term is
   deliberately absent: the shop's own interest belongs in the catalogue's
   default sort, not in a recommendation a shopper was told is about her. */

/* Do we know this product's ingredients well enough to filter on them?
   True for a read label, or for a model entry that kept its own confidence
   above the 0.5 cut. False stays false: silence is never read as "clean". */
function smKnowsIng(k) {
  if (!k) return false;
  if (k.inci) return true;
  return k.src === 'model' && Array.isArray(k.flags);
}

function smEligible(a, ans, h) {
  if (!a) return false;
  if (ans.skin && ans.skin !== 'unsure' && (a.fit || {})[ans.skin] === 'avoid') return false;
  // Unanswered means uncapped, not capped at zero: the counts on the dial
  // rows are read before tolerance has been picked.
  const cap = SM_IRR_CAP[ans.tol];
  if (cap !== undefined && (a.irr || 1) > cap) return false;
  if (ans.concerns.includes('sensitive') && (a.fit || {}).sensitive === 'avoid') return false;

  // Sensitive skin, stated as a fact about her rather than as a goal.
  // At 好易敏感 an unlabelled product is not eligible: 「唔知」 has never been
  // allowed to pass as 「安全」 anywhere else in this file and it does not
  // start here. 有時會 only drops what is labelled outright unsuitable.
  const sfit = (a.fit || {}).sensitive;
  if (ans.sens === 'some' && sfit === 'avoid') return false;
  if (ans.sens === 'high' && sfit !== 'good' && sfit !== 'ok') return false;

  // A named brand is a hard rule, not a preference. Someone who came for
  // Round Lab did not come to be shown the closest thing to Round Lab.
  // Empty means every brand, which is the default: the shop's own answer to
  // "which brands" is "all 23 that make skincare", and it says so.
  if (ans.brands && ans.brands.length && ans.brands.indexOf(a.v) < 0) return false;

  const k = (SM_BAKED && h) ? SM_BAKED[h] : null;

  // The last narrowing, asked after she has already seen the shelf. These
  // only ever run at the results, never during the questions, so nothing
  // here can shrink a pool she was never shown.
  //
  // There are six of them because three could not finish the job: a shopper
  // told 「51 件啱你」 and then handed 51 件 again after answering has been
  // asked to do work for nothing. Texture, a named active and an avoided
  // flag are what take a pool from fifty to single figures, and all three
  // are already in the data.
  const fine = ans.fine || {};
  // `fine.steps` is the subset of the routine the narrowing survives on.
  // Sunscreen has no product whose first job is 乾燥繃緊, so a shopper who
  // asks for 主打乾燥繃緊 would lose her sunscreen to a question about her
  // serum. The rule stands down for that step instead; the row says so.
  if (!fine.steps || fine.steps.indexOf(a.step) > -1) {
    if (fine.strict && ans.skin !== 'unsure' && (a.fit || {})[ans.skin] !== 'good') return false;
    if (fine.pri === 'gentle' && (a.irr || 1) !== 1) return false;
    if (fine.pri === 'targeted' && ans.concerns.length
        && (a.c1 || []).indexOf(ans.concerns[0]) < 0) return false;
    if (fine.pri === 'clean' && !(k && k.inci)) return false;
    if (fine.tex && a.tex !== fine.tex) return false;
    // Ingredient rules read the label. No published list is not "clean",
    // it is unknown, so it cannot satisfy either of these.
    if (fine.act && !(smKnowsIng(k) && (k.actives || []).indexOf(fine.act) > -1)) return false;
    if (fine.avoid && fine.avoid.length) {
      if (!smKnowsIng(k)) return false;
      const kf = k.flags || [];
      if (fine.avoid.some((x) => kf.indexOf(x) > -1)) return false;
    }
  }

  const adv = ans.adv || {};
  if (adv.preg && a.preg_safe === false) return false;
  if (adv.beg && a.beg !== 1) return false;

  // Ingredient rules read the label, never the marketing copy — and a
  // product with no published list is not "clean", it is unknown. Asking
  // for 無酒精 therefore narrows to brands that actually said so, which
  // the UI states rather than hides.
  //
  // Two provenances answer this and they are not equal. `inci` means the
  // brand published the list and build_ingredients.py read it. `src:'model'`
  // means a model recalled it and scored its own confidence; those are kept
  // only at conf >= 0.5, rank below labelled ones, and are always worded
  // "據我哋掌握" — never "成分表標明". Both filter; only one may claim the label.
  const wantsLabel = adv.noAlcohol || adv.noFragrance || adv.noOil || adv.noAcid;
  if (wantsLabel) {
    if (!smKnowsIng(k)) return false;
    const f = k.flags || [];
    if (adv.noAlcohol && f.includes('酒精')) return false;
    if (adv.noFragrance && f.includes('香料')) return false;
    if (adv.noOil && f.includes('精油')) return false;
    if (adv.noAcid && (k.actives || []).includes('AHA/BHA')) return false;
  }
  if (adv.want && (k?.actives || []).indexOf(adv.want) < 0) return false;
  return true;
}

/* What each age band tends to be shopping for.
 *
 * Deliberately weak: 8 points against a first concern's 42, applied only to
 * a product's primary job, and only where the shopper did not already name
 * that concern herself. It reorders equals; it never excludes anything and
 * it never overrides what she actually said. A shopper who says at 45 that
 * her problem is 粉刺暗瘡 gets 粉刺暗瘡 products, not wrinkle cream. */
const SM_AGE_LEAN = {
  u24: ['acne', 'blackhead', 'oil'],
  a25: ['pore', 'dull'],
  a35: ['wrinkle', 'dull'],
  a45: ['wrinkle', 'dry'],
};

function smScore(a, ans) {
  let s = 0;
  const weights = [1, 0.6, 0.35];
  ans.concerns.forEach((c, i) => {
    if ((a.c1 || []).includes(c)) s += 42 * weights[i];
    else if ((a.c2 || []).includes(c)) s += 42 * weights[i] * 0.45;
  });
  if (ans.skin && ans.skin !== 'unsure') {
    const g = (a.fit || {})[ans.skin];
    s += g === 'good' ? 20 : g === 'ok' ? 9 : 0;
  }
  if (ans.tex !== 'any' && a.wt) s += 14 * (1 - Math.abs(a.wt - Number(ans.tex)) / 2);
  if (ans.tol === 'none' && a.beg === 1) s += 8;
  if (ans.sens === 'some' || ans.sens === 'high') {
    const sf = (a.fit || {}).sensitive;
    s += sf === 'good' ? 14 : sf === 'ok' ? 6 : 0;
  }
  (SM_AGE_LEAN[ans.age] || []).forEach((c) => {
    if (!ans.concerns.includes(c) && (a.c1 || []).includes(c)) s += 8;
  });
  return s;
}

/* Score, then the published ingredient list, then a stable scramble.
 *
 * Ties are the normal case here, not the exception: at a loose setting two
 * dozen creams share a top score. Breaking them on the handle looked
 * neutral and was not — `abib-…` sorts first, so one brand won every tie
 * and filled all five steps. A hash of the handle keeps the order fixed
 * for the same answers while spreading it across the shelf. */
function smHash(h) {
  let n = 0;
  for (let i = 0; i < h.length; i += 1) n = (n * 31 + h.charCodeAt(i)) % 100003;
  return n;
}

function smRank(x, y) {
  if (y.s !== x.s) return y.s - x.s;
  const ix = (SM_BAKED?.[x.h]?.inci) ? 1 : 0;
  const iy = (SM_BAKED?.[y.h]?.inci) ? 1 : 0;
  if (iy !== ix) return iy - ix;
  return smHash(x.h) - smHash(y.h);
}

/* One routine should not be one brand. Nothing is wrong with a shopper
   buying five Abib products, but arriving at that because of how ties
   sorted is not a recommendation — it reads as broken, and it is. A brand
   already used has to beat the next candidate by a real margin, not by a
   rounding difference. */
function smSpread(cands, used) {
  if (!cands.length) return null;
  const top = cands[0];
  const topV = SM_BAKED?.[top.h]?.vendor;
  if (!topV || !used.has(topV)) return top;
  const other = cands.find((c) => {
    const v = SM_BAKED?.[c.h]?.vendor;
    return v && !used.has(v) && c.s >= top.s - 8;
  });
  return other || top;
}

function smRemaining(ans) {
  return Object.entries(SM.attrs).filter(([h, a]) => smEligible(a, ans, h)).length;
}

/* ── brands, and counting what a change would leave ───────────────────
   Every control that narrows says how much it narrows, before it is
   pressed. The shop already does this with 「仲有 N 件啱你」 during the
   questions; a brand chip or a tie-breaker that quietly empties a step
   would be the same promise broken at the end. */

const smAnsWith = (ans, patch) => Object.assign({}, ans, patch, {
  fine: Object.assign({}, ans.fine, patch && patch.fine),
});

/* Work out which steps the narrowing can survive on, and pin that to the
   answers. Everything downstream — the build, the counts on the panel, the
   brand tallies — reads the pinned copy, so the number a chip promises is
   the number the routine is actually drawn from. */
function smApply(ans, steps) {
  const f = ans.fine || {};
  if (f.steps || (!f.pri && !f.strict)) return ans;
  const alive = steps.filter((s) => {
    for (const h in SM.attrs) {
      if (SM.attrs[h].step === s && smEligible(SM.attrs[h], ans, h)) return true;
    }
    return false;
  });
  return smAnsWith(ans, { fine: Object.assign({}, f, { steps: alive }) });
}

/* Counted strictly — no per-step standing down.
 *
 * A chip that promises 4 has to leave 4. If this counted the way smBuild
 * builds, a combination that empties the only step she asked for would come
 * back as "51 件" (the standing-down pool) and the chip would read as though
 * nothing had been narrowed at all. Strict counting means a dead end reads
 * as 0 and the chip is disabled, which is the whole point of showing the
 * number before the tap. Where a *multi-step* routine has one step that
 * cannot obey, that row says so on itself.
 */
function smPoolCount(ans, steps) {
  let n = 0;
  for (const h in SM.attrs) {
    const a = SM.attrs[h];
    if (steps.indexOf(a.step) < 0) continue;
    if (smEligible(a, ans, h)) n += 1;
  }
  return n;
}

/* The values a dimension can still take, with how many products each leaves.
   Built from the live pool rather than a fixed list, so a step whose shelf
   holds no 噴霧 is never offered 噴霧. */
function smFacet(ans, steps, pick) {
  const n = new Map();
  for (const h in SM.attrs) {
    const a = SM.attrs[h];
    if (steps.indexOf(a.step) < 0) continue;
    if (!smEligible(a, ans, h)) continue;
    for (const v of pick(a, SM_BAKED ? SM_BAKED[h] : null)) {
      n.set(v, (n.get(v) || 0) + 1);
    }
  }
  return Array.from(n, ([v, c]) => ({ v, n: c })).sort((x, y) => y.n - x.n || String(x.v).localeCompare(String(y.v)));
}

/* Which brands still have something for her, and how much. Counted with
   the brand filter itself lifted, so the numbers stay put while she picks
   — a list whose counts collapse to zero the moment you touch it is a
   list you cannot compare across. */
function smVendors(ans, steps) {
  return smFacet(smAnsWith(ans, { brands: [] }), steps, (a) => (a.v ? [a.v] : []));
}

/* Every brand that makes skincare, whatever the answers — the count the
   "全部品牌" chip stands for, and the honest denominator on the panel. */
function smAllVendors() {
  const s = new Set();
  for (const h in SM.attrs) if (SM.attrs[h].v) s.add(SM.attrs[h].v);
  return Array.from(s).sort();
}

/* Why this one — about the product, not about the answers.
 *
 * The first version said "針對你排第 1 嘅「乾燥繃緊」", which tells a shopper
 * only what she just typed. A reason has to come from the thing being
 * recommended: what it feels like, what is in it, what that ingredient is
 * for, and what the label says is absent. All four are on hand — texture
 * and weight from the labels, actives and flags from the brand's own
 * ingredient list — so there is no excuse for restating the question.
 *
 * The second version restated the *shelf* instead. 「泡沫。清爽，油肌搽落
 * 唔會笠。」 is true of thirty-six cleansers, and 「含煙酰胺，常用嚟處理暗沉、
 * 粗大毛孔同出油。」 was word for word the same sentence on every bottle that
 * had niacinamide in it — the shop's own reading was 「好行貨」, and it was.
 * A reason that would fit the product next to it is not a reason.
 *
 * Three things make this one line belong to this one product:
 *
 *   · `hook` in attrs.json is written per product — 305 different lines
 *     across the 307 that carry one — and it names what the product is
 *     actually built on (綠豆, 92% 蝸牛, 米糠＋益生菌, PHA). It was sitting
 *     here as the fallback nobody ever reached. It leads now.
 *   · the ingredient sentence is spoken to a concern she named, so 煙酰胺
 *     answers 毛孔 differently from 暗沉 — same bottle, different shopper,
 *     different sentence — and the active it speaks about is the one that
 *     separates this bottle from the shelf rather than the one she ranked
 *     first, because 透明質酸 is in 197 of them.
 *   · when the brand published no list, the product's own primary job from
 *     the label pass carries the line instead of a texture platitude.
 *
 * Nothing new is claimed about what an ingredient does: SM_ACTIVE_FOR still
 * decides which concerns an active may be offered for, and the wording stays
 * in the register INGREDIENT_INFO was reviewed in — 常用嚟, not 醫好.
 */

const SM_TEX_ZH = {
  watery: '水感', essence: '精華質地', milky: '乳液質地', creamy: '綿密',
  gel: '啫喱', oil: '油狀', foam: '泡沫', balm: '膏狀',
  sheet: '面膜紙', pad: '化妝棉片', mist: '噴霧',
};

/* Which concern each active is normally reached for. Used only to decide
   whether an ingredient is worth naming to this shopper. Deliberately not
   widened when SM_ACTIVE_WHY was written: a new pair here is a new claim
   about what an ingredient treats, and that is not a copy edit. */
const SM_ACTIVE_FOR = {
  煙酰胺: ['dull', 'pore', 'oil'],
  積雪草: ['sensitive', 'barrier'],
  透明質酸: ['dry'],
  神經醯胺: ['dry', 'barrier'],
  泛醇: ['sensitive', 'barrier', 'dry'],
  維他命C: ['dull', 'spot'],
  '曲酸／傳明酸': ['spot', 'dull'],
  'AHA/BHA': ['texture', 'pore', 'blackhead', 'acne'],
  視黃醇: ['wrinkle', 'texture'],
  胜肽: ['wrinkle'],
  PDRN: ['barrier'],
};

/* The same active, answering the concern she actually named.
 *
 * Every line here is the corresponding INGREDIENT_INFO entry narrowed to one
 * concern — the claim is the same claim, said to one person instead of to
 * everybody. A pair missing from here falls back to INGREDIENT_INFO.use,
 * which is what the whole table used to be. */
const SM_ACTIVE_WHY = {
  煙酰胺: {
    dull: '維他命 B3，暗沉不均最多人由呢隻入手',
    pore: '維他命 B3，常用嚟收斂粗大毛孔',
    oil: '維他命 B3，常用嚟平衡出油',
  },
  積雪草: {
    sensitive: '韓國 cica 講嘅就係佢，常用嚟鎮靜泛紅',
    barrier: '韓國 cica 講嘅就係佢，屏障唔穩陣嗰排好多人用',
  },
  透明質酸: {
    dry: '抓水嗰層底工，皮膚仲濕住搽落去先鎖得住',
  },
  神經醯胺: {
    dry: '屏障本身嘅脂質，補返去可以減少水分流走',
    barrier: '屏障本身嘅脂質，用嚟補返缺咗嗰浸',
  },
  泛醇: {
    sensitive: '維他命 B5，保濕兼鎮靜，好少人會敏感',
    barrier: '維他命 B5，修護類產品最常見嗰隻',
    dry: '維他命 B5，抓水之餘安撫繃緊',
  },
  維他命C: {
    dull: '抗氧化，常用嚟提亮膚色',
    spot: '抗氧化，常用嚟對付曬後留低嘅暗沉',
  },
  '曲酸／傳明酸': {
    spot: '走抑制黑色素生成嗰條路，連續用幾個月先講得到分別',
    dull: '走抑制黑色素生成嗰條路，一定要配埋防曬',
  },
  'AHA/BHA': {
    texture: '果酸代謝角質，摸落去粗糙嗰陣好多人用',
    pore: '溶於油嗰種果酸，入到毛孔裏面',
    blackhead: '溶於油嗰種果酸，黑頭最多人由呢度入手',
    acne: '代謝角質兼疏通毛孔，粉刺期常見',
  },
  視黃醇: {
    wrinkle: '研究得最多嘅 A 醇，晚上用、日頭要防曬',
    texture: 'A 醇，粗糙膚質常用，由隔日晚上開始試',
  },
  胜肽: {
    wrinkle: '訊號胜肽，唔想用 A 醇又想做抗老就係呢類',
  },
  PDRN: {
    barrier: '三文魚 DNA 片段，近年最紅嘅修護成分，性質溫和',
  },
};

/* 防曬係唯一一件「晚上用」講唔通嘅嘢。
 *
 * ROUND LAB 山茶花防曬精華 carries a retinoid, and the retinoid line ends
 * 「晚上用、日頭要防曬」 — read off a bottle of sunscreen it contradicts the
 * product in its own sentence. Same claim, said the way it is true of a
 * daytime product. */
const SM_ACTIVE_WHY_SUN = {
  視黃醇: '研究得最多嘅抗紋成分，而防曬本身就係用佢嘅前提',
};

/* 佢嘅膚質配呢一步，講返呢一步嘅嘢。
 *
 * The old rider was three lines for the whole shop, fired off weight alone,
 * so a cleanser and a sunscreen both said 「油肌搽落唔會笠」. Keyed by step it
 * says something about washing when it is a wash; and it only fires when the
 * label actually rates the product 'good' for her skin, which is a fact about
 * this bottle rather than about its weight. */
const SM_FIT_RIDER = {
  oily: {
    cleanse: '洗完唔會即刻返油', toner: '油肌用落唔會焗',
    serum: '油肌搽咗都吸收得晒', cream: '油肌搽落唔會笠',
    sun: '油肌搽足一日都唔會谷住',
  },
  dry: {
    cleanse: '洗完唔會繃緊', toner: '乾肌打底夠濕',
    serum: '乾肌用落唔會覺得唔夠', cream: '乾到起皮嗰陣包得住',
    sun: '乾肌搽落唔會起皮',
  },
  combo: {
    cleanse: 'T 字位同兩頰用同一支就得', toner: 'T 字位同兩頰都用得',
    serum: '混合肌成面搽都唔怕', cream: 'T 字位唔焗，兩頰又夠',
    sun: '混合肌成面搽都均勻',
  },
  normal: {
    cleanse: '中性肌日日洗都得', toner: '中性肌日常打底啱用',
    serum: '中性肌日日搽都得', cream: '中性肌一年四季用得',
    sun: '中性肌日日搽都得',
  },
};

/* Can this active be printed as a fact about the bottle?
 *
 * `actives` come out of build_ingredients.py by reading the brand's own title
 * and its own copy, so naming them is quoting the brand. `actives_src:'model'`
 * is a model's recollection at 0.5–0.75 confidence; ingredients.js already
 * refuses to put those on a chip, and a sentence is not a smaller promise
 * than a chip. Same rule, same reason. */
function smNamedActives(k) {
  if (!k || k.actives_src === 'model') return [];
  return k.actives || [];
}

/* The same vocabulary build_ingredients.py reads INCI lists with, plus the
   spellings marketing uses (cica, 玻尿酸, B5). Only used to check a hook
   against the pack — never to decide that something is *in* a product. */
const SM_ING_PAT = {
  視黃醇: /retinol|retinal|視黃醇|視黃醛|a\s*醇|a\s*醛/i,
  維他命C: /vitamin ?c|維他命 ?c|維生素 ?c|抗壞血/i,
  煙酰胺: /niacinamide|煙.胺|菸鹼醯胺|菸鹼胺|煙鹼醯胺/i,
  'AHA/BHA': /\baha\b|\bbha\b|\bpha\b|果酸|水楊酸|甘醇酸|杏仁酸/i,
  PDRN: /\bpdrn\b/i,
  胜肽: /peptide|胜肽|勝肽/i,
  透明質酸: /hyaluron|透明質酸|玻尿酸/i,
  積雪草: /centella|madecass|積雪草|\bcica\b/i,
  神經醯胺: /ceramide|神經醯胺|神經酰胺/i,
  泛醇: /panthenol|泛醇|\bb5\b/i,
  '曲酸／傳明酸': /kojic|tranexamic|arbutin|曲酸|傳明酸|熊果/i,
};

/* Is the hook safe to lead with?
 *
 * `hook` was written in the labelling pass off the product's copy, and until
 * now it was the line nobody reached. Leading with it puts it in front of
 * every shopper, so it has to clear the same bar as everything else on this
 * card: an ingredient it names, or a percentage it quotes, has to be on the
 * pack — in the title the shop itself wrote, or in the actives read out of
 * the brand's own text. Eight bottles in the five steps fail that. They lose
 * their opener and keep everything else; a good line we cannot stand behind
 * is not a good line. */
const SM_HOOK_MED = /患處|治療|根治|醫治|消炎|抗炎|殺菌|療效|抗痘|去痘|消痘/;

function smHookOk(a, k) {
  const hook = a.hook || '';
  const title = a.t || '';
  // 「積雪草修護暗瘡患處」 is a sentence about a condition, not about a cream.
  // The panel carries a disclaimer; it is not a licence to write around it.
  if (SM_HOOK_MED.test(hook)) return false;
  const pct = hook.match(/\d+(?:\.\d+)?(?=\s*%)/g) || [];
  if (pct.some((n) => title.indexOf(n) < 0)) return false;
  const known = smNamedActives(k);
  return !Object.keys(SM_ING_PAT).some((nm) => SM_ING_PAT[nm].test(hook)
    && !SM_ING_PAT[nm].test(title) && known.indexOf(nm) < 0);
}

/* How many bottles on this shelf carry each active.
 *
 * Counted off the same file the cards are drawn from rather than written
 * down, so the day the shop takes on a ceramide brand the answer moves with
 * it. Only what may be named counts — a recalled active is not on the shelf
 * as far as anything a shopper reads is concerned. */
let SM_ACT_N = null;
function smActiveSpread() {
  if (SM_ACT_N) return SM_ACT_N;
  SM_ACT_N = new Map();
  for (const h in SM_BAKED) {
    smNamedActives(SM_BAKED[h]).forEach((x) => SM_ACT_N.set(x, (SM_ACT_N.get(x) || 0) + 1));
  }
  return SM_ACT_N;
}

/* Has this line already said this?
 *
 * Three sources write into one sentence and none of them can see the others:
 * a hook reading 「乾到起皮嗰陣用」 followed by a rider reading 「乾到起皮嗰陣
 * 包得住」 is one thought said twice, and it reads worse than either half
 * alone. Any three characters in common is enough to call it a repeat —
 * Chinese runs short, so a shared run of three is a shared phrase. */
function smFresh(had, s) {
  for (let i = 0; i + 3 <= s.length; i += 1) {
    if (had.indexOf(s.slice(i, i + 3)) > -1) return false;
  }
  return true;
}

function smWhy(a, ans, h) {
  const k = (SM_BAKED && h) ? SM_BAKED[h] : null;
  const L = SM.labels;
  const out = [];

  // 1 · 呢支係乜。The one line written for this bottle and no other.
  const hook = smHookOk(a, k) ? (a.hook || '').trim() : '';
  if (hook) out.push(hook.replace(/[。．.]$/, '') + '。');

  // 2 · 點解喺你張單度。The active she has a use for, said the way that use
  //     needs to hear it.
  //
  //     Her ranking used to decide this outright, and 乾燥繃緊 at number one
  //     handed 透明質酸 to eight of the fifteen cards in one routine — it is in
  //     197 of the products we hold, so answering with it answers nothing.
  //     Which active *tells this bottle from the next one* comes first now:
  //     the one on the label, else the one fewest other bottles carry. Her
  //     ranking is the tie-breaker, and it still decides the wording, because
  //     the concern the winner is spoken to is always one she named.
  const acts = smNamedActives(k);
  const cand = acts
    .map((x) => ({ x, ci: ans.concerns.findIndex((c) => (SM_ACTIVE_FOR[x] || []).indexOf(c) > -1) }))
    .filter((o) => o.ci > -1)
    .sort((p, q) => ((k.head || []).indexOf(q.x) > -1) - ((k.head || []).indexOf(p.x) > -1)
      || (smActiveSpread().get(p.x) || 0) - (smActiveSpread().get(q.x) || 0)
      || p.ci - q.ci)[0];
  const name = cand ? cand.x : (acts[0] || null);
  const concern = cand ? ans.concerns[cand.ci] : null;

  // An active she has no use for is not a reason. 「含透明質酸，幾乎所有保濕
  // 產品都會有」 was on the card of a toner recommended for 油光 — true, and an
  // argument for buying any other bottle just as much as this one. What the
  // product is *for* comes first in that case; c1 was read off the brand's own
  // copy in the label pass, so it is still a fact we hold.
  const job = (a.c1 || []).find((c) => ans.concerns.includes(c))
    || (a.c2 || []).find((c) => ans.concerns.includes(c));
  const info = (name && typeof INGREDIENT_INFO === 'object') ? INGREDIENT_INFO[name] : null;
  // With no concern to answer, take the ingredient's first reason rather than
  // its INGREDIENT_INFO line. 透明質酸's reads 「幾乎所有保濕產品都會有」 — true,
  // and an argument for the bottle beside it just as much as for this one.
  const why = SM_ACTIVE_WHY[name] || {};
  const say = (a.step === 'sun' && SM_ACTIVE_WHY_SUN[name])
    || (concern && why[concern]) || Object.values(why)[0]
    || (info ? info.use.replace(/。$/, '') : '');

  // The hook on a cica sunscreen has already said 積雪草, and 訊號胜肽 says
  // 胜肽 itself. Naming it a second time in the same breath is the tell of a
  // sentence assembled rather than written, so say what it does instead.
  //
  // Matched on the parts, not the whole: 「AHA/BHA」 is one label over two
  // ingredients, and the hook that reads 「AHA加BHA同時溫和去角質」 has already
  // introduced it however the label happens to be punctuated.
  const named = () => {
    if (!name || !say) return '';
    const parts = name.split(/[/／]/);
    if (parts.some((x) => hook.indexOf(x) > -1 || say.indexOf(x) > -1)) {
      // 「積雪草紓緩泛紅兼保濕」 followed by 「常用嚟舒緩泛紅同鎮靜…」 is the hook
      // read back to her. Drop the whole clause; the job line below is a
      // second thing to say, and saying one thing twice is not.
      return smFresh(hook, say) ? `${say}。` : '';
    }
    // 主打 is only for what the product is *named* after: `head` is read off
    // the title alone, so it is the brand calling it the headline, not us.
    const lead = (k.head || []).indexOf(name) > -1 ? '主打' : '配方有';
    return `${lead}${/^[A-Za-z]/.test(name) ? ' ' : ''}${name}，${say}。`;
  };

  // c1 is what the product is sold to do; c2 is what it also happens to
  // cover. Calling the second one 主打 would be the shop overselling by a
  // word, on the strength of a field that says the opposite.
  const ingLine = named();
  const jobLine = (job && smFresh(out.join('') + ingLine, L.concern[job]))
    ? `${(a.c1 || []).indexOf(job) > -1 ? '主打嘅就係' : '順帶都覆蓋到'}「${L.concern[job]}」。`
    : '';
  if (concern && ingLine) out.push(ingLine);
  else if (jobLine) out.push(jobLine);
  else if (ingLine) out.push(ingLine);

  // 3 · 佢嘅膚質。Only when the label rates this product good for it, and only
  //     if there is room left — three clauses is a card, four is a paragraph.
  const rider = ((a.fit || {})[ans.skin] === 'good')
    ? (SM_FIT_RIDER[ans.skin] || {})[a.step] : null;
  const said = out.join('');
  if (rider && said.length <= 34 && smFresh(said, rider)) out.push(rider + '。');

  // 4 · 冇嘢好講嗰十六件。No hook was written, no list was published, and her
  //     concerns are not what this one is sold for. 「泡沫。」 was what shipped,
  //     which is the complaint in miniature — so hand over the small true
  //     things instead: how it feels, how much is in the bottle, and whether
  //     it is somewhere to start. The size is what tells the 160ml green bean
  //     cleanser from the 80ml one.
  if (!out.length) {
    const bits = [[SM_TEX_ZH[a.tex], a.wt ? L.wt[a.wt] : ''].filter(Boolean).join('、')];
    if (k && k.size) bits.push(`${k.size}${k.unit === '片' ? ' 片' : k.unit}`);
    if (a.beg === 1) bits.push(L.beg[1]);
    const line = bits.filter(Boolean).join('，');
    if (line) out.push(line + '。');
  }

  // 5 · what the label says is not in it — the first thing reactive skin checks
  // A read label may say "成分表標明". A recalled one may not — it says
  // "據我哋掌握" and carries the hedge with it, so the shopper can tell
  // which of the two she is being handed.
  if (smKnowsIng(k)) {
    const f = k.flags || [];
    const read = !!k.inci;
    if (!f.length && (ans.concerns.includes('sensitive') || ans.adv?.noFragrance
        || ans.adv?.noAlcohol || ans.adv?.noOil)) {
      out.push(read ? '成分表標明無酒精、無香料、無精油。'
        : '據我哋掌握係無酒精、無香料、無精油，但品牌未公開全成分表。');
    } else if (f.length && !ans.concerns.includes('sensitive')) {
      out.push(read ? `成分表有${f.join('、')}，敏感肌要留意。`
        : `據我哋掌握含${f.join('、')}，敏感肌要留意。`);
    }
  } else if (ans.concerns.includes('sensitive')) {
    out.push('品牌未公開全成分表，敏感肌用前建議先試。');
  }

  // 6 · only if nothing above landed
  if (!out.length) out.push(`一支基本嘅${SM_STEP_ZH[a.step] || '護膚品'}。`);
  return out.join('');
}

/* Three per step, side by side, and the shopper scrolls between them.
 *
 * The first build handed one product per step and hid the runners-up behind
 * a "換下一件" button, because five steps × three read as a catalogue when
 * they were stacked. Stacking was the problem, not the three: a rail that
 * moves sideways puts 第一/第二/第三推薦 in the same square inch of screen,
 * so the page stays five rows long however many候選 sit behind each one. */
const SM_PICKS = 3;

async function smBuild(rawAns) {
  const steps = (rawAns.want && rawAns.want !== 'set') ? rawAns.want : SM_STEPS;
  const ans = smApply(rawAns, steps);
  const fineOff = (ans.fine && ans.fine.steps)
    ? steps.filter((s) => ans.fine.steps.indexOf(s) < 0) : [];
  const byStep = {};
  Object.entries(SM.attrs).forEach(([h, a]) => {
    if (!steps.includes(a.step) || !smEligible(a, ans, h)) return;
    (byStep[a.step] = byStep[a.step] || []).push({ h, a, s: smScore(a, ans) });
  });
  steps.forEach((k) => (byStep[k] || []).sort(smRank));

  // Six deep per step: enough that a sold-out top pick has somewhere to
  // fall back to, small enough to stay one request.
  // Live stock is only asked about the few we are going to name. The rest
  // of the pool stays available offline, because a shopper told "77 件啱你"
  // and then shown six of them has been told something untrue.
  const shortlist = steps.flatMap((k) => (byStep[k] || []).slice(0, 8).map((c) => c.h));

  let live = new Map();
  let degraded = false;
  if (shortlist.length) {
    try {
      live = await smLive(shortlist.slice(0, 40));
    } catch (err) {
      degraded = true;
    }
  }
  if (!live.size) degraded = true;

  const baked = await smBaked();
  const deco = (c) => {
    const b = baked[c.h] || {};
    return { ...c, degraded, live: live.get(c.h) || {
      title: c.a.t || b.title || c.h, vendor: c.a.v || b.vendor || '',
      image: '', price: b.price, available: null, variantId: null } };
  };

  // One routine should still not be one brand — but only the headline of
  // each step carries that across the whole set. If every runner-up also
  // burned a vendor, the fifth step would be choosing from whatever was
  // left over rather than from what fits.
  const usedVendors = new Set();
  const groups = steps.map((step) => {
    const cands = byStep[step] || [];
    // With live stock, take the best ones that are actually buyable.
    // Without it, take the best and say plainly that stock is unconfirmed.
    const usable = degraded ? cands : cands.filter((c) => live.get(c.h)?.available);
    const picks = [];
    const local = new Set(usedVendors);
    for (let i = 0; i < SM_PICKS; i += 1) {
      const p = smSpread(usable.filter((c) => !picks.includes(c)), local);
      if (!p) break;
      picks.push(p);
      const v = baked[p.h]?.vendor || p.a.v;
      if (v) local.add(v);
    }
    if (picks.length) {
      const v0 = baked[picks[0].h]?.vendor || picks[0].a.v;
      if (v0) usedVendors.add(v0);
    }
    return {
      step,
      // Said out loud on the row: this step ignored the narrowing, because
      // obeying it would have left the shopper with no sunscreen at all.
      fineOff: fineOff.indexOf(step) > -1,
      picks: picks.map(deco),
      // What "再換三件" deals from. Only stock-checked candidates, so a
      // swap can never hand back something unbuyable.
      rest: usable.filter((c) => !picks.includes(c)).map(deco),
      depth: cands.length,
      // The full depth behind the step, offline: what she is actually
      // choosing from, and what "睇晒" opens.
      pool: cands.map((c) => {
        const b = baked[c.h] || {};
        return { h: c.h, t: c.a.t || b.title || c.h, v: c.a.v || b.vendor || '', p: b.price };
      }),
    };
  });
  return { groups, degraded, steps };
}

/* ── rendering ──────────────────────────────────────────────────────── */

const smEsc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function smQuestion(q, ans, idx, total) {
  const chosen = q.multi ? ans[q.key] : [ans[q.key]].filter(Boolean);
  const cls = q.three ? ' sm__picks--three' : q.wide ? ' sm__picks--wide' : '';
  const picks = q.options.map((o) => {
    const at = chosen.indexOf(o.v);
    const on = at > -1;
    const attr = q.multi ? 'aria-pressed' : 'aria-checked';
    const role = q.multi ? '' : ' role="radio"';
    return `<button type="button" class="sm__pick"${role} ${attr}="${on}" data-v="${smEsc(o.v)}">
      ${q.multi ? `<span class="sm__pick-rank">${on ? at + 1 : '·'}</span>` : ''}
      <span class="sm__pick-name">${smEsc(o.name)}</span>
      ${o.note ? `<span class="sm__pick-note">${smEsc(o.note)}</span>` : ''}
    </button>`;
  }).join('');

  const ready = q.multi ? chosen.length > 0 : !!ans[q.key];
  return `<div class="sm__field sm__field--${q.field} is-entering">
    <p class="sm__folio">${idx + 1} / ${total}</p>
    <h2 class="sm__display sm__ask">${smEsc(q.ask)}</h2>
    ${q.hint ? `<p class="sm__standfirst">${smEsc(q.hint)}</p>` : ''}
    <div class="sm__picks${cls}" ${q.multi ? 'role="group"' : 'role="radiogroup"'}
         aria-label="${smEsc(q.ask)}">${picks}</div>
    <p class="sm__remain" aria-live="polite">仲有 <b>${smRemaining(ans)}</b> 件啱你</p>
    <div class="sm__controls">
      ${idx > 0 ? '<button type="button" class="sm__back" data-back>返上一頁</button>' : ''}
      <button type="button" class="sm__go" data-next ${ready ? '' : 'disabled'}>
        ${idx === total - 1 ? '睇我嘅配方' : '落一頁'}
      </button>
    </div>
  </div>`;
}

/* A read of her skin, then the whole set at a glance, then the detail.
   Order matters: she asked to be told about herself before being sold to,
   and to see five things together rather than scroll past them one by one. */

function smRead(ans) {
  const L = SM.labels;
  const bits = [];
  if (ans.skin && ans.skin !== 'unsure') bits.push(`你話你係${L.skin[ans.skin]}肌`);
  else bits.push('你話唔太清楚自己嘅膚質，我哋當混合性行');
  if (ans.sens === 'high') bits.push('皮膚好易敏感，所以只揀咗品牌講明敏感肌用得嘅');
  else if (ans.sens === 'some') bits.push('皮膚有時會敏感，所以避開咗標明唔啱敏感肌嘅');
  if (ans.concerns.length) {
    bits.push(`最想搞掂${ans.concerns.map((c) => `「${L.concern[c]}」`).join('、')}`);
  }
  if (ans.tol === 'none') bits.push('想要溫和，所以成套都避開咗刺激嘅嘢');
  else if (ans.tol === 'ok') bits.push('夠力嘅你都受得住，所以精華揀得落手啲');
  if (ans.tex !== 'any') bits.push(`質地你要${L.wt[Number(ans.tex)]}`);
  return bits.join('，') + '。';
}

const SM_MONEY = (v) => (typeof formatPrice === 'function' ? formatPrice(v) : 'HK$' + v);
const SM_RANK_ZH = ['第一推薦', '第二推薦', '第三推薦'];

/* ── the last two questions ───────────────────────────────────────────
 *
 * Fifty-seven creams all "fit". That is a true answer and a useless one:
 * being told the shelf is wide is not being told which end of it is yours.
 * So the narrowing that could not be asked up front — because up front it
 * would have read as another interview — is asked here, once she has seen
 * what she is choosing between and can tell why she cannot choose.
 *
 * Every option carries the count it would leave, computed against the real
 * pool, and an option that would leave nothing is disabled rather than
 * offered and then apologised for. Nothing here re-asks something already
 * answered: 質地 and 活性成分 were dials, so these ask about strictness of
 * the skin-type match, about which of her own concerns leads, and about
 * transparency of the label — three axes the questions never touched.
 */

const SM_FINE_PRI = [
  { v: '', name: '唔指定' },
  { v: 'targeted', name: '主打我第一個狀況' },
  { v: 'gentle', name: '最溫和嗰批' },
  { v: 'clean', name: '品牌公開晒成分表' },
];

const SM_AVOID = ['酒精', '香料', '精油'];

function smRefine(ans, pending, steps, open) {
  const L = SM.labels;
  const pf = () => ({
    pri: pending.pri, strict: pending.strict,
    tex: pending.tex, act: pending.act, avoid: pending.avoid,
  });
  const withPending = (patch) => smAnsWith(ans, {
    brands: (patch && patch.brands) || pending.brands,
    fine: Object.assign(pf(), patch && patch.fine),
  });
  const at = (patch) => smPoolCount(withPending(patch), steps);

  // The "from" number is what is on screen right now, not the untouched
  // catalogue: she is deciding whether this change is worth making, and
  // 314 → 20 would be measuring against a shelf she already left behind.
  const live = smPoolCount(ans, steps);
  const now = at();

  /* One row of the drawer. Every option carries the count it would leave
     given everything else already ticked, and an option that would leave
     nothing is disabled rather than offered and then apologised for.

     Each live option is also filed as a candidate for the nudge below: the
     complaint that produced this drawer was "答完仲有好多款", and the fix is
     not more questions but pointing at the one that actually cuts. */
  const cuts = [];
  const row = (label, sub, opts, attr, isOn, patchOf) => {
    const tags = opts.map((o) => {
      const n = at(patchOf(o));
      const on = isOn(o);
      if (!n && !on) return '';
      if (n && !on && o.v !== '') cuts.push({ n, attr, v: o.v, name: o.name });
      return `<button type="button" class="rf__tag" ${attr}="${smEsc(o.v)}"
        aria-pressed="${on}" ${n ? '' : 'disabled'}>${smEsc(o.name)}${
        o.v === '' ? '' : `<i>${n}</i>`}</button>`;
    }).filter(Boolean).join('');
    if (!tags) return '';
    return `<p class="rf__label">${smEsc(label)}${sub
      ? `<span class="rf__sub">${smEsc(sub)}</span>` : ''}</p>
      <div class="rf__tags">${tags}</div>`;
  };

  const priRow = row('最後三件，想我點揀？', '', SM_FINE_PRI
    .filter((o) => o.v !== 'targeted' || ans.concerns.length)
    .map((o) => ({ v: o.v, name: (o.v === 'targeted')
      ? `主打「${L.concern[ans.concerns[0]]}」` : o.name })),
  'data-fine-pri', (o) => (pending.pri || '') === o.v, (o) => ({ fine: { pri: o.v } }));

  const strictRow = ans.skin === 'unsure' ? '' : row('膚質配對有幾嚴', '', [
    { v: '0', name: '啱就得' },
    { v: '1', name: `只要完全啱${L.skin[ans.skin]}肌嘅` },
  ], 'data-fine-strict', (o) => String(pending.strict ? 1 : 0) === o.v,
  (o) => ({ fine: { strict: o.v === '1' } }));

  // Texture is the thing a shopper can feel and the thing the shelf differs
  // most on, so it cuts harder than any of the abstract preferences above.
  const texRow = row('質地', '', [{ v: '', name: '唔指定' }].concat(
    smFacet(withPending({ fine: { tex: null } }), steps, (a) => (a.tex ? [a.tex] : []))
      .map((x) => ({ v: x.v, name: SM_TEX_ZH[x.v] || x.v }))),
  'data-fine-tex', (o) => (pending.tex || '') === o.v, (o) => ({ fine: { tex: o.v || null } }));

  const actRow = row('一定要含', '只計品牌公開咗成分表嗰批', [{ v: '', name: '唔指定' }].concat(
    smFacet(withPending({ fine: { act: null } }), steps,
      (a, k) => (smKnowsIng(k) ? (k.actives || []) : []))
      .slice(0, 12).map((x) => ({ v: x.v, name: x.v }))),
  'data-fine-act', (o) => (pending.act || '') === o.v, (o) => ({ fine: { act: o.v || null } }));

  const avoidRow = row('唔要', '可以揀多過一樣',
    SM_AVOID.map((x) => ({ v: x, name: '無' + x })),
    'data-fine-avoid', (o) => pending.avoid.indexOf(o.v) > -1,
    (o) => ({ fine: { avoid: pending.avoid.indexOf(o.v) > -1
      ? pending.avoid.filter((x) => x !== o.v) : pending.avoid.concat([o.v]) } }));

  const brands = smVendors(withPending(), steps).map((x) => `<button type="button" class="rf__tag"
      data-brand="${smEsc(x.v)}" aria-pressed="${pending.brands.includes(x.v)}"
      >${smEsc(x.v)}<i>${x.n}</i></button>`).join('');

  const touched = pending.pri || pending.strict || pending.tex || pending.act
    || pending.avoid.length || pending.brands.length;

  // The single remaining tap that lands closest to a shortlist. Not the
  // sharpest one: the sharpest is usually some near-empty corner of the
  // shelf (「泡沫 → 1 件」), and being handed the one odd product is not
  // being helped to choose. Three is the target, so rank by distance to
  // three and treat "fewer than three" as overshooting.
  const aim = (n) => (n < 3 ? 100 + (3 - n) : n - 3);
  cuts.sort((x, y) => aim(x.n) - aim(y.n) || x.n - y.n);
  const cut = (now > 6 && cuts.length && cuts[0].n < now) ? cuts[0] : null;

  return `<section class="rf" data-refine-panel>
    <button type="button" class="rf__toggle" data-refine aria-expanded="${open}">
      <b>揀唔落手？喺度收窄</b>
      <span>而家 ${live} 件啱你${open ? '' : '，答多幾條可以收到剩返幾件'}</span>
    </button>
    ${open ? `<div class="rf__body">
      <p class="rf__now" aria-live="polite">
        <b>${now}</b> 件${now === live ? '' : `<span>（本來 ${live} 件）</span>`}
        ${now > 6 ? '<span class="rf__more">仲多，再收窄多一兩格</span>' : ''}</p>
      ${cut ? `<button type="button" class="rf__cut" ${cut.attr}="${smEsc(cut.v)}">
        最快收窄：撳「${smEsc(cut.name)}」剩返 <b>${cut.n}</b> 件</button>` : ''}
      ${priRow}
      ${strictRow}
      ${texRow}
      ${actRow}
      ${avoidRow}
      <p class="rf__label">品牌<span class="rf__sub">${pending.brands.length
        ? `揀咗 ${pending.brands.length} 個` : `唔揀＝全部 ${smAllVendors().length} 個`}</span></p>
      <div class="rf__tags">
        <button type="button" class="rf__tag" data-brand-all
          aria-pressed="${!pending.brands.length}">全部品牌</button>
        ${brands}
      </div>
      <p class="rf__note">成分類要求只揀到品牌公開咗全成分表嘅產品。冇公開唔代表含有，只係我哋唔知 —— 所以唔會當作符合。</p>
      <div class="rf__acts">
        <button type="button" class="rf__go" data-refine-go ${now ? '' : 'disabled'}>
          ${now && now <= 3 ? `就睇呢 ${now} 件` : '收窄推薦'}</button>
        ${touched ? '<button type="button" class="rf__clear" data-refine-clear>清晒</button>' : ''}
      </div>
    </div>` : ''}
  </section>`;
}

/* ── the rail ─────────────────────────────────────────────────────────
   One step, three cards, scrolled sideways. The dots are the control for
   anyone not on a touchscreen; the scroll position is the source of truth
   for everyone else, and both write the same selection. */

function smCard(r, i, ans, on) {
  const out = r.live.available === false;
  // Thumb beside the words, not above them. A card tall enough to need its
  // own scroll would trade the long list for a long page, which is the same
  // complaint wearing a different coat.
  return `<article class="cw__card" data-i="${i}" data-h="${smEsc(r.h)}"
      aria-current="${!!on}">
    <p class="cw__rank">${smEsc(SM_RANK_ZH[i] || '推薦')}<span class="cw__on">揀咗</span></p>
    <div class="cw__main">
      <div class="cw__shot">${r.live.image
        ? `<img src="${smEsc(r.live.image)}" alt="" loading="lazy">` : ''}</div>
      <div class="cw__body">
        <p class="cw__vendor">${smEsc(r.live.vendor)}</p>
        <h3 class="cw__name"><a href="/products/${smEsc(r.h)}">${smEsc(r.live.title)}</a></h3>
        <p class="cw__price">${smEsc(SM_MONEY(r.live.price))}${out ? ' · 暫時缺貨' : ''}</p>
      </div>
    </div>
    <p class="cw__why">${smEsc(smWhy(r.a, ans, r.h))}</p>
    <div class="cw__acts">
      <button type="button" class="cw__add" data-card-add="${smEsc(r.h)}"
        ${r.live.variantId ? '' : 'disabled'}>${out ? '暫時缺貨'
          : (r.live.variantId ? '加入購物袋' : '接唔到貨存')}</button>
    </div>
  </article>`;
}

function smGroupRow(g, i, ans, sel) {
  const zh = SM_STEP_ZH[g.step] || g.step;
  if (!g.picks.length) {
    return `<article class="ed__row ed__row--none" id="sm-step-${i}">
      <p class="ed__step">${smEsc(zh)}</p>
      <p class="ed__none">${ans.brands && ans.brands.length
        ? '你揀嘅品牌冇呢一步嘅嘢。' : '呢一步今次配唔到，放寬一樣條件就有。'}</p>
    </article>`;
  }
  const cur = Math.min(sel[g.step] || 0, g.picks.length - 1);
  return `<article class="ed__row cw" id="sm-step-${i}" data-step="${smEsc(g.step)}">
    <header class="cw__head">
      <p class="ed__step">${smEsc(zh)} · ${g.depth} 件啱你${g.fineOff
        ? '<span class="ed__off">收窄條件喺呢一步冇貨，用返原本嘅推薦</span>' : ''}</p>
      <div class="cw__dots" role="group" aria-label="${smEsc(zh)}推薦">
        ${g.picks.map((p, k) => `<button type="button" class="cw__dot"
          data-dot="${k}" aria-pressed="${k === cur}"
          aria-label="${smEsc(SM_RANK_ZH[k] || '推薦')}：${smEsc(p.live.title)}"></button>`).join('')}
      </div>
    </header>
    <div class="cw__rail" data-rail="${smEsc(g.step)}" tabindex="0"
         aria-label="${smEsc(zh)}三個推薦，向右掃睇下一個">
      ${g.picks.map((p, k) => smCard(p, k, ans, k === cur)).join('')}
    </div>
    <div class="ed__more">
      ${g.rest.length
        ? `<button type="button" class="ed__swap" data-swap="${smEsc(g.step)}">再換三件</button>` : ''}
      ${g.pool.length > g.picks.length
        ? `<button type="button" class="ed__all" data-all="${smEsc(g.step)}">
             睇晒 ${g.pool.length} 件${smEsc(zh)}</button>` : ''}
    </div>
    <div class="ed__list" data-list="${smEsc(g.step)}" hidden>
      ${g.pool.map((x) => `<a class="ed__li" href="/products/${smEsc(x.h)}">
         <span class="ed__li-v">${smEsc(x.v)}</span>
         <span class="ed__li-t">${smEsc(x.t)}</span>
         <span class="ed__li-p">${x.p ? smEsc(SM_MONEY(x.p)) : ''}</span></a>`).join('')}
    </div>
  </article>`;
}

/* What the shopper would buy right now: the card facing her in each rail,
   not the first one we picked. Price, cart and the top strip all read from
   here, so scrolling a rail changes the basket rather than just the view. */
function smShown(groups, sel) {
  return groups.filter((g) => g.picks.length)
    .map((g) => g.picks[Math.min(sel[g.step] || 0, g.picks.length - 1)]);
}

function smEdit(groups, ans, sel, pending, open) {
  const steps = groups.map((g) => g.step);
  const shown = smShown(groups, sel);
  const total = shown.reduce((n, r) => n + Number(r.live.price || 0), 0);
  const degraded = groups.some((g) => g.picks.some((p) => p.degraded));

  const strip = groups.filter((g) => g.picks.length).map((g) => {
    const i = groups.indexOf(g);
    const r = g.picks[Math.min(sel[g.step] || 0, g.picks.length - 1)];
    return `<button type="button" class="ed__cell" data-jump="${i}" data-cell="${smEsc(g.step)}">
      <span class="ed__cell-step">${smEsc(SM_STEP_ZH[g.step])}</span>
      <span class="ed__cell-shot">${r.live.image
        ? `<img src="${smEsc(r.live.image)}" alt="" loading="lazy">` : ''}</span>
      <span class="ed__cell-price">${smEsc(SM_MONEY(r.live.price))}</span>
    </button>`;
  }).join('');

  return `<div class="ed">
    <header class="ed__head">
      <p class="ed__kicker">你嘅皮膚</p>
      <p class="ed__read">${smEsc(smRead(ans))}</p>
    </header>
    ${/* The strip exists to put the whole routine side by side. Asking for
          one toner leaves nothing to compare, so it is not a strip — it is
          one product photographed at hero size for no reason. */
      shown.length > 1
        ? `<div class="ed__strip" style="--n:${shown.length}">${strip}</div>` : ''}
    <p class="ed__total" data-total>${shown.length} 件 · <b>${smEsc(SM_MONEY(total))}</b></p>
    <p class="ed__hint">每一步都揀咗三件，向右掃就見到第二、第三推薦。仲係揀唔落手就拉到底收窄。</p>
    ${degraded ? '<p class="ed__warn">而家接唔到即時貨存，落單前請留意有冇貨。</p>' : ''}
    ${groups.map((g, i) => smGroupRow(g, i, ans, sel)).join('')}
    ${/* Down here, not up top. Above the routine it sat where a shopper
          scrolled straight past it — she only knows she cannot choose after
          she has tried to, and by then she is at the bottom of the page. */
      ''}${smRefine(ans, pending, steps, open)}
    <footer class="ed__foot">
      <p class="ed__fine">呢個配方係按產品質地、成分同你揀嘅狀況計出嚟嘅購物建議，唔係醫學意見。
        皮膚有持續狀況請先睇醫生，新產品用前喺耳後試一試。</p>
      <div class="ed__acts">
        <button type="button" class="ed__add" data-add>全部加入購物袋</button>
        <button type="button" class="ed__again" data-back-to-q>上一步</button>
      </div>
    </footer>
  </div>`;
}

/* ── mount ──────────────────────────────────────────────────────────── */

const SM_BLANK = () => ({
  skin: '', sens: '', concerns: [], tol: '', tex: 'any', age: '', want: 'set',
  adv: {}, brands: [], fine: {},
});

/* Whatever the shop learns about who is asking, kept where the shop can
 * read it later. Nothing is sent anywhere from here: there is no analytics
 * endpoint on this site and inventing one — or quietly attaching an age band
 * to the Meta pixel that is already loaded — is not a decision this file
 * gets to make. See OPEN-QUESTIONS for where it should actually go. */
function smRemember(ans) {
  try {
    const log = JSON.parse(localStorage.getItem('sm_profile') || '[]');
    log.push({ skin: ans.skin, sens: ans.sens, tol: ans.tol, tex: ans.tex, age: ans.age,
      concerns: ans.concerns.slice(), want: ans.want });
    localStorage.setItem('sm_profile', JSON.stringify(log.slice(-20)));
  } catch (e) { /* private mode; the routine still works */ }
}

/* Make the lever a lever.
 *
 * It is called 拉桿 and it was only ever tappable, which is most of why the
 * blank track read as decoration. The knob follows the thumb while it is
 * down and the value is only committed on release, so the panel is not
 * re-rendered out from under a finger mid-drag. Tapping a stop still works
 * and goes through the same commit, so nothing depends on pointer events
 * being available. */
function smWireLevers(scope, onCommit) {
  scope.querySelectorAll('[data-lever]').forEach((el) => {
    const stops = el.querySelectorAll('.dl__stop');
    const n = stops.length;
    if (!n) return;
    const scaleN = el.querySelectorAll('.dl__stop:not(.dl__stop--off)').length;
    let live = -1;
    let moved = false;
    // Measured off the stops themselves rather than divided out of the row:
    // the scale and the off-scale column are different widths, so an even
    // split would drift by a whole stop at the right-hand end.
    const indexAt = (x) => {
      let best = 0;
      let bd = Infinity;
      stops.forEach((s, k) => {
        const r = s.getBoundingClientRect();
        const d = Math.abs((r.left + r.width / 2) - x);
        if (d < bd) { bd = d; best = k; }
      });
      return best;
    };
    const show = (i) => {
      if (i === live) return;
      live = i;
      el.classList.remove('is-unset');
      el.classList.toggle('is-off', i >= scaleN);
      el.style.setProperty(i >= scaleN ? '--j' : '--i', String(i >= scaleN ? i - scaleN : i));
      stops.forEach((s, k) => s.setAttribute('aria-checked', String(k === i)));
    };
    el.addEventListener('pointerdown', (e) => {
      if (e.button) return;
      try { el.setPointerCapture(e.pointerId); } catch (err) { /* no capture, still drags */ }
      el.classList.add('is-dragging');
      moved = false;
      show(indexAt(e.clientX));
    });
    el.addEventListener('pointermove', (e) => {
      if (!el.classList.contains('is-dragging')) return;
      const i = indexAt(e.clientX);
      if (i !== live) moved = true;
      show(i);
    });
    // Every pointer release commits where the knob ended up.
    //
    // This used to commit only when the drag had crossed into another stop,
    // and leave everything else to the click that follows. That click never
    // arrives if the press landed on the knob or the rail rather than on a
    // stop button — so grabbing the handle, the one gesture the control is
    // named for, moved it on screen and changed nothing underneath. The
    // shopper then had a lever sitting on 混合性 and a button still telling
    // her to pick her skin type.
    //
    // onCommit ignores a value that has not changed, so the click that may
    // follow — and the keyboard, which fires click and no pointer event at
    // all — costs nothing.
    const end = (e) => {
      if (!el.classList.contains('is-dragging')) return;
      el.classList.remove('is-dragging');
      try { el.releasePointerCapture(e.pointerId); } catch (err) { /* already gone */ }
      const s = stops[live];
      if (s) onCommit(el.dataset.lever, s.dataset.val);
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  });
}

/* The rail's scroll position is the selection. Reading it back on scroll —
   rather than only on a tap — is what lets the price and the basket follow
   a thumb that never touched a control. */
function smWireRails(scope, onPick) {
  scope.querySelectorAll('[data-rail]').forEach((rail) => {
    let raf = 0;
    rail.addEventListener('scroll', () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const cards = rail.children;
        if (!cards.length) return;
        const mid = rail.scrollLeft + rail.clientWidth / 2;
        let best = 0;
        let bd = Infinity;
        for (let i = 0; i < cards.length; i += 1) {
          const d = Math.abs((cards[i].offsetLeft + cards[i].offsetWidth / 2) - mid);
          if (d < bd) { bd = d; best = i; }
        }
        onPick(rail.dataset.rail, best);
      });
    }, { passive: true });
  });
}

async function initSkincareMatch(root) {
  if (!root) return;
  const ans = SM_BLANK();
  let mode, st;
  let groups = [];
  let sel = {};
  let pending = { pri: '', strict: false, tex: '', act: '', avoid: [], brands: [] };
  let refineOpen = false;

  /* Shut, and announced by what it is for.
   *
   * Open, this lands on a shopper who came to browse 護膚 as an unexplained
   * apparatus at the top of the page — dials and chips where a product grid
   * was expected, with nothing saying what it is. So the page keeps its
   * shape and this offers itself in one line she can ignore.
   *
   * It is also why nothing loads until she taps: attrs.json and
   * ingredients.json are a quarter of a megabyte that every visitor to the
   * category page was paying for whether or not they ever used this. */
  root.innerHTML = `<div class="sm__sheet">
    <button type="button" class="sm__open" data-open aria-expanded="false">
      <span class="sm__open-lede">
        <span class="sm__open-kicker">護膚配方</span>
        <span class="sm__open-title">唔知揀邊支好？答三條，幫你揀</span>
        <span class="sm__open-sub">對膚質、成分同質地，喺全店護膚品入面揀出屬於你嗰幾件</span>
      </span>
      <span class="sm__open-mark" aria-hidden="true"></span>
    </button>
    <div class="sm__panel" hidden>
      <div class="sm__stage"></div>
    </div>
  </div>`;
  const panel = root.querySelector('.sm__panel');
  const opener = root.querySelector('[data-open]');
  const stage = root.querySelector('.sm__stage');
  let loaded = false;

  const start = () => {
    mode = SM_MODES[0];
    st = {};
    mode.init(st, ans);
    draw();
  };

  const draw = () => {
    const html = mode.render(st, ans);
    if (html === null) return finish();
    stage.innerHTML = html;
    smWireLevers(stage, (key, val) => {
      if (ans[key] === val) return;
      ans[key] = val;
      draw();
    });
  };

  /* Price, basket and the top strip all read the facing card, so they are
     refreshed in place on scroll. Re-rendering the whole edit here would
     throw away every other rail's position mid-swipe. */
  const sync = () => {
    const shown = smShown(groups, sel);
    const t = stage.querySelector('[data-total]');
    if (t) {
      const sum = shown.reduce((n, r) => n + Number(r.live.price || 0), 0);
      t.innerHTML = `${shown.length} 件 · <b>${smEsc(SM_MONEY(sum))}</b>`;
    }
    groups.forEach((g) => {
      if (!g.picks.length) return;
      const r = g.picks[Math.min(sel[g.step] || 0, g.picks.length - 1)];
      const cell = stage.querySelector(`[data-cell="${g.step}"]`);
      if (cell) {
        cell.querySelector('.ed__cell-shot').innerHTML = r.live.image
          ? `<img src="${smEsc(r.live.image)}" alt="" loading="lazy">` : '';
        cell.querySelector('.ed__cell-price').textContent = SM_MONEY(r.live.price);
      }
      const row = stage.querySelector(`[data-step="${g.step}"]`);
      if (row) {
        row.querySelectorAll('[data-dot]').forEach((d) => d.setAttribute('aria-pressed',
          String(Number(d.dataset.dot) === (sel[g.step] || 0))));
        row.querySelectorAll('.cw__card').forEach((c) => c.setAttribute('aria-current',
          String(Number(c.dataset.i) === (sel[g.step] || 0))));
      }
    });
  };

  /* One way in for every gesture. On a phone the rail scrolls and the
     selection follows; on a desktop wide enough to show all three nothing
     scrolls at all, so a tap has to be able to say it on its own. */
  const choose = (step, i) => {
    const rail = stage.querySelector(`[data-rail="${step}"]`);
    const card = rail && rail.children[i];
    if (card) rail.scrollTo({ left: card.offsetLeft - rail.offsetLeft, behavior: 'smooth' });
    if ((sel[step] || 0) === i) return;
    sel[step] = i;
    sync();
  };

  const paint = () => {
    stage.innerHTML = smEdit(groups, ans, sel, pending, refineOpen);
    smWireRails(stage, (step, i) => {
      if ((sel[step] || 0) === i) return;
      sel[step] = i;
      sync();
    });
  };

  const finish = async () => {
    stage.innerHTML = `<div class="sm__wait"><p>執緊你嗰套…</p>
      <p class="sm__wait-sub">對緊 ${Object.keys(SM.attrs || {}).length} 件貨嘅膚質、成分同存貨。</p></div>`;
    smRemember(ans);
    try {
      const r = await smBuild(ans);
      groups = r.groups;
    } catch (err) {
      stage.innerHTML = `<div class="sm__wait"><p>一時接唔到貨存</p>
        <p class="sm__wait-sub">網絡好啲再試。</p>
        <button type="button" class="ed__again" data-restart>重新做過</button></div>`;
      return;
    }
    sel = {};
    pending = {
      pri: ans.fine.pri || '', strict: !!ans.fine.strict,
      tex: ans.fine.tex || '', act: ans.fine.act || '',
      avoid: (ans.fine.avoid || []).slice(), brands: ans.brands.slice(),
    };
    if (!groups.some((g) => g.picks.length)) {
      stage.innerHTML = `<div class="sm__wait"><p>今次配唔到一套</p>
        <p class="sm__wait-sub">${ans.brands.length
          ? '你揀嘅品牌喺呢啲條件下冇貨，揀多個牌子或者放寬一樣就得。'
          : '條件太窄，放寬其中一樣就得。'}</p>
        <button type="button" class="ed__again" data-restart>重新做過</button></div>`;
      return;
    }
    paint();
  };

  const open = async () => {
    panel.hidden = false;
    opener.setAttribute('aria-expanded', 'true');
    if (loaded) return;
    stage.innerHTML = '<div class="sm__wait"><p>攞緊配方資料…</p></div>';
    try { await smLoad(); await smBaked(); } catch (e) {
      stage.innerHTML = '<div class="sm__wait"><p>配方資料載入唔到</p></div>';
      return;
    }
    loaded = true;
    start();
  };

  root.addEventListener('click', async (e) => {
    if (e.target.closest('[data-open]')) {
      if (panel.hidden) return open();
      panel.hidden = true;
      opener.setAttribute('aria-expanded', 'false');
      return;
    }
    if (!loaded) return;

    if (e.target.closest('[data-restart]')) {
      Object.assign(ans, SM_BLANK());
      return start();
    }

    const al = e.target.closest('[data-all]');
    if (al) {
      const list = stage.querySelector(`[data-list="${al.dataset.all}"]`);
      if (list) { list.hidden = !list.hidden; al.textContent = list.hidden
        ? `睇晒 ${list.children.length} 件` : '收埋'; }
      return;
    }

    const j = e.target.closest('[data-jump]');
    if (j) { document.getElementById('sm-step-' + j.dataset.jump)
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }

    const dot = e.target.closest('[data-dot]');
    if (dot) { choose(dot.closest('[data-step]').dataset.step, Number(dot.dataset.dot)); return; }

    // Anywhere on the card picks it — except the title, which is still a
    // link to the product page, and the cart button, which has its own job.
    const card = e.target.closest('.cw__card');
    if (card && !e.target.closest('a') && !e.target.closest('[data-card-add]')) {
      choose(card.closest('[data-step]').dataset.step, Number(card.dataset.i));
      return;
    }

    // Deal the next three for that step, so a shopper who likes none of the
    // trio is not sent back through the questions. What she has seen goes to
    // the back of the queue rather than out of it.
    const sw = e.target.closest('[data-swap]');
    if (sw) {
      const g = groups.find((x) => x.step === sw.dataset.swap);
      if (g && g.rest.length) {
        const next = g.rest.splice(0, Math.min(SM_PICKS, g.rest.length));
        const old = g.picks.splice(0, g.picks.length);
        g.picks = next.concat(old).slice(0, SM_PICKS);
        g.rest = g.rest.concat(old.slice(Math.max(0, SM_PICKS - next.length)));
        sel[g.step] = 0;
        paint();
        document.getElementById('sm-step-' + groups.indexOf(g))
          ?.scrollIntoView({ block: 'center' });
      }
      return;
    }

    /* ── the last narrowing ──────────────────────────────────────────
       Chips write to a draft and only redraw the panel, so the counts can
       be compared without a round-trip; 收窄推薦 is the one thing that
       spends a request.

       Scoped to the panel on purpose: 拉桿 carries its own brand chips with
       the same data-brand names, and those write straight to `ans`. */
    const inPanel = !!e.target.closest('[data-refine-panel]');
    if (inPanel && e.target.closest('[data-refine]')) {
      refineOpen = !refineOpen;
      paint();
      stage.querySelector('[data-refine-panel]')?.scrollIntoView({ block: 'nearest' });
      return;
    }
    const repaintPanel = () => {
      const p = stage.querySelector('[data-refine-panel]');
      if (p) p.outerHTML = smRefine(ans, pending, groups.map((g) => g.step), refineOpen);
    };
    const fp = inPanel && e.target.closest('[data-fine-pri]');
    if (fp) { pending.pri = fp.dataset.finePri || ''; repaintPanel(); return; }
    const fs = inPanel && e.target.closest('[data-fine-strict]');
    if (fs) { pending.strict = fs.dataset.fineStrict === '1'; repaintPanel(); return; }
    const ft = inPanel && e.target.closest('[data-fine-tex]');
    if (ft) { pending.tex = ft.dataset.fineTex || ''; repaintPanel(); return; }
    const fa = inPanel && e.target.closest('[data-fine-act]');
    if (fa) { pending.act = fa.dataset.fineAct || ''; repaintPanel(); return; }
    const fv = inPanel && e.target.closest('[data-fine-avoid]');
    if (fv) {
      const v = fv.dataset.fineAvoid;
      const at = pending.avoid.indexOf(v);
      if (at > -1) pending.avoid.splice(at, 1); else pending.avoid.push(v);
      repaintPanel();
      return;
    }
    if (inPanel && e.target.closest('[data-brand-all]')) { pending.brands = []; repaintPanel(); return; }
    const br = inPanel && e.target.closest('[data-brand]');
    if (br) {
      const v = br.dataset.brand;
      const at = pending.brands.indexOf(v);
      if (at > -1) pending.brands.splice(at, 1); else pending.brands.push(v);
      repaintPanel();
      return;
    }
    if (inPanel && e.target.closest('[data-refine-clear]')) {
      pending = { pri: '', strict: false, tex: '', act: '', avoid: [], brands: [] };
      repaintPanel();
      return;
    }
    if (inPanel && e.target.closest('[data-refine-go]')) {
      ans.fine = {
        pri: pending.pri, strict: pending.strict,
        tex: pending.tex || null, act: pending.act || null, avoid: pending.avoid.slice(),
      };
      ans.brands = pending.brands.slice();
      refineOpen = true;
      await finish();
      // Back to the products, not to the drawer she just used: the answer
      // to "which three" is up there, and the drawer is still below it.
      stage.querySelector('.ed__strip')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    // One product, straight into the bag. Someone who only wanted a toner
    // should not have to work out that "全部加入購物袋" means the one thing
    // she is looking at.
    const ca = e.target.closest('[data-card-add]');
    if (ca) {
      const h = ca.dataset.cardAdd;
      let pick = null;
      groups.forEach((g) => g.picks.forEach((p) => { if (p.h === h) pick = p; }));
      const id = pick?.live?.variantId;
      if (!id) { ca.textContent = '加唔到'; return; }
      ca.disabled = true; ca.textContent = '加緊…';
      let ok = false;
      if (typeof addLinesToCart === 'function') ok = !!(await addLinesToCart([{ merchandiseId: id, quantity: 1 }]));
      else if (typeof addToCart === 'function') ok = !!(await addToCart(id, 1));
      ca.textContent = ok ? '已加入 ✓' : '加唔到，請再試';
      ca.disabled = ok;
      return;
    }

    // Back to the questions with every answer still in place. "重新做過"
    // threw the lot away, so a shopper who wanted one different concern had
    // to re-enter her skin type, her tolerance and her texture as well.
    if (e.target.closest('[data-back-to-q]')) {
      if (st && Array.isArray(st.deck) && st.at >= st.deck.length) st.at = st.deck.length - 1;
      draw();
      stage.scrollIntoView({ block: 'start' });
      return;
    }

    if (e.target.closest('[data-add]')) {
      const btn = e.target.closest('[data-add]');
      btn.disabled = true; btn.textContent = '加緊…';
      const lines = smShown(groups, sel)
        .map((r) => ({ merchandiseId: r.live.variantId, quantity: 1 }))
        .filter((l) => l.merchandiseId);
      let ok = false;
      if (!lines.length) { btn.textContent = '冇即時貨存，加唔到'; return; }
      if (typeof addLinesToCart === 'function') ok = !!(await addLinesToCart(lines));
      else if (typeof addToCart === 'function') { for (const l of lines) await addToCart(l.merchandiseId, 1); ok = true; }
      btn.textContent = ok ? '已加入購物袋' : '加唔到，請再試';
      btn.disabled = !ok;
      return;
    }

    if (!mode) return;
    const act = mode.click(e, st, ans);
    if (act === 'redraw') draw();
    else if (act === 'finish') finish();
  });
}
