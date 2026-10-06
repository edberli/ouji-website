/* All displayed catalogue counts derive from the same snapshot and allow-list. */
const dataRoot = new URL('../data/', import.meta.url);
export const RATING_SOURCE = 'Olive Young Global';
const shortDated = p => p.productType === '短效期特價' || (p.tags || []).includes('短效期') || /^【短效期/.test(p.title || '');
const node = x => x?.node || x;
const purchasable = (p, v) => {
  const api = globalThis.OUJI_purchasable;
  const lens = api?.isLensProduct?.(p) ?? p?.options?.[0]?.name === '度數';
  return api ? api.isPurchasable(v, { lens }) : !!(v?.availableForSale && (lens || v.quantityAvailable == null || v.quantityAvailable > 0));
};
export const inStock = p => (p.variants?.edges || []).some(x => purchasable(p, node(x)));
const normalized = s => String(s || '').trim().normalize('NFKC').toLocaleLowerCase('en');
export async function loadCounts() {
  const [catalog, universe] = await Promise.all([
    fetch(new URL('catalog.json', dataRoot)).then(r => { if (!r.ok) throw Error('catalog unavailable'); return r.json(); }),
    fetch(new URL('brand-universe.json', dataRoot)).then(r => { if (!r.ok) throw Error('brand universe unavailable'); return r.json(); })
  ]);
  return createCounts(catalog, universe);
}
export function createCounts(catalog, universe) {
  const products = (catalog.v || []).map(node).filter(Boolean);
  const vendors = new Map();
  for (const brand of universe) for (const alias of [brand.vendor,...(brand.aliases || [])]) {
    const key = normalized(alias);
    if (vendors.has(key) && vendors.get(key) !== brand) throw Error(`Duplicate vendor alias: ${alias}`);
    vendors.set(key,brand);
  }
  const depth = new Map(universe.map(b => [b.vendor,0]));
  const categories = new Map();
  let stock = 0, soldOut = 0, dated = 0;
  for (const p of products) {
    if (!inStock(p)) { soldOut++; continue; }
    stock++;
    const brand = vendors.get(normalized(p.vendor));
    if (brand) depth.set(brand.vendor,depth.get(brand.vendor)+1);
    if (shortDated(p)) { dated++; continue; }
    const labels = new Set([p.productType,...(p.tags || [])].filter(Boolean));
    for (const label of labels) categories.set(label,(categories.get(label) || 0)+1);
  }
  const brands = universe.map(brand => ({...brand,count:depth.get(brand.vendor)}));
  const counted = brands.filter(b => b.counted && b.count > 0);
  const sorted = (group) => counted.filter(b => !group || b.group === group).sort((a,b) => b.count-a.count || a.name_en.localeCompare(b.name_en));
  return {
    at:catalog.at, productCount:stock, soldOutCount:soldOut, shortDatedCount:dated,
    brandCount:counted.length, brands, sorted,
    brandDepth:vendor => depth.get(vendors.get(normalized(vendor))?.vendor) || 0,
    resolveBrand:vendor => vendors.get(normalized(vendor)) || null,
    categoryCount:label => categories.get(label) || 0,
    scopeCount:predicate => products.filter(p => !shortDated(p) && inStock(p) && predicate(p)).length,
    format:n => new Intl.NumberFormat('zh-HK').format(n)
  };
}
