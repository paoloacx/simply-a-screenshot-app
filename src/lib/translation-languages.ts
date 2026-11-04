export type TranslationLanguage = {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  gCode: string; // Código para Google Translate
};

export const BASE_LANGUAGE: TranslationLanguage = {
  code: "es",
  name: "Español",
  nativeName: "Español",
  flag: "🇪🇸",
  gCode: "es",
};

/** Paquete de 5 idiomas solicitados para la App Store */
export const DEFAULT_TRANSLATION_PACK: TranslationLanguage[] = [
  { code: "en", name: "Inglés", nativeName: "English", flag: "🇬🇧", gCode: "en" },
  { code: "fr", name: "Francés", nativeName: "Français", flag: "🇫🇷", gCode: "fr" },
  { code: "de", name: "Alemán", nativeName: "Deutsch", flag: "🇩🇪", gCode: "de" },
  { code: "zh-Hans", name: "Chino Simplificado", nativeName: "简体中文", flag: "🇨🇳", gCode: "zh-CN" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", flag: "🇮🇳", gCode: "hi" },
];

/** Todos los idiomas soportados (base + paquete inicial + extras populares de App Store) */
export const ALL_SUPPORTED_LANGUAGES: TranslationLanguage[] = [
  BASE_LANGUAGE,
  ...DEFAULT_TRANSLATION_PACK,
  { code: "it", name: "Italiano", nativeName: "Italiano", flag: "🇮🇹", gCode: "it" },
  { code: "pt", name: "Portugués", nativeName: "Português", flag: "🇵🇹", gCode: "pt" },
  { code: "ja", name: "Japonés", nativeName: "日本語", flag: "🇯🇵", gCode: "ja" },
  { code: "ko", name: "Coreano", nativeName: "한국어", flag: "🇰🇷", gCode: "ko" },
  { code: "ar", name: "Árabe", nativeName: "العربية", flag: "🇸🇦", gCode: "ar" },
  { code: "ru", name: "Ruso", nativeName: "Русский", flag: "🇷🇺", gCode: "ru" },
];

export function getLanguageInfo(code: string): TranslationLanguage {
  const normalized = code.toLowerCase();
  const found = ALL_SUPPORTED_LANGUAGES.find(
    (l) => l.code.toLowerCase() === normalized || l.gCode.toLowerCase() === normalized,
  );
  if (found) return found;

  return {
    code,
    name: code.toUpperCase(),
    nativeName: code.toUpperCase(),
    flag: "🌐",
    gCode: code,
  };
}
