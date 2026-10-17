/* Original artwork for the wide makeup brand headings only.
   Each mark is optically sized, preserving its own proportions and details.
   Sources, colour interpretation and asset limitations: docs/makeup-brand-headers.md.
   Navigation artwork, product cards and other categories are independent. */
/* Curated 2026-10-17: HK Google Trends beauty searches inform Korean-brand
   order; owner overrides put WAKEMAKE lower and nail brands last.
   This is a frozen merchandising order, not a live popularity leaderboard.
   Sources and sparse-data limits: docs/makeup-brand-order.md. */
window.OUJI_MAKEUP_BRAND_ORDER = Object.freeze([
  'Peripera', 'OBgE', 'rom&nd', 'CLIO', 'fwee', 'dasique', '2aN',
  'lilybyred', 'hince', 'Laka', 'TIRTIR', 'Heart Percent',
  'AMUSE', 'Glint', 'UNLEASHIA', "SO'NATURAL", 'KSECRET', 'Coralhaze', 'BRAYE', 'CORINGCO',
  'WAKEMAKE',
  'Flower Knows', 'CEZANNE', 'Kiss Me', 'SANA', 'Love Liner', 'K-Palette', 'BCL', "AN' BLESS", 'miru miru',
  'fillimilli', 'STUDIO 17', 'ROSY ROSA', 'MAPEPE',
  'Beauty World', 'Felicera', '其他', 'MAYBELLINE', 'ohora',
]);

window.OUJI_MAKEUP_BRAND_HEADERS = {
  'CLIO': { identity: true, tint: '#14110f', dark: true, logo: 'logos/makeup-headers/clio.png', width: 170, maxHeight: 42 },
  'CEZANNE': { identity: true, tint: '#b42046', logo: 'logos/makeup-headers/cezanne.png', width: 184, maxHeight: 51 },
  'fwee': { identity: true, tint: '#0d88d8', dark: true, logo: 'logos/makeup-headers/fwee.png', width: 140, maxHeight: 44 },
  'UNLEASHIA': { identity: true, tint: '#121212', dark: true, logo: 'logos/makeup-headers/unleashia.png', width: 195, maxHeight: 36 },
  'hince': { identity: true, tint: '#a16e72', dark: true, logo: 'logos/makeup-headers/hince.svg', width: 145, maxHeight: 44 },
  'dasique': { identity: true, tint: '#f9eeec', logo: 'logos/makeup-headers/dasique.png', width: 133, maxHeight: 40 },
  'MAYBELLINE': { identity: true, tint: '#14110f', logo: 'logos/makeup-headers/maybelline.svg', width: 218, maxHeight: 38 },
  'Peripera': { identity: true, tint: '#ff2a71', dark: true, logo: 'logos/makeup-headers/peripera.png', width: 175, maxHeight: 41 },
  'rom&nd': { identity: true, tint: '#ffe2ea', logo: 'logos/makeup-headers/romand.png', width: 185, maxHeight: 44 },
  'ROSY ROSA': { identity: true, tint: '#cf0025', dark: true, logo: 'logos/makeup-headers/rosy-rosa.png', width: 220, maxHeight: 35 },
  'WAKEMAKE': { identity: true, tint: '#e10034', dark: true, logo: 'logos/makeup-headers/wakemake.svg', width: 214, maxHeight: 34 },
  'AMUSE': { identity: true, tint: '#f5bbb4', logo: 'logos/makeup-headers/amuse.png', width: 208, maxHeight: 38 },
  'TIRTIR': { identity: true, tint: '#b8172a', dark: true, logo: 'logos/brand-headers/tirtir.svg', width: 165, maxHeight: 38 },
  "SO'NATURAL": { identity: true, tint: '#ffffff', logo: 'logos/brand-headers/so-natural.svg', width: 165, maxHeight: 40 },
  'lilybyred': { identity: true, tint: '#fff1f2', logo: 'logos/makeup-headers/lilybyred.png', width: 139, maxHeight: 36 },
  'Laka': { identity: true, tint: '#f8f8f8', logo: 'logos/makeup-headers/laka.svg', width: 116, maxHeight: 45 },
  '2aN': { identity: true, tint: '#ffffff', logo: 'logos/makeup-headers/2an.png', width: 104, maxHeight: 48 },
  'Heart Percent': { identity: true, tint: '#ad5a69', dark: true, logo: 'logos/makeup-headers/heart-percent.webp', width: 240, maxHeight: 32 },
  'SANA': { identity: true, tint: '#ffffff', logo: 'logos/makeup-headers/sana.png', width: 129, maxHeight: 37, blend: 'multiply' },
  'STUDIO 17': { identity: true, tint: '#171717', dark: true, logo: 'logos/makeup-headers/studio-17.png', width: 188, maxHeight: 43 },
  'fillimilli': { identity: true, tint: '#b9dedc', logo: 'logos/makeup-headers/fillimilli.png', width: 150, maxHeight: 41 },
  'Flower Knows': { identity: true, tint: '#fff0f0', logo: 'logos/makeup-headers/flower-knows.png', width: 84, maxHeight: 58 },
  'CORINGCO': { identity: true, tint: '#f7a1c4', logo: 'logos/makeup-headers/coringco.png', width: 220, maxHeight: 36 },
  'Coralhaze': { identity: true, tint: '#ffffff', logo: 'logos/makeup-headers/coralhaze.png', width: 220, maxHeight: 39 },
  'Glint': { identity: true, tint: '#333333', dark: true, logo: 'logos/makeup-headers/glint.png', width: 120, maxHeight: 56 },
  'BRAYE': { identity: true, tint: '#007b83', dark: true, logo: 'logos/makeup-headers/braye.svg', width: 195, maxHeight: 34 },
  'KSECRET': { identity: true, tint: '#ffffff', logo: 'logos/ksecret.png', width: 200, maxHeight: 46 },
  'Love Liner': { identity: true, tint: '#ffffff', logo: 'logos/makeup-headers/love-liner.svg', width: 180, maxHeight: 42 },
  'OBgE': { identity: true, tint: '#202433', dark: true, logo: 'logos/makeup-headers/obge.png', width: 112, maxHeight: 44 },
  'BCL': { identity: true, tint: '#002b60', dark: true, logo: 'logos/makeup-headers/bcl.png', width: 112, maxHeight: 49 },
  "AN' BLESS": { identity: true, tint: '#ffffff', logo: 'logos/makeup-headers/an-bless.png', width: 112, maxHeight: 52 },
  'MAPEPE': { identity: true, tint: '#ffffff', logo: 'logos/makeup-headers/mapepe.png', width: 205, maxHeight: 34 },
  'Beauty World': { identity: true, tint: '#ffffff', logo: 'logos/makeup-headers/beauty-world.png', width: 80, maxHeight: 55 },
  'ohora': { identity: true, tint: '#171717', dark: true, logo: 'logos/makeup-headers/ohora.png', width: 135, maxHeight: 44 },
  'K-Palette': { identity: true, tint: '#ffffff', logo: 'logos/makeup-headers/k-palette.png', width: 178, maxHeight: 41 },
  'miru miru': { identity: true, tint: '#120506', logo: 'logos/makeup-headers/miru-miru.png', width: 200, maxHeight: 40 },
  'Felicera': { identity: true, tint: '#0c0603', logo: 'logos/makeup-headers/felicela.png', width: 154, maxHeight: 56, blend: 'lighten' },
  'Kiss Me': { identity: true, tint: '#ce0037', dark: true, logo: 'logos/makeup-headers/kiss-me.svg', width: 182, maxHeight: 40 },
};
