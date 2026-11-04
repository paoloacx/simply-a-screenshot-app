import { NextResponse } from "next/server";
import { create } from "@/lib/projects-store";
import { fail, guardedBody } from "@/lib/projects-route-utils";

export const dynamic = "force-dynamic";

/**
 * Body: an exported file { meta?: {name}, state } or a bare project state,
 * optionally with { name } override. State is validated with projectValidationError.
 */
export async function POST(req: Request) {
  const g = await guardedBody(req);
  if ("response" in g) return g.response;
  try {
    const b = g.body;
    const hasState = b.state && typeof b.state === "object";
    const state = hasState ? b.state : b;
    const metaName = b.meta && typeof b.meta === "object" ? (b.meta as { name?: unknown }).name : undefined;
    const meta = await create(typeof b.name === "string" ? b.name : metaName, { state, activate: b.activate !== false });
    return NextResponse.json({ ok: true, project: meta });
  } catch (e) { return fail(e); }
}
