import { NextResponse } from "next/server";
import { getLanguageInfo } from "@/lib/translation-languages";

export const dynamic = "force-dynamic";

async function translateSingle(text: string, targetGCode: string, sourceGCode = "es"): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return text;

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(
      sourceGCode,
    )}&tl=${encodeURIComponent(targetGCode)}&dt=t&q=${encodeURIComponent(trimmed)}`;

    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      console.warn(`[Translate API] Error status ${res.status} for "${trimmed.slice(0, 30)}" -> ${targetGCode}`);
      return text;
    }

    const data = await res.json();
    if (!Array.isArray(data) || !Array.isArray(data[0])) {
      return text;
    }

    // Unir los fragmentos traducidos preservando saltos de línea
    const translated = data[0].map((chunk: unknown) => (Array.isArray(chunk) && typeof chunk[0] === "string" ? chunk[0] : "")).join("");
    return translated || text;
  } catch (err) {
    console.error(`[Translate API] Failed to translate:`, err);
    return text;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { texts, targetLangs, sourceLang = "es" } = body as {
      texts?: string[];
      targetLangs?: string[];
      sourceLang?: string;
    };

    if (!Array.isArray(texts) || texts.length === 0) {
      return NextResponse.json({ ok: false, error: "No se proporcionaron textos para traducir" }, { status: 400 });
    }

    if (!Array.isArray(targetLangs) || targetLangs.length === 0) {
      return NextResponse.json({ ok: false, error: "No se especificaron idiomas de destino" }, { status: 400 });
    }

    const uniqueTexts = Array.from(new Set(texts.map((t) => (typeof t === "string" ? t.trim() : "")).filter(Boolean)));
    const sourceInfo = getLanguageInfo(sourceLang);

    // translations: { [langCode]: { [originalText]: translatedText } }
    const translations: Record<string, Record<string, string>> = {};

    for (const targetCode of targetLangs) {
      const targetInfo = getLanguageInfo(targetCode);
      translations[targetCode] = {};

      // Si el idioma de destino es el mismo que el de origen, devolvemos el texto original
      if (targetInfo.code === sourceInfo.code) {
        for (const t of uniqueTexts) {
          translations[targetCode][t] = t;
        }
        continue;
      }

      // Traducir todos los textos únicos para este idioma
      const promises = uniqueTexts.map(async (text) => {
        const translated = await translateSingle(text, targetInfo.gCode, sourceInfo.gCode);
        return { text, translated };
      });

      const results = await Promise.all(promises);
      for (const res of results) {
        translations[targetCode][res.text] = res.translated;
      }
    }

    return NextResponse.json({
      ok: true,
      translations,
      totalTranslated: uniqueTexts.length * targetLangs.length,
    });
  } catch (error) {
    console.error("[Translate API Route] Error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Error al procesar la traducción" },
      { status: 500 },
    );
  }
}
