import { NextResponse } from "next/server";
import { loadSearchSuggest } from "@/lib/search-suggest-server";

export const runtime = "nodejs";

type Body = {
  q?: string;
  history?: unknown;
};

export async function POST(req: Request) {
  let body: Body = {};
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const q = typeof body.q === "string" ? body.q : "";
  const history = Array.isArray(body.history)
    ? body.history.filter((x): x is string => typeof x === "string" && x.trim().length > 0).slice(0, 20)
    : [];

  try {
    const { channels, phrases } = await loadSearchSuggest(q, history);
    return NextResponse.json({ channels, phrases });
  } catch (e) {
    console.error("search/suggest", e);
    return NextResponse.json({ error: "Suggest failed" }, { status: 500 });
  }
}
