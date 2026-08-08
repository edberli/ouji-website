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

## 1 筆 —— 令結帳唔再係 5rerjn-mt.myshopify.com

| 類型 | 名稱 | 值 |
|---|---|---|
| CNAME | `shop` | `shops.myshopify.com` |

加完之後：

1. 等 Shopify 網域設定顯示 `shop.oujikbeauty.com` **已連線**（幾分鐘到一個鐘）
2. 喺 Shopify 將佢設做**主要網域**
3. 話我知 —— 我填返 `shopify.js` 個 `CHECKOUT_DOMAIN = 'shop.oujikbeauty.com'`

冇做第 3 步之前，程式碼唔會改任何嘢（`CHECKOUT_DOMAIN` 留空 = 原封不動）。

## 6 筆 —— 令訂單電郵由 info@oujikbeauty.com 寄出

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
