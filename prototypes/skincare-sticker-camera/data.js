const SKIN_META = { total: 627, brands: 32 };

const SKIN_CATS = [
  {
    id: "cleanser", label: "潔面", count: 93, tint: "#70e5ff",
    products: [
      ["VT 塗抹式微針潔面乳 80ml", "VT COSMETICS", 126, "https://cdn.shopify.com/s/files/1/0765/3405/5070/files/vt-cosmetics-vt-cosmetics-vt-80ml-9315-01-7fba0ba01a22.jpg?v=1786775243"],
      ["Arencia 皇家藍牛膝草潔面乳", "ARENCIA", 89, "https://cdn.shopify.com/s/files/1/0765/3405/5070/files/arencia-arencia-1070-01-5d57488d8434.jpg?v=1786773478"],
      ["Arencia 綠色年糕保濕潔面乳", "ARENCIA", 95, "https://cdn.shopify.com/s/files/1/0765/3405/5070/files/arencia-arencia-0738-01-5f3dd03cd9e7.jpg?v=1786773459"],
      ["ma:nyo 草本綠色卸妝油 200ml", "MA:NYO", 148, "https://cdn.shopify.com/s/files/1/0765/3405/5070/files/ma-nyo-ma-nyo-200ml-1608-01-60fd37a38c6a.jpg?v=1786772028"]
    ]
  },
  {
    id: "toner", label: "爽膚水", count: 53, tint: "#b8ff62",
    products: [
      ["竹萃透明質酸保濕爽膚水 250ml", "BRING GREEN", 109, "https://cdn.shopify.com/s/files/1/0765/3405/5070/files/original_bb38ea73-5a74-4fdf-9d4c-caee1570c582.png?v=1786103467"],
      ["煥膚透亮白米爽膚水 200ml", "DR. MELAXIN", 148, "https://cdn.shopify.com/s/files/1/0765/3405/5070/files/Korean-Skincare-Official_206be71b-e711-4433-a462-e9af89cb4c71.jpg?v=1786092826"],
      ["燕麥 PDRN 溫和爽膚水 200ml", "PURITO SEOUL", 128, "https://cdn.shopify.com/s/files/1/0765/3405/5070/files/Purito-Oat-PDRN-Gentle-Refining-Toner-Nudie-Glow-Australia.jpg?v=1786081000"],
      ["濟州青橘維C保濕爽膚水 300ml", "GOODAL", 129, "https://cdn.shopify.com/s/files/1/0765/3405/5070/files/Goodal-Green-Tangerine-Vita-C-Toner-Nudie-Glow-Australia.jpg?v=1786080926"]
    ]
  },
  {
    id: "pad", label: "棉片", count: 36, tint: "#fff06a",
    products: [
      ["VT AZ 護理爽膚水棉片 60片", "VT COSMETICS", 128, "https://cdn.shopify.com/s/files/1/0765/3405/5070/files/vt-cosmetics-vt-az-60-60-1567-01-196cd09f0e02.jpg?v=1786775234"],
      ["Green Tomato 毛孔護理棉片 60片", "SUNGBOON EDITOR", 132, "https://cdn.shopify.com/s/files/1/0765/3405/5070/files/sungboon-editor-sungboon-editor-green-to-01-e30eaee1133a.jpg?v=1786771184"],
      ["積雪草茶樹保濕舒緩爽膚棉 90片", "BRING GREEN", 118, "https://cdn.shopify.com/s/files/1/0765/3405/5070/files/bring-green-bring-green-90-0050-white.jpg?v=1786103587"],
      ["Super Lemon 穀胱甘肽爽膚棉片 90片", "BRING GREEN", 129, "https://cdn.shopify.com/s/files/1/0765/3405/5070/files/original_8801e382-5ca5-457d-852a-2ddb2a90705f.png?v=1786103446"]
    ]
  },
  {
    id: "serum", label: "精華液", count: 105, tint: "#ff82c9",
    products: [
      ["龍血植物萃取緊緻微針精華 300 50ml", "VT COSMETICS", 280, "https://cdn.shopify.com/s/files/1/0765/3405/5070/files/vt-cosmetics-vt-300-50ml-9663-01-7c8b5c208c20.png?v=1786775530"],
      ["膠原蛋白微針精華 100 獨立包裝", "VT COSMETICS", 69, "https://cdn.shopify.com/s/files/1/0765/3405/5070/files/vt-cosmetics-vt-100-2-x-10-7317-01-53eab0247508.jpg?v=1786775490"],
      ["老虎膠原蛋白微晶精華 100 50ml", "VT COSMETICS", 248, "https://cdn.shopify.com/s/files/1/0765/3405/5070/files/vt-cosmetics-vt-100-50ml-3692-01-75554b16d306_c308f9e5-dc8f-4f13-acab-999fbb449ad4.png?v=1786775479"],
      ["老虎維他亮白微晶精華 100 50ml", "VT COSMETICS", 248, "https://cdn.shopify.com/s/files/1/0765/3405/5070/files/vt-cosmetics-vt-100-50ml-6402-01-3bb2636cdace.png?v=1786775453"]
    ]
  },
  {
    id: "moisturizer", label: "乳液", count: 101, tint: "#c8a6ff",
    products: [
      ["微針提拉面霜 50ml", "VT COSMETICS", 228, "https://cdn.shopify.com/s/files/1/0765/3405/5070/files/vt-cosmetics-vt-50-9537-01-c3f060bcdc15_a8ec8921-e100-4e80-8a59-90264df0c6bf.jpg?v=1786775289"],
      ["PDRN 面霜 100 50ml", "VT COSMETICS", 289, "https://cdn.shopify.com/s/files/1/0765/3405/5070/files/vt-cosmetics-vt-pdrn-100-50ml-6655-01-861902ed129b_61f6cfbd-8432-4bbe-8090-708354e67ebd.webp?v=1786775279"],
      ["紅色果昔乳液 5號 200ml", "ARENCIA", 128, "https://cdn.shopify.com/s/files/1/0765/3405/5070/files/arencia-arencia-5-200-2565-01-e0b08764ae4e.jpg?v=1786773593"],
      ["深水湧動舒緩面霜 110ml", "ARENCIA", 109, "https://cdn.shopify.com/s/files/1/0765/3405/5070/files/arencia-arencia-2025-110-2220-01-ac578f8cfe6b.jpg?v=1786773555"]
    ]
  },
  {
    id: "mask", label: "面膜", count: 132, tint: "#ff987c",
    products: [
      ["杯裝軟膜粉 28g 鎮靜草", "LINDSAY", 19, "https://cdn.shopify.com/s/files/1/0765/3405/5070/files/lindsay-lindsay-28g-6354-01-b6ee0a881e2c_a75ec8af-fd75-4a02-bdc6-edae54d7eca8.jpg?v=1786775985"],
      ["杯裝軟膜粉 28g 舒緩肌膚", "LINDSAY", 19, "https://cdn.shopify.com/s/files/1/0765/3405/5070/files/lindsay-lindsay-re-natural-35g-5745-01-4d899018e396_7cf57a0d-d0a1-4cd1-b644-04cd0d6919fa.jpg?v=1786775965"],
      ["杯裝軟膜粉 28g 美白保濕", "LINDSAY", 19, "https://cdn.shopify.com/s/files/1/0765/3405/5070/files/lindsay-lindsay-re-natural-35g-5745-01-4d899018e396_7bf87305-bf65-4c3f-be3c-b972b789d56b.jpg?v=1786775948"],
      ["杯裝軟膜粉 28g 清潔毛孔", "LINDSAY", 19, "https://cdn.shopify.com/s/files/1/0765/3405/5070/files/lindsay-lindsay-re-natural-35g-5745-01-4d899018e396_f565a808-5657-48e9-a6cc-38c6c107faef.jpg?v=1786775929"]
    ]
  },
  {
    id: "eye", label: "眼部護理", count: 24, tint: "#77c8ff",
    products: [
      ["Probioderm 膠原重塑眼膜 60片", "BOH", 126, "https://cdn.shopify.com/s/files/1/0765/3405/5070/files/boh-boh-probioderm-60-8129-01-6f49c56465dc.jpg?v=1786771571"],
      ["Super Lemon 穀胱甘肽眼霜 30ml＋30ml", "BRING GREEN", 149, "https://cdn.shopify.com/s/files/1/0765/3405/5070/files/original_ed77ade1-7e54-400c-934c-4860ed99e0f5.png?v=1786103435"],
      ["咖啡因即時舒緩眼部凝膠貼片 60片", "KSECRET", 116, "https://cdn.shopify.com/s/files/1/0765/3405/5070/files/KSECRET-Instant-Relief-Eye-Gel-Patches-_Caffeine_-Nudie-Glow-Australia.jpg?v=1786081125"],
      ["維A醇高級再生眼膠貼片 60片", "KSECRET", 119, "https://cdn.shopify.com/s/files/1/0765/3405/5070/files/KSECRET-Advanced-Regenerating-Eye-Gel-Patches-_Retinol_-Nudie-Glow-Australia.jpg?v=1786081119"]
    ]
  },
  {
    id: "sunscreen", label: "防曬", count: 67, tint: "#ffce4f",
    products: [
      ["PDRN 精華光澤防曬粉餅 10g", "VT COSMETICS", 178, "https://cdn.shopify.com/s/files/1/0765/3405/5070/files/vt-cosmetics-vt-pdrn-10-7201-01-14d923b269ce_ac7cf232-156b-4f78-8ae3-4dddbd0e8d8c.jpg?v=1786775266"],
      ["深水湧動防曬精華 50ml", "ARENCIA", 119, "https://cdn.shopify.com/s/files/1/0765/3405/5070/files/arencia-arencia-50-2121-01-8e45717ef0c2.jpg?v=1786773575"],
      ["Probioderm 膠原精華防曬霜 SPF50+", "BOH", 168, "https://cdn.shopify.com/s/files/1/0765/3405/5070/files/boh-boh-probioderm-spf50-pa-50ml-1595-01-4cf09e729f92.jpg?v=1786771536"],
      ["蘆薈鎮定防曬精華液 50ml", "TOCOBO", 119, "https://cdn.shopify.com/s/files/1/0765/3405/5070/files/tocobo-tocobo-50ml-0447-01-471531642aa3.png?v=1786762686"]
    ]
  }
];

