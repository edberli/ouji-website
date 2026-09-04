# 廣告追蹤：點裝、裝喺邊、點驗

**現況（2026-08-09）**

| | ID | 狀態 |
|---|---|---|
| Meta pixel | **`344492400198411`** | ✅ 已上線，實測 `ViewContent`／`AddToCart` 都報呢個 ID |

⚠️ **2026-08-10 換咗 pixel。** 08-09 我開嘅新 pixel `1618903536462904`
開咗喺一個**私人廣告戶口**下面，唔屬於任何商業管理平台 —— OUJI 主廣告
戶口（`act_715500878480355`，累計 \$26,351）永遠揀唔到佢。即係將來落廣告
做唔到轉換最佳化、冇 ROAS、冇再營銷受眾。

`344492400198411` 一直喺主戶口下面。2021 年之後冇觸發過，歷史數據當冇
（自訂受眾一早過期），但**揀得到**，呢個先係重點。換走新嗰個冇損失 ——
佢先得幾個鐘數據。

網站（`analytics.js`）同 Shopify 結帳嗰個自訂像素「Meta Purchase」
兩邊都已經係呢個 ID。
| GA4 | **`G-54MEJHNCXQ`** | ✅ 前台及 Shopify `GA4 Purchase` 自訂像素已連結 |
| Google Ads | **`AW-18398942973`** | ⚠️ 前台及成交像素已設定；Google & YouTube app 仍顯示未連結 Ads 帳戶 |

`analytics.js` 頂部 ID 已填妥並生效。

## 一件最緊要嘅事：呢個網站係 headless

```
oujikbeauty.com  (Vercel)                shop.oujikbeauty.com  (Shopify)
├─ 首頁、分類、產品、購物袋      →       └─ 結帳、多謝惠顧
└─ analytics.js（我哋自己嘅）              └─ Shopify 顧客事件 pixel
```

**兩個網域＝兩套追蹤，缺一不可。** 常見錯誤係喺 Shopify 後台裝咗
Google／Meta 嘅官方 app 就以為搞掂 —— 嗰啲 app 只會將程式碼注入
**Shopify 自己嘅 online store 主題**，而我哋根本冇用嗰個主題。裝咗
都唔會追蹤到 oujikbeauty.com。

## 🔴 先做 DNS，唔係先開廣告戶

`shop.oujikbeauty.com` 嗰條 CNAME（見 `docs/dns-todo.md`）由「令結帳
睇落專業啲」升級成**廣告能唔能夠計數嘅前提**：

- 而家：`oujikbeauty.com` → `5rerjn-mt.myshopify.com`，兩個唔同母網域。
  GA4 會當結帳係全新 session，每一張單歸功於「myshopify.com 推薦連結」
  而唔係 Google／Meta。**即係廣告 ROAS 全部係零，錢照燒。**
- 接咗之後：兩邊都係 `.oujikbeauty.com`，cookie 共用，歸因自然正確。

`analytics.js` 已經開咗 GA4 跨網域連結做保險，但同一個母網域先係穩陣做法。

## 現有帳戶同剩餘權限

| 項目 | 現況 | 下一步 |
|---|---|---|
| GA4 | 網站使用 `G-54MEJHNCXQ`；Shopify `GA4 Purchase` 已連結 | 目前 Chrome 登入帳戶只見 `abreak`／`heywireless`，要切換到擁有呢個資源嘅 Google 帳戶先可以逐日對數 |
| Google Ads | `AW-18398942973` 及前台／成交轉換標籤已填 | Google & YouTube app 顯示未連結 Ads 帳戶；正式投廣告前要連結正確帳戶並排除重複轉換 |
| Meta | `344492400198411`；Shopify `Meta Purchase` 已連結 | 用事件管理工具測試真單 Purchase |

**Meta pixel 唔好開新**：廣告戶 2021 年已經有一個（`topics/social-marketing.md`
記錄咗 pixel 最後觸發係 2021-04-13）。用返舊嗰個，保住歷史同自訂受眾。

## 網站呢邊已經識發嘅事件

| 事件 | 幾時 | GA4 | Meta |
|---|---|---|---|
| 睇產品 | 入產品頁 | `view_item` | `ViewContent` |
| 加入購物袋 | 撳「加入購物袋」 | `add_to_cart` | `AddToCart` |
| 去結帳 | 撳「結帳」 | `begin_checkout` | `InitiateCheckout` |

全部帶住 `item_id`（handle）、品牌、分類、價錢、HKD 幣值 —— Google
Shopping 同 Meta 動態廣告都認得。

**廣告點擊 ID 會帶過去結帳**：客人由廣告入嚟，`gclid`／`fbclid`／`utm_*`
會記喺 sessionStorage，跳去結帳嗰陣自動貼返落網址。

## 結帳嗰邊：Shopify 顧客事件

購買事件發生喺 Shopify，要另外裝。後台 → **設定 → 顧客事件 → 新增自訂像素**，
後台 `GA4 Purchase` 現行核心邏輯如下；Meta Purchase 由另一個像素發，唔好喺呢段重複：

