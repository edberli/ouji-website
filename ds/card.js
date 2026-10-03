import {inStock, RATING_SOURCE} from './counts.js';
const node = x => x?.node || x;
const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = n => new Intl.NumberFormat('zh-HK',{maximumFractionDigits:2}).format(n);
const shortDated = p => p.productType === '短效期特價' || p.tags?.includes('短效期') || /^【短效期/.test(p.title || '');
const price = v => Number(v?.amount);
/** Return new markup on migrated pages; the legacy renderer remains the source on older pages. */
export function renderCard(raw, opts = {}) {
  if (typeof document !== 'undefined' && document.documentElement.dataset.ds !== '2') {
    return opts.legacyRenderer ? opts.legacyRenderer(raw,opts) : '';
  }
  const p=node(raw), variants=(p.variants?.edges || []).map(node);
  const api=globalThis.OUJI_purchasable;
  const lens=api?.isLensProduct?.(p) || p.options?.[0]?.name==='度數';
  const can=v => api ? api.isPurchasable(v,{lens}) : !!(v?.availableForSale && (lens || v.quantityAvailable==null || v.quantityAvailable>0));
  const live=variants.filter(can), sold=!inStock(p);
  const v=live.reduce((a,b)=>{
    const difference=price(a.price)-price(b.price);
    if(difference!==0)return difference<0?a:b;
    return price(b.compareAtPrice)>price(b.price) && !(price(a.compareAtPrice)>price(a.price))?b:a;
  },live[0]);
  const compare=price(v?.compareAtPrice), paid=price(v?.price);
  const sale=!shortDated(p) && compare>paid && paid>0;
  const discount=sale && paid/compare<=.9 ? Math.ceil(paid/compare*100)/10 : null;
  const images=(p.images?.edges || []).map(node).filter(i=>i?.url);
  const badImage=p.title==='CLIO 極緻捲翹超防水睫毛膏';
  const first=badImage?images.slice(1):images;
  const rating=opts.ratings?.[p.handle];
  const href=`${opts.urlPrefix || ""}product.html?handle=${encodeURIComponent(p.handle)}`;
  const badge=sold?'暫時缺貨':shortDated(p)?'短效期':opts.badge || '';
  const photo=(img,alt,extra='')=>`<img class="o-card__image ${extra}" src="${esc(img.url)}" alt="${esc(alt)}" loading="lazy" decoding="async">`;
  const title=p.title.replace(/^【短效期[^】]*】\s*/,'');
  return `<article class="o-card ${sold?'o-card--sold-out':''}" data-handle="${esc(p.handle)}">
    <div class="o-card__media"><a href="${href}" aria-label="${esc(title)}">
      ${first[0]?photo(first[0],first[0].altText||title):'<span class="o-skeleton" aria-hidden="true"></span>'}
      ${first[1]?photo(first[1],'','o-card__image--alt'):''}</a>
      ${badge?`<span class="o-badge o-card__badge">${esc(badge)}</span>`:''}
      <button type="button" class="o-card__wishlist" data-action="wishlist" aria-label="加入心願單：${esc(title)}">♡</button>
      ${!sold?`<button type="button" class="o-card__add" data-action="${variants.length>1?'variants':'quick-add'}" data-variant-id="${esc(v?.id || '')}" aria-label="${variants.length>1?'揀色號':'加入購物袋'}：${esc(title)}">+</button>`:''}
    </div><div class="o-card__info"><span class="o-card__brand">${esc(p.vendor)}</span>
      <a href="${href}" class="o-card__name">${esc(title)}</a>
      ${opts.descriptor?`<span class="o-card__descriptor">${esc(opts.descriptor)}</span>`:live.length===1&&live[0].quantityAvailable>0&&live[0].quantityAvailable<=2?`<span class="o-card__descriptor">只剩 ${fmt(live[0].quantityAvailable)} 件</span>`:''}
      ${rating?.count>=20?`<span class="o-card__rating" title="${esc(RATING_SOURCE)}">★ ${esc(rating.star)} (${fmt(rating.count)})</span>`:''}
      <div class="o-card__price ${sale?'o-card__price--sale':''}"><span class="o-card__prices"><span class="o-card__paid">HK$${fmt(paid||price(p.priceRange?.minVariantPrice))}</span>
      ${sale?`<del class="o-card__compare">HK$${fmt(compare)}</del>`:''}
      </span>${discount?`<span class="o-badge o-badge--sale">${fmt(discount)} 折</span>`:''}</div>
      ${opts.promo?`<span class="o-badge o-badge--promo">${esc(opts.promo)}</span>`:''}
      ${opts.award?`<span class="o-badge o-badge--award">${esc(opts.award)}</span>`:''}
      ${sold?'<a class="o-card__restock" href="'+href+'">想要？通知我補貨</a>':''}
      ${variants.length>1&&!sold?`<span class="o-card__descriptor">${fmt(variants.length)} 個色號</span>`:''}
    </div></article>`;
}
