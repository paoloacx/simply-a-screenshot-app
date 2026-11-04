import { promises as fs } from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { dataDir, ensureDataDir } from "./app-paths";
import { projectValidationError } from "./project-validation";

/**
 * Server-only multi-project store.
 *   projects/<id>.json   -> { meta: {id,name,createdAt,updatedAt}, state }
 *   projects/_active.json -> { id }
 * Every mutation goes through one queue and files are replaced atomically (tmp + rename).
 */
export type ProjectMeta = { id: string; name: string; createdAt: number; updatedAt: number };
type Wrapper = { meta: ProjectMeta; state: unknown };

const LEGACY_FILE = "app-store-screenshots.json";
const ACTIVE_FILE = "_active.json";
const ID_RE = /^[a-z0-9][a-z0-9-]{0,80}$/;

const dir = () => path.join(dataDir(), "projects");
const fileOf = (id: string) => path.join(dir(), `${id}.json`);

export const revisionOf = (raw: string | null) =>
  `"${raw === null ? "missing" : createHash("sha256").update(raw).digest("hex")}"`;

export const isValidId = (id: unknown): id is string => typeof id === "string" && ID_RE.test(id) && id !== "_active";

let queue: Promise<unknown> = Promise.resolve();
/** Serialize every read-modify-write so concurrent requests cannot interleave. */
export function enqueue<T>(job: () => Promise<T>): Promise<T> {
  // Every store operation also guarantees the data folder exists and that the
  // one-time import of older data folders has finished.
  const result = queue.then(() => ensureDataDir()).then(job);
  queue = result.catch(() => undefined);
  return result;
}

export class StoreError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

async function readIfExists(file: string): Promise<string | null> {
  try { return await fs.readFile(file, "utf8"); }
  catch (e) { if ((e as NodeJS.ErrnoException).code === "ENOENT") return null; throw e; }
}

async function atomicWrite(file: string, content: string) {
  await fs.mkdir(dir(), { recursive: true });
  const tmp = `${file}.${randomUUID()}.tmp`;
  try {
    await fs.writeFile(tmp, content, "utf8");
    await fs.rename(tmp, file);
  } finally {
    await fs.unlink(tmp).catch(() => undefined);
  }
}

const serialize = (w: Wrapper) => JSON.stringify(w, null, 2) + "\n";

export function slugify(name: string) {
  const base = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
  return base || "proyecto";
}

export function cleanName(name: unknown, fallback = "Untitled project") {
  const n = typeof name === "string" ? name.replace(/\s+/g, " ").trim().slice(0, 80) : "";
  return n || fallback;
}

async function uniqueId(name: string) {
  for (;;) {
    const id = `${slugify(name)}-${randomUUID().slice(0, 6)}`;
    if ((await readIfExists(fileOf(id))) === null) return id;
  }
}

async function readWrapperRaw(id: string): Promise<{ wrapper: Wrapper; raw: string } | null> {
  if (!isValidId(id)) return null;
  const raw = await readIfExists(fileOf(id));
  if (raw === null) return null;
  const parsed = JSON.parse(raw) as Wrapper;
  if (!parsed || typeof parsed !== "object" || !parsed.meta || typeof parsed.meta.name !== "string") {
    throw new StoreError(`El archivo del proyecto ${id} está dañado`, 500);
  }
  parsed.meta.id = id;
  return { wrapper: parsed, raw };
}

const metaCache = new Map<string, { sig: string; meta: ProjectMeta }>();

async function listMetas(): Promise<ProjectMeta[]> {
  let names: string[];
  try { names = await fs.readdir(dir()); }
  catch (e) { if ((e as NodeJS.ErrnoException).code === "ENOENT") return []; throw e; }
  const metas: ProjectMeta[] = [];
  for (const name of names) {
    if (!name.endsWith(".json")) continue;
    const id = name.slice(0, -5);
    if (!isValidId(id)) continue;
    try {
      const st = await fs.stat(fileOf(id));
      const sig = `${st.mtimeMs}:${st.size}`;
      const hit = metaCache.get(id);
      if (hit && hit.sig === sig) { metas.push(hit.meta); continue; }
      const r = await readWrapperRaw(id);
      if (!r) continue;
      metaCache.set(id, { sig, meta: r.wrapper.meta });
      metas.push(r.wrapper.meta);
    } catch { /* skip unreadable files */ }
  }
  return metas.sort((a, b) => b.updatedAt - a.updatedAt);
}

async function readActiveId(): Promise<string | null> {
  const raw = await readIfExists(path.join(dir(), ACTIVE_FILE));
  if (!raw) return null;
  try { const id = (JSON.parse(raw) as { id?: unknown }).id; return isValidId(id) ? id : null; }
  catch { return null; }
}

const setActiveId = (id: string) => atomicWrite(path.join(dir(), ACTIVE_FILE), JSON.stringify({ id }) + "\n");

async function createProject(name: string, state: unknown): Promise<ProjectMeta> {
  const id = await uniqueId(name);
  const now = Date.now();
  const meta = { id, name, createdAt: now, updatedAt: now };
  await atomicWrite(fileOf(id), serialize({ meta, state }));
  return meta;
}

