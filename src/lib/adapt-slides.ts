import { CANVAS, DEVICE_LABEL } from "./constants";
import { nid } from "./defaults";
import type { Device, DeviceElement, ImageElement, Orientation, Slide, TextElement } from "./types";

const STARTER_HEADLINES_RAW = [
  // iPhone / iPad / Base
  "Sell one\nidea per slide.",
  "Your headline\nlives here.",
  "Show two\nscreens at once.",
  "Flip the contrast\nfor visual rhythm.",
  "And so\nmuch more.",
  "Made for\nthe big screen.",
  "Built for\nfocus.",
  "Always within reach.",
  "Big, bold\nheadline.",
  "Detail your\nkey feature.",
  "Show it in\ncontext.",
  "Wrap it up\nwith proof.",
  "Your app,\nat a glance.",
  "Feature spotlight\ngoes here.",
  // Apple TV
  "Made for\nthe living room.",
  "One idea\nper screen.",
  "Flip the contrast.",
  // Watch
  "On your\nwrist.",
  "One glance.\nDone.",
  "Always\nwith you.",
  // CarPlay
  "Eyes on\nthe road.",
  "Everything, one tap away.",
  "Made for every drive.",
  // Android
  "Pocket-sized\npower.",
  "Wide canvas,\nbigger ideas.",
  // Mac
  "Made for\nyour Mac.",
  "Everything in\none window.",
  "One shortcut away.",
  "Work across windows.",
  // iPhone Duo
  "Everything,\none hand.",
  "Open it for\nthe full view.",
  "Made for the wide view.",
  "Room for\nthe whole view.",
  "Turn it, open it,\nkeep going.",
  "Lead with the two-pane view.",
  "Same moment, closed and open.",
  "Show what only the wide screen can.",
  "And so much more.",
  // Feature Graphic & Creative
  "Your tagline goes here.",
  "Edita este\ntitular principal.",
];

const STARTER_LABELS_RAW = [
  "MEET YOUR APP",
  "FEATURE 01",
  "FEATURE 02",
  "FEATURE 03",
  "MORE",
  "TURN IT",
  "UNFOLD IT",
  "FOLDED + OPEN",
  "CARPLAY",
  "NEW",
  "NUEVA FUNCIÓN",
  "OPEN IT",
];

export function normalizeText(s?: string): string {
  return (s || "").toLowerCase().replace(/\s+/g, " ").trim();
}

const STARTER_HEADLINES_NORM = new Set(STARTER_HEADLINES_RAW.map(normalizeText));
const STARTER_LABELS_NORM = new Set(STARTER_LABELS_RAW.map(normalizeText));

export function getCanvasDims(device: Device, orientation: Orientation): { cW: number; cH: number } {
  const c = CANVAS[device];
  if (!c) return { cW: 1320, cH: 2868 };
  if ((device === "android-7" || device === "android-10") && orientation === "landscape") {
    return { cW: c.wL || c.w, cH: c.hL || c.h };
  }
  return { cW: c.w, cH: c.h };
}

/**
 * Evalúa si una diapositiva individual es una plantilla starter sin personalizar.
 */
export function isStarterSlide(s: Slide): boolean {
  if (s.screenshot && s.screenshot.trim() !== "") return false;
  if (s.screenshotSecondary && s.screenshotSecondary.trim() !== "") return false;
  if (s.backgroundColor || s.headlineColor || s.labelColor) return false;
  if (s.backgroundPattern && s.backgroundPattern !== "none") return false;
  if (s.backgroundStyle && s.backgroundStyle !== "solid") return false;
  if (s.textElements && s.textElements.length > 0) return false;
  if (s.deviceElements && s.deviceElements.length > 0) return false;
  if (s.imageElements && s.imageElements.length > 0) return false;
  if (s.frameless || s.hideBaseDevice) return false;

  // Comprobar si los titulares son todos textos por defecto
  for (const h of Object.values(s.headline || {})) {
    const norm = normalizeText(h);
    if (norm && !STARTER_HEADLINES_NORM.has(norm)) {
      return false;
    }
  }

  // Comprobar si las etiquetas son todas textos por defecto
  for (const l of Object.values(s.label || {})) {
    const norm = normalizeText(l);
    if (norm && !STARTER_LABELS_NORM.has(norm)) {
      return false;
    }
  }

  return true;
}

