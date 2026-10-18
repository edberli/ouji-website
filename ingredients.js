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
/* 英文版（2026-10-18 上 live 前補） */
const FLAG_EN = {
  酒精: { name: 'alcohol', note: 'Contains denatured alcohol; sensitive or dry skin may feel tight' },
  香料: { name: 'fragrance', note: 'Contains fragrance/perfume, a common allergen' },
  精油: { name: 'essential oils', note: 'Contains essential oils; take care if your skin is sensitive' },
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
    return `<span class="ing-chip ing-chip--clean">${typeof oujiCopy === 'function' ? oujiCopy('無酒精 · 無香料 · 無精油', 'No alcohol · No fragrance · No essential oils') : '無酒精 · 無香料 · 無精油'}</span>`;
  }
  const en = typeof oujiCopy === 'function' && oujiCopy('zh', 'en') === 'en';
  return flags
    .map((f) => (en && FLAG_EN[f]
      ? `<span class="ing-chip ing-chip--warn" title="${FLAG_EN[f].note}">Contains ${FLAG_EN[f].name}</span>`
      : `<span class="ing-chip ing-chip--warn" title="${FLAG_NOTE[f] || ''}">含${f}</span>`))
    .join('');
}

/**
 * What each active actually does, in one breath.
 *
 * A chip reading 煙酰胺 15% means nothing to most shoppers, and the ones
 * it does mean something to are not the ones who need convincing. The "!"
 * is for everyone else: tap it and find out why this ingredient is on the
 * bottle. Written as what the ingredient is for, never as a promise about
 * anyone's skin — "有助" and "常用嚟", not "醫好" or "根治".
 */
