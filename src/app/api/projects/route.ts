import { NextResponse } from "next/server";
import { create, listProjects } from "@/lib/projects-store";
import { fail, guardedBody } from "@/lib/projects-route-utils";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ ok: true, ...(await listProjects()) }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) { return fail(e); }
}

/** Body: { name?, duplicateOf?: id, activate?: boolean (default true) } -> new project (empty defaults, or a copy). */
export async function POST(req: Request) {
  const g = await guardedBody(req, true);
  if ("response" in g) return g.response;
  try {
    const { name, duplicateOf, activate } = g.body;
    const meta = await create(name, { duplicateOf, activate: activate !== false });
    return NextResponse.json({ ok: true, project: meta });
  } catch (e) { return fail(e); }
}
