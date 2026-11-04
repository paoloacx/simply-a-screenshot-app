import type { Device, Orientation, Palette, Platform, ScreenshotFontId, SlideLayout, Theme, ThemeId } from "./types";
import { relativeLuminance } from "./contrast";

// ---------- Canvas dimensions (design at largest required resolution) ----------
export const CANVAS: Record<Device, { w: number; h: number; wL?: number; hL?: number }> = {
  iphone:        { w: 1320, h: 2868 },
  ipad:          { w: 2064, h: 2752 },
  // iPhone Duo, exactly as App Store Connect lists them (checked 7 Oct 2026).
  // The displays are not scalings of each other, so each is its own canvas.
  "duo-outer":           { w: 1398, h: 2034 },
  "duo-outer-landscape": { w: 2034, h: 1398 },
  "duo-inner":           { w: 2007, h: 2853 },
  "duo-inner-landscape": { w: 2853, h: 2007 },
  // Apple TV is 16:9 landscape-only. Design at 4K; 1920x1080 is a clean 2x downscale.
  tvos:          { w: 3840, h: 2160 },
  // Apple Watch: design at the largest slot Apple accepts (Ultra 422x514) so every
  // smaller size is a downscale rather than an upscale.
  watchos:       { w: 422, h: 514 },
  // CarPlay has NO App Store screenshot slot of its own - see EXPORT_SIZES below.
  // It is submitted in an iPhone slot, which accepts landscape, so the canvas is
  // the 6.9" iPhone size turned sideways to fit a wide head unit.
  carplay:       { w: 2868, h: 1320 },
  // Mac App Store is landscape-only 16:10. Design at 2880x1800; every other Mac
  // slot is an exact 16:10 downscale.
  mac:           { w: 2880, h: 1800 },
  android:       { w: 1080, h: 1920 },
  "android-7":   { w: 1200, h: 1920, wL: 1920, hL: 1200 },
  "android-10":  { w: 1600, h: 2560, wL: 2560, hL: 1600 },
  "feature-graphic": { w: 1024, h: 500 },
  // App Store creative assets, the size of Apple's own templates.
  "creative-universal": { w: 5244, h: 2950 },
  "creative-header":    { w: 3840, h: 1646 },
  "creative-search":    { w: 3840, h: 2560 },
};

// ---------- Export sizes per device ----------
export type ExportSize = { label: string; w: number; h: number };

