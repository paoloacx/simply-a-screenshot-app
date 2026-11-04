import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * Single source of truth for where the editor reads and writes user data.
 *
 * `next dev` and the packaged Electron app must resolve to the same folder,
 * otherwise a deck edited in the browser is invisible to the .dmg (that was the
 * case before: dev wrote into the checkout, the app into userData). Electron
 * sets APP_DATA_DIR and APP_ROOT explicitly; the dev server falls back to the
 * same per-user location, so both agree without extra configuration.
 */

const APP_DIR_NAME = "Simply a screenshot app";
const DATA_DIR_NAME = "data";
const MIGRATION_MARKER = ".data-migrated.json";
const LEGACY_PROJECT_FILE = "app-store-screenshots.json";
const PROJECT_FILE = /^[a-z0-9][a-z0-9-]{0,80}\.json$/;
const SCREENSHOT_FILE = /^[a-f0-9]{16}\.(?:png|jpg|webp)$/;
const FONT_FILE = /^[a-f0-9]{16}\.(?:woff2?|ttf|otf)$/;

/** Where a fresh install keeps its data when nothing overrides it. */
export function defaultDataDir(): string {
  if (process.platform === "darwin") {
    return path.join(os.homedir(), "Library", "Application Support", APP_DIR_NAME, DATA_DIR_NAME);
  }
  if (process.platform === "win32") {
    const appData = process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
    return path.join(appData, APP_DIR_NAME, DATA_DIR_NAME);
  }
  const xdg = process.env.XDG_DATA_HOME || path.join(os.homedir(), ".local", "share");
  return path.join(xdg, "capturas-app-store");
}

/** User data root. Electron passes the app's own userData path. */
export const dataDir = () => process.env.APP_DATA_DIR || defaultDataDir();

/**
 * Root of the bundled app (the folder holding `public/` and `.next/`).
 * Never use process.cwd() directly for bundled assets: a packaged app opened
 * from Finder runs with cwd "/", so Apple's bezels silently disappear.
 */
export const appRoot = () => process.env.APP_ROOT || process.cwd();

export const projectsDir = () => path.join(dataDir(), "projects");
export const publicDataDir = () => path.join(dataDir(), "public");
export const uploadedScreenshotsDir = () => path.join(publicDataDir(), "screenshots", "uploaded");
export const importedFontsDir = () => path.join(publicDataDir(), "fonts", "imported");

type Source = { base: string };

/**
 * Folders a previous build may have written into:
 *  - the checkout itself (`projects/`, `public/…`), which `next dev` used;
 *  - the old Electron userData folder, passed by the main process;
 *  - any extra folder through APP_LEGACY_DATA_DIRS.
 */
function legacySources(): Source[] {
  // The app used to be called "Capturas App Store". Its data folder is still a
  // valid source for a one-time import after the rename.
  const legacyUserData =
    process.platform === "darwin"
      ? [path.join(os.homedir(), "Library", "Application Support", "Capturas App Store", "data")]
      : [];
  const roots = [
    appRoot(),
    ...legacyUserData,
    ...(process.env.APP_LEGACY_DATA_DIRS || "").split(path.delimiter),
  ];
  const seen = new Set<string>([path.resolve(/*turbopackIgnore: true*/ dataDir())]);
  const sources: Source[] = [];
  for (const root of roots) {
    if (!root) continue;
    const resolved = path.resolve(root);
    if (seen.has(resolved)) continue;
    seen.add(resolved);
    sources.push({ base: resolved });
  }
  return sources;
}

async function readdirSafe(dir: string): Promise<string[]> {
  try {
    return await fs.readdir(dir);
  } catch {
    return [];
  }
}

async function copyMissing(src: string, dst: string): Promise<boolean> {
  if (path.resolve(src) === path.resolve(dst)) return false;
  try {
    await fs.access(dst);
    return false;
  } catch {
    // Missing: copy it.
  }
  await fs.mkdir(path.dirname(dst), { recursive: true });
  await fs.copyFile(src, dst);
  return true;
}

