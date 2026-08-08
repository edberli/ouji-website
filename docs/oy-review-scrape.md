# 由 Olive Young 攞評價

## 點解要噉樣攞

OUJI 係新舖，冇自己嘅評價。作假評價唔會做。可以做嘅係引用 Olive Young
顧客講過乜，寫明出處、標明評分、連返去原文嗰版，客人逐隻字查得到。

## 攞資料嘅路

Olive Young 個 WAF 擋住呢部機出口 IP（Surfshark VPN，`138.199.60.178`）
入面**大部分**路徑：

| 路徑 | 狀態 |
|---|---|
| `/product/detail?prdtNo=…` | ✅ 200 |
| `/sitemapindex-product.xml` | ✅ 200（直接就係 urlset） |
| `/robots.txt` | ❌ 403 |
| 任何有 `search` 字嘅路徑 | ❌ 403 |
| `/sitemap-brand.xml` | ❌ 403 |
| `www.oliveyoung.co.kr` 全站 | ❌ 卡喺人機驗證 |

所以**唔可以喺 OY 度搜尋**。要搵某件產品嘅 `prdtNo`，用 WebSearch 限定
`allowed_domains: ["global.oliveyoung.com"]` 搵，再用 curl 撞一撞個
`<title>`——撞唔到會靜靜哋回首頁 title，唔會 404。

## 攞數據

產品頁係 Vue app，評價經 `POST /product/review-summary`、`/product/review-list`
攞。個 payload 未解到（淨 `{prdtNo}` 會 500），所以唔好夾硬砌 API——
**直接喺瀏覽器度讀 Vue state**，佢已經幫你 load 好：

```js
let vm; for (const e of document.querySelectorAll('*')) if (e.__vue__) { vm = e.__vue__; break; }
let root = vm; while (root.$parent) root = root.$parent;
root.review.global.summary   // totalReviewCount / totalStarRate / scores / evltScores
root.review.korea.summary    // 韓國嗰邊淨係有數字，冇文字
root.review.global.reviewList // 頭 10 則，有 conText / previewScore / reviewEvltList
```

`evltScores[].rate` 先係平均分（`star` 一律 0，唔好信）。

## 清洗

`scripts/oy_reviews.py` 收 raw dump，出 `data/reviews.json`：

- **剷走 spam** —— 蝦皮／淘寶「出貨速度快、值得信賴的賣家」湊字數範本。
- **剷走同一個人重覆貼嘅** —— 同 who + 前 160 字相似度 > 0.8。
- **負評一定留低。** 全部五星係最唔可信嘅樣。

跟住要加 `zh` 翻譯同 `lang`。一件產品得幾則，自己譯；**要跑全店就派去
MiniMax**（`~/.claude/skills/offload`）——過三閘：量夠、每則自足、對返
原文驗得平。

## 版面

`reviews.js` + `[data-reviews]`，冇資料就成塊唔出。
