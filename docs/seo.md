# SEO：現況、已修好嘅嘢、仲欠乜

**最後更新 2026-08-09。**

## 已經有嘅

| 項目 | 狀態 |
|---|---|
| `sitemap.xml` | ✅ 807 件產品 ＋ 20 版靜態頁（`scripts/build_sitemap.py` 重新生成）|
| `robots.txt` | ✅ 擋咗 /cart /account /wishlist，指住 sitemap |
| schema.org Product JSON-LD | ✅ 逐件產品（特登唔放 aggregateRating，見 `analytics.js`）|
| 每版 canonical | ✅ 全部 25 版對晒 |
| 產品頁 title／description／og | ✅ 逐件產品（2026-08-09 修好）|
| HTTPS、HSTS、行動版 | ✅ |

## 2026-08-09 修好嘅三個 bug

**1. 807 件產品共用同一條 canonical（致命）**

`product.html` 個 `<head>` 寫死 `<link rel="canonical" href="…/product">`。
每一版產品頁都同 Google 講「唔好收錄我，去收錄 /product」——
成個目錄自我除名，一件產品都排唔到。而 `/product` 本身仲要唔喺 sitemap 度。

而家 canonical 由 `applyProductSeo()` 按 handle 即場寫入，
`product.html` 特登**唔再寫死**（寫死就一定係錯嗰個）。

**2. 807 件產品共用同一個 title 同 description**

全部叫「商品 — OUJI」、同一段「OUJI — 香港最齊 K-Beauty 專門店」。
Google 見到 807 條一模一樣嘅標題，當重複內容。
而家 title 用產品名，description 抽產品自己文案頭 150 字。

**3. `awards.html` 同 `match.html` 個 canonical copy-paste 錯咗指去 `/makeup`**

兩版都會被 Google 當成 /makeup 嘅複本而唔收錄。已改返自己。

## ✅ 社交分享預覽（2026-08-09 修好）

`applyProductSeo()` 係 JavaScript。Google 執行 JS 所以睇到，但
**WhatsApp、Facebook、LINE、IG、Slack 嘅連結預覽爬蟲唔會執行 JS**，
Merchant Center 讀 JSON-LD 都一樣。所以分享任何產品連結，預覽永遠都係
「商品 — OUJI」加通用圖。

做法：`/products/:handle` 交畀 **`api/product.js`**（Vercel serverless），
向 Storefront API 攞資料，換走 `product.html` 入面用
`<!-- OUJI-SEO:START -->` … `<!-- OUJI-SEO:END -->` 包住嗰組 tag，
順便出埋 JSON-LD。

- **安全網**：API 掛咗／handle 唔存在／逾時 → 原封不動回 product.html。
  最衰情況等於冇咗呢個 function 之前嘅行為，唔會白畫面、唔會 500。
  實測唔存在嘅 handle：HTTP 200，出通用版。
- **速度**：冷啟約 0.8s，CDN 快取後約 0.26s（`s-maxage=3600`）。
- **兩邊一致**：客戶端 `applyProductSeo()` 寫入一模一樣嘅值，
  JSON-LD 用同一個 `id` 整個換走，所以永遠只有一份。

### 順帶修好嘅兩樣

**1. 多變體產品價格對唔上。** BRAYE Lipsleek 八隻色，七隻 $138、一隻 $118。
頁面顯示「HK$118」（最低價），但 schema 報住第一個變體嘅 $138。
Google 見到頁面價同結構化資料唔夾，Merchant Center 會拒收。
而家有價格範圍就出 `AggregateOffer`（lowPrice/highPrice），
`api/product.js` 同 `analytics.js` 兩邊同步。

**2. JS／CSS 會派過期版本。** 原本 `max-age=600` 加
`stale-while-revalidate=604800` —— 回頭客最耐可以攞到七日前嘅
`shopify.js`／`analytics.js`。呢兩個檔載住價錢、購物袋、追蹤同 SEO 邏輯，
即係修咗都唔到用戶手上（今次就撞正：服務端出咗 AggregateOffer，
客戶端用舊碼覆蓋返做舊價）。改成 `max-age=0, must-revalidate`，
靠 ETag 出 304。

**3. sessionStorage 快取加咗 `CACHE_VERSION`。** 快取住嘅係 GraphQL 物件，
形狀由 query 決定；一改 query，舊 session 嘅快取就會少咗新欄位，
新程式碼讀落去係 undefined，唔報錯但靜靜哋行錯分支。改 query 順手 +1。

## 仲未做（免費，優先做）

1. **Google Search Console** —— 未開。sitemap 從來冇提交過。開咗先知
   Google 到底收錄咗幾多版、有冇報錯。呢個係所有 SEO 嘢嘅前提。
2. **Google Merchant Center** —— 未開。香港做 K-beauty，購物免費刊登
   通常比自然搜尋更快見效。Shopify 有官方 app 自動出 feed，
   **唔受 headless 影響**，但要記住將產品連結設成
   `oujikbeauty.com/products/<handle>`，唔好用 myshopify 網址。

## 唔使做

- **hreflang** —— 單一地區單一語言，唔需要。
- **DMARC／SPF** —— 已經有（唔關 SEO 事，但成日有人問埋一齊）。