async function copyMatchingFiles(source: string, target: string, pattern: RegExp): Promise<number> {
  let copied = 0;
  for (const name of await readdirSafe(source)) {
    if (!pattern.test(name)) continue;
    try {
      if (await copyMissing(path.join(source, name), path.join(target, name))) copied += 1;
    } catch {
      // A single unreadable file must not abort the migration.
    }
  }
  return copied;
}

/**
 * One-time import of the data older builds kept inside the checkout or in the
 * previous userData folder. Projects come from the first folder that has any
 * (so the newest working copy wins); content-addressed screenshots and fonts
 * are merged from every folder, because different projects may reference them.
 * Nothing is deleted, and files already present in the data folder win.
 */
async function migrate(): Promise<void> {
  await Promise.all([
    fs.mkdir(projectsDir(), { recursive: true }),
    fs.mkdir(uploadedScreenshotsDir(), { recursive: true }),
    fs.mkdir(importedFontsDir(), { recursive: true }),
  ]);

  const marker = path.join(dataDir(), MIGRATION_MARKER);
  try {
    await fs.access(marker);
    return;
  } catch {
    // First run in this folder.
  }

  const sources = legacySources();
  let importedFrom: string | null = null;
  let projects = 0;
  let screenshots = 0;

  for (const source of sources) {
    const sourceProjects = path.join(source.base, "projects");
    const names = (await readdirSafe(sourceProjects)).filter((name) => PROJECT_FILE.test(name));
    if (names.length === 0) continue;

    for (const name of names) {
      const src = path.join(sourceProjects, name);
      try {
        // Only import something the store can actually open.
        const parsed = JSON.parse(await fs.readFile(src, "utf8")) as { meta?: { name?: unknown } };
        if (typeof parsed?.meta?.name !== "string") continue;
        if (await copyMissing(src, path.join(projectsDir(), name))) projects += 1;
      } catch {
        // Ignore corrupt project files instead of blocking startup.
      }
    }
    if (projects > 0) {
      importedFrom = source.base;
      await copyMissing(path.join(sourceProjects, "_active.json"), path.join(projectsDir(), "_active.json"));
      break;
    }
  }

  for (const source of sources) {
    screenshots += await copyMatchingFiles(
      path.join(source.base, "public", "screenshots", "uploaded"),
      uploadedScreenshotsDir(),
      SCREENSHOT_FILE,
    );
    await copyMatchingFiles(
      path.join(source.base, "public", "fonts", "imported"),
      importedFontsDir(),
      FONT_FILE,
    );
  }

  // Pre-multi-project builds stored a single deck at the root. Keep it
  // importable: the store turns it into a project on first load.
  if (projects === 0) {
    for (const source of sources) {
      const legacy = path.join(source.base, LEGACY_PROJECT_FILE);
      try {
        const parsed = JSON.parse(await fs.readFile(legacy, "utf8")) as { slidesByDevice?: unknown };
        if (!parsed?.slidesByDevice) continue;
        if (await copyMissing(legacy, path.join(dataDir(), LEGACY_PROJECT_FILE))) break;
      } catch {
        // No legacy project file in this source.
      }
    }
  }

  await fs.writeFile(
    marker,
    `${JSON.stringify({ version: 1, at: new Date().toISOString(), from: importedFrom, projects, screenshots }, null, 2)}\n`,
    "utf8",
  );
}

let preparing: Promise<void> | null = null;

/**
 * Creates the data folders and runs the one-time migration. Memoised per
 * process; a failure clears the memo so the next request can retry.
 */
export function ensureDataDir(): Promise<void> {
  if (!preparing) {
    preparing = migrate().catch((error) => {
      preparing = null;
      throw error;
    });
  }
  return preparing;
}
