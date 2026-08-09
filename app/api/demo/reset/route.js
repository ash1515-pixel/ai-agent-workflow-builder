import { NextResponse } from "next/server";
import { store } from "../../../../lib/demo-store";

export async function POST() {
  store.reset();
  return NextResponse.json({ ok: true });
}
