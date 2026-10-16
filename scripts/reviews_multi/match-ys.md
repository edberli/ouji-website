# 配對任務（OUJI 產品 ↔ YesStyle）

規矩同 prompts/match.md 一樣（同一條產品線＋同一種產品形態；容量／色號／香味總列表可以；唔同系列、唔同形態、套裝對單品 ❌；唔肯定就 null；寧願配唔到都唔好配錯）。
YesStyle 候選喺 `yesstyle`（k、name 係網址 slug 英文、reviews 評論數）。

輸出：JSON array，每件 ours 一行：
`{"h": "...", "k": <yesstyle k 或 null>, "confidence": "high"|"medium"|"none", "why": "≤20字"}`
寫去 `work/match-out-ys/<同一個檔名>`。唔好改其他檔。