// One entry is exported at a time. The first size is the default and the one
// App Store Connect requires (or Google Play, for Android); the rest stay
// selectable in the toolbar for older devices. A bundle never mixes sizes.
//
// For iOS, App Store Connect requires either the 6.9" set (1320x2868) or the
// 6.5" set (1284x2778); the 6.3" set (1206x2622) is optional and Apple fills it
// by downscaling the 6.9" upload.
export const EXPORT_SIZES: Record<Device, ExportSize[]> = {
  iphone: [
    { label: '6.9" · 1320×2868 (App Store)', w: 1320, h: 2868 },
    { label: '6.5" · 1284×2778', w: 1284, h: 2778 },
    { label: '6.3" · 1206×2622', w: 1206, h: 2622 },
    { label: '6.1" · 1125×2436', w: 1125, h: 2436 },
  ],
  ipad: [
    { label: '13" · 2064×2752 (App Store)', w: 2064, h: 2752 },
    { label: '12.9" · 2048×2732', w: 2048, h: 2732 },
  ],
  // App Store Connect lists exactly one size per Duo display and orientation.
  "duo-outer":           [{ label: "Outer portrait",  w: 1398, h: 2034 }],
  "duo-outer-landscape": [{ label: "Outer landscape", w: 2034, h: 1398 }],
  "duo-inner":           [{ label: "Inner portrait",  w: 2007, h: 2853 }],
  "duo-inner-landscape": [{ label: "Inner landscape", w: 2853, h: 2007 }],
  // App Store Connect display type APP_APPLE_TV. Verified 18 Aug 2026 via
  // `asc screenshots sizes --all`; these are the only accepted dimensions.
  tvos: [
    { label: "4K · 3840×2160 (App Store)", w: 3840, h: 2160 },
    { label: "HD · 1920×1080", w: 1920, h: 1080 },
  ],
  // Apple Watch display types, all verified the same way:
  //   APP_WATCH_ULTRA 410x502 + 422x514 | SERIES_10 416x496
  //   SERIES_7 396x484 | SERIES_4 368x448 | SERIES_3 312x390
  // Upload the largest one; App Store scales the smaller watch sets.
  watchos: [
    { label: "Ultra · 422×514 (App Store)", w: 422, h: 514 },
    { label: "Ultra · 410×502", w: 410, h: 502 },
    { label: "Series 10 · 416×496", w: 416, h: 496 },
    { label: "Series 7 · 396×484", w: 396, h: 484 },
    { label: "Series 4 · 368×448", w: 368, h: 448 },
    { label: "Series 3 · 312×390", w: 312, h: 390 },
  ],
  // Note: CarPlay has NO display type in App Store Connect - confirmed against its own
  // metadata, not documentation: `asc screenshots sizes --all` lists APPLE_TV,
  // VISION_PRO, DESKTOP, IPAD*, IPHONE*, WATCH* and nothing for CarPlay. A CarPlay
  // app ships inside its iPhone app, so a CarPlay shot is submitted in an iPhone
  // slot. The first size is the 6.9" iPhone size turned sideways.
  carplay: [
    { label: '6.9" · 2868×1320 (iPhone slot)', w: 2868, h: 1320 },
    { label: '6.5" · 2778×1284', w: 2778, h: 1284 },
    { label: '6.3" · 2622×1206', w: 2622, h: 1206 },
    { label: '6.1" · 2436×1125', w: 2436, h: 1125 },
  ],
  // App Store Connect display type APP_DESKTOP (Mac App Store). 2880x1800 is the
  // required native size; the others are optional downscales.
  mac: [
    { label: "2880×1800 (App Store)", w: 2880, h: 1800 },
    { label: "2560×1600", w: 2560, h: 1600 },
    { label: "1440×900", w: 1440, h: 900 },
    { label: "1280×800", w: 1280, h: 800 },
  ],
  android:       [{ label: "Phone",          w: 1080, h: 1920 }],
  "android-7":   [{ label: '7" Portrait',    w: 1200, h: 1920 }],
  "android-10":  [{ label: '10" Portrait',   w: 1600, h: 2560 }],
  "feature-graphic": [{ label: "Feature Graphic", w: 1024, h: 500 }],
  // One universal asset covers both the product page header and search results.
  "creative-universal": [{ label: "Universal", w: 5244, h: 2950 }],
  "creative-header":    [{ label: "Header", w: 3840, h: 1646 }],
  // Search results take any 3:2 size from 1920x1280 to 3840x2560.
  "creative-search": [
    { label: "3840×2560 (App Store)", w: 3840, h: 2560 },
    { label: "1920×1280", w: 1920, h: 1280 },
  ],
};

// Landscape sizes (tablets only)
export const EXPORT_SIZES_LANDSCAPE: Partial<Record<Device, ExportSize[]>> = {
  "android-7":  [{ label: '7" Landscape',  w: 1920, h: 1200 }],
  "android-10": [{ label: '10" Landscape', w: 2560, h: 1600 }],
};

// Targets whose two orientations are separate decks (and separate devices),
// so portrait and landscape keep independent compositions.
export const ORIENTATION_PAIRS: Partial<Record<Device, Record<Orientation, Device>>> = {
  "duo-outer":           { portrait: "duo-outer", landscape: "duo-outer-landscape" },
  "duo-outer-landscape": { portrait: "duo-outer", landscape: "duo-outer-landscape" },
  "duo-inner":           { portrait: "duo-inner", landscape: "duo-inner-landscape" },
  "duo-inner-landscape": { portrait: "duo-inner", landscape: "duo-inner-landscape" },
};

