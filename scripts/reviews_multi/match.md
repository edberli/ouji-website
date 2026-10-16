# 配對任務（OUJI 產品 ↔ Olive Young／@cosme）

每個 job 檔（JSON）有：
- `ours`：OUJI 冇評論嘅產品（h=handle、title 中文/英文名、type 類別、variants 規格／色號）
- `oliveyoung`：同品牌喺 Olive Young Global 嘅產品（i、name 英文、reviews 評論數）
- `cosme`：同品牌喺日本 @cosme 嘅產品（j、name 日文、cats 類別、size 容量價錢、reviews）

為 `ours` 每件產品揀出**同一件產品**：
- 同一條產品線＋同一種產品形態先算（例：「積雪草精華」對 Centella Ampoule ✅；「積雪草爽膚水」對 Centella Ampoule ❌）。
- 容量唔同、補充裝、Set/Single、限定包裝、同一款唔同色號／香味嘅總列表 —— 都算同一件 ✅。
- 同系列但唔同產品（精華 vs 面霜、防曬乳 vs 防曬噴霧、洗頭水 vs 護髮素、眼影 vs 唇釉、SPF 唔同版本、配方版本名唔同如 Moist／Fresh）—— ❌。
- 我哋係套裝／禮盒而對方只有單品（或相反）—— ❌，除非套裝主體就係嗰件單品。
- 唔肯定就填 null。寧願配唔到，都唔好配錯：配錯會令產品頁顯示另一件貨嘅評論。
- 只可以用 job 入面列出嘅候選 i / j，唔准自己作。

輸出：JSON array，每件 ours 一行（全部都要有）：
`{"h": "...", "i": <oliveyoung i 或 null>, "j": <cosme j 或 null>, "confidence": "high"|"medium"|"none", "why": "≤20字理由"}`
寫去 `work/match-out/<同一個檔名>`。唔好改其他檔。
