import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { appRoot, dataDir, ensureDataDir } from "./app-paths";

/**
 * Next's production public-file index excludes uploads created after startup,
 * and user uploads live outside the app bundle, so they are served from here.
 */
export async function serveAsset(directory: string, filename: string, types: Record<string, string>) {
  const match = /^[a-f0-9]{16}\.([a-z0-9]+)$/.exec(filename);
  if (!match || !Object.hasOwn(types, match[1])) return new NextResponse(null, { status: 404 });
  try {
    // The first request after launch may arrive before the store has migrated
    // older data folders; waiting keeps previously uploaded assets reachable.
    await ensureDataDir();

    const candidates = [
      // User uploads (the only writable location in a packaged app).
      path.join(dataDir(), "public", directory, filename),
      // Assets shipped with the app, and a checkout running in dev.
      path.join(appRoot(), "public", directory, filename),
      path.join(__dirname, "..", "..", "..", "public", directory, filename),
    ];

    let filePath = "";
    for (const candidate of candidates) {
      try {
        await fs.access(candidate);
        filePath = candidate;
        break;
      } catch {
        // try next candidate
      }
    }

    if (!filePath) {
      return new NextResponse(null, { status: 404 });
    }

    const bytes = await fs.readFile(/*turbopackIgnore: true*/ filePath);
    return new NextResponse(new Uint8Array(bytes), { headers: {
      "Content-Type": types[match[1]],
      "Content-Length": String(bytes.length),
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    } });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return new NextResponse(null, { status: 404 });
    return NextResponse.json({ ok: false, error: "Asset could not be read" }, { status: 500 });
  }
}
