import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { rejectCrossSiteWrite, sniffImageType } from "@/lib/request-guard";
import sharp from "sharp";
import { ensureDataDir, uploadedScreenshotsDir } from "@/lib/app-paths";
import { decodeBase64, readJsonBody } from "@/lib/request-body";
import { writeAsset } from "@/lib/write-asset";

export const dynamic = "force-dynamic";

const PUBLIC_PREFIX = "/screenshots/uploaded";
// A 20 MB PNG usually becomes a few hundred KB once re-encoded, so the limit
// exists to reject absurd files, not to reject real 5K/6K captures.
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
// The largest canvas the editor renders is 5244x2950 (App Store creative), so
// anything above this edge is detail the editor can never show. Smaller images
// are never upscaled.
const MAX_EDGE = 6144;
// 92 is visually lossless for UI captures (PSNR > 42 dB on real screenshots) and
// reduces a 5 MB PNG to roughly 100 KB. Lossless WebP only saved 15-45%.
const WEBP_QUALITY = 92;

const MIME_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
};

function parseDataUrl(dataUrl: string): { mime: string; bytes: Buffer } | null {
  const m = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!m) return null;
  const mime = m[1].toLowerCase();
  const bytes = decodeBase64(m[2]);
  return bytes ? { mime, bytes } : null;
}

export async function POST(req: Request) {
  // This route WRITES A FILE to disk. See lib/request-guard.ts.
  const blocked = rejectCrossSiteWrite(req);
  if (blocked) {
    return NextResponse.json({ ok: false, error: blocked.error }, { status: blocked.status });
  }
  const input = await readJsonBody(req, 32 * 1024 * 1024);
  if (input.response) return input.response;
  const body = input.value as { dataUrl?: string } | null;
  if (!body?.dataUrl || typeof body.dataUrl !== "string") {
    return NextResponse.json({ ok: false, error: "Missing dataUrl" }, { status: 400 });
  }
  const parsed = parseDataUrl(body.dataUrl);
  if (!parsed) {
    return NextResponse.json({ ok: false, error: "Unsupported data URL" }, { status: 400 });
  }
  const ext = MIME_EXT[parsed.mime];
  if (!ext) {
    return NextResponse.json(
      { ok: false, error: `Unsupported mime: ${parsed.mime}` },
      { status: 400 },
    );
  }
  // The declared MIME comes from the caller-written data URL, so it decides
  // the accepted input. Require the bytes to actually be that image type.
  const sniffed = sniffImageType(parsed.bytes);
  if (!sniffed || MIME_EXT[sniffed] !== ext) {
    return NextResponse.json(
      { ok: false, error: "Content does not match declared image type" },
      { status: 400 },
    );
  }
  if (parsed.bytes.byteLength > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { ok: false, error: `Image too large (>${MAX_UPLOAD_BYTES / 1024 / 1024}MB)` },
      { status: 413 },
    );
  }

  // Re-encode instead of storing the original: user drops are often 5-8 MB
  // PNGs, and the editor only ever draws them inside a device frame. This also
  // decodes every pixel, so truncated/corrupt files are rejected here.
  let optimized: Buffer;
  let width: number;
  let height: number;
  try {
    const result = await sharp(parsed.bytes, {
      limitInputPixels: 64 * 1024 * 1024,
      failOn: "warning",
    })
      .rotate()
      .resize({
        width: MAX_EDGE,
        height: MAX_EDGE,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: WEBP_QUALITY, effort: 6, smartSubsample: true })
      .toBuffer({ resolveWithObject: true });
    optimized = result.data;
    width = result.info.width;
    height = result.info.height;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Image is corrupt or exceeds 64 megapixels" },
      { status: 400 },
    );
  }

  // Content-addressed by the original bytes, so re-uploading the same capture
  // reuses the same file and project paths stay stable.
  const hash = createHash("sha1").update(parsed.bytes).digest("hex").slice(0, 16);
  const filename = `${hash}.webp`;
  const absDir = uploadedScreenshotsDir();
  const absFile = path.join(/*turbopackIgnore: true*/ absDir, filename);

  try {
    await ensureDataDir();
    await fs.mkdir(absDir, { recursive: true });
    await writeAsset(absFile, optimized);
    return NextResponse.json({
      ok: true,
      path: `${PUBLIC_PREFIX}/${filename}`,
      width,
      height,
      bytes: optimized.length,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
