# 彩妝分類頁頂：五方向樣稿

今輪只比較一件事：彩妝分類頁第一屏可以用咩設計語言，唔改 production code。

## 五個方向

| 方向 | 主要軸 | 色彩 | 字體 | 記憶點 | 代價 |
|---|---|---|---|---|---|
| 雜誌特集 | 不對稱編排 | 紙白、墨黑、OUJI 藍、胭脂紅 | Bodoni Moda + Noto Sans TC | 跨頁式圖文同巨型頁碼 | 產品入口冇藥妝店咁快 |
| 韓式藥妝 | 高密度零售 | 白、螢光青、OUJI 藍、橙 | League Gothic + Noto Sans TC | 五張貨架價牌就係五個分類 | 最實用，意境最少 |
| 月白意境 | 氛圍與留白 | 夜藍、月白、玉綠、淡紫 | Italiana + Noto Serif TC | 月光、浮動絲帶、產品似陳列於夜色 | 情緒行先，資訊較慢 |
| 字體實驗 | 互動與尺度 | 紙白、黑、鈷藍、珊瑚 | Noto Sans TC variable + Azeret Mono | 拉桿即時改變整版字重 | 冇相片主導，較設計學院感 |
| 貼紙相機 | 玩味與層疊 | 銀、粉紅、電藍、青檸 | Bagel Fat One + Noto Sans TC | 相紙、閃光、散落貼紙係分類掣 | 最年輕，未必適合全站 |

## Impeccable roll

- Seed：`6bdc6133`，指定排第三嘅自家方向，即「月白意境」。
- Variable-font challenger：competitive，產品辨識稍弱，但互動同分類清晰，保留為「字體實驗」。
- 其餘 challenger：audience identification 同 product clarity 都較弱；只保留佢哋嘅紀律——
  巨型尺度（fight poster）、每格只講一件真事（instrument panel）、手機改成順序而唔係縮細（Versailles）。

## 共同底線

- 真資料：182 件、23 個品牌；底妝 46、眼妝 50、唇妝 58、頰彩 16、修容 12。
- 真產品名、真價錢、真 Shopify 相；唔講熱賣、排名、人氣。
- 五個分類都可以撳，會即時改下面產品預覽。
- Prototype 只做到足夠睇款；揀咗先做 production 細節。

