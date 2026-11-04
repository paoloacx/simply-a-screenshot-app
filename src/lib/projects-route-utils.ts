import { NextResponse } from "next/server";
import { StoreError } from "./projects-store";
import { rejectCrossSiteWrite } from "./request-guard";
import { readJsonBody } from "./request-body";

export const fail = (e: unknown) =>
  NextResponse.json(
    { ok: false, error: e instanceof Error ? e.message : String(e) },
    { status: e instanceof StoreError ? e.status : 500 },
  );

/** Guard + parse for write routes. Returns either a ready response or the body. */
export async function guardedBody(req: Request, optional = false): Promise<{ response: NextResponse } | { body: Record<string, unknown> }> {
  const blocked = rejectCrossSiteWrite(req);
  if (blocked) return { response: NextResponse.json({ ok: false, error: blocked.error }, { status: blocked.status }) };
  const parsed = await readJsonBody(req, 64 * 1024 * 1024);
  if (parsed.response) return optional ? { body: {} } : { response: parsed.response };
  const v = parsed.value;
  return { body: v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {} };
}