```js
const GA4 = 'G-54MEJHNCXQ';
const AW = 'AW-18398942973';
const LABEL = 't9MSCNiFruQcEP2tpsVE';
const s = document.createElement('script');
s.async = true;
s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA4;
document.head.appendChild(s);
window.dataLayer = window.dataLayer || [];
function gtag(){ dataLayer.push(arguments); }
gtag('js', new Date());
gtag('config', GA4, { send_page_view: false });
gtag('config', AW);

function itemId(line) {
  const product = line.variant?.product;
  return product?.url?.match(/\/products\/([^/?#]+)/)?.[1]
    || line.variant?.sku || line.variant?.id || product?.id || line.id;
}

function checkoutItems(checkout) {
  return (checkout.lineItems || []).map((line) => {
    const quantity = line.quantity || 1;
    const original = Number(line.variant?.price?.amount || 0);
    const paid = Number(line.finalLinePrice?.amount ?? original * quantity) / quantity;
    return {
      item_id: itemId(line),
      item_name: line.title,
      item_brand: line.variant?.product?.vendor,
      item_category: line.variant?.product?.type,
      item_variant: line.variant?.title,
      price: paid,
      discount: Math.max(0, original - paid),
      quantity,
    };
  });
}

analytics.subscribe('checkout_completed', (event) => {
  const c = event.data.checkout;
  const items = checkoutItems(c);
  const value = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const currency = c.totalPrice?.currencyCode || 'HKD';
  const transactionId = String(c.order?.id || c.token || event.id);
  gtag('event', 'purchase', {
    transaction_id: transactionId,
    value, currency,
    shipping: c.shippingLine?.price?.amount,
    tax: c.totalTax?.amount,
    items,
  });
  gtag('event', 'conversion', {
    send_to: AW + '/' + LABEL,
    value, currency, transaction_id: transactionId,
  });
});
```

2026-09-04 後台實測：`GA4 Purchase` 已連結，權限設為行銷＋分析，修正版已顯示「像素已儲存」。

## Google Shopping（購物廣告）

香港做 K-beauty，購物廣告通常比搜尋廣告抵。要 **Google Merchant Center**
＋一個產品資料摘要。Shopify 有官方「Google & YouTube」app 可以自動出 feed
—— **呢個唔受 headless 影響**（feed 由 Shopify 產品資料出，唔關主題事），
但要記住喺 app 入面將產品連結設成 `oujikbeauty.com/products/<handle>`，
唔好用 myshopify 網址。

## 點驗真係裝好咗

1. `analytics.js` 填咗 ID 之後，開產品頁 → DevTools Network 應該見到
   `googletagmanager.com/gtag/js` 同 `connect.facebook.net`。
2. GA4 → 管理 → DebugView，應該即時見到 `view_item`、`add_to_cart`。
3. Meta 事件管理工具 → 測試事件。
4. 落一張真單，睇 GA4 有冇 `purchase`、金額啱唔啱。

### ⚠️ 兩個驗證陷阱（實測撞過，唔好再撞）

**一、Meta 唔係用 image beacon 發所有事件。**
`PageView` 用 GET image beacon，Resource Timing 睇得到；但 `AddToCart`
呢啲帶多參數嘅事件係 **喺隱藏 iframe 度 POST 一個 form 去
`facebook.com/tr/`**。`performance.getEntriesByType('resource')` 記錄唔到
form POST，攔截 `fetch`／`sendBeacon`／`Image.src` 一樣捉唔到。
睇錯就會以為「AddToCart 冇發」。要驗就 patch `HTMLFormElement.prototype.submit`：

```js
const os = HTMLFormElement.prototype.submit;
HTMLFormElement.prototype.submit = function () {
  console.log('form →', this.action); return os.apply(this, arguments);
};
fbq('track', 'AddToCart', { content_ids: ['x'], value: 1, currency: 'HKD' });
// 見到 form → https://www.facebook.com/tr/ 就係發咗
```

**二、老闆自己部 Chrome 有廣告攔截器。**
喺嗰度 `fbevents.js` 個 script tag 插得入，但檔案載唔到 —— 表現係
`fbq.callMethod === false`、`fbq.queue` 一路積埋唔清。所以
**Meta「測試事件」喺老闆部 Chrome 行唔到**（嗰個工具要求同一部瀏覽器）。
要驗就用冇攔截器嘅瀏覽器，或者等總覽嘅數（有幾十分鐘延遲）。

## ⚠️ CSP

`vercel.json` 個 Content-Security-Policy 已經開咗 Google 同 Meta 嘅網域。
**日後再加第三方追蹤（TikTok、Hotjar 之類）要記住喺嗰度加返**，唔加就會
被瀏覽器靜靜哋擋住，而且喺本機測試睇唔到（本機冇 CSP）。

Meta pixel 特別要留意：除咗 `script-src`／`img-src`／`connect-src`，
仲要開 **`form-action`** 同 **`frame-src`**，否則得 `PageView` 行到，
其餘事件全部靜靜哋被擋（原因見上面陷阱一）。而家嘅設定：

```
script-src  … https://connect.facebook.net
img-src     … https://www.facebook.com
connect-src … https://connect.facebook.net https://www.facebook.com
frame-src   … https://www.facebook.com https://connect.facebook.net
form-action … https://www.facebook.com https://connect.facebook.net
```
