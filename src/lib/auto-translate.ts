import { pickText, writeLocalized } from "./locale";
import type { LocalizedText, ProjectState, Slide, TextElement } from "./types";
import { BASE_LANGUAGE, DEFAULT_TRANSLATION_PACK, getLanguageInfo } from "./translation-languages";

export type TranslateResult = {
  ok: boolean;
  translatedCount: number;
  languages: string[];
  error?: string;
};

/**
 * Obtiene el texto en español base (o el texto actual no vacío) para un campo localizado.
 */
export function getBaseSpanishText(
  localizedField: LocalizedText | undefined,
  currentLocale: string,
): string {
  if (!localizedField) return "";
  // 1. Si existe texto explícito en español
  const esText = localizedField[BASE_LANGUAGE.code];
  if (esText && esText.trim()) return esText.trim();

  // 2. Si el usuario está viendo un idioma activo que tiene texto
  const currentText = localizedField[currentLocale];
  if (currentText && currentText.trim()) return currentText.trim();

  // 3. Cualquier idioma que tenga texto no vacío (p. ej. "en" original del starter)
  const fallback = pickText(localizedField, currentLocale);
  return fallback.trim();
}

/**
 * Extrae todos los textos únicos traducibles de un conjunto de pantallas.
 */
export function extractTranslatableTexts(
  slides: Slide[],
  currentLocale: string,
): { uniqueTexts: string[]; slideCount: number; totalOccurrences: number } {
  const texts = new Set<string>();
  let totalOccurrences = 0;

  for (const slide of slides) {
    const headline = getBaseSpanishText(slide.headline, currentLocale);
    if (headline) {
      texts.add(headline);
      totalOccurrences++;
    }

    const label = getBaseSpanishText(slide.label, currentLocale);
    if (label) {
      texts.add(label);
      totalOccurrences++;
    }

    for (const textEl of slide.textElements || []) {
      const text = getBaseSpanishText(textEl.text, currentLocale);
      if (text) {
        texts.add(text);
        totalOccurrences++;
      }
    }
  }

  return {
    uniqueTexts: Array.from(texts),
    slideCount: slides.length,
    totalOccurrences,
  };
}

/**
 * Aplica las traducciones devueltas por la API a las pantallas.
 */
export function applyTranslationsToSlides(
  slides: Slide[],
  translations: Record<string, Record<string, string>>,
  targetLangs: string[],
  currentLocale: string,
): Slide[] {
  return slides.map((slide) => {
    let headline = { ...(slide.headline || {}) };
    let label = { ...(slide.label || {}) };

    const baseHeadline = getBaseSpanishText(slide.headline, currentLocale);
    if (baseHeadline) {
      // Aseguramos que la base española contenga el texto base
      headline = writeLocalized(headline, BASE_LANGUAGE.code, baseHeadline);
      for (const lang of targetLangs) {
        const translated = translations[lang]?.[baseHeadline];
        if (translated) {
          headline = writeLocalized(headline, lang, translated);
        }
      }
    }

    const baseLabel = getBaseSpanishText(slide.label, currentLocale);
    if (baseLabel) {
      label = writeLocalized(label, BASE_LANGUAGE.code, baseLabel);
      for (const lang of targetLangs) {
        const translated = translations[lang]?.[baseLabel];
        if (translated) {
          label = writeLocalized(label, lang, translated);
        }
      }
    }

    const textElements: TextElement[] = (slide.textElements || []).map((el) => {
      let text = { ...(el.text || {}) };
      const baseElText = getBaseSpanishText(el.text, currentLocale);
      if (baseElText) {
        text = writeLocalized(text, BASE_LANGUAGE.code, baseElText);
        for (const lang of targetLangs) {
          const translated = translations[lang]?.[baseElText];
          if (translated) {
            text = writeLocalized(text, lang, translated);
          }
        }
      }
      return { ...el, text };
    });

    return {
      ...slide,
      headline,
      label,
      textElements: textElements.length > 0 ? textElements : slide.textElements,
    };
  });
}

/**
 * Ejecuta la traducción automática de un proyecto completo o de un dispositivo.
 */
export async function executeAutoTranslation(
  project: ProjectState,
  options: {
    targetLangs?: string[];
    deviceOnly?: boolean;
    onProgress?: (status: string) => void;
  } = {},
): Promise<{ nextState: ProjectState; result: TranslateResult }> {
  const targetLangs = options.targetLangs || DEFAULT_TRANSLATION_PACK.map((l) => l.code);
  const deviceOnly = !!options.deviceOnly;

  options.onProgress?.("Extrayendo textos en español...");

  // Recolectar pantallas a traducir
  const targetDevices = deviceOnly ? [project.device] : (Object.keys(project.slidesByDevice) as Array<keyof typeof project.slidesByDevice>);
  const allSlidesToProcess: Slide[] = [];
  for (const d of targetDevices) {
    allSlidesToProcess.push(...(project.slidesByDevice[d] || []));
  }

  const { uniqueTexts, totalOccurrences } = extractTranslatableTexts(allSlidesToProcess, project.locale);

  if (uniqueTexts.length === 0) {
    return {
      nextState: project,
      result: {
        ok: false,
        translatedCount: 0,
        languages: targetLangs,
        error: "No se encontraron textos para traducir en las pantallas.",
      },
    };
  }

  options.onProgress?.(`Traduciendo ${uniqueTexts.length} textos a ${targetLangs.length} idiomas...`);

  const response = await fetch("/api/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      texts: uniqueTexts,
      targetLangs,
      sourceLang: BASE_LANGUAGE.code,
    }),
  });

  const json = await response.json();
  if (!response.ok || !json.ok) {
    throw new Error(json.error || "Error en el servicio de traducción");
  }

  const translations = json.translations as Record<string, Record<string, string>>;

  // Aplicar traducciones a las pantallas correspondientes
  const nextSlidesByDevice = { ...project.slidesByDevice };
  for (const d of targetDevices) {
    const originalSlides = project.slidesByDevice[d] || [];
    nextSlidesByDevice[d] = applyTranslationsToSlides(originalSlides, translations, targetLangs, project.locale);
  }

  // Asegurar que la lista de idiomas del proyecto incluya español primero y todos los destinos
  const updatedLocalesSet = new Set<string>([BASE_LANGUAGE.code, ...project.locales, ...targetLangs]);
  const nextLocales = Array.from(updatedLocalesSet);

  const nextState: ProjectState = {
    ...project,
    locales: nextLocales,
    locale: project.locale === "en" && nextLocales.includes("es") ? "es" : project.locale,
    slidesByDevice: nextSlidesByDevice,
  };

  return {
    nextState,
    result: {
      ok: true,
      translatedCount: totalOccurrences * targetLangs.length,
      languages: targetLangs,
    },
  };
}
