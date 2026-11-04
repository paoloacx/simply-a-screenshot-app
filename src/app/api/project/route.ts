import { NextResponse } from "next/server";
import { projectValidationError } from "@/lib/project-validation";
import { rejectCrossSiteWrite } from "@/lib/request-guard";
import { readJsonBody } from "@/lib/request-body";
import { StoreError, readActive, revisionOf, writeActive } from "@/lib/projects-store";

export const dynamic = "force-dynamic";

/**
 * Compatibility route: always serves the ACTIVE project of the multi-project
 * store (see lib/projects-store.ts). Revisions (ETag/If-Match) are hashes of
 * the stored project file, so stale writers get a 412.
 */
export async function GET() {
  try {
    const active = await readActive();
    if (!active) {
      return NextResponse.json({ ok: true, state: null, project: null }, { headers: { ETag: revisionOf(null), "Cache-Control": "no-store" } });
    }
    if (active.state === null || active.state === undefined) {
      // Proyecto recién creado: el editor arranca con los valores por defecto.
      return NextResponse.json(
        { ok: true, state: null, project: { id: active.meta.id, name: active.meta.name } },
        { headers: { ETag: active.revision, "Cache-Control": "no-store" } },
      );
    }
    const validationError = projectValidationError(active.state);
    if (validationError) throw new Error(validationError);
    return NextResponse.json(
      { ok: true, state: active.state, project: { id: active.meta.id, name: active.meta.name } },
      { headers: { ETag: active.revision, "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  // This route OVERWRITES project files on disk. See lib/request-guard.ts.
  const blocked = rejectCrossSiteWrite(req);
  if (blocked) {
    return NextResponse.json({ ok: false, error: blocked.error }, { status: blocked.status });
  }
  const parsed = await readJsonBody(req, 64 * 1024 * 1024);
  if (parsed.response) return parsed.response;
  const body = parsed.value;
  const validationError = projectValidationError(body);
  if (validationError) {
    return NextResponse.json({ ok: false, error: validationError }, { status: 400 });
  }
  try {
    // X-Project-Id lets the editor refuse to write into a project it is no longer showing.
    const result = await writeActive(body, req.headers.get("if-match"), req.headers.get("x-project-id"));
    return NextResponse.json({ ok: true, project: { id: result.meta.id, name: result.meta.name } }, { headers: { ETag: result.revision } });
  } catch (e) {
    const status = e instanceof StoreError ? e.status : 500;
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status });
  }
}
