import { NextResponse } from "next/server";
import { exportProject, open, remove, rename } from "@/lib/projects-store";
import { fail, guardedBody } from "@/lib/projects-route-utils";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

/** GET -> full {meta,state} wrapper (used for export). */
export async function GET(_req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    return NextResponse.json({ ok: true, ...(await exportProject(id)) }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) { return fail(e); }
}

/** Body: { action: "open" } | { action: "rename", name } | { name } (rename). */
export async function POST(req: Request, { params }: Ctx) {
  const g = await guardedBody(req);
  if ("response" in g) return g.response;
  try {
    const { id } = await params;
    if (g.body.action === "open") return NextResponse.json({ ok: true, activeId: await open(id) });
    return NextResponse.json({ ok: true, project: await rename(id, g.body.name) });
  } catch (e) { return fail(e); }
}

/** DELETE -> removes a project; refuses the last one. Returns the new activeId. */
export async function DELETE(req: Request, { params }: Ctx) {
  const g = await guardedBody(req, true);
  if ("response" in g) return g.response;
  try {
    const { id } = await params;
    return NextResponse.json({ ok: true, activeId: await remove(id) });
  } catch (e) { return fail(e); }
}