/**
 * Detecta si un mazo de diapositivas es una plantilla inicial por defecto (no editada por el usuario).
 */
export function isStarterDeck(slides: Slide[] | undefined): boolean {
  if (!slides || slides.length === 0) return true;
  return slides.every(isStarterSlide);
}

/**
 * Puntuación que mide cuánto trabajo real personalizado tiene un mazo.
 */
export function scoreCustomWork(slides: Slide[] | undefined): number {
  if (!slides) return 0;
  let score = 0;
  for (const s of slides) {
    if (s.screenshot && s.screenshot.trim()) score += 15;
    if (s.screenshotSecondary && s.screenshotSecondary.trim()) score += 15;
    if (s.backgroundColor) score += 8;
    if (s.headlineColor || s.labelColor) score += 4;
    if (s.backgroundPattern && s.backgroundPattern !== "none") score += 5;
    if (s.backgroundStyle && s.backgroundStyle !== "solid") score += 5;
    if (s.frameless || s.hideBaseDevice) score += 6;
    if (s.textElements?.length) score += s.textElements.length * 6;
    if (s.deviceElements?.length) score += s.deviceElements.length * 8;
    if (s.imageElements?.length) score += s.imageElements.length * 6;

    for (const h of Object.values(s.headline || {})) {
      const norm = normalizeText(h);
      if (norm && !STARTER_HEADLINES_NORM.has(norm)) score += 6;
    }
    for (const l of Object.values(s.label || {})) {
      const norm = normalizeText(l);
      if (norm && !STARTER_LABELS_NORM.has(norm)) score += 4;
    }
  }
  return score;
}

/**
 * Encuentra el dispositivo principal personalizado de un proyecto que puede servir como origen.
 */
export function findPrimaryCustomizedDevice(
  slidesByDevice: Record<Device, Slide[]>,
  currentDevice?: Device,
): Device | null {
  // Si el actual tiene trabajo personalizado, es el origen ideal
  if (currentDevice && !isStarterDeck(slidesByDevice[currentDevice])) {
    return currentDevice;
  }

  let bestDevice: Device | null = null;
  let bestScore = 0;

  for (const [d, slides] of Object.entries(slidesByDevice) as [Device, Slide[]][]) {
    if (d === currentDevice) continue;
    const score = scoreCustomWork(slides);
    if (score > bestScore) {
      bestScore = score;
      bestDevice = d;
    }
  }

  return bestScore > 0 ? bestDevice : null;
}

export type AdaptOptions = {
  preserveScreenshots?: boolean;
  preserveColors?: boolean;
  preserveCopy?: boolean;
  preserveFloatingElements?: boolean;
};

/**
 * Adapta las pantallas diseñadas en un dispositivo origen al tamaño, marco y proporciones de un dispositivo destino.
 * Conserva el 100% de los titulares, etiquetas, traducciones, colores, texturas, degradados y capturas.
 */
