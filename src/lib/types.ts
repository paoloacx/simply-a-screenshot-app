export type Device =
  | "iphone"
  | "ipad"
  // iPhone Duo's two displays. Each orientation is its own target with its own
  // deck, so turning the device never rewrites a composed placement.
  | "duo-outer"
  | "duo-outer-landscape"
  | "duo-inner"
  | "duo-inner-landscape"
  | "tvos"
  | "watchos"
  | "carplay"
  | "mac"
  | "android"
  | "android-7"
  | "android-10"
  | "feature-graphic"
  // App Store creative assets (product page header and search results).
  | "creative-universal"
  | "creative-header"
  | "creative-search";

export type Orientation = "portrait" | "landscape";

export type Platform = "ios" | "macos" | "android";

// Layouts the editor can render. Vary across slides for visual rhythm.
export type SlideLayout =
  | "hero"             // centered device, headline above
  | "device-bottom"    // headline top, device bottom-center
  | "device-top"       // device top, headline bottom (contrast)
  | "two-devices"      // back + front phones, headline above
  | "no-device"        // big headline + decorative blob, no device
  | "split-landscape"  // landscape tablets + Mac: caption left + device right
  | "feature-graphic"  // 1024×500 banner with icon + name + tagline
  | "frameless";       // solo captura con esquinas redondeadas (sin marco)

// Per-element rect in canvas pixel space. Optional rotation in degrees and zIndex.
export type ElementTransform = {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  zIndex?: number;
};

// "label" es la etiqueta superior: una pieza independiente del titular que se puede colocar donde se quiera.
export type BuiltInElementId = "caption" | "label" | "device" | "deviceSecondary" | "callout";
export type TextElementId = `text:${string}`;
export type ImageElementId = `image:${string}`;
export type MockupElementId = `mockup:${string}`;
export type ElementId = BuiltInElementId | TextElementId | ImageElementId | MockupElementId;

/** Terminales que se pueden añadir como mockups extra dentro de una misma pantalla. */
export type MockupKind =
  | "iphone"
  | "ipad"
  | "android"
  | "duo-outer"
  | "duo-inner"
  | "mac"
  | "watchos"
  | "tvos"
  | "frameless";

/** Mockup de dispositivo adicional (varios terminales en una pantalla), con su propia captura. */
export type DeviceElement = {
  id: string;
  kind: MockupKind;
  /** Ruta de la captura; puede contener {locale}. */
  screenshot: string;
  transform: ElementTransform;
};

export type SelectedElement = {
  slideId: string;
  elementId: ElementId;
};

// Per-locale text keyed by locale code (e.g. "en", "de"). A locale is absent
// if the user hasn't typed anything for it; renderers fall back to en (see
// lib/locale.ts). The set of locales a project targets lives on
// ProjectState.locales.
export type LocalizedText = Partial<Record<string, string>>;

export type SlidePattern = "none" | "dots" | "lines" | "grid" | "linen" | "halftone" | "crosses" | "mesh";
export type TextShadowStyle = "none" | "subtle" | "medium" | "dramatic" | "glow";
export type DeviceShadowStyle = "none" | "subtle" | "medium" | "apple" | "dramatic";
export type BackgroundStyle = "solid" | "gradient" | "blobs";
export type GradientShape = "diagonal" | "vertical" | "horizontal" | "radial";
export type GradientIntensity = "subtle" | "medium" | "intense";

export type TextElement = {
  id: string;
  text: LocalizedText;
  transform: ElementTransform;
  fontSize?: number;
  fontWeight?: number;
  color?: string;
  align?: "left" | "center" | "right";
  shadow?: TextShadowStyle;
};

export type SlideTypography = {
  /** Uppercase label above the headline (default 1). */
  labelScale?: number;
  /** Main headline, or feature-graphic tagline (default 1). */
  headlineScale?: number;
  /** Feature graphic app name only (default 1). */
  appNameScale?: number;
};

export type ImageElement = {
  id: string;
  src: string;
  transform: ElementTransform;
  fit?: "cover" | "contain";
  fade?: {
    edge: "top" | "bottom" | "left" | "right";
    amount: number;
  };
};

/** Magnified loupe of the primary screenshot, placed by transforms.callout. */
export type Callout = {
  /** Point of the screenshot to magnify, as 0–1 fractions of its width/height. */
  focusX: number;
  focusY: number;
  /** Magnification relative to the callout's own width (1.5–5). */
  zoom: number;
  shape: "circle" | "rounded";
};

export type Slide = {
  id: string;
  layout: SlideLayout;
  label: LocalizedText;       // tiny uppercase caption above headline, per locale
  headline: LocalizedText;    // multi-line; newlines are intentional, per locale
  screenshot: string;         // path under /screenshots/ — may contain {locale}
  screenshotSecondary?: string; // for two-devices layout — may contain {locale}
  inverted?: boolean;         // dark background variant
  /** Optional relative font-size scales for built-in caption text. */
  typography?: SlideTypography;
  backgroundColor?: string;   // per-slide hex color override
  headlineColor?: string;     // color personalizado para el titular
  labelColor?: string;        // color personalizado para la etiqueta
  backgroundStyle?: BackgroundStyle; // "solid" (liso/plano), "gradient", or "blobs"
  gradientShape?: GradientShape;     // "diagonal", "vertical", "horizontal", "radial"
  gradientIntensity?: GradientIntensity; // "subtle", "medium", "intense"
  gradientColor2?: string;           // optional second color for custom gradient
  backgroundPattern?: SlidePattern; // per-slide pattern texture
  patternOpacity?: number;    // 0-100 pattern opacity
  textShadow?: TextShadowStyle; // per-slide text shadow
  deviceShadow?: DeviceShadowStyle; // per-slide device shadow override
  frameless?: boolean;        // solo captura con bordes redondeados (sin marco de terminal)
  cornerRadius?: number;      // radio de esquinas redondeadas en px (para frameless)
  hideBaseDevice?: boolean;   // oculta/elimina el dispositivo principal o base de esta pantalla
  // Per-element overrides; when present, replaces layout default placement.
  transforms?: Partial<Record<BuiltInElementId, ElementTransform>>;
  textElements?: TextElement[];
  imageElements?: ImageElement[];
  /** Mockups de dispositivos extra: permiten componer p. ej. 3 iPhone, o iPhone + iPad en una pantalla. */
  deviceElements?: DeviceElement[];
  callout?: Callout;
};

