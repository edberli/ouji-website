function renderHydro() {
  return `<section class="skin-hero hydro" aria-labelledby="hydro-title">
    <div class="hero-flash" aria-hidden="true"></div>
    <div class="hydro__title">
      <h1 id="hydro-title">OUJI<br><span>DEW CLUB</span></h1>
      <p>護膚 · ${SKIN_META.total} 件 · ${SKIN_META.brands} 品牌</p>
    </div>
    <div class="photo-strip hydro__strip" aria-hidden="true">
      <div class="photo-strip__frames" data-photo-strip>${skinPhotoFrames(skinCat("serum"))}</div>
      <span>FRESH DEW · SKIN SNAP</span>
    </div>
    <div class="hydro__art" aria-hidden="true">
      <div class="hydro__orb"><span>DROP<br>YOUR<br>ROUTINE!</span></div>
      <span class="gel gel--a"></span><span class="gel gel--b"></span><span class="gel gel--c"></span>
      <span class="hydro__bubble hydro__bubble--a"></span><span class="hydro__bubble hydro__bubble--b"></span>
      <span class="hydro__splash">SPLASH!</span><span class="hydro__glow">GLOW MODE</span>
    </div>
    <div class="skin-cats skin-cats--hydro" aria-label="護膚分類">${skinCategoryButtons("hydro")}</div>
  </section>${skinProductSection("serum")}`;
}
