const CATALOG = {
  total: 182,
  brands: 23,
  categories: [
    {
      label: "底妝", count: 46,
      products: [
        ["CLIO 極致持妝無瑕氣墊粉底 附補充裝 SPF40+ PA++", "CLIO", 269, "https://cdn.shopify.com/s/files/1/0765/3405/5070/files/clio-kill-cover-founwear-cushion-01.jpg?v=1785764635"],
        ["CLIO 柔霧遮瑕氣墊粉底 附補充裝 SPF40+ PA++", "CLIO", 269, "https://cdn.shopify.com/s/files/1/0765/3405/5070/files/clio-kill-cover-skin-fixer-cushion-01.jpg?v=1785764637"],
        ["CLIO 網光亮肌精華氣墊粉底 附補充裝 SPF50+ PA+++", "CLIO", 269, "https://cdn.shopify.com/s/files/1/0765/3405/5070/files/clio-kill-cover-high-glow-cushion-01.jpg?v=1785764640"],
        ["UNLEASHIA Babe Skin Baby Blue 氣墊粉底", "UNLEASHIA", 178, "https://cdn.shopify.com/s/files/1/0765/3405/5070/files/unleashia-babe-skin-baby-blue-cushion.jpg?v=1785904491"]
      ]
    },
    {
      label: "眼妝", count: 50,
      products: [
        ["Heart Percent Dote on Mood 眼影盤", "HEART PERCENT", 198, "https://cdn.shopify.com/s/files/1/0765/3405/5070/files/2a6ff6ccf99e7154a4b67cafb2811612.jpg?v=1785667240"],
        ["Heart Percent Dote on Mood 眼線膠筆", "HEART PERCENT", 85, "https://cdn.shopify.com/s/files/1/0765/3405/5070/files/e25a2e62868900e3cd4f21f88bfdbe6e.jpg?v=1785748479"],
        ["CLIO 自動塑形眉筆連削筆器", "CLIO", 155, "https://cdn.shopify.com/s/files/1/0765/3405/5070/files/clio-kill-brow-auto-hard-pencil-01.jpg?v=1785764643"],
        ["CLIO 魅黑高效防水眼線液", "CLIO", 138, "https://cdn.shopify.com/s/files/1/0765/3405/5070/files/clio-superproof-brush-liner-01.jpg?v=1785764649"]
      ]
    },
    {
      label: "唇妝", count: 58,
      products: [
        ["BRAYE Lipsleek 唇頰彩妝", "BRAYE", 118, "https://cdn.shopify.com/s/files/1/0765/3405/5070/files/braye-lipsleek-03.jpg?v=1785519682"],
        ["BRAYE Lipsleek Blur 霧感唇頰彩妝", "BRAYE", 118, "https://cdn.shopify.com/s/files/1/0765/3405/5070/files/braye-lipsleek-blur-04.jpg?v=1785519682"],
        ["BRAYE Thin Glow Tint 薄透唇釉", "BRAYE", 108, "https://cdn.shopify.com/s/files/1/0765/3405/5070/files/braye-thin-glow-tint-03.jpg?v=1785519684"],
        ["BRAYE Pocket Lip Brush 隨身唇掃", "BRAYE", 49, "https://cdn.shopify.com/s/files/1/0765/3405/5070/files/braye-lipsleek-04_432a8b06-4704-47b9-b0fc-2dc98de2bf35.jpg?v=1785519684"]
      ]
    },
    {
      label: "頰彩", count: 16,
      products: [
        ["Glint Baked Blush 烘焙胭脂", "GLINT", 128, "https://cdn.shopify.com/s/files/1/0765/3405/5070/files/glint-baked-blush-08.jpg?v=1785469561"],
        ["Coralhaze 絲柔胭脂", "CORALHAZE", 89, "https://cdn.shopify.com/s/files/1/0765/3405/5070/files/coralhaze-soft-blur-cheek-01.jpg?v=1785751446"],
        ["CLIO Essential Blush Tap 胭脂", "CLIO", 138, "https://cdn.shopify.com/s/files/1/0765/3405/5070/files/CLIOEssentialBlushTap8Colors-7.jpg?v=1785913549"],
        ["Peripera 水潤透亮胭脂液", "PERIPERA", 108, "https://cdn.shopify.com/s/files/1/0765/3405/5070/files/Syrupy_Tok_Cheek_Pink_Haguma__T_1.jpg?v=1785768447"]
      ]
    },
    {
      label: "修容", count: 12,
      products: [
        ["Glint Stick Highlighter 高光棒", "GLINT", 138, "https://cdn.shopify.com/s/files/1/0765/3405/5070/files/glint-stick-highlighter-04.jpg?v=1785469560"],
        ["Glint Highlighter 高光粉", "GLINT", 128, "https://cdn.shopify.com/s/files/1/0765/3405/5070/files/glint-highlighter-02.jpg?v=1785469559"],
        ["Peripera 三色V面修容盤", "PERIPERA", 122, "https://cdn.shopify.com/s/files/1/0765/3405/5070/files/Peripera__NEW_VShading_coverpic_3.jpg?v=1785768439"],
        ["LILYBYRED Dewy Fit 水光修容盤", "LILYBYRED", 198, "https://cdn.shopify.com/s/files/1/0765/3405/5070/files/lilybyred-dewy-fit-palette-01_992d2953-9c33-4248-a62b-a22de2e2bc74.jpg?v=1785769847"]
      ]
    }
  ]
};

const esc = (value) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll('"', "&quot;");

function imageUrl(url, width = 640) {
  return `${url}${url.includes("?") ? "&" : "?"}width=${width}`;
}

function siteChrome() {
  return `
    <div class="promo">8 月 31 日前全單 9 折 · 滿 HK$400 免運費</div>
    <nav class="site-nav" aria-label="主要導覽">
      <a class="site-nav__logo" href="#">OUJI</a>
      <a href="#">全部產品</a>
      <a href="#">品牌</a>
      <a href="#">獲獎產品</a>
      <a href="#">妝感配對</a>
    </nav>`;
}

function productPreview(category) {
  return `
    <section class="products" aria-live="polite">
      <div class="products__bar">
        <strong>${esc(category.label)}</strong>
        <span>${category.count} 件 · 全部現貨</span>
        <button type="button">篩選／排序</button>
      </div>
      <div class="product-grid">
        ${category.products.map(([title, vendor, price, image]) => `
          <a class="product-card" href="#">
            <div class="product-card__image"><img src="${imageUrl(image)}" alt="${esc(title)}"></div>
            <em>${esc(vendor)}</em><p>${esc(title)}</p><b>HK$${price}</b>
          </a>`).join("")}
      </div>
    </section>`;
}

function selectCategory(label) {
  const category = CATALOG.categories.find((item) => item.label === label) || CATALOG.categories[0];
  document.getElementById("product-preview").innerHTML = productPreview(category);
  document.querySelectorAll("[data-cat]").forEach((control) => {
    const active = control.dataset.cat === category.label;
    control.toggleAttribute("data-active", active);
    control.setAttribute("aria-pressed", String(active));
  });
}

function bootPrototype(initial = "底妝") {
  document.getElementById("site-chrome").innerHTML = siteChrome();
  document.querySelectorAll("[data-cat]").forEach((control) => {
    control.addEventListener("click", (event) => {
      event.preventDefault();
      selectCategory(control.dataset.cat);
    });
  });
  selectCategory(initial);
}

