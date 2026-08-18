function renderMask() {
  return `<section class="skin-hero maskbooth" aria-labelledby="mask-title">
    <div class="maskbooth__title">
      <h1 id="mask-title">MASK<br><span>ME!</span></h1>
      <p>OUJI SKIN PHOTO CLUB · ${SKIN_META.total} 件</p>
    </div>
    <div class="photo-strip maskbooth__strip" aria-hidden="true">
      <div class="photo-strip__frames" data-photo-strip>${skinPhotoFrames(skinCat("serum"))}</div>
      <span>${SKIN_META.brands} K-BEAUTY BRANDS</span>
    </div>
    <div class="maskbooth__art" aria-hidden="true">
      <svg class="maskbooth__face" viewBox="0 0 220 270">
        <path d="M28 119C28 50 62 17 110 17s82 33 82 102c0 82-34 133-82 133S28 201 28 119Z" fill="#f8fff7" stroke="#15121c" stroke-width="7"/>
        <ellipse cx="76" cy="111" rx="25" ry="13" fill="#bb9cff" stroke="#15121c" stroke-width="6"/>
        <ellipse cx="144" cy="111" rx="25" ry="13" fill="#bb9cff" stroke="#15121c" stroke-width="6"/>
        <path d="M84 193c18-16 36-16 52 0-17 13-34 13-52 0Z" fill="#ff729e" stroke="#15121c" stroke-width="6"/>
        <path d="M110 129c-8 19-8 29 2 35" fill="none" stroke="#15121c" stroke-width="6" stroke-linecap="round"/>
        <path d="M42 72c17 5 30-8 31-27M177 72c-17 5-30-8-31-27" fill="none" stroke="#7de7e0" stroke-width="7" stroke-linecap="round"/>
      </svg>
      <span class="maskbooth__speech">SOAK<br>IT UP!</span>
      <span class="maskbooth__patch maskbooth__patch--a">+</span>
      <span class="maskbooth__patch maskbooth__patch--b">♡</span>
      <span class="maskbooth__patch maskbooth__patch--c">✦</span>
      <span class="maskbooth__note">10 MIN<br>SELFIE</span>
    </div>
    <div class="skin-cats skin-cats--mask" aria-label="護膚分類">${skinCategoryButtons("mask")}</div>
  </section>${skinProductSection("serum")}`;
}
