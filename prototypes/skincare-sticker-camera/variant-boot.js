function renderBoot() {
  return `<section class="skin-hero boot" aria-labelledby="boot-title">
    <div class="boot__wallpaper" aria-hidden="true"><span class="boot__cloud boot__cloud--a"></span><span class="boot__cloud boot__cloud--b"></span><span class="boot__hill"></span></div>
    <div class="boot__title">
      <span>OUJI SKIN OS · VERSION 2001</span>
      <h1 id="boot-title">BOOT YOUR<br>ROUTINE</h1>
      <p>${SKIN_META.total} ITEMS READY · ${SKIN_META.brands} DEVICES FOUND</p>
    </div>
    <div class="boot__window" aria-hidden="true">
      <div class="boot__windowbar"><span>skin_camera.exe</span><i>_</i><i>□</i><i>×</i></div>
      <div class="boot__windowbody"><div class="photo-strip__frames" data-photo-strip>${skinPhotoFrames(skinCat("serum"))}</div></div>
      <div class="boot__status">4 files selected <b>OUJI</b></div>
    </div>
    <div class="boot__disk" aria-hidden="true"><span>OUJI<br>SKIN<br>BOOT</span><small>627 / 32</small></div>
    <div class="boot__dialog" aria-hidden="true">
      <div class="boot__dialogbar">Starting skin.exe</div>
      <p>Loading your routine...</p><div class="boot__progress"><i></i></div>
      <span>DON'T TURN OFF YOUR GLOW</span>
    </div>
    <div class="boot__cursor" aria-hidden="true">➤</div>
    <div class="boot__taskbar" aria-hidden="true"><b>start</b><span>OUJI skin camera</span><time>20:01</time></div>
    <div class="skin-cats skin-cats--boot" aria-label="護膚分類">${skinCategoryButtons("boot")}</div>
  </section>${skinProductSection("serum")}`;
}