function skinCat(id) {
  return SKIN_CATS.find((cat) => cat.id === id) || SKIN_CATS[3];
}

function skinIcon(id) {
  const common = 'class="skin-cat-icon" viewBox="0 0 64 64" aria-hidden="true" focusable="false"';
  const icons = {
    cleanser: `<svg ${common}><path d="M13 42c-7-7 1-16 8-13-1-10 14-15 19-6 8-3 15 7 10 14 7 5 0 15-8 13H21c-7 0-12-3-8-8Z" fill="#fff" stroke="currentColor" stroke-width="3"/><circle cx="24" cy="36" r="3"/><circle cx="38" cy="31" r="4" fill="none" stroke="currentColor" stroke-width="3"/><path d="m48 12 2 6 6 2-6 2-2 6-2-6-6-2 6-2Z" fill="#fff" stroke="currentColor" stroke-width="2"/></svg>`,
    toner: `<svg ${common}><path d="M32 7c8 13 16 21 16 32a16 16 0 0 1-32 0c0-11 8-19 16-32Z" fill="#fff" stroke="currentColor" stroke-width="3"/><path d="M23 39c2 7 7 10 14 9" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><circle cx="27" cy="31" r="3" fill="currentColor"/></svg>`,
    pad: `<svg ${common}><circle cx="32" cy="32" r="22" fill="#fff" stroke="currentColor" stroke-width="3"/><path d="M18 27c9-6 19-7 28-1M17 35c10-5 20-5 30 0M20 43c8-3 16-3 24 0" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><path d="m49 10 1.5 4.5L55 16l-4.5 1.5L49 22l-1.5-4.5L43 16l4.5-1.5Z" fill="currentColor"/></svg>`,
    serum: `<svg ${common}><path d="M24 8h16v9H24z" fill="#fff" stroke="currentColor" stroke-width="3"/><path d="M27 17v9L18 38v17h28V38l-9-12v-9" fill="#fff" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/><path d="M22 40c7 3 13-3 21 0v11H22Z" fill="currentColor" opacity=".28"/><path d="M32 30c3 4 5 6 5 9a5 5 0 1 1-10 0c0-3 2-5 5-9Z" fill="none" stroke="currentColor" stroke-width="2.5"/></svg>`,
    moisturizer: `<svg ${common}><path d="M14 31h36l-4 23H18Z" fill="#fff" stroke="currentColor" stroke-width="3"/><path d="M18 24h28v8H18z" fill="#fff" stroke="currentColor" stroke-width="3"/><path d="M24 23c-1-7 11-4 8-12 8 5 12 9 7 13" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M23 43c7-4 13 4 19 0" fill="none" stroke="currentColor" stroke-width="2.5"/></svg>`,
    mask: `<svg ${common}><path d="M14 29C14 16 22 8 32 8s18 8 18 21c0 16-8 27-18 27S14 45 14 29Z" fill="#fff" stroke="currentColor" stroke-width="3"/><ellipse cx="24" cy="29" rx="5" ry="3" fill="none" stroke="currentColor" stroke-width="2.5"/><ellipse cx="40" cy="29" rx="5" ry="3" fill="none" stroke="currentColor" stroke-width="2.5"/><path d="M29 44c2-2 4-2 6 0M32 33v5" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><path d="M17 19c4 1 7-2 8-6M47 19c-4 1-7-2-8-6" fill="none" stroke="currentColor" stroke-width="2"/></svg>`,
    eye: `<svg ${common}><path d="M8 31c7-10 15-14 24-14s17 4 24 14c-7 10-15 14-24 14S15 41 8 31Z" fill="#fff" stroke="currentColor" stroke-width="3"/><circle cx="32" cy="31" r="7" fill="currentColor"/><circle cx="35" cy="28" r="2" fill="#fff"/><path d="M15 48c5-4 10-4 15-1M34 47c5-3 10-3 15 1" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>`,
    sunscreen: `<svg ${common}><circle cx="31" cy="31" r="13" fill="#fff" stroke="currentColor" stroke-width="3"/><g stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M31 5v8M31 49v8M5 31h8M49 31h8M13 13l6 6M43 43l6 6M49 13l-6 6M19 43l-6 6"/></g><path d="m31 20 3 7 7 1-5 5 1 8-6-4-7 4 2-8-6-5 8-1Z" fill="currentColor"/></svg>`
  };
  return icons[id];
}

