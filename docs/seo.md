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

## ⚠️ 仲未解決：社交分享預覽

`applyProductSeo()` 係 **JavaScript**。Google 會執行 JS 所以睇到，但
**WhatsApp、Facebook、LINE、IG 嘅連結預覽爬蟲唔會執行 JS** ——
佢哋只讀原始 HTML，所以任何人分享產品連結，預覽永遠顯示：

> 商品 — OUJI
> OUJI — 香港最齊 K-Beauty 專門店
> （通用 og-image.jpg）

對一間靠 IG／WhatsApp 落單嘅店嚟講，呢個影響唔細。

**要真正解決，只有服務端出 HTML 一條路**，兩個做法：

| 做法 | 點做 | 代價 |
|---|---|---|
| Vercel Serverless Function | `/products/:handle` 交畀一個 function，佢向 Storefront API 攞資料、改好 `<head>` 先回 HTML；用 `s-maxage` 快取 | 靜態站要加一層 server，多咗一個會壞嘅位；首次請求慢 |
| 建置時預先產生 | 一個 script 幫 807 件產品各出一個 `.html`，只係 `<head>` 唔同 | repo 多 807 個檔；每次改產品要重新生成 |

兩個都做得，未做，等老闆決定。

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
