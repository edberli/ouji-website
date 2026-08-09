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

## ✅ Google Search Console（2026-08-09 開好）

- **戶口**：`asahikanlimited@gmail.com`（同 Shopify 同一個公司戶口）
- **資源類型**：網址前置字元 `https://oujikbeauty.com`
- **驗證方法**：首頁 `<head>` 嘅 meta 標記
  （`index.html`，`content="E0PunCsCzII-…"`）
- **Sitemap**：已提交 `/sitemap.xml` → 狀態「成功」，Google 讀到 **807 條網址**

⚠️ **`index.html` 嗰個 meta 標記唔可以刪。** 刪咗 Google 會當你唔再擁有
呢個網站，Search Console 啲數據即刻停。

本來想用 Google 畀嘅 `.html` 驗證檔，但 `vercel.json` 開咗 `cleanUrls`，
`/xxx.html` 會 308 轉去 `/xxx`，Google 未必認，所以改用 meta 標記。
（日後要加第二種驗證方法做保險，DNS TXT 係最穩陣嗰個。）

## 仲未做：Google Merchant Center

`asahikanlimited@gmail.com` 未有 Merchant Center 帳戶。**要老闆自己開** ——
開帳戶同接受服務條款我唔會代做。

兩條路：

| 做法 | 點做 | 分別 |
|---|---|---|
| **Shopify 官方 app**（建議） | Shopify 後台 → 應用程式 → 裝「Google & YouTube」→ 跟指示連 Google 戶口 | 自動幫你開 Merchant Center、自動出 807 件產品 feed、自動更新價錢同庫存 |
| 自己開 | merchants.google.com → 註冊 → 再自己整 feed | 要人手維護 feed，唔值得 |

**一定要用返 `asahikanlimited@gmail.com`** —— 呢個戶口已經驗證咗
oujikbeauty.com，Merchant Center 會直接沿用，唔使再驗一次。

裝完之後嗌我，我要入去改一個設定：產品連結要指
`oujikbeauty.com/products/<handle>`，唔可以用 myshopify 網址
（用錯就等於將客人送去一個唔跟你設計嘅頁）。

## 唔使做

- **hreflang** —— 單一地區單一語言，唔需要。
