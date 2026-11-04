import { setImage } from "./image-cache";
import { t as tr } from "./i18n";

const ACCEPTED = ["image/png", "image/jpeg"];

export class ScreenshotUploadError extends Error {}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Valida y guarda una captura soltada sobre el lienzo. Devuelve la ruta bajo /public
 * (o la imagen en línea si el servidor no puede guardarla) lista para usar como `screenshot`.
 */
export async function ingestScreenshotFile(file: File): Promise<string> {
  if (!ACCEPTED.includes(file.type)) throw new ScreenshotUploadError(tr("Usa PNG o JPG (la App Store rechaza otros formatos)"));
  if (file.size > 20 * 1024 * 1024) throw new ScreenshotUploadError(tr("Imagen demasiado grande (>20 MB)"));
  const dataUrl = await fileToDataUrl(file);
  const image = new Image();
  image.src = dataUrl;
  try {
    await image.decode();
  } catch {
    throw new ScreenshotUploadError(tr("La imagen está dañada"));
  }
  if (image.naturalWidth * image.naturalHeight > 64 * 1024 * 1024) throw new ScreenshotUploadError(tr("La imagen supera los 64 megapíxeles"));
  const size = { w: image.naturalWidth, h: image.naturalHeight };
  try {
    const resp = await fetch("/api/upload", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ dataUrl }),
      // The server re-encodes the capture as WebP; large drops can take a few seconds.
      signal: AbortSignal.timeout(30000),
    });
    if (resp.ok) {
      const json = (await resp.json()) as {
        ok: boolean;
        path?: string;
        width?: number;
        height?: number;
      };
      if (json.ok && json.path) {
        const storedSize =
          json.width && json.height ? { w: json.width, h: json.height } : size;
        setImage(json.path, dataUrl, storedSize);
        return json.path;
      }
    } else if (resp.status >= 400 && resp.status < 500 && resp.status !== 404) {
      const error = await resp.json().catch(() => ({}));
      throw new ScreenshotUploadError(error.error || tr("El servidor rechazó la imagen"));
    }
  } catch (e) {
    if (e instanceof ScreenshotUploadError) throw e;
  }
  setImage(dataUrl, dataUrl, size);
  return dataUrl;
}

export function firstImageFile(files: FileList | null | undefined): File | null {
  if (!files) return null;
  for (const file of Array.from(files)) if (file.type.startsWith("image/")) return file;
  return null;
}