export function supportsLandscape(device: Device): boolean {
  return device in EXPORT_SIZES_LANDSCAPE || device in ORIENTATION_PAIRS;
}

/** The device holding `device`'s deck in `orientation`; itself when orientation is just a canvas flip. */
export function deviceForOrientation(device: Device, orientation: Orientation): Device {
  return ORIENTATION_PAIRS[device]?.[orientation] ?? device;
}

/** Orientation a paired device is fixed to; otherwise the project's orientation. */
export function orientationOf(device: Device, orientation: Orientation): Orientation {
  const pair = ORIENTATION_PAIRS[device];
  if (!pair) return orientation;
  return pair.landscape === device ? "landscape" : "portrait";
}

export type CreativeDevice = "creative-universal" | "creative-header" | "creative-search";

export function isCreative(device: Device): device is CreativeDevice {
  return device.startsWith("creative-");
}

type Box = { x: number; y: number; w: number; h: number };

// "Art Safe Area" layer of Apple's static creative asset templates, measured in
// canvas pixels from the Photoshop files linked on developer.apple.com/app-store/
// asset-best-practices (downloaded 7 Oct 2026). Keep focal art and copy inside.
// `crops` preview how the universal asset may be trimmed in each placement.
// Apple does not publish that crop, so these are centred cover crops at each
// placement's own aspect: guides only, never applied to the export.
export const CREATIVE_SPECS: Record<CreativeDevice, { safe: Box; crops: { label: string; aspect: number }[] }> = {
  "creative-universal": {
    safe: { x: 1921, y: 660, w: 1402, h: 962 },
    crops: [
      { label: "Header crop", aspect: 3840 / 1646 },
      { label: "Search crop", aspect: 3 / 2 },
    ],
  },
  "creative-header": { safe: { x: 1097, y: 493, w: 1646, h: 661 }, crops: [] },
  "creative-search": { safe: { x: 836, y: 765, w: 2168, h: 1030 }, crops: [] },
};

/** Centred cover crop of a `cW`×`cH` canvas at `aspect` (w/h). */
export function centredCrop(cW: number, cH: number, aspect: number): Box {
  const w = Math.min(cW, cH * aspect);
  const h = w / aspect;
  return { x: (cW - w) / 2, y: (cH - h) / 2, w, h };
}

export function getExportSizes(device: Device, orientation: Orientation): ExportSize[] {
  if (orientation === "landscape") {
    return EXPORT_SIZES_LANDSCAPE[device] || EXPORT_SIZES[device];
  }
  return EXPORT_SIZES[device];
}

// ---------- Frame aspect ratios ----------
export const MK_RATIO    = 1022 / 2082; // iPhone PNG mockup
export const TAB_P_RATIO = 0.667;        // tablet portrait
export const TAB_L_RATIO = 1.5;          // tablet landscape
export const IPAD_RATIO  = 0.770;        // iPad
export const TV_RATIO    = 16 / 9;       // Apple TV - landscape only
export const WATCH_RATIO = 422 / 514;    // Apple Watch Ultra, the largest accepted slot
// CarPlay head units vary by vehicle and Apple ships five presets in CarPlay
// Simulator.app/Contents/Resources/VehicleConfigs: Minimum 748x456, Standard 800x480,
// Widescreen 1920x720, Portrait 900x1200, Standard Video Playback 1920x1080.
// "Standard" is the default here; change this constant to target another.
export const CARPLAY_RATIO = 800 / 480;
// Mac window: a 16:10 content area under a title bar MAC_TITLE_BAR x the content
// height tall, so a 16:10 capture (the Mac App Store's own aspect) fills the
// window without being cropped.
export const MAC_TITLE_BAR = 0.045;
export const MAC_RATIO = 16 / (10 * (1 + MAC_TITLE_BAR));

