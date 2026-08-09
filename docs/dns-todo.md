# 要喺 GoDaddy 加嘅 DNS 記錄

DNS 喺 **GoDaddy**（`oujikbeauty.com` → ns53/ns54.domaincontrol.com）。
下面七筆全部係新增，一次過加完就唔使再入。

> **千祈唔好郁 `@` 同 `www` 嗰兩條。** 佢哋指緊 Vercel，
> 即係 oujikbeauty.com 個網站本身。改咗＝網站即刻斷線。
>
> Shopify 後台會彈「自動連結 GoDaddy」，**唔好撳**。
> 個 Shopify 入面仲掛住 `oujikbeauty.com` 同 `www.oujikbeauty.com`
> 兩個域名（狀態「DNS 設定無效」，因為佢哋正確噉指住 Vercel）。
> 自動連結有機會連呢兩個一齊「修正」去 Shopify，就會拆咗個網站。
> 手動加，風險係零。

## ✅ 1 筆 —— 令結帳唔再係 5rerjn-mt.myshopify.com（2026-08-09 做完）

| 類型 | 名稱 | 值 |
|---|---|---|
| CNAME | `shop` | `shops.myshopify.com` |

做咗嘅嘢同驗證結果：

1. GoDaddy 加咗條 CNAME（15 條記錄，`@` 同 `www` 冇郁過）
2. Shopify 網域設定：`shop.oujikbeauty.com` **已連線**，TLS 憑證已發
3. Shopify 主要網域已改成 `shop.oujikbeauty.com`
4. Storefront API 出嘅 `checkoutUrl` 已經係
   `https://shop.oujikbeauty.com/cart/c/…`，跟到落
   `/checkouts/cn/…`（標題「結帳 - OUJI」，HTTP 200）
5. `vercel.json` 個 CSP `connect-src` 同 `form-action` 加咗新網域

`shopify.js` 個 `CHECKOUT_DOMAIN` **繼續留空** —— Shopify 而家原生就回
正確網域，唔使改 host。填咗反而多一重出錯機會。

### 擋爬蟲行 Shopify 主題 —— 老闆決定唔做（2026-08-09）

`shop.oujikbeauty.com` 會直接出 Shopify 主題（800 件產品都 publish 咗去
線上商店），理論上同 oujikbeauty.com 重複內容。主題本身有段 script 會將
`*.myshopify.com` 轉去 oujikbeauty.com，但新網域唔中呢個條件。

**老闆話唔使做**，理由係唔想再郁 Shopify 後台（郁得多錯得多）。呢個判斷
合理 —— 影響係「將來可能有」而唔係「而家壞咗」，而每次改後台都係即時風險。

點知幾時要翻兜：開咗 Google Search Console 之後，如果見到
`shop.oujikbeauty.com/products/…` 出現喺索引，先至值得處理。到時方法係
線上商店 → 佈景主題（Savor，id `154988085406`）→ 編輯程式碼 → 新增
`templates/robots.txt.liquid`，入面兩行 `User-agent: *` / `Disallow: /`。

（我當日試過但做唔到：後台個佈景主題程式碼編輯器渲染唔到，一片空白；
Admin API token 又冇 `read_themes`／`write_themes` 權限。）

## 6 筆 —— 令訂單電郵由 info@oujikbeauty.com 寄出（仲未做）

2026-08-09 試過加，但 GoDaddy 個「Add New Record」表單撳極都唔彈出嚟
（同一 session 加 `shop` 嗰陣係正常嘅，之後就壞咗）。過陣時重開個頁再試。
值已經同 Shopify 後台核對過，照舊有效。

而家 `info@oujikbeauty.com` 係「未驗證」，所以 Shopify 實際用緊
`store+76534055070@shopifyemail.com` 寄訂單確認信。個地址一睇就唔似
你哋，入 spam 嘅機會高好多。

| 類型 | 名稱 | 值 |
|---|---|---|
| CNAME | `1ki._domainkey` | `dkim1.edc61d7d4e17.p477.email.myshopify.com` |
| CNAME | `1ki2._domainkey` | `dkim2.edc61d7d4e17.p477.email.myshopify.com` |
| CNAME | `pdk1._domainkey.mailerkjo` | `dkim3.57e04585dd85.p811.email.myshopify.com` |
| CNAME | `pdk2._domainkey.mailerkjo` | `dkim4.57e04585dd85.p811.email.myshopify.com` |
| CNAME | `mailer1ki` | `edc61d7d4e17.p477.email.myshopify.com` |
| CNAME | `mailerkjo` | `57e04585dd85.p811.email.myshopify.com` |

加完返 Shopify → 設定 → 通知 → 電子郵件網域驗證 → 撳「我已更新 DNS 記錄」。

（呢六條係 Shopify 幫 `oujikbeauty.com` 生成嘅，唔通用，唔好抄去第二個店。）
