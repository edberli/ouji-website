/* Public offers confirmed in DECISIONS.md. Shared by chrome, PDP and cart. */
(() => {
  'use strict';
  const shipping = Object.freeze({
    post: Object.freeze({ free: 99, fee: 15, label: '7-Eleven／郵局自取' }),
    sfp: Object.freeze({ free: 250, fee: 16, label: '順豐站／智能櫃' }),
    sfd: Object.freeze({ free: 290, fee: 31, label: '順豐送貨上門' }),
    shop: Object.freeze({ free: 0, fee: 0, label: '觀塘門市免費自取' })
  });
  const discount = Object.freeze({ threshold: 399, saving: 20, enabled: true });
  const gift = Object.freeze({
    threshold: 599, handle: 'round-lab-round-lab-80ml-0221',
    variantId: 'gid://shopify/ProductVariant/48093431529630', lineAttribute: '_ouji_auto_gift'
  });
  const offers = Object.freeze([
    { id: 'post', priority: 1, message: `${shipping.post.label} 滿 HK$${shipping.post.free} 免運`, href: '/shipping.html', eligibility: '選擇 7-Eleven 或郵局自取' },
    { id: 'discount', priority: 2, message: `滿 HK$${discount.threshold} 減 $${discount.saving}`, href: '/shop.html', enabled: discount.enabled, eligibility: '結賬自動套用購物禮遇' },
    { id: 'gift', priority: 3, message: `滿 HK$${gift.threshold} 送 Round Lab 白樺樹面霜`, href: '/shop.html', eligibility: '送完即止' },
    { id: 'clearance', priority: 4, message: '清貨任揀 2 件 $160', href: '/short-dated.html', eligibility: '指定清貨產品' },
    ...['sfp', 'sfd'].map((id, i) => ({ id, priority: 5 + i, message: `${shipping[id].label} 滿 HK$${shipping[id].free} 免運`, href: '/shipping.html', eligibility: '按所選運送方式計算' })),
    { id: 'pickup', priority: 7, message: shipping.shop.label, href: '/stores.html', eligibility: '備妥後通知取貨' }
  ].map(Object.freeze));
  const active = (now = Date.now()) => offers.filter(o => o.enabled !== false && (!o.startsAt || now >= Date.parse(o.startsAt)) && (!o.endsAt || now <= Date.parse(o.endsAt))).sort((a, b) => a.priority - b.priority);
  // Retired seasonal tiers retain a harmless compatibility shape for legacy bodies.
  const commerce = Object.freeze({ promotion: Object.freeze({ startsAt: '1970-01-01T00:00:00Z', endsAt: '1970-01-01T00:00:00Z', tiers: Object.freeze([]), gift }) });
  const value = path => path.split('.').reduce((v, key) => v?.[key], { shipping, discount, gift });
  function hydrateOfferCopy() {
    document.querySelectorAll('[data-offer-value]').forEach(el => { el.textContent = String(value(el.dataset.offerValue)); });
    document.querySelectorAll('[data-offer-label]').forEach(el => { el.setAttribute('aria-label', el.dataset.offerLabel.replace(/\$\{([^}]+)\}/g, (_, key) => '$' + value(key))); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hydrateOfferCopy, { once: true });
  else hydrateOfferCopy();
  window.OUJI_PROMOTIONS = Object.freeze({ shipping, discount, gift, offers, active, commerce });
})();