const INGREDIENT_INFO = {
  視黃醇: {
    what: '維他命 A 衍生物，護膚成分入面研究得最多嗰隻。',
    use: '常用嚟處理細紋同粗糙膚質。',
    tip: '由低濃度開始、隔日晚上用，日頭一定要搽防曬。孕婦應該避開。',
    en: { name: 'Retinol', what: 'A vitamin A derivative — the most researched ingredient in skincare.', use: 'Commonly used for fine lines and rough texture.', tip: 'Start with a low strength every other night and always wear sunscreen in the day. Avoid during pregnancy.' },
  },
  維他命C: {
    what: '抗氧化成分，最常見嘅形態係 L-抗壞血酸。',
    use: '常用嚟提亮膚色同對付曬後暗沉。',
    tip: '早上用配合防曬效果較好。開封後會氧化變黃，變色就唔好再用。',
    en: { name: 'Vitamin C', what: 'An antioxidant; the most common form is L-ascorbic acid.', use: 'Commonly used to brighten skin tone and tackle post-sun dullness.', tip: 'Works best in the morning with sunscreen. It oxidises and turns yellow after opening — stop using it once it changes colour.' },
  },
  煙酰胺: {
    what: '維他命 B3。韓國護膚品最常見嘅活性成分之一。',
    use: '常用嚟處理暗沉、粗大毛孔同出油。',
    tip: '2% 已經有用，10% 以上有啲人會覺得刺痛，可以由低濃度試起。',
    en: { name: 'Niacinamide', what: 'Vitamin B3, one of the most common actives in Korean skincare.', use: 'Commonly used for dullness, enlarged pores and oiliness.', tip: '2% already works; some people feel a sting above 10%, so start low.' },
  },
  'AHA/BHA': {
    what: '果酸類。AHA 溶於水，BHA 溶於油所以入到毛孔。',
    use: '常用嚟代謝角質、處理粗糙同粉刺。',
    tip: '一星期一至三次已經夠。同 A 醇分開晚上用，日頭要搽防曬。',
    en: { name: 'AHA/BHA', what: 'Acids: AHA dissolves in water, while BHA dissolves in oil, so it can get into pores.', use: 'Commonly used to exfoliate and deal with roughness and clogged pores.', tip: 'One to three times a week is enough. Use on a different night from retinol, and wear sunscreen in the day.' },
  },
  PDRN: {
    what: '三文魚 DNA 片段，近年韓國最紅嘅修護成分。',
    use: '常用嚟做屏障修護同提升彈性。',
    tip: '性質溫和，可以日日用，同其他成分都夾得埋。',
    en: { name: 'PDRN', what: 'Salmon DNA fragments — one of Korea\'s most popular repair ingredients right now.', use: 'Commonly used to support the skin barrier and elasticity.', tip: 'Gentle enough for daily use and pairs well with other ingredients.' },
  },
  胜肽: {
    what: '氨基酸短鏈，作用係向皮膚傳遞訊號。',
    use: '常見於抗皺同緊緻類產品。',
    tip: '溫和，適合唔想用 A 醇但想做抗老嘅人。',
    en: { name: 'Peptides', what: 'Short chains of amino acids that send signals to the skin.', use: 'Common in anti-wrinkle and firming products.', tip: 'Gentle — a good choice if you want anti-ageing care without retinol.' },
  },
  透明質酸: {
    what: '保濕劑，可以抓住自身重量幾百倍嘅水分。',
    use: '幾乎所有保濕產品都會有。',
    tip: '皮膚仲濕住嗰陣搽，跟住要用面霜鎖住，否則乾燥天氣反而會抽走水分。',
    en: { name: 'Hyaluronic acid', what: 'A humectant that can hold hundreds of times its own weight in water.', use: 'Found in almost every hydrating product.', tip: 'Apply to damp skin and seal it in with a cream; otherwise it can draw moisture out in dry weather.' },
  },
  積雪草: {
    what: '雷公根萃取，韓國「cica」系列講嘅就係佢。',
    use: '常用嚟舒緩泛紅同鎮靜狀態唔穩定嘅皮膚。',
    tip: '溫和，刷酸或者曬後嘅日子特別多人用。',
    en: { name: 'Centella', what: 'Centella asiatica extract — the \'cica\' in Korean cica ranges.', use: 'Commonly used to calm redness and settle unsettled skin.', tip: 'Gentle; especially popular on days after exfoliating or sun exposure.' },
  },
  神經醯胺: {
    what: '皮膚屏障本身嘅組成脂質之一。',
    use: '常用嚟補返屏障、減少水分流失。',
    tip: '乾肌同敏感肌嘅基本盤，一年四季都用得。',
    en: { name: 'Ceramide', what: 'One of the lipids that make up the skin barrier itself.', use: 'Commonly used to restore the barrier and reduce moisture loss.', tip: 'A staple for dry and sensitive skin, all year round.' },
  },
  泛醇: {
    what: '維他命 B5 前體，保濕兼舒緩。',
    use: '常見於修護同鎮靜類產品。',
    tip: '好少人會敏感，可以同任何成分一齊用。',
    en: { name: 'Panthenol', what: 'Pro-vitamin B5 — hydrating and soothing.', use: 'Common in repairing and calming products.', tip: 'Rarely irritating, and works alongside any other ingredient.' },
  },
  '曲酸／傳明酸': {
    what: '抑制黑色素生成路徑嘅成分。',
    use: '常用嚟處理曬斑同痘印留低嘅色素。',
    tip: '要見到分別通常要連續用幾個月，而且一定要配防曬。',
    en: { name: 'Kojic / tranexamic acid', what: 'Ingredients that interrupt the pathway that makes pigment.', use: 'Commonly used for sun spots and marks left by breakouts.', tip: 'It usually takes a few months of steady use to see a difference, and sunscreen is a must.' },
  },
};