export function adaptSlidesForDevice(
  sourceSlides: Slide[],
  sourceDevice: Device,
  sourceOrientation: Orientation,
  targetDevice: Device,
  targetOrientation: Orientation,
  options: AdaptOptions = {},
): Slide[] {
  if (!sourceSlides || sourceSlides.length === 0) return [];

  const { cW: srcW, cH: srcH } = getCanvasDims(sourceDevice, sourceOrientation);
  const { cW: dstW, cH: dstH } = getCanvasDims(targetDevice, targetOrientation);

  const scaleX = dstW / srcW;
  const scaleY = dstH / srcH;
  const scale = Math.min(scaleX, scaleY);

  const preserveScreenshots = options.preserveScreenshots !== false;
  const preserveColors = options.preserveColors !== false;
  const preserveCopy = options.preserveCopy !== false;
  const preserveFloatingElements = options.preserveFloatingElements !== false;

  return sourceSlides.map((src) => {
    // Escalar elementos de texto flotantes si existen
    const textElements: TextElement[] = preserveFloatingElements && src.textElements
      ? src.textElements.map((el) => ({
          ...el,
          id: nid(),
          text: { ...el.text },
          fontSize: el.fontSize ? Math.round(el.fontSize * scale) : undefined,
          transform: {
            ...el.transform,
            x: Math.round(el.transform.x * scaleX),
            y: Math.round(el.transform.y * scaleY),
            width: Math.round(el.transform.width * scaleX),
            height: Math.round(el.transform.height * scaleY),
          },
        }))
      : [];

    // Escalar elementos de imagen / stickers si existen
    const imageElements: ImageElement[] = preserveFloatingElements && src.imageElements
      ? src.imageElements.map((el) => ({
          ...el,
          id: nid(),
          transform: {
            ...el.transform,
            x: Math.round(el.transform.x * scaleX),
            y: Math.round(el.transform.y * scaleY),
            width: Math.round(el.transform.width * scaleX),
            height: Math.round(el.transform.height * scaleY),
          },
        }))
      : [];

    // Escalar mockups adicionales si existen
    const deviceElements: DeviceElement[] = preserveFloatingElements && src.deviceElements
      ? src.deviceElements.map((el) => ({
          ...el,
          id: nid(),
          transform: {
            ...el.transform,
            x: Math.round(el.transform.x * scaleX),
            y: Math.round(el.transform.y * scaleY),
            width: Math.round(el.transform.width * scaleX),
            height: Math.round(el.transform.height * scaleY),
          },
        }))
      : [];

    return {
      id: nid(),
      layout: src.layout === "feature-graphic" && targetDevice !== "feature-graphic" ? "hero" : src.layout,
      // Copys y textos localizados en todos los idiomas
      label: preserveCopy ? { ...src.label } : {},
      headline: preserveCopy ? { ...src.headline } : {},
      // Capturas de pantalla
      screenshot: preserveScreenshots ? src.screenshot : "",
      screenshotSecondary: preserveScreenshots ? (src.screenshotSecondary || "") : "",
      // Variante invertida
      inverted: src.inverted,
      typography: src.typography ? { ...src.typography } : undefined,
      // Colores y diseño de fondo
      backgroundColor: preserveColors ? src.backgroundColor : undefined,
      headlineColor: preserveColors ? src.headlineColor : undefined,
      labelColor: preserveColors ? src.labelColor : undefined,
      backgroundStyle: preserveColors ? src.backgroundStyle : undefined,
      gradientShape: preserveColors ? src.gradientShape : undefined,
      gradientIntensity: preserveColors ? src.gradientIntensity : undefined,
      gradientColor2: preserveColors ? src.gradientColor2 : undefined,
      backgroundPattern: preserveColors ? src.backgroundPattern : undefined,
      patternOpacity: preserveColors ? src.patternOpacity : undefined,
      textShadow: preserveColors ? src.textShadow : undefined,
      deviceShadow: preserveColors ? src.deviceShadow : undefined,
      // Propiedades de terminal
      frameless: src.frameless,
      cornerRadius: src.cornerRadius,
      hideBaseDevice: src.hideBaseDevice,
      // Al cambiar de dispositivo, el terminal y el titular base se reposicionan
      // según el marco nativo y proporción óptima del dispositivo destino
      transforms: undefined,
      textElements: textElements.length > 0 ? textElements : undefined,
      imageElements: imageElements.length > 0 ? imageElements : undefined,
      deviceElements: deviceElements.length > 0 ? deviceElements : undefined,
      callout: src.callout ? { ...src.callout } : undefined,
    };
  });
}

/**
 * Obtiene los dispositivos del proyecto que tienen contenido personalizado y pueden usarse como origen.
 */
export function getCustomizedDevices(
  slidesByDevice: Record<Device, Slide[]>,
  currentDevice: Device,
): { device: Device; label: string; count: number; isStarter: boolean; score: number }[] {
  const devices = Object.keys(slidesByDevice) as Device[];
  const list: { device: Device; label: string; count: number; isStarter: boolean; score: number }[] = [];

  for (const d of devices) {
    if (d === currentDevice) continue;
    const slides = slidesByDevice[d] || [];
    if (slides.length === 0) continue;
    const starter = isStarterDeck(slides);
    const score = scoreCustomWork(slides);
    list.push({
      device: d,
      label: DEVICE_LABEL[d] || d,
      count: slides.length,
      isStarter: starter,
      score,
    });
  }

  // Ordenar por puntuación de trabajo personalizado (el que tenga más trabajo primero)
  return list.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (!a.isStarter && b.isStarter) return -1;
    if (a.isStarter && !b.isStarter) return 1;
    return b.count - a.count;
  });
}
