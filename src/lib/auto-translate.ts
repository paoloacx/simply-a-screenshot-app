import { pickText, writeLocalized } from "./locale";
import type { LocalizedText, ProjectState, Slide, TextElement } from "./types";
import { BASE_LANGUAGE, getLanguageInfo, getTranslationPackForSource } from "./translation-languages";

export type TranslateResult = {
  ok: boolean;
  translatedCount: number;
  languages: string[];
  error?: string;
};

/**
 * Obtiene el texto en el idioma base (o el texto actual no vacío) para un campo localizado.
 */
export function getBaseText(
  localizedField: LocalizedText | undefined,
  currentLocale: string,
  sourceLang: string = BASE_LANGUAGE.code,
): string {
  if (!localizedField) return "";
  // 1. Si existe texto explícito en el idioma base seleccionado
  const baseText = localizedField[sourceLang];
  if (baseText && baseText.trim()) return baseText.trim();

  // 2. Si el usuario está viendo un idioma activo que tiene texto
  const currentText = localizedField[currentLocale];
  if (currentText && currentText.trim()) return currentText.trim();

  // 3. Cualquier idioma que tenga texto no vacío
  const fallback = pickText(localizedField, currentLocale);
  return fallback.trim();
}

export const getBaseSpanishText = getBaseText;

/**
 * Extrae todos los textos únicos traducibles de un conjunto de pantallas.
 */
export function extractTranslatableTexts(
  slides: Slide[],
  currentLocale: string,
  sourceLang: string = BASE_LANGUAGE.code,
): { uniqueTexts: string[]; slideCount: number; totalOccurrences: number } {
  const texts = new Set<string>();
  let totalOccurrences = 0;

  for (const slide of slides) {
    const headline = getBaseText(slide.headline, currentLocale, sourceLang);
    if (headline) {
      texts.add(headline);
      totalOccurrences++;
    }

    const label = getBaseText(slide.label, currentLocale, sourceLang);
    if (label) {
      texts.add(label);
      totalOccurrences++;
    }

    for (const textEl of slide.textElements || []) {
      const text = getBaseText(textEl.text, currentLocale, sourceLang);
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
  sourceLang: string = BASE_LANGUAGE.code,
): Slide[] {
  return slides.map((slide) => {
    let headline = { ...(slide.headline || {}) };
    let label = { ...(slide.label || {}) };

    const baseHeadline = getBaseText(slide.headline, currentLocale, sourceLang);
    if (baseHeadline) {
      // Aseguramos que el idioma base contenga el texto fuente
      headline = writeLocalized(headline, sourceLang, baseHeadline);
      for (const lang of targetLangs) {
        const translated = translations[lang]?.[baseHeadline];
        if (translated) {
          headline = writeLocalized(headline, lang, translated);
        }
      }
    }

    const baseLabel = getBaseText(slide.label, currentLocale, sourceLang);
    if (baseLabel) {
      label = writeLocalized(label, sourceLang, baseLabel);
      for (const lang of targetLangs) {
        const translated = translations[lang]?.[baseLabel];
        if (translated) {
          label = writeLocalized(label, lang, translated);
        }
      }
    }

    const textElements: TextElement[] = (slide.textElements || []).map((el) => {
      let text = { ...(el.text || {}) };
      const baseElText = getBaseText(el.text, currentLocale, sourceLang);
      if (baseElText) {
        text = writeLocalized(text, sourceLang, baseElText);
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
    sourceLang?: string;
    targetLangs?: string[];
    deviceOnly?: boolean;
    onProgress?: (status: string) => void;
  } = {},
): Promise<{ nextState: ProjectState; result: TranslateResult }> {
  const sourceLang = options.sourceLang || project.locale || BASE_LANGUAGE.code;
  const targetLangs = (options.targetLangs || getTranslationPackForSource(sourceLang).map((l) => l.code)).filter(
    (code) => code !== sourceLang,
  );
  const deviceOnly = !!options.deviceOnly;
  const sourceInfo = getLanguageInfo(sourceLang);

  options.onProgress?.(`Extrayendo textos en ${sourceInfo.name}...`);

  // Recolectar pantallas a traducir
  const targetDevices = deviceOnly ? [project.device] : (Object.keys(project.slidesByDevice) as Array<keyof typeof project.slidesByDevice>);
  const allSlidesToProcess: Slide[] = [];
  for (const d of targetDevices) {
    allSlidesToProcess.push(...(project.slidesByDevice[d] || []));
  }

  const { uniqueTexts, totalOccurrences } = extractTranslatableTexts(allSlidesToProcess, project.locale, sourceLang);

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
      sourceLang,
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
    nextSlidesByDevice[d] = applyTranslationsToSlides(originalSlides, translations, targetLangs, project.locale, sourceLang);
  }

  // Asegurar que la lista de idiomas del proyecto incluya el idioma base primero y todos los destinos
  const updatedLocalesSet = new Set<string>([sourceLang, ...project.locales, ...targetLangs]);
  const nextLocales = Array.from(updatedLocalesSet);

  const nextState: ProjectState = {
    ...project,
    locales: nextLocales,
    locale: sourceLang,
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
