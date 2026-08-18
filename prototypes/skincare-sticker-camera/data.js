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
  const common = 'class="skin-cat-icon" viewBox="0 0 72 76" aria-hidden="true" focusable="false"';
  const icons = {
    cleanser: `<svg ${common}><g stroke="currentColor" stroke-width="2.8" stroke-linejoin="round"><path d="m20 9 36 7-8 47-37-7Z" fill="var(--cat-tint)"/><path d="m16 55 32 6-2 9-32-6Z" fill="#fff"/><path d="M30 10 44 3l8 12" fill="#fff"/><path d="M23 30c8-6 18-2 20 6-5 8-15 10-23 5Z" fill="#fff"/></g><circle cx="35" cy="34" r="3" fill="currentColor"/><circle cx="46" cy="25" r="4" fill="#fff" stroke="currentColor" stroke-width="2.5"/><path d="m57 36 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" fill="#7de7e0" stroke="currentColor" stroke-width="2"/></svg>`,
    toner: `<svg ${common}><g stroke="currentColor" stroke-width="2.8" stroke-linejoin="round"><path d="M28 6h18v8H28Z" fill="#fff"/><path d="M31 14h12v7l7 9v36H22V30l9-9Z" fill="var(--cat-tint)"/><path d="M26 38h20v20H26Z" fill="#fff"/></g><path d="M33 31c4-7 8-7 10 0" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/><path d="M31 45h10M31 50h7" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><circle cx="53" cy="20" r="4" fill="#63e7ff" stroke="currentColor" stroke-width="2"/></svg>`,
    pad: `<svg ${common}><g stroke="currentColor" stroke-width="2.8"><ellipse cx="35" cy="21" rx="25" ry="12" fill="#fff"/><path d="M10 21v34c0 7 11 13 25 13s25-6 25-13V21c0 7-11 13-25 13S10 28 10 21Z" fill="var(--cat-tint)"/><ellipse cx="35" cy="21" rx="20" ry="8" fill="#fff"/><path d="M17 48c11 5 25 5 36 0" fill="none" stroke-linecap="round"/></g><path d="M22 18c8-3 17-3 25 0M24 22c7-2 14-2 22 0M26 26c6-1 12-1 18 0" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="m57 7 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" fill="#fff06a" stroke="currentColor" stroke-width="2"/></svg>`,
    serum: `<svg ${common}><g stroke="currentColor" stroke-width="2.8" stroke-linejoin="round"><path d="M30 3h18v8H30Z" fill="#11131a"/><path d="M34 11h10v8H34Z" fill="#fff"/><path d="M24 19h30l4 48H20Z" fill="var(--cat-tint)"/><path d="M26 37h25v24H26Z" fill="#fff"/></g><path d="M39 25c5 7 7 10 7 14a7 7 0 1 1-14 0c0-4 2-7 7-14Z" fill="#7de7e0" stroke="currentColor" stroke-width="2.4"/><path d="M31 46h16M31 51h11" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
    moisturizer: `<svg ${common}><g stroke="currentColor" stroke-width="2.8" stroke-linejoin="round"><path d="M16 27h40l4 11H12Z" fill="#fff"/><path d="M13 38h46l-4 29H17Z" fill="var(--cat-tint)"/><path d="M19 47h34v13H19Z" fill="#fff"/></g><path d="M26 25c-3-7 10-6 7-16 10 5 16 10 10 17" fill="#fff" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M27 53c7-5 12 5 19 0" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>`,
    mask: `<svg ${common}><path d="M16 5h40l7 13-5 52H14L9 18Z" fill="var(--cat-tint)" stroke="currentColor" stroke-width="2.8" stroke-linejoin="round"/><path d="M17 14h38l-3 48H20Z" fill="#fff" stroke="currentColor" stroke-width="2.4"/><path d="M26 29c0-7 4-11 10-11s10 4 10 11v13c0 10-5 16-10 16s-10-6-10-16Z" fill="#e8f7ed" stroke="currentColor" stroke-width="2.2"/><ellipse cx="31" cy="34" rx="3.5" ry="2" fill="none" stroke="currentColor" stroke-width="1.8"/><ellipse cx="41" cy="34" rx="3.5" ry="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M33 48c2-1 4-1 6 0" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="m56 8 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" fill="#ff82c9" stroke="currentColor" stroke-width="2"/></svg>`,
    eye: `<svg ${common}><path d="M8 18c9-5 18-5 27 1-3 12-10 20-23 23-4-8-5-16-4-24Z" fill="#7de7e0" stroke="currentColor" stroke-width="2.8" stroke-linejoin="round"/><path d="M64 18c-9-5-18-5-27 1 3 12 10 20 23 23 4-8 5-16 4-24Z" fill="#7de7e0" stroke="currentColor" stroke-width="2.8" stroke-linejoin="round"/><path d="M15 22c6-2 11-1 16 2M57 22c-6-2-11-1-16 2" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/><path d="M21 49c5 0 9 4 9 9s-4 9-9 9-9-4-9-9 4-9 9-9Zm30 0c5 0 9 4 9 9s-4 9-9 9-9-4-9-9 4-9 9-9Z" fill="var(--cat-tint)" stroke="currentColor" stroke-width="2.6"/><path d="m21 53 1.5 3.5L26 58l-3.5 1.5L21 63l-1.5-3.5L16 58l3.5-1.5Z" fill="#fff"/></svg>`,
    sunscreen: `<svg ${common}><g stroke="currentColor" stroke-width="2.8" stroke-linejoin="round"><path d="m20 12 34 6-9 45-34-6Z" fill="var(--cat-tint)"/><path d="m14 55 31 6-2 9-31-6Z" fill="#fff"/><path d="M24 28h22l-4 22H20Z" fill="#fff"/></g><circle cx="34" cy="38" r="6" fill="#fff06a" stroke="currentColor" stroke-width="2"/><g stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M34 27v4M34 45v4M23 38h4M41 38h4M26 30l3 3M39 43l3 3M42 30l-3 3M29 43l-3 3"/></g><path d="m57 7 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" fill="#ff82c9" stroke="currentColor" stroke-width="2"/></svg>`
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
