/* 相紙揀相：呢啲係人手逐張開圖確認過有真人模特／情境嘅產品相 ——
   貼紙相機要似影相機，四格白底 packshot 做唔到嗰種感覺。

   點揀：由 573 件護膚品嘅頭三張圖（1,388 張）計「邊框係咪白底」同
   「有冇膚色」篩出候選，再逐個分類砌 contact sheet 開圖用眼揀。
   避開咗有數據聲稱（+95%、GLOBAL NO.1、before/after 臨床對比）同埋
   「滿額全單 93 折」嗰類促銷圖 —— 呢啲唔應該由我哋放大。

   格式：分類 id → [{ handle, url }]。url 係嗰件貨自己嘅相，唔係圖庫相。
   夠唔夠四格由 catalog.js 決定；唔夠就用返推薦排序補（爽膚水同眼部護理
   目錄入面真係得三件貨有乾淨模特相）。件貨落咗架或者換咗相，張圖載唔到，
   相紙會自動收起嗰格。 */
const BOOTH_SHOTS = {
  cleanser: [
    // mixsoon PDRN 膠原蛋白潔面乳 [100ml]
    { handle: "mixsoon-mixsoon-pdrn-100ml-5383", url: "https://cdn.shopify.com/s/files/1/0765/3405/5070/files/ec301e2e54c30a95fc81227441c1b8e5.jpg?v=1786074938" },
    // Haruharu Wonder 黑米三重AHA溫和潔面啫喱 100ml
    { handle: "haruharu-wonder-haruharu-wonder-aha-100ml-1783", url: "https://cdn.shopify.com/s/files/1/0765/3405/5070/files/1_0d00aded-c61a-4570-8181-edbe36bf909b.jpg?v=1786070092" },
    // Beauty of Joseon 青梅清爽潔面乳 加大版 [200ml]
    { handle: "beauty-of-joseon-beauty-of-joseon-200ml-2172", url: "https://cdn.shopify.com/s/files/1/0765/3405/5070/files/green-plum-refreshing-cleanser-3.webp?v=1786070009" },
    // Torriden Dive-In 低分子透明質酸保濕潔面乳 150ml
    { handle: "torriden-torriden-dive-in-150ml-0404", url: "https://cdn.shopify.com/s/files/1/0765/3405/5070/files/03_c3566393-d2bc-4a0f-94d8-3632ca5a41f6.jpg?v=1786074832" },
    // ilso 天然溫和潔面油 [200毫升]
    { handle: "ilso-ilso-200-1742", url: "https://cdn.shopify.com/s/files/1/0765/3405/5070/files/a5b32192249fd439199897dc8053bf83.jpg?v=1786080085" },
    // Anua 魚腥草深層潔面卸妝油 200ml
    { handle: "anua-anua-200ml-2829", url: "https://cdn.shopify.com/s/files/1/0765/3405/5070/files/anua-us-cleanser-heartleaf-pore-control-cleansing-oil-1244398150_dac96444-96d3-4517-836f-1cb710b67a91.jpg?v=1786072594" },
  ],
  toner: [
    // SOMEBYMI 視黃醇泡泡爽膚水 100ml
    { handle: "some-by-mi-somebymi-100ml-5911", url: "https://cdn.shopify.com/s/files/1/0765/3405/5070/files/5ab3b011efb3fe86f8f1e13d68b30b31.jpg?v=1786078105" },
    // Torriden Dive-In 低分子透明質酸爽膚水 300ml
    { handle: "torriden-torriden-dive-in-300ml-1654", url: "https://cdn.shopify.com/s/files/1/0765/3405/5070/files/03_0c1305f6-66ed-4bf6-9a46-0eb58df2fd18.jpg?v=1786074858" },
  ],
  pad: [
    // Torriden Dive-In 低分子透明質酸補濕爽膚棉片 80片
    { handle: "torriden-torriden-dive-in-80-9446", url: "https://cdn.shopify.com/s/files/1/0765/3405/5070/files/DIVEINMultiPad3.jpg?v=1786074799" },
    // Torriden 積雪草爽膚棉片平衡Cica 爽膚棉片 60片
    { handle: "torriden-torriden-cica-60-0831", url: "https://cdn.shopify.com/s/files/1/0765/3405/5070/files/02_bcf093fa-2d2a-4d96-bc3f-6027661191fc.jpg?v=1786074879" },
    // SUNGBOON EDITOR -Green Tomato Pore Peeling Jumbo Pad 綠番茄緊緻收毛孔角質護理爽膚棉片- 60片裝
    { handle: "sungboon-editor-sungboon-editor-green-tomato-pore-peeling-ju-8750", url: "https://cdn.shopify.com/s/files/1/0765/3405/5070/files/sungboon-editor-sungboon-editor-green-to-03-5aeadb13fae3.jpg?v=1786771184" },
  ],
  serum: [
    // mixsoon PDRN 膠原蛋白眼部精華 [20ml]
    { handle: "mixsoon-mixsoon-pdrn-20ml-5390", url: "https://cdn.shopify.com/s/files/1/0765/3405/5070/files/c6b10708f75bb107e8765c65ba2dfcb1.jpg?v=1786074975" },
    // BOH-泛醇積雪草抗敏修復安瓶精華30ml
    { handle: "boh-boh-30ml-6687", url: "https://cdn.shopify.com/s/files/1/0765/3405/5070/files/boh-boh-30ml-6687-01-4a365fa82ea4.jpg?v=1786771623" },
    // SOMEBYMI 螺旋藻 PDRN 修復精華 50ml
    { handle: "some-by-mi-somebymi-pdrn-50ml-5454", url: "https://cdn.shopify.com/s/files/1/0765/3405/5070/files/3fe83f5ae464fcb67860528dc318a053.jpg?v=1786078150" },
    // TIRTIR 保濕急救精華
    { handle: "tirtir-hydra-rescue-serum", url: "https://cdn.shopify.com/s/files/1/0765/3405/5070/files/tirtir-sos-serum-cover.jpg?v=1785913105" },
    // Torriden 積雪草舒緩保濕精華 50ml
    { handle: "torriden-torriden-50ml-0978", url: "https://cdn.shopify.com/s/files/1/0765/3405/5070/files/03_eeae77d8-f5c2-41ba-984b-774c662948ac.jpg?v=1786074853" },
    // Sungboon Editor 綠蕃茄NMN立體塑顏毛孔精華 40 ml
    { handle: "sungboon-editor-sungboon-editor-nmn-40-ml-9948", url: "https://cdn.shopify.com/s/files/1/0765/3405/5070/files/sungboon-editor-sungboon-editor-nmn-40-m-03-d336d8c704f4.jpg?v=1786771228" },
  ],
  moisturizer: [
    // ROUND LAB 山茶花深層膠原緊緻面霜 [50毫升]
    { handle: "round-lab-round-lab-50-1840", url: "https://cdn.shopify.com/s/files/1/0765/3405/5070/files/RoundLab_CamelliaDeepCollagenFirmingCream_08.webp?v=1786074513" },
    // Torriden Dive-In 低分子透明質酸面霜 80ml
    { handle: "torriden-torriden-dive-in-80ml-1660", url: "https://cdn.shopify.com/s/files/1/0765/3405/5070/files/03_d0a751d0-41f8-4581-b431-940f3f920ec7.jpg?v=1786074841" },
    // Torriden DIVE-IN 低分子透明質酸保濕舒緩啫喱面霜100ml
    { handle: "torriden-torriden-dive-in-100ml-0183", url: "https://cdn.shopify.com/s/files/1/0765/3405/5070/files/DIVEINSoothingCream-jar-3_25e95f10-7e99-4123-821b-abbbe8d36892.jpg?v=1786074847" },
    // Torriden 積雪草舒緩保濕面霜 80ml
    { handle: "torriden-torriden-80ml-0985", url: "https://cdn.shopify.com/s/files/1/0765/3405/5070/files/03_58119012-130b-4494-ab62-ee2f470727ea.jpg?v=1786074870" },
    // SOMEBYMI 視黃醇雙效面霜 50ml
    { handle: "some-by-mi-somebymi-50ml-5928", url: "https://cdn.shopify.com/s/files/1/0765/3405/5070/files/e965ac4eda9c2c72e81fceda931cb17d.jpg?v=1786078159" },
  ],
  mask: [
    // Torriden 低分子膠原蛋白彈力緊緻果凍面膜4片裝
    { handle: "torriden-torriden-4-1906", url: "https://cdn.shopify.com/s/files/1/0765/3405/5070/files/2_-03.jpg?v=1786074776" },
    // BEAUTY OF JOSEON紅豆清爽毛孔去角質面膜140ml
    { handle: "beauty-of-joseon-beauty-of-joseon-140ml-6986", url: "https://cdn.shopify.com/s/files/1/0765/3405/5070/files/v2_BOj1708.jpg?v=1786070056" },
    // Torriden 積雪草保濕鎮靜面膜 10片
    { handle: "torriden-torriden-10-5690", url: "https://cdn.shopify.com/s/files/1/0765/3405/5070/files/10_-02_0a5f016c-ec0e-4234-bd1b-578e68fc3879.jpg?v=1786074786" },
    // Torriden 美白保濕透肌面膜 10片
    { handle: "torriden-torriden-10-2194", url: "https://cdn.shopify.com/s/files/1/0765/3405/5070/files/10_-02.jpg?v=1786074790" },
    // ROUND LAB 山茶花深層膠原緊緻凝膠面膜套裝 [34克 x 4片]
    { handle: "round-lab-round-lab-34-x-4-1383", url: "https://cdn.shopify.com/s/files/1/0765/3405/5070/files/02_1_28dd3aa4-b7d4-48ef-b2d1-13954b9526b5.jpg?v=1786074589" },
    // SOMEBYMI [1g*10個] 螺旋藻 PDRN 舒緩雪芭面膜
    { handle: "some-by-mi-somebymi-1g-10-pdrn-5447", url: "https://cdn.shopify.com/s/files/1/0765/3405/5070/files/8b2006c434a36312cb75dc3743a8a075.jpg?v=1786078074" },
    // Torriden 低分子透明質酸深層保濕面膜 10片
    { handle: "torriden-torriden-10-2865", url: "https://cdn.shopify.com/s/files/1/0765/3405/5070/files/DIVEINMask10ea-2.jpg?v=1786074815" },
  ],
  eye: [
    // Torriden Cellmazing 低分子膠原蛋白緊緻眼霜30ml
    { handle: "torriden-torriden-cellmazing-30ml-1999", url: "https://cdn.shopify.com/s/files/1/0765/3405/5070/files/02_850a4fd6-62cc-4b9f-9596-760e0f7a967b.jpg?v=1786074825" },
    // mixsoon PDRN 膠原蛋白眼部精華 [20ml]
    { handle: "mixsoon-mixsoon-pdrn-20ml-5390", url: "https://cdn.shopify.com/s/files/1/0765/3405/5070/files/c6b10708f75bb107e8765c65ba2dfcb1.jpg?v=1786074975" },
    // beplain 艾草眼霜 [2023新版 - 25毫升]
    { handle: "beplain-beplain-2023-25-0111", url: "https://cdn.shopify.com/s/files/1/0765/3405/5070/files/Beplain-Artemisia-Eye-Butter-25ml-3.jpg?v=1786092726" },
  ],
  sunscreen: [
    // Purito - Wonder Releaf 積雪草日常舒緩防曬乳SPF50+ PA++++ 60ml
    { handle: "purito-purito-wonder-releaf-spf50-pa-60ml-3072", url: "https://cdn.shopify.com/s/files/1/0765/3405/5070/files/Purito-Seoul-Wonder-Releaf-Centella-Daily-Sun-Lotion-Kbeauty-World_49fa2de6-afb9-46d1-8f94-b0505a460658.webp?v=1786080976" },
    // Haruharu Wonder 黑米純礦物舒緩日常防曬霜 50ml
    { handle: "haruharu-wonder-haruharu-wonder-50ml-1691", url: "https://cdn.shopify.com/s/files/1/0765/3405/5070/files/1_bea59aca-d459-4822-9455-f5cbff26cec0.jpg?v=1786070097" },
    // TOCOBO 生物水潤溫和防曬乳 SPF50 PA++++ 50ml
    { handle: "tocobo-tocobo-spf50-pa-50ml-0058", url: "https://cdn.shopify.com/s/files/1/0765/3405/5070/files/tocobo-tocobo-spf50-pa-50ml-0058-03-c35ffdc325ba.png?v=1786762526" },
    // Beauty of Joseon 杏啞光防曬棒18g SPF50+PA++++
    { handle: "beauty-of-joseon-beauty-of-joseon-18g-spf50-pa-6884", url: "https://cdn.shopify.com/s/files/1/0765/3405/5070/files/Beauty-of-Joseon-Matte-Sun-Stick---Mugwort-_-Camelia-Nudie-Glow.jpg?v=1786092831" },
    // TOCOBO 棉花柔滑防曬棒 SPF50+ PA++++
    { handle: "tocobo-tocobo-spf50-pa-0041", url: "https://cdn.shopify.com/s/files/1/0765/3405/5070/files/tocobo-tocobo-spf50-pa-0041-03-8226f8ee872c.png?v=1786762478" },
    // Anua Zero-Cast 保濕防曬乳
    { handle: "anua-anua-zero-cast-9507", url: "https://cdn.shopify.com/s/files/1/0765/3405/5070/files/anua-us-sunscreen-zero-cast-moisturizing-finish-sunscreen-1244398149.jpg?v=1786072674" },
    // Round Lab-白樺樹保濕舒暖有色防曬SPF50+PA++++ 50ml
    { handle: "round-lab-round-lab-spf50-pa-50ml-9977", url: "https://cdn.shopify.com/s/files/1/0765/3405/5070/files/Birch_Mild_Up_Sunscreen_content_3.jpg?v=1786074493" },
    // COSRX 蘆薈 54.2% 水潤調色防曬乳 [50ml]
    { handle: "cosrx-cosrx-54-2-50ml-5405", url: "https://cdn.shopify.com/s/files/1/0765/3405/5070/files/aloe-54-2-aqua-tone-up-sunscreen-spf-50-pa-cosrx-official-3_5c6b5eec-ab73-46a8-85c1-8aa53c1aa956.jpg?v=1786088413" },
  ],
};