export type ThemeId =
  | "clean-light"
  | "dark-bold"
  | "warm-editorial"
  | "ocean-fresh"
  | "bloom-roast"
  // One preset per named style in style-prompts/ (same id as the slug).
  | "hand-drawn-editorial-tasks"
  | "retro-rubberhose-mascot"
  | "moody-curated-dating"
  | "paper-sticker-skeuomorphic"
  | "dreamy-pastel-couples"
  | "glossy-3d-kbeauty-creator"
  | "liquid-glass-aurora"
  | "swiss-grid-bold"
  | "neon-athletic-night"
  | "magazine-cover-editorial"
  | "candy-pop-social"
  | "soft-clay-wellness"
  | "midnight-glow-pro"
  | "risograph-zine"
  | "bento-keynote-grid"
  | "toybox-primary"
  | "quiet-japandi"
  | "vintage-travel-poster";

export type ScreenshotFontId =
  | "template-default"
  | "template-serif"
  | "system-sans"
  | "avenir-next"
  | "helvetica-neue"
  | "american-typewriter"
  | "baskerville"
  | "optima"
  | "palatino"
  | "futura"
  | "poppins"
  | "montserrat"
  | "plus-jakarta-sans"
  | "outfit"
  | "playfair-display"
  | "space-grotesk"
  | "raleway"
  | "geist"
  | "self-hosted";

export type ImportedFont = {
  src: string;
  format: "woff2" | "woff" | "truetype" | "opentype";
  /** Display name, taken from the uploaded file name. */
  name?: string;
};

export type Theme = {
  id: string;
  name: string;
  group?: "neutro" | "color" | "bicolor";
  bg: string;          // primary background
  bgAlt: string;       // inverted background
  fg: string;          // text on bg
  fgAlt: string;       // text on bgAlt
  accent: string;      // label color on bg, decorative blobs
  accentAlt?: string;  // label color on bgAlt; defaults to accent
  muted: string;
};

// ---------- Scene (deck-wide composition, see lib/scene.ts) ----------

export type SceneBackdrop =
  | "gradient"
  | "solid"
  | "aurora"
  | "spotlight"
  | "grid"
  | "dots"
  | "lines"
  | "linen"
  | "crosses"
  | "halftone"
  | "neutral-warm"
  | "neutral-slate"
  | "neutral-cream";
export type SceneDecoration = "blobs" | "rings" | "sparkles" | "none";

export type Scene = {
  backdrop: SceneBackdrop;
  /** Lay the backdrop art out across the whole strip so it flows between screens. */
  span: boolean;
  decoration: SceneDecoration;
  /** Device drop shadow strength, 0–100. */
  shadow: number;
  /** Accent-coloured light behind each device, 0–100. */
  glow: number;
  /** 3D turn of every device in degrees, -30–30. */
  tilt: number;
  /** Headline weight, 300–900. */
  headlineWeight: number;
  /** Deck-wide multiplier on every headline's size (0.5–2), on top of per-screen sizes. */
  headlineScale: number;
  headlineCase: "as-typed" | "upper";
  /** "auto" keeps each layout's own alignment. */
  captionAlign: "auto" | "left" | "center";
  /** Deck-wide text shadow preset. */
  textShadow?: TextShadowStyle;
};

/** A complete look saved from Style Lab: palette, type, layout rhythm and scene. */
export type Look = {
  id: string;
  name: string;
  direction: string;
  themeId: string;
  fontId: ScreenshotFontId;
  scene: Scene;
  /** Layouts applied in order, repeating across the deck. */
  layouts: SlideLayout[];
  /** Screens (by position, repeating) that use the inverted background. */
  inverted: boolean[];
};

export type Palette = {
  /** Color Base: fondo principal del lienzo. */
  base: string;
  /** Color Secundario: segundo tono para transiciones de degradado o pantalla invertida. */
  secondary: string;
  /** Color Extra: acento para etiquetas superiores, relieves, destellos y botones. */
  extra: string;
};

export type ProjectState = {
  schemaVersion?: number;
  appName: string;
  themeId: string;
  /** Paleta armónica activa de 3 colores (Base, Secundario, Extra). */
  palette?: Palette;
  fontId?: ScreenshotFontId;
  importedFont?: ImportedFont;
  // v1 projects render as isolated screens until the user opts into connected crops.
  connectedCanvas: boolean;
  // Locales this project targets. Drives the toolbar dropdown and bulk export.
  // Single-locale projects ship as ["en"] and hide the locale UI.
  locales: string[];
  locale: string;
  device: Device;
  orientation: Orientation;
  // Per-device slide decks so platform switching preserves work
  slidesByDevice: Record<Device, Slide[]>;
  appIcon?: string;    // path under /public (e.g. /app-icon.png)
  /** Deck-wide composition. Absent = the classic gradient + blobs look. */
  scene?: Scene;
  /** Looks starred in Style Lab. */
  savedLooks?: Look[];
};