/** Makes sure at least one project exists (migrating the legacy single file) and the active pointer is valid. */
async function ensureReady(): Promise<{ metas: ProjectMeta[]; activeId: string | null }> {
  let metas = await listMetas();
  if (metas.length === 0) {
    const legacy = await readIfExists(path.join(dataDir(), LEGACY_FILE));
    if (legacy !== null) {
      try {
        const parsed = JSON.parse(legacy);
        if (!projectValidationError(parsed)) {
          const meta = await createProject("Proyecto 1", parsed);
          await setActiveId(meta.id);
          metas = [meta];
        }
      } catch { /* unreadable legacy file: start empty */ }
    }
  }
  if (metas.length === 0) return { metas, activeId: null };
  let activeId = await readActiveId();
  if (!activeId || !metas.some((m) => m.id === activeId)) {
    activeId = metas[0].id;
    await setActiveId(activeId);
  }
  return { metas, activeId };
}

export type ListResult = { projects: ProjectMeta[]; activeId: string | null };

export const listProjects = () => enqueue(async (): Promise<ListResult> => {
  const { metas, activeId } = await ensureReady();
  return { projects: metas, activeId };
});

/** Active project as stored; null state when nothing exists yet (a project is created on first save). */
export const readActive = () => enqueue(async () => {
  const { activeId } = await ensureReady();
  if (!activeId) return null;
  const r = await readWrapperRaw(activeId);
  return r ? { meta: r.wrapper.meta, state: r.wrapper.state, revision: revisionOf(r.raw) } : null;
});

export const writeActive = (state: unknown, expected: string | null, expectedId: string | null) => enqueue(async () => {
  const { activeId } = await ensureReady();
  if (expectedId && activeId && expectedId !== activeId) {
    throw new StoreError("El proyecto activo ha cambiado. Recarga para continuar.", 409);
  }
  if (!activeId) {
    const meta = await createProject("Proyecto 1", state);
    await setActiveId(meta.id);
    const r = await readWrapperRaw(meta.id);
    return { meta, revision: revisionOf(r!.raw) };
  }
  const current = await readWrapperRaw(activeId);
  if (!current) throw new StoreError("Proyecto activo no encontrado", 404);
  if (expected !== null && expected !== revisionOf(current.raw)) {
    throw new StoreError("El proyecto cambió en otra pestaña o en disco. Tus cambios siguen abiertos aquí; expórtalos antes de recargar.", 412);
  }
  const meta = { ...current.wrapper.meta, updatedAt: Date.now() };
  const raw = serialize({ meta, state });
  await atomicWrite(fileOf(activeId), raw);
  return { meta, revision: revisionOf(raw) };
});

export const create = (name: unknown, opts: { duplicateOf?: unknown; state?: unknown; activate?: boolean }) => enqueue(async () => {
  await ensureReady();
  let state: unknown = opts.state ?? null;
  let finalName = cleanName(name);
  if (opts.duplicateOf !== undefined) {
    const src = await readWrapperRaw(String(opts.duplicateOf));
    if (!src) throw new StoreError("Proyecto original no encontrado", 404);
    state = src.wrapper.state;
    finalName = cleanName(name, `${src.wrapper.meta.name} (copia)`);
  }
  if (state !== null) {
    const err = projectValidationError(state);
    if (err) throw new StoreError(err, 400);
  }
  const meta = await createProject(finalName, state);
  if (opts.activate !== false) await setActiveId(meta.id);
  return meta;
});

export const open = (id: unknown) => enqueue(async () => {
  if (!isValidId(id) || !(await readIfExists(fileOf(id)))) throw new StoreError("Proyecto no encontrado", 404);
  await setActiveId(id);
  return id;
});

export const rename = (id: unknown, name: unknown) => enqueue(async () => {
  const r = isValidId(id) ? await readWrapperRaw(id) : null;
  if (!r) throw new StoreError("Proyecto no encontrado", 404);
  const meta = { ...r.wrapper.meta, name: cleanName(name, r.wrapper.meta.name) };
  await atomicWrite(fileOf(meta.id), serialize({ meta, state: r.wrapper.state }));
  return meta;
});

export const remove = (id: unknown) => enqueue(async () => {
  const { metas, activeId } = await ensureReady();
  if (!isValidId(id) || !metas.some((m) => m.id === id)) throw new StoreError("Proyecto no encontrado", 404);
  if (metas.length <= 1) throw new StoreError("No se puede eliminar el último proyecto", 400);
  await fs.unlink(fileOf(id));
  metaCache.delete(id);
  let nextActive = activeId;
  if (activeId === id) {
    nextActive = metas.find((m) => m.id !== id)!.id;
    await setActiveId(nextActive);
  }
  return nextActive;
});

export const exportProject = (id: unknown) => enqueue(async () => {
  const r = isValidId(id) ? await readWrapperRaw(id) : null;
  if (!r) throw new StoreError("Proyecto no encontrado", 404);
  return r.wrapper;
});
