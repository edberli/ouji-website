(function () {
  const href = (path) => `../../${path}`;

  const categoryDefs = [
    { id: 'makeup', label: '彩妝', href: href('makeup.html'), test: (p) => has(p, '彩妝', 'makeup') },
    { id: 'skincare', label: '護膚', href: href('category.html'), test: (p) => has(p, '護膚', 'skincare') },
    { id: 'lens', label: '隱形眼鏡', href: href('lens.html'), test: (p) => has(p, '隱形眼鏡', 'contact lens') },
    { id: 'kpop', label: 'K-pop', href: href('kpop.html'), test: (p) => has(p, 'k-pop', 'kpop') },
    { id: 'serum', label: '精華', href: href('category.html?cat=serum'), test: (p) => has(p, '精華', 'serum', 'ampoule') },
    { id: 'mask', label: '面膜', href: href('category.html?cat=mask'), test: (p) => has(p, '面膜', 'mask') },
    { id: 'sun', label: '防曬', href: href('category.html?cat=sunscreen'), test: (p) => has(p, '防曬', 'sunscreen', 'sun cream') },
    { id: 'fragrance', label: '香氛', href: href('fragrance.html'), test: (p) => has(p, '香氛', 'fragrance', 'perfume') },
  ];

  let dataPromise;

  function textOf(p) {
    return [p.title, p.vendor, p.productType, ...(p.tags || [])].filter(Boolean).join(' ').toLowerCase();
  }

  function has(p, ...words) {
    const text = textOf(p);
    return words.some((word) => text.includes(String(word).toLowerCase()));
  }

  function inStock(p) {
    if (typeof p.totalInventory === 'number') return p.totalInventory > 0;
    return (p.variants?.edges || []).some((edge) =>
      edge.node.availableForSale && (edge.node.quantityAvailable == null || edge.node.quantityAvailable > 0));
  }

  function imageOf(p) {
    return p?.images?.edges?.[0]?.node?.url || '';
  }

  function discountOf(p) {
    const compare = Number(p.compareAtPriceRange?.minVariantPrice?.amount || 0);
    const price = Number(p.priceRange?.minVariantPrice?.amount || 0);
    return compare > price ? (compare - price) / compare : 0;
  }

  function priceOf(p) {
    const amount = Number(p.priceRange?.minVariantPrice?.amount || 0);
    return `HK$${Number.isInteger(amount) ? amount : amount.toFixed(2)}`;
  }

  function diversifyByBrand(list, maxPerBrand = 1) {
    const seen = new Map();
    return list.filter((p) => {
      const brand = p.vendor || '—';
      const next = (seen.get(brand) || 0) + 1;
      seen.set(brand, next);
      return next <= maxPerBrand;
    });
  }

  function esc(value) {
    return String(value ?? '').replace(/[&<>"]/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'
    }[char]));
  }

  async function loadData() {
    if (dataPromise) return dataPromise;
    dataPromise = Promise.all([
      getAllProducts(),
      fetch('../../data/ratings.json').then((r) => r.ok ? r.json() : null).catch(() => null),
      fetch('../../match-data.json').then((r) => r.ok ? r.json() : null).catch(() => null),
    ]).then(([catalogue, ratingData, matchData]) => {
      const products = (catalogue?.edges || []).map((edge) => edge.node)
        .filter((p) => inStock(p) && imageOf(p));
      const ratings = ratingData?.products || {};
      const ratingCount = (p) => ratings[p.handle]?.count || 0;
      const sets = {
        popular: diversifyByBrand([...products].filter((p) => ratingCount(p) > 0)
          .sort((a, b) => ratingCount(b) - ratingCount(a))),
        new: diversifyByBrand([...products]
          .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))),
        sale: [...products].filter((p) => discountOf(p) > 0)
          .sort((a, b) => discountOf(b) - discountOf(a)),
      };
      categoryDefs.forEach((category) => {
        sets[category.id] = products.filter(category.test);
      });

      const concernDefs = typeof CONCERNS !== 'undefined' ? CONCERNS : [];
      const concerns = concernDefs.map((concern) => {
        const hits = typeof matchesConcern === 'function'
          ? products.filter((p) => matchesConcern(p, concern))
          : [];
        return { ...concern, hits, cover: hits[0] };
      }).filter((item) => item.cover && item.hits.length >= 4)
        .sort((a, b) => b.hits.length - a.hits.length);

      const categories = categoryDefs.map((category) => ({
        ...category,
        products: sets[category.id],
        count: sets[category.id].length,
        cover: sets[category.id][0],
      }));

      /* Shopify 將 K-pop 藝人都放咗喺 vendor。佢哋係藝人／產品線，唔係
         美妝品牌，所以「品牌數」要剔走 K-pop，否則會將 68 報成品牌深度。 */
      const beautyBrands = new Set(products
        .filter((p) => !categoryDefs.find((category) => category.id === 'kpop').test(p))
        .map((p) => p.vendor).filter(Boolean));

      const productByHandle = new Map(products.map((product) => [product.handle, product]));
      const awardRows = typeof awardedProducts === 'function'
        ? awardedProducts().map((item) => ({ ...item, product: productByHandle.get(item.handle) }))
          .filter((item) => item.product)
        : [];
      const awardProductCount = typeof AWARDS === 'object' ? Object.keys(AWARDS).length : awardRows.length;
      const awardTotal = typeof AWARDS === 'object'
        ? Object.values(AWARDS).reduce((sum, list) => sum + list.length, 0)
        : awardRows.reduce((sum, item) => sum + item.count, 0);

      const vendorCounts = new Map();
      products.forEach((product) => {
        if (categoryDefs.find((category) => category.id === 'kpop').test(product)) return;
        vendorCounts.set(product.vendor, (vendorCounts.get(product.vendor) || 0) + 1);
      });
      const newBrands = [];
      sets.new.forEach((product) => {
        if (!product.vendor || newBrands.some((entry) => entry.name === product.vendor)) return;
        newBrands.push({ name: product.vendor, cover: product, count: vendorCounts.get(product.vendor) || 1 });
      });

      return {
        products,
        brands: beautyBrands,
        ratings,
        sets,
        categories,
        concerns,
        awardRows,
        awardProductCount,
        awardTotal,
        newBrands,
        looks: matchData?.looks || {},
      };
    });
    return dataPromise;
  }

  function productCard(p, data) {
    const rating = data.ratings[p.handle];
    const ratingText = rating?.count
      ? `<span class="proto-product-card__rating">評分 ${esc(rating.rating)} · ${Number(rating.count).toLocaleString()}</span>`
      : '<span class="proto-product-card__rating">現貨</span>';
    return `<a class="proto-product-card" href="../../products/${encodeURIComponent(p.handle)}">
      <span class="proto-product-card__media"><img src="${esc(imageOf(p))}" alt="${esc(p.title)}" loading="lazy"></span>
      <span class="proto-product-card__brand">${esc(p.vendor)}</span>
      <span class="proto-product-card__name">${esc(p.title)}</span>
      <span class="proto-product-card__meta"><span class="proto-product-card__price">${priceOf(p)}</span>${ratingText}</span>
    </a>`;
  }

  function fillProducts(shell, data, selector = '[data-product-set]') {
    shell.querySelectorAll(selector).forEach((host) => {
      const set = data.sets[host.dataset.productSet] || data.products;
      const limit = Number(host.dataset.limit || 4);
      host.innerHTML = set.slice(0, limit).map((p) => productCard(p, data)).join('') ||
        '<div class="proto-loading">呢一類暫時冇足夠現貨</div>';
    });
  }

  function fillFacts(shell, data) {
    shell.querySelectorAll('[data-fact="products"]').forEach((el) => { el.textContent = data.products.length.toLocaleString(); });
    shell.querySelectorAll('[data-fact="brands"]').forEach((el) => { el.textContent = data.brands.size.toLocaleString(); });
    data.categories.forEach((category) => {
      shell.querySelectorAll(`[data-count="${category.id}"]`).forEach((el) => { el.textContent = category.count.toLocaleString(); });
      shell.querySelectorAll(`[data-category-image="${category.id}"]`).forEach((el) => {
        if (category.cover) el.src = imageOf(category.cover);
      });
    });
  }

  function fillConcerns(shell, data) {
    shell.querySelectorAll('[data-concern-grid]').forEach((host) => {
      const style = host.dataset.concernStyle || 'curated';
      const limit = Number(host.dataset.limit || 5);
      const items = data.concerns.slice(0, limit);
      host.innerHTML = items.map((item) => {
        const link = `../../shop.html?concern=${encodeURIComponent(item.id)}`;
        if (style === 'sticker') {
          return `<a class="sticker-concern" href="${link}">
            <img src="${esc(imageOf(item.cover))}" alt="" loading="lazy">
            <span class="sticker-concern__label">${esc(item.label)} · ${item.hits.length} 件</span>
          </a>`;
        }
        return `<a class="curated-concern" href="${link}">
          <img src="${esc(imageOf(item.cover))}" alt="" loading="lazy">
          <span class="curated-concern__text"><strong>${esc(item.label)}</strong><small>${item.hits.length} 件現貨</small></span>
        </a>`;
      }).join('');
    });
  }

  function wireTabs(shell, data) {
    shell.querySelectorAll('[data-tab-group]').forEach((group) => {
      const host = group.parentElement.querySelector('[data-tab-products]');
      const buttons = [...group.querySelectorAll('[data-set]')];
      const render = (setName) => {
        buttons.forEach((button) => button.classList.toggle('is-active', button.dataset.set === setName));
        const list = data.sets[setName] || data.products;
        host.innerHTML = list.slice(0, Number(host.dataset.limit || 4)).map((p) => productCard(p, data)).join('');
      };
      buttons.forEach((button) => button.addEventListener('click', () => render(button.dataset.set)));
      render(buttons.find((button) => button.classList.contains('is-active'))?.dataset.set || buttons[0]?.dataset.set || 'popular');
    });
  }

  function wireSearch(shell, data) {
    const form = shell.querySelector('[data-market-search]');
    const input = form?.querySelector('input');
    const results = shell.querySelector('[data-search-results]');
    if (!form || !input || !results) return;

    const render = () => {
      const query = input.value.trim().toLowerCase();
      if (!query) {
        results.classList.remove('is-open');
        results.innerHTML = '';
        return;
      }
      const hits = data.products.filter((p) => textOf(p).includes(query)).slice(0, 4);
      results.classList.add('is-open');
      results.innerHTML = `<div class="market-search-results__head"><span>搜尋「${esc(input.value.trim())}」</span><span>${hits.length ? `頭 ${hits.length} 件` : '冇結果'}</span></div>
        <div class="proto-product-grid">${hits.map((p) => productCard(p, data)).join('')}</div>`;
      results.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'nearest' });
    };
    form.addEventListener('submit', (event) => { event.preventDefault(); render(); });
    input.addEventListener('input', () => { if (!input.value.trim()) render(); });
  }

  async function hydrate(key, stage) {
    const shell = stage.querySelector(`[data-variant-root="${key}"]`);
    if (!shell) return;
    try {
      const data = await loadData();
      if (!shell.isConnected || !stage.contains(shell)) return;
      fillFacts(shell, data);
      fillProducts(shell, data);
      fillConcerns(shell, data);
      wireTabs(shell, data);
      wireSearch(shell, data);
    } catch (error) {
      console.error('OUJI prototype data failed:', error);
      shell.querySelectorAll('.proto-loading').forEach((el) => {
        el.textContent = '目錄暫時載入唔到，請重新整理。';
      });
    }
  }

  window.OUJIPrototype = {
    loadData,
    hydrate,
    esc,
    imageOf,
    priceOf,
    discountOf,
    ratingOf(product, data) {
      return data.ratings?.[product.handle] || null;
    },
    productHref(product) {
      return `../../products/${encodeURIComponent(product.handle)}`;
    },
  };
  window.OUJI_HOME_VARIANTS = [];
}());
