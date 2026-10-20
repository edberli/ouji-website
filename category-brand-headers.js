/* Shared original-artwork section identities across departments.
   Exact source colours versus display adaptations and per-logo optical
   sizes are documented in docs/category-brand-headers.md. Neutral black
   fields are deliberate reversals of one-ink marks, not invented colour claims.
   Product data and merchandising order are independent. */
(() => {
  const extra = {
  "YOLU": {
    "identity": true,
    "tint": "#092b96",
    "logo": "logos/category-headers/care-yolu.svg",
    "width": 164,
    "maxHeight": 44,
    "railFilter": "brightness(0)"
  },
  "AROMATICA": {
    "identity": true,
    "tint": "#006839",
    "logo": "logos/category-headers/care-aromatica.svg",
    "width": 238,
    "maxHeight": 32,
    "dark": true
  },
  "DROAS": {
    "identity": true,
    "tint": "#f1ede7",
    "logo": "logos/category-headers/care-droas.svg",
    "width": 185,
    "maxHeight": 34
  },
  "HETRAS": {
    "identity": true,
    "tint": "#231815",
    "logo": "logos/category-headers/care-hetras.png",
    "width": 155,
    "maxHeight": 44,
    "dark": true,
    "crop": {
      "x": 38,
      "y": 22,
      "width": 163,
      "height": 47,
      "sourceWidth": 217,
      "sourceHeight": 100
    }
  },
  "BOTANIST": {
    "identity": true,
    "tint": "#222222",
    "logo": "logos/category-headers/care-botanist.svg",
    "width": 96,
    "maxHeight": 51,
    "dark": true
  },
  "UNOVE": {
    "identity": true,
    "tint": "#202945",
    "logo": "logos/category-headers/care-unove.svg",
    "width": 170,
    "maxHeight": 38,
    "dark": true
  },
  "TREECELL": {
    "identity": true,
    "tint": "#221e1f",
    "logo": "logos/category-headers/care-treecell.png",
    "width": 186,
    "maxHeight": 44,
    "dark": true
  },
  "NARD": {
    "identity": true,
    "tint": "#171717",
    "logo": "logos/category-headers/care-nard.png",
    "width": 158,
    "maxHeight": 40,
    "dark": true
  },
  "RAIP": {
    "identity": true,
    "tint": "#231815",
    "logo": "logos/category-headers/care-raip-white-official.png",
    "width": 125,
    "maxHeight": 36,
    "dark": true,
    "filter": "none",
    "railFilter": "brightness(0)"
  },
  "SOLEP": {
    "identity": true,
    "tint": "#171717",
    "logo": "logos/solep.png",
    "width": 118,
    "maxHeight": 44,
    "dark": true
  },
  "HEVEBLUE": {
    "identity": true,
    "tint": "#f2e9da",
    "logo": "logos/heveblue.png",
    "width": 44,
    "maxHeight": 55
  },
  "SHISEIDO": {
    "identity": true,
    "tint": "#d6001c",
    "logo": "logos/category-headers/refined-shiseido.svg",
    "width": 190,
    "maxHeight": 50,
    "railFilter": "brightness(0)"
  },
  "VITAMIN VILLAGE": {
    "identity": true,
    "tint": "#fff0c9",
    "logo": "logos/category-headers/health-vitamin-village.png",
    "width": 220,
    "maxHeight": 42
  },
  "Chong Kun Dang": {
    "identity": true,
    "tint": "#202433",
    "logo": "logos/category-headers/health-chong-kun-dang.png",
    "width": 210,
    "maxHeight": 38,
    "railFilter": "brightness(0)"
  },
  "BOTO": {
    "identity": true,
    "tint": "#feede5",
    "logo": "logos/category-headers/health-boto.png",
    "width": 180,
    "maxHeight": 47
  },
  "AFC": {
    "identity": true,
    "tint": "#fff0ef",
    "logo": "logos/category-headers/health-afc.jpg",
    "width": 200,
    "maxHeight": 38,
    "blend": "multiply"
  },
  "NE:AR": {
    "identity": true,
    "tint": "#171717",
    "logo": "logos/category-headers/health-near.svg",
    "width": 140,
    "maxHeight": 45,
    "dark": true
  },
  "UHA": {
    "identity": true,
    "tint": "#ffeff2",
    "logo": "logos/category-headers/quality-uha.png",
    "width": 145,
    "maxHeight": 49,
    "blend": "multiply"
  },
  // No verified standalone manufacturer logo: use the native text fallback.
  "MOTEMA SLIM": {
    "identity": true,
    "tint": "#fce8ee",
    "ink": "#8c264a"
  },
  "ITOH": {
    "identity": true,
    "tint": "#f2eee8",
    "logo": "logos/category-headers/health-itoh.svg",
    "width": 164,
    "maxHeight": 48
  },
  "SVELTY": {
    "identity": true,
    "tint": "#e3eee4",
    "logo": "logos/category-headers/quality-svelty.png",
    "width": 172,
    "maxHeight": 38
  },
  "Shinya Koso": {
    "identity": true,
    "tint": "#3f3f3f",
    "logo": "logos/category-headers/health-shinya-koso.png",
    "width": 164,
    "maxHeight": 44,
    "dark": true
  },
  "Slimwalk": {
    "identity": true,
    "tint": "#171717",
    "logo": "logos/category-headers/health-slimwalk.svg",
    "width": 210,
    "maxHeight": 40,
    "dark": true
  },
  "Pro-Fits": {
    "identity": true,
    "tint": "#eeeeee",
    "logo": "logos/category-headers/health-pro-fits.jpg",
    "width": 165,
    "maxHeight": 48,
    "blend": "multiply"
  },
  "Feliamo": {
    "identity": true,
    "tint": "#1b1b1b",
    "logo": "logos/category-headers/lifestyle-feliamo.svg",
    "width": 175,
    "maxHeight": 48,
    "dark": true
  },
  "Lilmoon": {
    "identity": true,
    "tint": "#181818",
    "logo": "logos/category-headers/lifestyle-lilmoon.svg",
    "width": 180,
    "maxHeight": 42,
    "dark": true
  },
  "Molak": {
    "identity": true,
    "tint": "#f9edf2",
    "logo": "logos/category-headers/lifestyle-molak.svg",
    "width": 170,
    "maxHeight": 42
  },
  "N's Collection": {
    "identity": true,
    "tint": "#181818",
    "logo": "logos/category-headers/lifestyle-ns-collection.svg",
    "width": 254,
    "maxHeight": 34,
    "dark": true
  },
  "TOPARDS": {
    "identity": true,
    "tint": "#595757",
    "logo": "logos/category-headers/lifestyle-topards.svg",
    "width": 190,
    "maxHeight": 42,
    "dark": true
  },
  "YAO": {
    "identity": true,
    "tint": "#f1e8dc",
    "logo": "logos/category-headers/lifestyle-yao.png",
    "width": 60,
    "maxHeight": 50
  },
  "Lavons": {
    "identity": true,
    "tint": "#f4efe5",
    "logo": "logos/category-headers/lifestyle-lavons.svg",
    "width": 80,
    "maxHeight": 50
  },
  "MUMCHIT": {
    "identity": true,
    "tint": "#171717",
    "logo": "logos/category-headers/lifestyle-mumchit.png",
    "width": 180,
    "maxHeight": 40,
    "railFilter": "brightness(0)"
  },
  "Adopt": {
    "identity": true,
    "tint": "#fff0f4",
    "logo": "logos/category-headers/lifestyle-adopt.svg",
    "width": 190,
    "maxHeight": 42
  },
  "OHANA MAHAALO": {
    "identity": true,
    "tint": "#f5ede7",
    "logo": "logos/category-headers/lifestyle-ohana-mahaalo.png",
    "width": 218,
    "maxHeight": 34,
    "crop": {
      "x": 61,
      "y": 123,
      "width": 1878,
      "height": 154,
      "sourceWidth": 2000,
      "sourceHeight": 400
    }
  },
  "oneTONE": {
    "identity": true,
    "tint": "#f6f3ef",
    "logo": "logos/category-headers/lifestyle-onetone.png",
    "width": 176,
    "maxHeight": 34,
    "blend": "multiply"
  },
  "SUNCUT": {
    "identity": true,
    "tint": "#fae8ec",
    "logo": "logos/category-headers/extra-suncut.svg",
    "width": 55,
    "maxHeight": 55
  },
  "Sunplay": {
    "identity": true,
    "tint": "#e5eef8",
    "logo": "logos/category-headers/extra-sunplay.png",
    "width": 145,
    "maxHeight": 28,
    "blend": "multiply",
    "crop": {
      "x": 16,
      "y": 22,
      "width": 101,
      "height": 22,
      "sourceWidth": 142,
      "sourceHeight": 71
    }
  },
  "SANTAN": {
    "identity": true,
    "tint": "#e6f1e2",
    "logo": "logos/category-headers/extra-santan.png",
    "width": 140,
    "maxHeight": 50
  },
  "MASCLUB": {
    "identity": true,
    "tint": "#fbe7ed",
    "logo": "logos/category-headers/extra-masclub.jpg",
    "width": 180,
    "maxHeight": 36,
    "blend": "multiply",
    "crop": {
      "x": 86,
      "y": 23,
      "width": 451,
      "height": 54,
      "sourceWidth": 1173,
      "sourceHeight": 156
    }
  },
  "AGARISM": {
    "identity": true,
    "tint": "#231815",
    "logo": "logos/category-headers/extra-agarism.svg",
    "width": 190,
    "maxHeight": 38,
    "dark": true
  },
  "emplir": {
    "identity": true,
    "tint": "#eeeae7",
    "logo": "logos/category-headers/extra-emplir.svg",
    "width": 184,
    "maxHeight": 40
  },
  "TO BE FRESH": {
    "identity": true,
    "tint": "#e9f1e9",
    "logo": "logos/category-headers/extra-to-be-fresh.svg",
    "width": 180,
    "maxHeight": 40
  },
  "Ariul": {
    "identity": true,
    "tint": "#f7f3ed",
    "logo": "logos/category-headers/shop-ariul.png",
    "width": 120,
    "maxHeight": 46
  },
  "Hada Labo": {
    "identity": true,
    "tint": "#eaf7ff",
    "logo": "logos/category-headers/shop-hada-labo.gif",
    "width": 124,
    "maxHeight": 50,
    "crop": {
      "x": 31,
      "y": 37,
      "width": 158,
      "height": 66,
      "sourceWidth": 220,
      "sourceHeight": 140
    },
    "blend": "multiply"
  },
  "Mentholatum": {
    "identity": true,
    "tint": "#003da6",
    "logo": "logos/category-headers/parent-mentholatum.svg",
    "width": 252,
    "maxHeight": 32,
    "railFilter": "brightness(0)"
  },
  "DHC": {
    "identity": true,
    "tint": "#0058aa",
    "logo": "logos/category-headers/parent-dhc.svg",
    "width": 105,
    "maxHeight": 48,
    "dark": true
  },
  "FANCL": {
    "identity": true,
    "tint": "#1e4d9e",
    "logo": "logos/category-headers/parent-fancl.svg",
    "width": 175,
    "maxHeight": 38,
    "dark": true
  },
  "KOSÉ": {
    "identity": true,
    "tint": "#418fde",
    "logo": "logos/category-headers/parent-kose.svg",
    "width": 180,
    "maxHeight": 38,
    "railFilter": "brightness(0)"
  },
  "Kao": {
    "identity": true,
    "tint": "#e1f3ee",
    "logo": "logos/category-headers/quality-kao.png",
    "width": 128,
    "maxHeight": 38,
    "blend": "multiply"
  },
  "Bioré": {
    "identity": true,
    "tint": "#24298a",
    "logo": "logos/category-headers/parent-biore.png",
    "width": 158,
    "maxHeight": 48,
    "dark": true
  },
  "ANESSA": {
    "identity": true,
    "tint": "#e4f6fa",
    "logo": "logos/category-headers/parent-anessa.svg",
    "width": 205,
    "maxHeight": 36
  },
  "ROHTO": {
    "identity": true,
    "tint": "#eaf2fb",
    "logo": "logos/category-headers/parent-rohto.svg",
    "width": 92,
    "maxHeight": 48
  },
  "Fiancee": {
    "identity": true,
    "tint": "#f3eee9",
    "logo": "logos/category-headers/parent-fiancee.png",
    "width": 185,
    "maxHeight": 46
  },
  "FURRIKY": {
    "identity": true,
    "tint": "#fce9ec",
    "logo": "logos/category-headers/parent-furriky.png",
    "width": 120,
    "maxHeight": 50
  },
  "WELLP": {
    "identity": true,
    "tint": "#eee8de",
    "logo": "logos/category-headers/parent-wellp.svg",
    "width": 175,
    "maxHeight": 38
  },
  "John's Blend": {
    "identity": true,
    "tint": "#211b18",
    "logo": "logos/category-headers/parent-johns-blend.svg",
    "width": 190,
    "maxHeight": 44,
    "railFilter": "brightness(0)"
  },
  "SEVENTEEN": {
    "identity": true,
    "tint": "#181818",
    "logo": "logos/category-headers/parent-seventeen.png",
    "width": 240,
    "maxHeight": 40,
    "railFilter": "brightness(0)"
  },
  "ILLIT": {
    "identity": true,
    "tint": "#636363",
    "logo": "logos/category-headers/parent-illit.svg",
    "width": 140,
    "maxHeight": 45,
    "dark": true
  },
  "IVE": {
    "identity": true,
    "tint": "#f6eef2",
    "logo": "logos/category-headers/parent-ive.png",
    "width": 42,
    "maxHeight": 56,
    "crop": {
      "x": 20,
      "y": 8,
      "width": 79,
      "height": 105,
      "sourceWidth": 120,
      "sourceHeight": 120
    },
    "blend": "multiply"
  },
  "MOEV": {
    "identity": true,
    "tint": "#edeae7",
    "logo": "logos/category-headers/resolved-moev.png",
    "width": 170,
    "maxHeight": 36,
    "crop": {
      "x": 150,
      "y": 18,
      "width": 522,
      "height": 110,
      "sourceWidth": 797,
      "sourceHeight": 147
    }
  },
  "BOUQUET GARNI": {
    "identity": true,
    "tint": "#f1e9e1",
    "logo": "logos/category-headers/resolved-bouquet-garni.svg",
    "width": 226,
    "maxHeight": 40,
    "crop": {
      "x": 30,
      "y": 42,
      "width": 460,
      "height": 46,
      "sourceWidth": 523.01,
      "sourceHeight": 121.13
    }
  },
  "Disney 迪士尼": {
    "identity": true,
    "tint": "#1a2453",
    "logo": "logos/disney.svg",
    "width": 170,
    "maxHeight": 46,
    "dark": true
  },
  "FINE JAPAN": {
    "identity": true,
    "tint": "#e6e8f4",
    "logo": "logos/category-headers/refined-fine-japan.png",
    "width": 200,
    "maxHeight": 46
  },
  "JUNGWONSAM": {
    "identity": true,
    "tint": "#f8eeea",
    "logo": "logos/category-headers/refined-jungwonsam.png",
    "width": 172,
    "maxHeight": 46,
    "crop": {
      "x": 17,
      "y": 17,
      "width": 576,
      "height": 133,
      "sourceWidth": 600,
      "sourceHeight": 163
    }
  },
  "Tiarera": {
    "identity": true,
    "tint": "#dff5f2",
    "logo": "logos/category-headers/refined-tiarera.png",
    "width": 178,
    "maxHeight": 38,
    "crop": {
      "x": 18,
      "y": 65,
      "width": 468,
      "height": 84,
      "sourceWidth": 1080,
      "sourceHeight": 208
    }
  },
  "PLU": {
    "identity": true,
    "tint": "#004c33",
    "logo": "logos/category-headers/final-plu.svg",
    "width": 74,
    "maxHeight": 46,
    "dark": true
  },
  "Menturm": {
    "identity": true,
    "tint": "#e7f0e9",
    "logo": "logos/category-headers/final-menturm.svg",
    "width": 50,
    "maxHeight": 50
  }
};
  const palette = {
  "Goodal": {
    "tint": "#fff586"
  },
  "WELLAGE": {
    "tint": "#ccdcff"
  },
  "FARMSTAY": {
    "tint": "#2130a0",
    "dark": true
  },
  "Arencia": {
    "tint": "#b8db8b"
  },
  "TOCOBO": {
    "tint": "#dc272d",
    "dark": true
  },
  "SO'NATURAL": {
    "tint": "#303030",
    "dark": true
  },
  "Cell Fusion C": {
    "tint": "#fae9ec"
  },
  "d'Alba": {
    "width": 225,
    "maxHeight": 38,
    "crop": {
      "x": 68,
      "y": 77,
      "width": 1057,
      "height": 133,
      "sourceWidth": 1190.55,
      "sourceHeight": 286.9
    }
  }
};
  const profiles = {
    ...window.OUJI_SKINCARE_BRAND_HEADERS,
    ...window.OUJI_MAKEUP_BRAND_HEADERS,
    ...extra,
  };
  Object.entries(palette).forEach(([brand, fields]) => {
    if (profiles[brand]) profiles[brand] = { ...profiles[brand], ...fields };
  });
  const key = (name) => String(name || '').trim().normalize('NFKC').toLocaleLowerCase('en');
  const byName = new Map(Object.entries(profiles).map(([name, profile]) => [key(name), profile]));
  window.OUJI_CATEGORY_BRAND_HEADERS = Object.freeze(profiles);
  window.OUJI_brandHeader = (name) => byName.get(key(name)) || null;
})();
