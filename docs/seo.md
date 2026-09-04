# SEO：現況、已修好嘅嘢、仲欠乜

**最後更新 2026-08-09。**

## 已經有嘅

| 項目 | 狀態 |
|---|---|
| `sitemap.xml` | ✅ 807 件產品 ＋ 20 版靜態頁（`scripts/build_sitemap.py` 重新生成）|
| `robots.txt` | ✅ 擋咗 /cart /account /wishlist，保留 `?variant=` 商品頁畀 Merchant Center 抓取，並指住 sitemap |
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

## ✅ Google 購物產品清單（2026-08-10 做好）

**Merchant Center 帳戶**：「OUJI」`5837071825`，喺 `asahikanlimited@gmail.com`。

### 點解唔用 Shopify 官方 app 出嘅 feed

Shopify 個 Google app 出 feed 嗰陣，產品連結一律用「線上商店主要網域」。
2026-08-09 為咗修好廣告歸因，主要網域改咗做 `shop.oujikbeauty.com`，
即係 Google 購物啲點擊會落喺 **Shopify 現成主題** —— 冇選單、冇評分、
logo 位得個網址，仲要顯示第一個變體嘅價而唔係最低價。我哋做嘅 SEO
修正全部喺 oujikbeauty.com 嗰邊，用唔上。老闆決定自己出一份。

### 自己嗰份

**網址：`https://oujikbeauty.com/google-feed.xml`**（`api/google-feed.js`）

即時由 Storefront API 出，唔預先生成 —— 一份過期 feed 換嚟嘅係
「價格不符」停權。CDN 快取一個鐘。

實測（2026-08-10）：

| | |
|---|---|
| 筆數 | **2240**（逐個色號一筆，唔係 807 件產品）|
| 大小／時間 | 4.8MB／2–7 秒 |
| XML 合法 | ✅ |
| 重複 g:id | 0 |
| 缺必填欄位 | 0 |
| 連結全部指 oujikbeauty.com | ✅ |
| 有 GTIN（條碼） | 1982／2240（88%）|

幾個要緊嘅取捨：

- **一個變體一筆 offer。** Google 購物係變體層面嘅。多變體用
  `item_group_id` 綁埋一組；單變體唔加，免得變成殘缺分組。
- **`g:price` 係原價、`g:sale_price` 係現售價。** 只有 `compareAtPrice`
  真係高過現價先報，唔製造假折扣。
- **產品頁支援 `?variant=`。** feed 帶住色號入去，客人撳咗 #08
  磚紅（$118）就落喺 #08，唔會見到 #01（$138）。canonical 仍然係
  乾淨嗰條網址，唔會拆散收錄。`robots.txt` 唔可以封鎖呢類網址，
  否則 Merchant Center 無法核對變體落地頁，商品會被拒批。
- **出唔到就回 500**，唔回空 feed —— 回空等於同 Google 講全線落架。

### 喺 Merchant Center 度做咗嘅設定（2026-08-10）

**1. 認證網域由 `shop.oujikbeauty.com` 改成 `oujikbeauty.com`。**

呢個係最關鍵嗰步，差啲漏咗。Merchant Center 規定產品連結一定要喺
**已認領嗰個網域**之內。原本認領咗嘅係 shop 子網域（Shopify app 開帳戶
嗰陣自動填），即係我份 feed 全部連結都會被判「網域唔符」而拒收。

改嗰陣 Google 會警告「認領會失效、產品會被拒批」，但因為
`oujikbeauty.com` 已經喺 Search Console 驗證過（同一個 Google 戶口），
所以一改就**自動重新驗證兼認領**，冇斷過。

**2. 加咗自己嗰個 feed 做主要來源。**
「PRODUCTS SOURCE 2」→ `https://oujikbeauty.com/google-feed.xml`，
香港、中文、每 24 小時自動更新。首次抓取：**2,239 件，零問題**。

**3. 刪咗 Shopify App API 嗰個來源。**
兩個來源同時推同一批貨，而 Shopify 嗰邊嘅連結指去 shop 子網域 ——
改咗認證網域之後嗰批一定會被拒批。而家淨返一個來源。

⚠️ **Shopify「Google & YouTube」app 仲會再推。** 要入去熄咗產品同步，
否則過幾日會自己重新出現。我試咗幾次都開唔到嗰個設定畫面
（Shopify 個 app iframe 今日一直白畫面），要老闆自己入去熄。

### 帳戶層面仲有兩個提示

- **未連結 Google Ads** —— 只影響付費廣告，免費刊登唔需要。
- **缺少門市庫存資料**（影響 100% 產品）—— 呢個係**實體店**免費刊登
  （local inventory ads）嘅要求，唔關網購事。三間鋪嘅存貨冇餵去 Google，
  所以永遠差呢一項。如果唔做實體店刊登，可以無視。

## 唔使做

- **hreflang** —— 單一地區單一語言，唔需要。