// iPhone Duo capture aspects (screen w/h), from the exact sizes above.
export const DUO_OUTER_SCREEN = 1398 / 2034;
export const DUO_INNER_SCREEN = 2007 / 2853;

// iPhone mockup screen overlay (pre-measured)
export const PHONE_SCREEN = {
  L: (52 / 1022) * 100,
  T: (46 / 2082) * 100,
  W: (918 / 1022) * 100,
  H: (1990 / 2082) * 100,
  RX: (126 / 918) * 100,
  RY: (126 / 1990) * 100,
};

// ---------- Width formula helpers ----------
export function phoneW(cW: number, cH: number, clamp = 0.84) {
  return Math.min(clamp, 0.72 * (cH / cW) * MK_RATIO);
}
export function phoneWSmall(cW: number, cH: number) {
  return phoneW(cW, cH, 0.66);
}
export function tabletPW(cW: number, cH: number, clamp = 0.80) {
  return Math.min(clamp, 0.72 * (cH / cW) * TAB_P_RATIO);
}
export function tabletLW(cW: number, cH: number, clamp = 0.62) {
  return Math.min(clamp, 0.75 * (cH / cW) * TAB_L_RATIO);
}
export function ipadW(cW: number, cH: number, clamp = 0.75) {
  return Math.min(clamp, 0.72 * (cH / cW) * IPAD_RATIO);
}
// Clamped low so a 16:9 device clears the 0.28-height caption block on a 16:9 canvas.
export function tvW(cW: number, cH: number, clamp = 0.58) {
  return Math.min(clamp, 0.72 * (cH / cW) * TV_RATIO);
}
export function watchW(cW: number, cH: number, clamp = 0.52) {
  return Math.min(clamp, 0.72 * (cH / cW) * WATCH_RATIO);
}
// Height-bound on the wide canvas: the head unit must clear the caption block.
export function carPlayW(cW: number, cH: number, clamp = 0.86) {
  return Math.min(clamp, 0.58 * (cH / cW) * CARPLAY_RATIO);
}
// Width that makes a frame of `aspect` take `heightFrac` of the canvas height.
export function frameFitW(aspect: number, heightFrac: number, clamp: number) {
  return (cW: number, cH: number) => Math.min(clamp, heightFrac * (cH / cW) * aspect);
}
// Contained like the TV: height-bound so the window clears the caption block
// above or below it on the 16:10 canvas.
export function macW(cW: number, cH: number, clamp = 0.86) {
  return Math.min(clamp, 0.58 * (cH / cW) * MAC_RATIO);
}

// ---------- Themes ----------
export const DEFAULT_THEME_ID: ThemeId = "clean-light";

export const DEFAULT_SCREENSHOT_FONT_ID: ScreenshotFontId = "template-default";

// Family used for a font imported through the toolbar. The matching @font-face
// is injected into <head> by the editor (see screenshot-editor.tsx), so it sits
// in document.styleSheets where html-to-image can embed it into exports.
export const IMPORTED_FONT_FAMILY = "ImportedScreenshotFont";

