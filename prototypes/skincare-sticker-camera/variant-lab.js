function renderLab() {
  return `<section class="skin-hero lab" aria-labelledby="lab-title">
    <div class="lab__grid" aria-hidden="true"></div>
    <div class="lab__title">
      <span>OUJI PHOTO LAB / SEOUL</span>
      <h1 id="lab-title">SKIN<br>LAB SNAP</h1>
      <p>${SKIN_META.total} FORMULAS · ${SKIN_META.brands} BRANDS</p>
    </div>
    <div class="lab__scanner" aria-hidden="true">
      <div class="lab__scanline"></div>
      <div class="lab__sample"><b>SCAN<br>YOUR<br>ROUTINE</b><i>H₂O</i><i>pH</i><i>SPF</i></div>
    </div>
    <div class="photo-strip lab__strip" aria-hidden="true">
      <div class="photo-strip__frames" data-photo-strip>${skinPhotoFrames(skinCat("serum"))}</div>
      <span>LIVE SAMPLE / 04 FRAMES</span>
    </div>
    <div class="lab__art" aria-hidden="true">
      <span class="lab__tag lab__tag--a">PATCH TEST ✓</span>
      <span class="lab__tag lab__tag--b">SNAP / DROP / GLOW</span>
      <span class="lab__molecule">H—O—H</span>
      <span class="lab__stamp">FORMULA<br>FOUND!</span>
    </div>
    <div class="skin-cats skin-cats--lab" aria-label="護膚分類">${skinCategoryButtons("lab")}</div>
  </section>${skinProductSection("serum")}`;
}