function activeChips(handle) {
  const r = ing(handle);
  if (!r || !r.actives?.length) return '';
  /* `actives_src: 'model'` 標住嗰批係由模型推斷返嚟（信心 0.5–0.75），
     唔係抄自官方成分表。用嚟做護膚配方推薦冇問題 —— 排錯次序最多
     係推薦冇咁準。但喺產品頁掛個「含積雪草」嘅牌就係同客講事實，
     估錯就係講錯，所以呢批唔顯示。 */
  if (r.actives_src === 'model') return '';
  return r.actives
    .slice(0, 4)
    .map((a) => {
      const pct = strengthOf(r, a);
      const info = INGREDIENT_INFO[a];
      const en = typeof oujiCopy === 'function' && oujiCopy('zh', 'en') === 'en';
      const label = en && info?.en ? info.en.name : a;
      return `<span class="ing-chip ing-chip--active">${label}${pct ? ` ${pct}%` : ''}${
        info ? `<button class="ing-what" type="button" data-ing="${a}"
                  aria-label="${en ? `What is ${label}?` : `${a}係咩`}">!</button>` : ''
      }</span>`;
    })
    .join('');
}

/**
 * One panel, opened by whichever "!" was tapped. A tooltip on hover would
 * be invisible on a phone, which is where most of this shop is read.
 */
function initIngredientInfo(root) {
  (root || document).addEventListener('click', (e) => {
    const btn = e.target.closest('.ing-what');
    const open = document.querySelector('.ing-sheet');
    if (open && !e.target.closest('.ing-sheet')) open.remove();
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    const name = btn.dataset.ing;
    const info = INGREDIENT_INFO[name];
    if (!info) return;
    const sheet = document.createElement('div');
    sheet.className = 'ing-sheet';
    /* 英文版（2026-10-18 上 live 前補）：有 en 就用英文 */
    const t = typeof oujiCopy === 'function' && oujiCopy('zh', 'en') === 'en' && info.en
      ? { ...info.en, close: 'Close', useH: 'What it\'s used for', tipH: 'Good to know', note: 'For general reference only, not medical advice. If you have a skin condition, please see a doctor.' }
      : { name, what: info.what, use: info.use, tip: info.tip, close: '閂', useH: '通常用嚟做咩', tipH: '用嘅時候留意', note: '成分說明只作一般參考，唔係醫療建議。皮膚有狀況請睇醫生。' };
    sheet.innerHTML = `<div class="ing-sheet__box">
      <button class="ing-sheet__close" type="button" aria-label="${t.close}">&times;</button>
      <h4>${t.name}</h4>
      <p>${t.what}</p>
      <p><strong>${t.useH}</strong><br>${t.use}</p>
      <p><strong>${t.tipH}</strong><br>${t.tip}</p>
      <small>${t.note}</small>
    </div>`;
    document.body.appendChild(sheet);
    sheet.addEventListener('click', (ev) => {
      if (ev.target === sheet || ev.target.closest('.ing-sheet__close')) sheet.remove();
    });
  });
}

document.addEventListener('DOMContentLoaded', () => initIngredientInfo());

const STRENGTH_KEY = {
  視黃醇: ['retinol', 'retinal', '視黃醇', '視黃醛'],
  維他命C: ['vitamin c', 'ascorbic', '維他命 c', '維他命c'],
  煙酰胺: ['niacinamide', '煙酰胺', '煙醯胺'],
  PDRN: ['pdrn'],
  'AHA/BHA': ['aha', 'bha', 'pha'],
};

/* 暫時一律唔顯示濃度。
 *
 * `strength` 係由產品名／文案掃數字掃返嚟嘅，掃錯咗都唔知：
 *   APRILSKIN「TXA 99」→ 記住「煙酰胺 99%」（99 係產品線名，唔係濃度）
 *   KSECRET「1988-12」 → 記住「視黃醛 12%」（視黃醛實際用 0.05–0.1%）
 * 十一件有記濃度嘅貨入面，至少五件係咁樣嚟。
 *
 * 而家啲數之所以冇喺產品頁出現過，純粹係因為 key 有亂碼（「煙?胺」）
 * 對唔上，唔係我哋擋住咗 —— 即係邊個修好個亂碼（scripts/
 * fix_title_mojibake.py 已經寫好但未跑過），啲錯數就會即刻見客。
 *
 * 濃度係客會照住嚟揀強弱嘅數字，講錯過唔到自己嗰關。要重新開返，
 * 先要對住品牌公開嘅成分表逐件核，唔可以再靠掃數字。 */
function strengthOf(r, active) {
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