function skinCategoryButtons(kind) {
  return SKIN_CATS.map((cat, i) => `
    <button type="button" class="skin-cat skin-cat--${cat.id}" data-cat="${cat.id}"
      aria-pressed="false" style="--cat-tint:${cat.tint};--i:${i}">
      ${skinIcon(cat.id)}
      <b>${cat.label}</b><small>${cat.count}</small>
    </button>`).join("");
}

function skinPhotoFrames(cat) {
  return cat.products.map((product) => `<img src="${product[3]}&width=300" alt="" loading="eager">`).join("");
}

function skinProducts(cat) {
  return cat.products.map(([title, vendor, price, image]) => `
    <a class="product-card" href="#">
      <span class="product-card__image"><img src="${image}&width=520" alt="${title}" loading="lazy"></span>
      <em>${vendor}</em><span class="product-card__name">${title}</span><strong>HK$${price}</strong>
    </a>`).join("");
}

function skinProductSection(initialId) {
  const cat = skinCat(initialId);
  return `<section class="products" aria-live="polite">
    <div class="products__bar"><strong data-product-title>${cat.label}</strong><span data-product-count>${cat.count} 件</span><button type="button">篩選／排序</button></div>
    <div class="product-grid" data-product-grid>${skinProducts(cat)}</div>
  </section>`;
}