export const SCREENSHOT_FONTS: Record<ScreenshotFontId, { name: string; family: string }> = {
  // Inherit the editor's Inter (next/font in app/layout.tsx), which is what the
  // canvas rendered before fonts were selectable, so existing decks don't shift.
  "template-default": { name: "Inter (Predeterminada)", family: "inherit" },
  "system-sans": {
    name: "System Sans (Apple UI)",
    family: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  "poppins": { name: "Poppins (Moderna geométrica)", family: "'Poppins', sans-serif" },
  "montserrat": { name: "Montserrat (Limpia y versátil)", family: "'Montserrat', sans-serif" },
  "plus-jakarta-sans": { name: "Plus Jakarta Sans (Fintech & UI)", family: "'Plus Jakarta Sans', sans-serif" },
  "outfit": { name: "Outfit (Vibrante y nítida)", family: "'Outfit', sans-serif" },
  "space-grotesk": { name: "Space Grotesk (Tech / Moderna)", family: "'Space Grotesk', sans-serif" },
  "geist": { name: "Geist Sans (Apple / Vercel)", family: "'Geist', -apple-system, sans-serif" },
  "raleway": { name: "Raleway (Elegante)", family: "'Raleway', sans-serif" },
  "playfair-display": { name: "Playfair Display (Serif editorial)", family: "'Playfair Display', Georgia, serif" },
  "template-serif": { name: "Georgia (Serif clásica)", family: "Georgia, 'Times New Roman', serif" },
  // Named system fonts ship with macOS; elsewhere they fall back to the listed
  // alternatives, so export on the machine whose fonts you designed with.
  "avenir-next": { name: "Avenir Next", family: '"Avenir Next", Avenir, sans-serif' },
  "helvetica-neue": { name: "Helvetica Neue", family: '"Helvetica Neue", Helvetica, Arial, sans-serif' },
  "futura": { name: "Futura", family: "Futura, 'Trebuchet MS', sans-serif" },
  "baskerville": { name: "Baskerville", family: "Baskerville, 'Baskerville Old Face', Georgia, serif" },
  "palatino": { name: "Palatino", family: "Palatino, 'Palatino Linotype', 'Book Antiqua', serif" },
  "optima": { name: "Optima", family: "Optima, Candara, 'Segoe UI', sans-serif" },
  "american-typewriter": { name: "American Typewriter", family: '"American Typewriter", "Courier New", serif' },
  // Only offered once a font has been imported; the name shown comes from the file.
  "self-hosted": { name: "Tipografía importada", family: `"${IMPORTED_FONT_FAMILY}", sans-serif` },
};

export const THEMES: Record<string, Theme> = {
  // --- 1. Neutros y Básicos (Sólidos) ---
  "clean-light": {
    id: "clean-light",
    name: "Blanco Puro (Sólido)",
    group: "neutro",
    bg: "#FFFFFF",
    bgAlt: "#0A0A0C",
    fg: "#0F172A",
    fgAlt: "#FFFFFF",
    accent: "#2563EB",
    muted: "#64748B",
  },
  "dark-bold": {
    id: "dark-bold",
    name: "Negro Profundo (Sólido)",
    group: "neutro",
    bg: "#0A0A0C",
    bgAlt: "#FFFFFF",
    fg: "#F8FAFC",
    fgAlt: "#0A0A0C",
    accent: "#60A5FA",
    muted: "#94A3B8",
  },
  "graphite": {
    id: "graphite",
    name: "Grafito Oscuro (Sólido)",
    group: "neutro",
    bg: "#18191E",
    bgAlt: "#F4F5F7",
    fg: "#F9FAFB",
    fgAlt: "#18191E",
    accent: "#818CF8",
    muted: "#A1A1AA",
  },
  "gray-minimal": {
    id: "gray-minimal",
    name: "Gris Suave (Sólido)",
    group: "neutro",
    bg: "#F2F3F5",
    bgAlt: "#18191E",
    fg: "#1E293B",
    fgAlt: "#F2F3F5",
    accent: "#475569",
    muted: "#64748B",
  },
  "cream-neutral": {
    id: "cream-neutral",
    name: "Crema Estudio (Sólido)",
    group: "neutro",
    bg: "#F8F5EE",
    bgAlt: "#262320",
    fg: "#262320",
    fgAlt: "#F8F5EE",
    accent: "#92400E",
    muted: "#78716C",
  },
  "slate-titanium": {
    id: "slate-titanium",
    name: "Pizarra Titanio (Sólido)",
    group: "neutro",
    bg: "#DCE1E8",
    bgAlt: "#0F172A",
    fg: "#0F172A",
    fgAlt: "#DCE1E8",
    accent: "#2563EB",
    muted: "#64748B",
  },
  "navy-solid": {
    id: "navy-solid",
    name: "Azul Marino (Sólido)",
    group: "neutro",
    bg: "#0F172A",
    bgAlt: "#F8FAFC",
    fg: "#F8FAFC",
    fgAlt: "#0F172A",
    accent: "#38BDF8",
    muted: "#94A3B8",
  },

  // --- 2. Colores Vivos (Sólidos) ---
  "blue-electric": {
    id: "blue-electric",
    name: "Azul Eléctrico",
    group: "color",
    bg: "#1D4ED8",
    bgAlt: "#0F172A",
    fg: "#FFFFFF",
    fgAlt: "#F8FAFC",
    accent: "#93C5FD",
    muted: "#BFDBFE",
  },
  "indigo-deep": {
    id: "indigo-deep",
    name: "Índigo Intenso",
    group: "color",
    bg: "#4338CA",
    bgAlt: "#1E1B4B",
    fg: "#FFFFFF",
    fgAlt: "#F8FAFC",
    accent: "#C7D2FE",
    muted: "#A5B4FC",
  },
  "purple-violet": {
    id: "purple-violet",
    name: "Violeta Vibrante",
    group: "color",
    bg: "#6B21A8",
    bgAlt: "#3B0764",
    fg: "#FFFFFF",
    fgAlt: "#F8FAFC",
    accent: "#E9D5FF",
    muted: "#D8B4FE",
  },
  "emerald-green": {
    id: "emerald-green",
    name: "Verde Esmeralda",
    group: "color",
    bg: "#047857",
    bgAlt: "#064E3B",
    fg: "#FFFFFF",
    fgAlt: "#F8FAFC",
    accent: "#A7F3D0",
    muted: "#6EE7B7",
  },
  "coral-red": {
    id: "coral-red",
    name: "Coral Cálido",
    group: "color",
    bg: "#E11D48",
    bgAlt: "#881337",
    fg: "#FFFFFF",
    fgAlt: "#F8FAFC",
    accent: "#FECDD3",
    muted: "#FDA4AF",
  },
  "amber-warm": {
    id: "amber-warm",
    name: "Ámbar Dorado",
    group: "color",
    bg: "#D97706",
    bgAlt: "#78350F",
    fg: "#FFFFFF",
    fgAlt: "#F8FAFC",
    accent: "#FDE68A",
    muted: "#FCD34D",
  },
  "teal-ocean": {
    id: "teal-ocean",
    name: "Turquesa Profundo",
    group: "color",
    bg: "#0F766E",
    bgAlt: "#134E4A",
    fg: "#FFFFFF",
    fgAlt: "#F8FAFC",
    accent: "#99F6E4",
    muted: "#5EEAD4",
  },

  // --- 3. Esquemas Bicolores (Armonizados) ---
  "bicolor-sunset": {
    id: "bicolor-sunset",
    name: "Atardecer (Naranja + Fucsia)",
    group: "bicolor",
    bg: "#EA580C",
    bgAlt: "#BE185D",
    fg: "#FFFFFF",
    fgAlt: "#FFFFFF",
    accent: "#FDE047",
    muted: "#FECDD3",
  },
  "bicolor-ocean": {
    id: "bicolor-ocean",
    name: "Océano (Marino + Turquesa)",
    group: "bicolor",
    bg: "#0F172A",
    bgAlt: "#0D9488",
    fg: "#FFFFFF",
    fgAlt: "#FFFFFF",
    accent: "#38BDF8",
    muted: "#99F6E4",
  },
  "bicolor-aurora": {
    id: "bicolor-aurora",
    name: "Aurora (Púrpura + Azul)",
    group: "bicolor",
    bg: "#581C87",
    bgAlt: "#1D4ED8",
    fg: "#FFFFFF",
    fgAlt: "#FFFFFF",
    accent: "#6EE7B7",
    muted: "#C4B5FD",
  },
  "bicolor-mint-cream": {
    id: "bicolor-mint-cream",
    name: "Menta & Crema",
    group: "bicolor",
    bg: "#065F46",
    bgAlt: "#F5F3EB",
    fg: "#F5F3EB",
    fgAlt: "#065F46",
    accent: "#34D399",
    muted: "#A7F3D0",
  },
  "bicolor-midnight": {
    id: "bicolor-midnight",
    name: "Medianoche & Violeta",
    group: "bicolor",
    bg: "#0B0B0E",
    bgAlt: "#4C1D95",
    fg: "#FFFFFF",
    fgAlt: "#FFFFFF",
    accent: "#C084FC",
    muted: "#A1A1AA",
  },
  "bicolor-peach-rose": {
    id: "bicolor-peach-rose",
    name: "Fresa & Melocotón",
    group: "bicolor",
    bg: "#E11D48",
    bgAlt: "#F97316",
    fg: "#FFFFFF",
    fgAlt: "#FFFFFF",
    accent: "#FEF08A",
    muted: "#FECDD3",
  },
  "bicolor-forest": {
    id: "bicolor-forest",
    name: "Bosque & Lima",
    group: "bicolor",
    bg: "#064E3B",
    bgAlt: "#4D7C0F",
    fg: "#FFFFFF",
    fgAlt: "#FFFFFF",
    accent: "#BEF264",
    muted: "#86EFAC",
  },
  "bicolor-cyber": {
    id: "bicolor-cyber",
    name: "Cyber (Cobalto + Cian)",
    group: "bicolor",
    bg: "#1E1B4B",
    bgAlt: "#0284C7",
    fg: "#FFFFFF",
    fgAlt: "#FFFFFF",
    accent: "#22D3EE",
    muted: "#7DD3FC",
  },
};

export function themeById(themeId: string | undefined, palette?: Palette): Theme {
  const baseTheme = THEMES[themeId || ""] || THEMES[DEFAULT_THEME_ID];
  if (!palette) return baseTheme;
  const isLightBase = (relativeLuminance(palette.base) ?? 1) >= 0.18;
  const isLightSec = (relativeLuminance(palette.secondary) ?? 1) >= 0.18;
  return {
    ...baseTheme,
    bg: palette.base,
    bgAlt: palette.secondary,
    accent: palette.extra,
    accentAlt: palette.extra,
    fg: isLightBase ? "#0F172A" : "#F8FAFC",
    fgAlt: isLightSec ? "#0F172A" : "#F8FAFC",
  };
}

export function hasTheme(themeId: string | undefined): boolean {
  return !!themeId && !!THEMES[themeId];
}

export const STORAGE_KEY = "app-store-screenshots:project:v1";
// v3 adds the iPhone Duo and App Store creative decks. Older editors reject
// a v3 project instead of loading decks they cannot render.
export const PROJECT_SCHEMA_VERSION = 3;

// Toolbar platform tabs, in menu order. The platform is also the top-level
// export folder (ios/…, macos/…, android/…). Mac gets its own tab because App
// Store Connect lists macOS as a separate platform with its own screenshot set.
export const PLATFORM_DEVICES: Record<Platform, Device[]> = {
  ios: [
    "iphone", "ipad",
    "duo-outer", "duo-outer-landscape", "duo-inner", "duo-inner-landscape",
    "tvos", "watchos", "carplay",
    "creative-universal", "creative-header", "creative-search",
  ],
  macos: ["mac"],
  android: ["android", "android-7", "android-10", "feature-graphic"],
};

export const DEVICE_LABEL: Record<Device, string> = {
  iphone: "iPhone",
  ipad: "iPad",
  "duo-outer": "iPhone Duo exterior",
  "duo-outer-landscape": "iPhone Duo exterior (apaisado)",
  "duo-inner": "iPhone Duo interior",
  "duo-inner-landscape": "iPhone Duo interior (apaisado)",
  tvos: "Apple TV",
  watchos: "Apple Watch",
  carplay: "CarPlay (ranura iPhone)",
  mac: "Mac",
  android: "Teléfono Android",
  "android-7": 'Tableta Android 7"',
  "android-10": 'Tableta Android 10"',
  "feature-graphic": "Gráfico de portada",
  "creative-universal": "Apple App Store: Universal",
  "creative-header": "Apple App Store: Encabezado",
  "creative-search": "Apple App Store: Resultados de búsqueda",
};

// Friendly labels for slide layouts (used in dropdowns)
export const LAYOUT_LABEL: Record<SlideLayout, string> = {
  hero: "Principal (Hero)",
  "device-bottom": "Dispositivo inferior",
  "device-top": "Dispositivo superior",
  "two-devices": "Dos dispositivos",
  "no-device": "Solo texto (sin marco)",
  "split-landscape": "Dividido (apaisado)",
  "feature-graphic": "Gráfico de portada",
  frameless: "Solo captura redondeada",
};

// Short description shown under each layout name
export const LAYOUT_HINT: Record<SlideLayout, string> = {
  hero: "Titular arriba, dispositivo centrado abajo",
  "device-bottom": "Titular superior, dispositivo anclado en la base",
  "device-top": "Invertido: dispositivo arriba y texto abajo",
  "two-devices": "Dos móviles superpuestos en perspectiva",
  "no-device": "Gran titular tipográfico sin marco de dispositivo",
  "split-landscape": "Subtítulo a la izquierda, dispositivo a la derecha",
  "feature-graphic": "Banner para Google Play Store (1024×500)",
  frameless: "Captura flotante sin móvil, con esquinas redondeadas y sombra",
};

// On iPhone Duo the second device is the same phone in its other state.
const DUO_PAIR_LABEL = "Plegado + abierto";
const DUO_PAIR_HINT = "El mismo teléfono cerrado y abierto, lado a lado";

// Presets de fondos neutros de alta calidad
export const NEUTRAL_BACKGROUND_PRESETS = [
  { id: "studio-white", name: "Blanco Estudio", color: "#FFFFFF", dark: false },
  { id: "soft-linen", name: "Lino Neutro", color: "#F7F5F0", dark: false },
  { id: "clean-cream", name: "Crema Minimal", color: "#F5F2EB", dark: false },
  { id: "warm-sand", name: "Arena Suave", color: "#ECE6DC", dark: false },
  { id: "titanium-slate", name: "Gris Titanio", color: "#E3E5E8", dark: false },
  { id: "soft-slate", name: "Pizarra Fría", color: "#D7DCE2", dark: false },
  { id: "graphite", name: "Grafito Suave", color: "#1E2024", dark: true },
  { id: "midnight", name: "Noche Profunda", color: "#0B0C10", dark: true },
];

/** Layout name for a device's deck. */
export function layoutLabel(layout: SlideLayout, device: Device): string {
  return layout === "two-devices" && device.startsWith("duo-") ? DUO_PAIR_LABEL : LAYOUT_LABEL[layout];
}

/** Layout description for a device's deck. */
export function layoutHint(layout: SlideLayout, device: Device): string {
  return layout === "two-devices" && device.startsWith("duo-") ? DUO_PAIR_HINT : LAYOUT_HINT[layout];
}

// ---------- Mockups extra por pantalla ----------
export const MOCKUP_KINDS: { id: import("./types").MockupKind; label: string; hint: string }[] = [
  { id: "iphone", label: "iPhone", hint: "Teléfono Apple" },
  { id: "ipad", label: "iPad", hint: "Tableta Apple" },
  { id: "android", label: "Android", hint: "Teléfono Android" },
  { id: "frameless", label: "Solo captura redondeada", hint: "Captura flotante sin móvil con esquinas redondeadas" },
  { id: "duo-outer", label: "iPhone Duo (cerrado)", hint: "Pantalla exterior" },
  { id: "duo-inner", label: "iPhone Duo abierto (horizontal)", hint: "Pantalla interior apaisada" },
  { id: "mac", label: "Mac", hint: "Ventana de macOS" },
  { id: "watchos", label: "Apple Watch", hint: "Reloj" },
  { id: "tvos", label: "Apple TV", hint: "Televisor" },
];
